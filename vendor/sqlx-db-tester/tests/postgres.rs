use anyhow::Result;
use sqlx::{
    AssertSqlSafe, Connection, PgConnection,
    migrate::Migrator,
    postgres::{PgConnectOptions, PgSslMode},
};
use sqlx_db_tester::{TestPg, TestPgBuilder};
use std::{env, path::PathBuf};
use url::Url;
use uuid::Uuid;

fn database_url() -> String {
    env::var("DATABASE_URL").expect("DATABASE_URL must point to a dedicated test postgres server")
}

fn fixture_path(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("fixtures")
        .join(name)
}

fn test_database() -> TestPg {
    TestPg::new(database_url(), fixture_path("migrations"))
}

#[tokio::test]
async fn test_postgres_should_create_and_drop() {
    let tdb = test_database();
    let pool = tdb.get_pool().await;
    // insert todo
    sqlx::query("INSERT INTO todos (title) VALUES ('test')")
        .execute(&pool)
        .await
        .unwrap();
    // get todo
    let (id, title) = sqlx::query_as::<_, (i32, String)>("SELECT id, title FROM todos")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(id, 1);
    assert_eq!(title, "test");
}

#[tokio::test]
#[ignore = "github action postgres server can't be used for this test"]
async fn test_postgres_should_load_csv() -> Result<()> {
    let filename = fixture_path("todos.csv");
    let tdb = test_database();
    tdb.load_csv("todos", &["title"], &filename).await?;
    let pool = tdb.get_pool().await;
    // get todo
    let (id, title) = sqlx::query_as::<_, (i32, String)>("SELECT id, title FROM todos")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(id, 1);
    assert_eq!(title, "hello world");
    Ok(())
}

#[tokio::test]
async fn test_postgres_should_load_csv_data() -> Result<()> {
    let csv = include_str!("../fixtures/todos.csv");
    let tdb = test_database();
    tdb.load_csv_data("todos", csv).await?;
    let pool = tdb.get_pool().await;
    // get todo
    let (id, title) = sqlx::query_as::<_, (i32, String)>("SELECT id, title FROM todos")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(id, 1);
    assert_eq!(title, "hello world");
    Ok(())
}

#[tokio::test]
async fn test_postgres_with_extensions() {
    let tdb = TestPgBuilder::new(database_url(), fixture_path("migrations"))
        .with_extensions(vec!["uuid-ossp".to_string()])
        .build();

    let pool = tdb.get_pool().await;

    // Verify the extension is installed by trying to use it
    let result = sqlx::query_scalar::<_, String>("SELECT uuid_generate_v4()::text")
        .fetch_one(&pool)
        .await;

    assert!(result.is_ok(), "uuid-ossp extension should be available");
}

#[tokio::test]
async fn test_postgres_with_seeds() {
    let tdb = TestPgBuilder::new(database_url(), fixture_path("migrations"))
        .with_seeds(fixture_path("seeds"))
        .build();

    let pool = tdb.get_pool().await;

    // Verify that seed data was loaded in the correct order
    let todos = sqlx::query_as::<_, (i32, String)>("SELECT id, title FROM todos ORDER BY id")
        .fetch_all(&pool)
        .await
        .unwrap();

    assert_eq!(todos.len(), 3);
    assert_eq!(todos[0].1, "First seeded todo");
    assert_eq!(todos[1].1, "Second seeded todo");
    assert_eq!(todos[2].1, "Third seeded todo");
}

#[tokio::test]
async fn test_postgres_transactions_upgrade_and_cleanup() -> Result<()> {
    let tdb = test_database();
    let dbname = tdb.dbname.clone();
    let admin_options = tdb
        .server_url()
        .parse::<PgConnectOptions>()?
        .database("postgres");
    let pool = tdb.get_pool().await;
    let id = sqlx::query_scalar::<_, i32>("INSERT INTO todos (title) VALUES ($1) RETURNING id")
        .bind("old row")
        .fetch_one(&pool)
        .await?;

    let mut tx = pool.begin().await?;
    sqlx::query("UPDATE todos SET completed = $1 WHERE id = $2")
        .bind(true)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    assert!(
        !sqlx::query_scalar::<_, bool>("SELECT completed FROM todos WHERE id = $1")
            .bind(id)
            .fetch_one(&pool)
            .await?
    );
    tx.commit().await?;
    assert!(
        sqlx::query_scalar::<_, bool>("SELECT completed FROM todos WHERE id = $1")
            .bind(id)
            .fetch_one(&pool)
            .await?
    );

    let mut tx = pool.begin().await?;
    sqlx::query("UPDATE todos SET completed = $1 WHERE id = $2")
        .bind(false)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    tx.rollback().await?;
    assert!(
        sqlx::query_scalar::<_, bool>("SELECT completed FROM todos WHERE id = $1")
            .bind(id)
            .fetch_one(&pool)
            .await?
    );

    let baseline = Migrator::new(fixture_path("migrations")).await?;
    let upgrade = Migrator::new(fixture_path("upgrade_migrations")).await?;
    let migrations =
        Migrator::with_migrations(baseline.iter().chain(upgrade.iter()).cloned().collect());
    migrations.run(&pool).await?;
    let row = sqlx::query_as::<_, (String, bool, i32)>(
        "SELECT title, completed, priority FROM todos WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&pool)
    .await?;
    assert_eq!(row, ("old row".to_string(), true, 0));

    pool.close().await;
    drop(tdb);
    let mut admin = PgConnection::connect_with(&admin_options).await?;
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1)",
    )
    .bind(dbname)
    .fetch_one(&mut admin)
    .await?;
    assert!(!exists, "the test database must be dropped");
    Ok(())
}

#[tokio::test]
async fn test_postgres_url_routing_and_creation_failure_preserve_source() -> Result<()> {
    async fn assert_source_untouched(options: &PgConnectOptions) -> Result<()> {
        let mut source = PgConnection::connect_with(options).await?;
        let row = sqlx::query_as::<_, (String, Option<String>)>(
            "SELECT message, to_regclass($1)::text FROM sentinel",
        )
        .bind("public.todos")
        .fetch_one(&mut source)
        .await?;
        assert_eq!(row, ("keep me".to_string(), None));
        source.close().await?;
        Ok(())
    }

    let admin_options = database_url()
        .parse::<PgConnectOptions>()?
        .database("postgres");
    let mut admin = PgConnection::connect_with(&admin_options).await?;
    let mut source_name = format!("source_{} /?#%\"@", Uuid::new_v4().simple());
    source_name.push_str(&"x".repeat(63 - source_name.len()));
    assert_eq!(source_name.len(), 63);
    let source_identifier = source_name.replace('"', "\"\"");
    // ponytail: the test generates this identifier and escapes its double quotes.
    sqlx::raw_sql(AssertSqlSafe(format!(
        "CREATE DATABASE \"{source_identifier}\""
    )))
    .execute(&mut admin)
    .await?;

    let source_options = admin_options.clone().database(&source_name);
    let mut source = PgConnection::connect_with(&source_options).await?;
    sqlx::raw_sql("CREATE TABLE sentinel (message TEXT NOT NULL)")
        .execute(&mut source)
        .await?;
    sqlx::query("INSERT INTO sentinel (message) VALUES ($1)")
        .bind("keep me")
        .execute(&mut source)
        .await?;
    source.close().await?;

    let mut source_url = Url::parse(&database_url())?;
    let parameters: Vec<_> = source_url
        .query_pairs()
        .filter(|(key, _)| key != "dbname")
        .map(|(key, value)| (key.into_owned(), value.into_owned()))
        .collect();
    source_url.set_query(None);
    source_url.query_pairs_mut().extend_pairs(parameters);
    source_url
        .set_scheme("postgresql")
        .expect("PostgreSQL URL alias");
    source_url
        .path_segments_mut()
        .expect("PostgreSQL URL has a path")
        .clear()
        .push(&source_name);
    source_url
        .query_pairs_mut()
        .append_pair("sslmode", "disable")
        .append_pair("application_name", "sqlx-db-tester URL regression");

    for dbname_in_query in [false, true] {
        let mut input_url = source_url.clone();
        if dbname_in_query {
            input_url
                .path_segments_mut()
                .expect("PostgreSQL URL has a path")
                .clear()
                .push("postgres");
            input_url
                .query_pairs_mut()
                .append_pair("dbname", &source_name);
        }
        let tdb = TestPg::new(input_url.to_string(), fixture_path("migrations"));
        let dbname = tdb.dbname.clone();
        assert!(dbname.len() <= 63);
        assert_ne!(dbname, source_name);
        let pool = tdb.get_pool().await;
        assert!(matches!(
            pool.connect_options().get_ssl_mode(),
            PgSslMode::Disable
        ));
        let row = sqlx::query_as::<_, (String, String)>(
            "SELECT current_database(), current_setting('application_name')",
        )
        .fetch_one(&pool)
        .await?;
        assert_eq!(
            row,
            (dbname.clone(), "sqlx-db-tester URL regression".to_string())
        );
        assert!(
            sqlx::query_scalar::<_, bool>("SELECT to_regclass($1) IS NOT NULL")
                .bind("public.todos")
                .fetch_one(&pool)
                .await?
        );

        let output_options = tdb.url().parse::<PgConnectOptions>()?;
        assert_eq!(output_options.get_database(), Some(dbname.as_str()));
        assert!(matches!(output_options.get_ssl_mode(), PgSslMode::Disable));
        assert_eq!(
            output_options.get_application_name(),
            Some("sqlx-db-tester URL regression")
        );
        let mut by_url = PgConnection::connect(&tdb.url()).await?;
        let actual_database = sqlx::query_scalar::<_, String>("SELECT current_database()")
            .fetch_one(&mut by_url)
            .await?;
        assert_eq!(actual_database, dbname);
        by_url.close().await?;
        pool.close().await;
        drop(tdb);
        assert!(
            !sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1)",
            )
            .bind(&dbname)
            .fetch_one(&mut admin)
            .await?
        );
        assert_source_untouched(&source_options).await?;
    }

    let role_name = format!("no_create_{}", Uuid::new_v4().simple());
    // ponytail: the role identifier is generated from a UUID by this test.
    sqlx::raw_sql(AssertSqlSafe(format!(
        "CREATE ROLE \"{role_name}\" LOGIN PASSWORD 'test-only' NOCREATEDB NOSUPERUSER"
    )))
    .execute(&mut admin)
    .await?;
    // ponytail: both identifiers are test-generated; the source name is quoted safely.
    sqlx::raw_sql(AssertSqlSafe(format!(
        "ALTER DATABASE \"{source_identifier}\" OWNER TO \"{role_name}\""
    )))
    .execute(&mut admin)
    .await?;
    let restricted_options = source_options
        .clone()
        .username(&role_name)
        .password("test-only");
    PgConnection::connect_with(&restricted_options)
        .await?
        .close()
        .await?;
    let mut restricted_url = source_url.clone();
    restricted_url
        .query_pairs_mut()
        .append_pair("user", &role_name)
        .append_pair("password", "test-only");
    let failed = tokio::task::spawn_blocking(move || {
        TestPg::new(restricted_url.to_string(), fixture_path("migrations"))
    })
    .await;
    assert!(failed.is_err_and(|error| error.is_panic()));
    assert_source_untouched(&source_options).await?;

    // ponytail: the UUID role isolates ownership checks from concurrently running tests.
    sqlx::raw_sql(AssertSqlSafe(format!(
        "ALTER ROLE \"{role_name}\" CREATEDB"
    )))
    .execute(&mut admin)
    .await?;
    let mut failing_url = source_url.clone();
    failing_url
        .query_pairs_mut()
        .append_pair("user", &role_name)
        .append_pair("password", "test-only");
    let failed = tokio::task::spawn_blocking(move || {
        TestPg::new(failing_url.to_string(), fixture_path("failing_migrations"))
    })
    .await;
    assert!(failed.is_err_and(|error| error.is_panic()));
    let owned_databases = sqlx::query_scalar::<_, String>(
        "SELECT datname FROM pg_database WHERE datdba = (SELECT oid FROM pg_roles WHERE rolname = $1)",
    )
    .bind(&role_name)
    .fetch_all(&mut admin)
    .await?;
    assert_eq!(owned_databases, vec![source_name.clone()]);
    assert_source_untouched(&source_options).await?;

    // ponytail: the source identifier was generated and escaped by this test.
    sqlx::raw_sql(AssertSqlSafe(format!(
        "DROP DATABASE \"{source_identifier}\""
    )))
    .execute(&mut admin)
    .await?;
    // ponytail: the role identifier is generated from a UUID by this test.
    sqlx::raw_sql(AssertSqlSafe(format!("DROP ROLE \"{role_name}\"")))
        .execute(&mut admin)
        .await?;
    Ok(())
}
