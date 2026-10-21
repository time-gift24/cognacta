use anyhow::Result;
use itertools::Itertools;
use sqlx::{
    AssertSqlSafe, Connection, Executor, PgConnection, PgPool,
    migrate::{MigrationSource, Migrator},
    postgres::PgConnectOptions,
};
use std::{
    fs,
    path::{Path, PathBuf},
    thread,
};
use tokio::runtime::Runtime;
use url::Url;
use uuid::Uuid;

#[derive(Debug)]
pub struct TestPg {
    pub server_url: String,
    pub dbname: String,
    #[allow(dead_code)]
    extensions: Vec<String>,
    options: PgConnectOptions,
    created: bool,
}

/// Builder for creating a TestPg instance with custom configuration.
pub struct TestPgBuilder<S>
where
    S: MigrationSource<'static> + Send + Sync + 'static,
{
    database_url: String,
    migrations: S,
    extensions: Vec<String>,
    seeds_path: Option<PathBuf>,
}

impl<S> TestPgBuilder<S>
where
    S: MigrationSource<'static> + Send + Sync + 'static,
{
    /// Create a new TestPgBuilder with the given database URL and migrations.
    pub fn new(database_url: String, migrations: S) -> Self {
        Self {
            database_url,
            migrations,
            extensions: vec![],
            seeds_path: None,
        }
    }

    /// Add a list of PostgreSQL extensions to be installed before running migrations.
    ///
    /// # Example
    /// ```no_run
    /// use sqlx_db_tester::TestPgBuilder;
    /// use std::path::Path;
    ///
    /// let tdb = TestPgBuilder::new(
    ///     "postgres://postgres:postgres@localhost:5432".to_string(),
    ///     Path::new("./fixtures/migrations")
    /// )
    /// .with_extensions(vec!["uuid-ossp".to_string(), "postgis".to_string()])
    /// .build();
    /// ```
    pub fn with_extensions(mut self, extensions: Vec<String>) -> Self {
        self.extensions = extensions;
        self
    }

    /// Add a path to a directory containing seed SQL files.
    ///
    /// Seed files should be named with the pattern `<timestamp>_<description>.sql`
    /// (e.g., `20240101120000_initial_data.sql`). They will be executed in
    /// timestamp order after migrations are complete.
    ///
    /// # Example
    /// ```no_run
    /// use sqlx_db_tester::TestPgBuilder;
    /// use std::path::Path;
    ///
    /// let tdb = TestPgBuilder::new(
    ///     "postgres://postgres:postgres@localhost:5432".to_string(),
    ///     Path::new("./fixtures/migrations")
    /// )
    /// .with_seeds(Path::new("./fixtures/seeds"))
    /// .build();
    /// ```
    pub fn with_seeds<P: AsRef<Path>>(mut self, seeds_path: P) -> Self {
        self.seeds_path = Some(seeds_path.as_ref().to_path_buf());
        self
    }

    /// Build and initialize the test database with the configured settings.
    pub fn build(self) -> TestPg {
        TestPg::new_with_config(
            self.database_url,
            self.migrations,
            self.extensions,
            self.seeds_path,
        )
    }
}

impl TestPg {
    pub fn new<S>(database_url: String, migrations: S) -> Self
    where
        S: MigrationSource<'static> + Send + Sync + 'static,
    {
        Self::new_with_config(database_url, migrations, vec![], None)
    }

    #[allow(dead_code)]
    fn new_with_extensions<S>(database_url: String, migrations: S, extensions: Vec<String>) -> Self
    where
        S: MigrationSource<'static> + Send + Sync + 'static,
    {
        Self::new_with_config(database_url, migrations, extensions, None)
    }

    fn new_with_config<S>(
        database_url: String,
        migrations: S,
        extensions: Vec<String>,
        seeds_path: Option<PathBuf>,
    ) -> Self
    where
        S: MigrationSource<'static> + Send + Sync + 'static,
    {
        let (server_url, options) = parse_postgres_url(&database_url);
        // ponytail: a fixed ASCII prefix avoids source-name truncation and SQL identifier escaping.
        let dbname = format!("test_{}", Uuid::new_v4().simple());
        let options = options.database(&dbname);
        let extensions_cloned = extensions.clone();

        let mut tdb = Self {
            server_url,
            dbname,
            extensions,
            options,
            created: false,
        };

        thread::spawn(move || {
            let rt = Runtime::new().unwrap();
            rt.block_on(async {
                let admin_options = tdb.options.clone().database("postgres");
                let mut conn = PgConnection::connect_with(&admin_options)
                    .await
                    .expect("Failed to connect to PostgreSQL management database");
                // ponytail: dbname is generated here, never copied from the input URL.
                conn.execute(AssertSqlSafe(format!(
                    r#"CREATE DATABASE "{}""#,
                    tdb.dbname,
                )))
                .await
                .unwrap();
                tdb.created = true;

                let mut conn = PgConnection::connect_with(&tdb.options)
                    .await
                    .expect("Failed to connect to isolated test database");

                // create extensions before running migrations
                for ext in &extensions_cloned {
                    // ponytail: extension names must come from trusted test configuration.
                    conn.execute(AssertSqlSafe(format!(
                        r#"CREATE EXTENSION IF NOT EXISTS "{ext}""#
                    )))
                    .await
                    .unwrap_or_else(|_| panic!("Error while creating extension {ext}"));
                }

                let m = Migrator::new(migrations).await.unwrap();
                m.run(&mut conn).await.unwrap();

                // run seed files if provided
                if let Some(seeds_dir) = seeds_path {
                    run_seeds(&mut conn, &seeds_dir).await.unwrap();
                }
            });
            tdb
        })
        .join()
        .expect("failed to initialize test database")
    }

    pub fn server_url(&self) -> String {
        self.server_url.clone()
    }

    pub fn url(&self) -> String {
        let (server_url, _) = parse_postgres_url(&self.server_url);
        let mut url = Url::parse(&server_url).expect("Invalid PostgreSQL server URL");
        url.set_path(
            self.options
                .get_database()
                .expect("Missing test database name"),
        );
        url.into()
    }

    pub async fn get_pool(&self) -> PgPool {
        PgPool::connect_with(self.options.clone())
            .await
            .expect("Failed to connect to isolated test database")
    }

    pub async fn load_csv(&self, table: &str, fields: &[&str], filename: &Path) -> Result<()> {
        let pool = self.get_pool().await;
        let path = filename.canonicalize()?;
        let mut conn = pool.acquire().await?;
        let sql = format!(
            "COPY {} ({}) FROM '{}' DELIMITER ',' CSV HEADER;",
            table,
            fields.join(","),
            path.display()
        );
        // ponytail: table, fields and file paths must come from trusted test fixtures.
        conn.execute(AssertSqlSafe(sql)).await?;
        // copy csv

        Ok(())
    }

    pub async fn load_csv_data(&self, table: &str, csv: &str) -> Result<()> {
        let mut rdr = csv::Reader::from_reader(csv.as_bytes());
        let headers = rdr.headers()?.iter().join(",");
        let mut tx = self.get_pool().await.begin().await?;
        for result in rdr.records() {
            let record = result?;
            let sql = format!(
                "INSERT INTO {} ({}) VALUES ({})",
                table,
                headers,
                record.iter().map(|v| format!("'{v}'")).join(",")
            );
            // ponytail: preserve upstream CSV SQL; accept trusted fixtures only.
            tx.execute(AssertSqlSafe(sql)).await?;
        }
        tx.commit().await?;
        Ok(())
    }
}

impl Drop for TestPg {
    fn drop(&mut self) {
        if !self.created {
            return;
        }
        let dbname = self
            .options
            .get_database()
            .expect("Missing test database name")
            .to_owned();
        let admin_options = self.options.clone().database("postgres");
        thread::spawn(move || {
            let rt = Runtime::new().unwrap();
            rt.block_on(async move {
                    let mut conn = PgConnection::connect_with(&admin_options).await
                    .expect("Failed to connect to PostgreSQL management database");
                    sqlx::query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND datname = $1")
                    .bind(&dbname)
                    .execute(&mut conn)
                    .await
                    .expect("Terminate all other connections");
                    // ponytail: cleanup uses the private options for the database we created.
                    conn.execute(AssertSqlSafe(format!(r#"DROP DATABASE "{dbname}""#)))
                        .await
                        .expect("Error while querying the drop database");
                });
            })
            .join()
            .expect("failed to drop database");
    }
}

impl Default for TestPg {
    fn default() -> Self {
        Self::new(
            "postgres://postgres:postgres@localhost:5432".to_string(),
            Path::new("./fixtures/migrations"),
        )
    }
}

/// Discovers and runs seed SQL files from a directory.
///
/// Seed files should follow the naming pattern: `<timestamp>_<description>.sql`
/// They will be executed in timestamp order.
async fn run_seeds(conn: &mut PgConnection, seeds_dir: &Path) -> Result<()> {
    if !seeds_dir.exists() {
        return Ok(());
    }

    let mut seed_files = Vec::new();

    // read all .sql files from the seeds directory
    for entry in fs::read_dir(seeds_dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_file()
            && path.extension().is_some_and(|ext| ext == "sql")
            && let Some(filename) = path.file_name().and_then(|n| n.to_str())
        {
            // extract timestamp from filename (before first underscore)
            if let Some(timestamp) = filename.split('_').next() {
                seed_files.push((timestamp.to_string(), path));
            }
        }
    }

    // sort by timestamp
    seed_files.sort_by(|a, b| a.0.cmp(&b.0));

    // execute each seed file
    for (_timestamp, path) in seed_files {
        let sql = fs::read_to_string(&path)?;
        // ponytail: seed files contain trusted test setup SQL.
        conn.execute(AssertSqlSafe(sql)).await?;
    }

    Ok(())
}

fn parse_postgres_url(value: &str) -> (String, PgConnectOptions) {
    let mut url = Url::parse(value).expect("Invalid PostgreSQL URL");
    assert!(
        matches!(url.scheme(), "postgres" | "postgresql"),
        "Expected a PostgreSQL URL"
    );
    assert!(
        url.fragment().is_none(),
        "PostgreSQL URL fragments are unsupported"
    );
    let options = value
        .parse()
        .expect("Invalid PostgreSQL connection options");
    url.set_path("");
    let params: Vec<_> = url
        .query_pairs()
        .into_owned()
        .filter(|(key, _)| key != "dbname")
        .collect();
    url.set_query(None);
    if !params.is_empty() {
        url.query_pairs_mut().extend_pairs(params);
    }
    (url.into(), options)
}
#[cfg(test)]
mod tests {
    use super::{TestPg, parse_postgres_url};
    use sqlx::postgres::{PgConnectOptions, PgSslMode};

    #[test]
    fn connection_parameters_are_not_part_of_database_name() {
        let (_, options) = parse_postgres_url(
            "postgres://testuser:1@localhost/source?sslmode=disable&application_name=regression",
        );
        assert_eq!(options.get_database(), Some("source"));
    }

    #[test]
    fn test_with_dbname() {
        let url = "postgres://testuser:1@localhost/pureya";
        let (server_url, options) = parse_postgres_url(url);
        assert_eq!(server_url, "postgres://testuser:1@localhost");
        assert_eq!(options.get_database(), Some("pureya"));
    }

    #[test]
    fn test_without_dbname() {
        let url = "postgres://testuser:1@localhost";
        let (server_url, _) = parse_postgres_url(url);
        assert_eq!(server_url, "postgres://testuser:1@localhost");
    }

    #[test]
    fn test_url_uses_owned_database_and_preserves_connection_parameters() {
        for source in [
            "postgres://testuser:p%40ss@localhost/source?dbname=source&sslmode=require&application_name=a%2Fb",
            "postgresql://testuser:p%40ss@localhost/source%2F%25%22?sslmode=require&application_name=a%2Fb",
        ] {
            let (server_url, options) = parse_postgres_url(source);
            let mut tdb = TestPg {
                server_url,
                dbname: "modified_public_name".to_string(),
                extensions: vec![],
                options: options.database("test_owned"),
                created: false,
            };
            tdb.server_url.push_str("&dbname=source");
            let returned: PgConnectOptions = tdb.url().parse().unwrap();
            assert_eq!(returned.get_database(), Some("test_owned"));
            assert_eq!(returned.get_application_name(), Some("a/b"));
            assert!(matches!(returned.get_ssl_mode(), PgSslMode::Require));
            // Dropping an object that never created a database must not connect or delete anything.
            drop(tdb);
        }
    }

    #[test]
    #[should_panic(expected = "Expected a PostgreSQL URL")]
    fn reject_non_postgres_url() {
        parse_postgres_url("https://localhost/source");
    }

    #[test]
    #[should_panic(expected = "PostgreSQL URL fragments are unsupported")]
    fn reject_url_fragment() {
        parse_postgres_url("postgres://testuser:1@localhost/source#fragment");
    }
}
