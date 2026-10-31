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

## 开发图检查

默认关闭的 `dev` feature 提供 `graph-check`，不改变默认构建的命令集合：

```sh
SQLX_OFFLINE=true cargo run -p cognacta-cli --features dev --locked -- graph-check all
SQLX_OFFLINE=true cargo run -p cognacta-cli --features dev --locked -- graph-check chain
```

场景可选择 `chain`、`diamond`、`branch`、`fanout`、`transition`、`settlement` 或 `all`；`all` 按固定顺序运行 16 个独立变体。命令只使用本地确定性计算，不连接模型、数据库或外部业务服务。

最终报告分别显示 `run` 和 `check`：预期的 `run=failed` 在全部事实与断言匹配时仍为 `check=PASS`。报告包含节点状态与执行次数、waves、State、Output、final_output、全部受控错误分类及逐项断言。全部断言通过退出 0，验收或报告 I/O 失败退出 1，参数错误退出 2。

```sh
SQLX_OFFLINE=true cargo test -p cognacta-cli --features dev --test graph_check --locked
SQLX_OFFLINE=true cargo test -p cognacta-cli --features dev --test telemetry --locked
```
