# sqlx-db-tester 本地适配

- 上游：<https://github.com/tyrchen/sqlx-db-tester>
- 来源：crates.io `sqlx-db-tester 0.7.1` 发布包（2025-10-23）。
- 本地版本：`0.7.1-cognacta.1`，基于上游 0.7.1，只支持 PostgreSQL，适配 SQLx 0.9。
- 发布包内记录的 Git commit：`24023a5d62aaa1fa3c93546075f6a25b1ffa6f61`。
- 发布包 SHA-256：`6c9798003effe0e77b1d77d41160c198fb01622eb9c96aaf699dfb54a9854670`。
- 许可证：原样保留于 `LICENSE.md`；原始 manifest 保留于 `Cargo.toml.orig`。

本地版本不发布到 crates.io。作为 workspace member 使用根 `Cargo.lock`，项目只通过 `dev-dependencies` 引入此工具；保留上游 PostgreSQL 的公共 API、错误类型及数据库生命周期约定，不要求改为业务 crate 的统一 `Error`。`Cargo.toml.orig` 和 `CHANGELOG.md` 保留上游历史，其中的其他数据库条目不参与本地构建。

## 本地修改

- SQLx 升级到 0.9，依赖版本统一由根 workspace 管理。
- 将原 runtime/TLS 组合 feature 拆分为 SQLx 0.9 的独立 feature，TLS 使用系统证书根，遵守项目现有许可证策略。
- 按 SQLx 0.9 要求为动态 SQL 添加安全来源标记；这些 SQL 仅用于隔离测试库及受控测试 fixtures，不接收产品用户输入。
- 删除 MySQL 实现、测试和迁移 fixtures；PostgreSQL 为唯一后端，无后端 feature 开关。
- 真实数据库测试从库的 UT 模块拆到 `tests/postgres.rs`；库 UT 只保留不连接数据库的检查。
- 数据库 URL 从环境读取，fixtures 路径相对 `CARGO_MANIFEST_DIR` 解析。
- URL 使用 `url` 规范化、SQLx `PgConnectOptions` 解析和连接；保留 TLS／连接参数，支持 `postgresql://` 与编码库名，移除服务端 URL 的 `dbname` 覆盖参数。
- 测试库固定命名为 `test_<UUID>`，不拼接原库名前缀；内部连接与清理使用私有连接配置，不受公开名称字段修改影响。
- 只有成功创建测试库后才启用清理；连接或建库失败不执行删库，迁移初始化失败仍清理已经创建的测试库。
- 增加事务提交／回滚、旧数据迁移升级及数据库清理的 PostgreSQL 回归测试。
- 未沿用上游发布包的独立 CI、工具配置及 lockfile；未使用的 SQLite 源文件不参与本地版本。
- 补全 README 异步测试示例，按项目格式规范整理本地改动。

## 执行测试

从项目根目录运行无数据库 UT：

```sh
SQLX_OFFLINE=true cargo test -p sqlx-db-tester --lib --all-features --locked
```

自行启动专用临时 PostgreSQL；完整回归会创建角色、修改数据库所有者，以及创建、删除测试库和终止相关连接，使用该临时服务的 `postgres` 管理角色运行。设置 `DATABASE_URL`，例如本机临时测试服务的 `postgres://postgres:test_password@127.0.0.1:5432/postgres`，再运行：

```sh
SQLX_OFFLINE=true cargo test -p sqlx-db-tester --test postgres --locked
```

`SQLX_OFFLINE` 仅影响编译阶段；集成测试仍连接真实服务。不要使用产品数据库。迁移和 fixtures 位于本目录的 `fixtures/`，项目业务迁移仍位于 workspace 根 `migrations/`。

上游 server-side CSV 文件测试需要数据库服务器能访问宿主文件，保持其忽略状态；使用 `load_csv_data` 的测试不受该条件限制。

## 保留的上游行为

每个 `TestPg` 创建独立数据库并应用迁移，`Drop` 同步等待终止连接和删除自己创建的数据库；初始化与清理失败仍通过 panic 处理。异常终止进程不保证清理，清理过程中的 panic 也可能影响其他测试。使用专用、可丢弃的测试服务。
