# 自动记录执行事件实施任务

## 1. 标准 Serde 业务值

- [x] 1.1 实现并根导出 Value／SharedValue、标准 Serde 与原有 downcast 能力；Input／GraphInput 支持序列化，验证异构输入、来源顺序、嵌套 GraphInput、非 Clone 输出与 Arc 身份，补充公开 API 示例。
- [x] 1.2 升级 State／Delta／Reducer／Output 的 Serialize 约束，State derive 自动生成 Delta Serialize；更新现有业务样例和编译契约，验证泛型卫生、仅 Send 的 Delta，以及 None／Some(None)／Some(()) 在记录格式中的不同表示。

## 2. Run 与节点自动记录

- [x] 2.1 增加 RunContext::with_event_log 及私有 Run 编号／追加状态，父子和资源投影继承配置；验证独立根隔离、父子关联与 attempt、并发追加序号和真正异步等待，公共 EventLog 不变。
- [x] 2.2 接入启动、初始化和终态记录，记录故障保留 EventLogError；使用 fake log 验证首次追加失败不执行初始化、初始化或 State 编码失败无节点调用、未 poll 无事件，并更新公开调用示例。
- [x] 2.3 将 Execution::advance／complete 改为对象安全异步签名并更新所有驱动；节点包装层记录开始、完整 Outcome、业务失败和任务失败，验证资源投影闸门、完成时间、panic 只记一次、本地与替代调度器一致。
- [x] 2.4 接入 NodeSkipped 和 WaveSettled／终态提交顺序；验证完成顺序不改变 Delta 归并顺序、普通失败仍收齐本波、Transition 新 attempt、Deliver payload，以及提交追加失败禁止下游。
- [x] 2.5 完成调用树记录故障的停止与传播、取消前缀语义；用受控 fake 验证停止新任务／子 Run／路由、收齐已开始任务、不补写业务终态、不自动重试，以及取消等待追加时不伪造提交。

## 3. 兼容性验证与文档

- [x] 3.1 运行仓库 fmt、workspace check／clippy（all-targets/all-features/locked，clippy -D warnings）、无数据库 UT、公开 API／compile／doc、CLI graph-check 回归和 cargo deny --disable-fetch；核对用户原有构造宏改动保留，更新本任务文件的实际结果。
- [x] 3.2 同步 docs/design/event-log.md 的已接入状态、Any+Serde 和公共调用方法，保留尚未实现的 resume 边界；通过 OpenSpec strict、空白检查并核对无注册器、Codec、WaveStarted、offset 或恢复占位 API。

## 实际验证结果（2026-11-04）

- `cargo fmt --all -- --check`：通过。
- `SQLX_OFFLINE=true cargo check --workspace --all-targets --all-features --locked`：通过。
- `SQLX_OFFLINE=true cargo clippy --workspace --all-targets --all-features --locked -- -D warnings`：通过。
- `SQLX_OFFLINE=true cargo test --workspace --lib --bins --all-features --locked`：83 个 UT 通过（core 67、CLI 5、collector 5、vendor 6）。本阶段新增 13 个 core UT，并扩充既有 State 所有权测试的日志断言。
- `SQLX_OFFLINE=true TRYBUILD=overwrite cargo test -p cognacta-core --test public_api --test event_log --test compile --locked`：公开 API 12 个、EventLog API 2 个、compile 2 个测试套件通过；compile 共 18 个夹具。首次运行发现两个受 Serialize 上界影响的旧诊断快照，核对失败原因未变后更新；随后 `SQLX_OFFLINE=true cargo test -p cognacta-core --test compile --all-features --locked` 在非 overwrite 模式再次通过。
- `SQLX_OFFLINE=true cargo test -p cognacta-core --doc --all-features --locked`：2 个 doctest 通过，根文档示例实际启用 EventLog 并读取终态。
- `SQLX_OFFLINE=true cargo run -p cognacta-cli --features dev --locked -- graph-check all`：16 个场景全部 PASS，退出码 0；预期业务失败场景的既有 WARN 保留。
- `cargo deny check --disable-fetch`：advisories／bans／licenses／sources 均通过，有重复版本 warning；首次受沙箱对本地 advisory lock 的只读限制阻挡，获准访问该锁后通过，未抓取网络数据。
- `openspec validate record-run-execution-events --strict`、`git diff --check`、71 个改动／未跟踪文本文件的尾空白、文件结尾、冲突标记和大小检查：通过。
- 公开替代调度器与 LocalScheduler 均验证记录链路；既有 3／5 层子图场景验证每 Run 序号、父子身份、非 Clone 输出及仅 Send 的 Delta。异常驱动和 State 引用泄露均验证不伪造 WaveSettled。
- 用户原有构造宏源码和夹具保留，相关公开 API／编译检查通过；没有提交 Git。未增加注册器、Codec、WaveStarted、offset 或 resume 占位 API。
