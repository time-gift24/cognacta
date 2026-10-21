![](https://github.com/tyrchen/sqlx-db-tester/workflows/build/badge.svg)

# sqlx-db-tester

Version `0.7.1-cognacta.1` is based on upstream `0.7.1`, supports PostgreSQL only,
and is adapted to SQLx 0.9 for Cognacta development and tests.
See [UPSTREAM.md](UPSTREAM.md) for provenance, local changes, and test commands.

This a tool to test sqlx with postgres. It only supports tokio runtime at this moment.

## How to use it

You should first create a `TestPg` data structure in your tests. It will automatically create a database and a connection pool for you. You could then get the connection string or connection pool from it to use in your own code. When `TestPg` gets dropped, it will automatically drop the database.

```rust
#[tokio::test]
async fn some_awesom_test() {
    let tdb = TestPg::new(
            "postgres://postgres:postgres@localhost:5432".to_string(),
            std::path::Path::new("./migrations"),
        );
    let pool = tdb.get_pool().await;
    // do something with the pool

    // when tdb gets dropped, the database will be dropped
}
```

Have fun with this crate!

## License

This project is distributed under the terms of MIT.

See [LICENSE](LICENSE.md) for details.

Copyright 2022-2024 Tyr Chen
