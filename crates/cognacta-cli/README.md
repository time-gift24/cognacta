# cognacta-cli

当前 CLI 提供版本输出、帮助和 Collector 初始化／关闭；旧 `chat`、`cluster-demo` 命令及 `cognacta-test` feature 已移除，业务架构待重写。

```sh
SQLX_OFFLINE=true cargo run -p cognacta-cli --locked
SQLX_OFFLINE=true cargo run -p cognacta-cli --locked -- --help
SQLX_OFFLINE=true cargo run -p cognacta-cli --locked -- --version
```

无参数时输出 `cognacta <version>`。帮助和版本退出码为 0，非法参数退出 2，输出失败退出 1。遥测配置或导出失败不改变 stdout 与退出码；错误诊断和 Collector 关闭共用 3 秒总预算。

```sh
SQLX_OFFLINE=true cargo test -p cognacta-cli --bins --locked
SQLX_OFFLINE=true cargo test -p cognacta-cli --test telemetry --locked
```
