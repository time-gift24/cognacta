# EventLog 基础模块实施任务

本次交付独立存储能力；design.md 中的节点写入、Delta 重放与 resume 接缝不属于本次代码实施。不要通过占位运行入口、类型注册器或未确认的调度改动扩展范围。

## 1. 事件模型与公开错误

- [x] 1.1 在 core 增加 Event、bon builder／状态模块、EventData、NodeAttempt、FailureKind 及根导出；验证仅通过根 API 能构造和读取所有事件种类，WaveSettled 仅含 wave，kind 与变体一致。
- [x] 1.2 引入 workspace 管理的 serde，为事件封套及 NodeId／NodeKey 提供标准实现；以开发依赖 serde_json 验证全部事件形状、实例身份和业务字节往返，并验证零 seq／attempt 被拒绝，不给 State／NodeInstance 增加约束。
- [x] 1.3 增加 thiserror EventLogError 与 core::Error::EventLog 转换；用最小来源错误验证 Append／Read／Encode／Decode 分类、source 保留及 Display 不泄露来源正文。

## 2. 存储 trait 与内存实现

- [x] 2.1 实现 EventLog 的 Send future 追加和读取签名，以及 InMemoryEventLog::new；用 UT 验证空日志、独占游标、按 Run 隔离、全部读取和父子独立序号，不分配或改写事件编号。
- [x] 2.2 验证共享实例中的不同 Run 并发追加，以及读取集合不随后续追加改变、重复读取共享 Event Arc；在公开 API 测试中验证外部实现 trait 可直接返回 core::Error，并补充存储调用文档示例。

## 3. 集成验证与交付

- [x] 3.1 运行 cargo fmt --all -- --check、SQLX_OFFLINE=true cargo check／clippy（workspace、all-targets、all-features、locked，clippy 为 -D warnings）及 cargo test --workspace --lib --bins --all-features --locked；单独运行 core 的公开 API／编译契约与文档测试，确认既有图执行未接入日志且未破坏用户构造宏改动。
- [x] 3.2 运行 cargo deny check --disable-fetch、OpenSpec 严格校验及文档空白检查；核对没有 WaveStarted／state_after 实现、没有自定义 Codec、没有新增 tracing 或 resume 占位入口，记录实际检查结果并更新任务状态。

## 验证记录（2026-11-04）

- `cargo fmt --all -- --check`：通过。
- `SQLX_OFFLINE=true cargo check --workspace --all-targets --all-features --locked`：通过。
- `SQLX_OFFLINE=true cargo clippy --workspace --all-targets --all-features --locked -- -D warnings`：通过。
- `SQLX_OFFLINE=true cargo test --workspace --lib --bins --all-features --locked`：70 个 UT 通过，其中 core 54 个，包含 5 个新增 EventLog UT。
- `SQLX_OFFLINE=true cargo test -p cognacta-core --test event_log --locked`：2 个新增公开 API 测试通过。
- `SQLX_OFFLINE=true cargo test -p cognacta-core --test public_api --test compile --all-features --locked`：12 个既有公开 API 测试、2 组共 18 个编译样例通过，包括用户现有构造宏样例。
- `SQLX_OFFLINE=true cargo test -p cognacta-core --doc --all-features --locked`：2 个文档测试通过。
- `cargo deny check --disable-fetch`：通过 advisories、bans、licenses、sources 检查；已有重复依赖版本警告保留。首次执行受 advisory 数据库锁的沙箱只读限制，经自动审批后原命令通过。
- `openspec validate add-run-event-log --strict`、`git diff --check` 及新增文档／源文件的空白、文件结尾检查：通过。

本次未接入节点自动记录或 resume，未运行数据库集成测试，也未提交 Git。
