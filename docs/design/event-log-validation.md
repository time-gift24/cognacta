# EventLog format=2 实现核对与 prodagent 对照

更新日期：2026-11-05。**本报告记录已实现的 format=2 JSON 业务载荷及本次验证结果。**变更范围见 [JSON 载荷实施清单](../../openspec/changes/use-json-event-values/tasks.md)。旧 format=1 日志不自动迁移。

以当前两个本地工作区为对照，不把 prodagent 的设计注释当成已实现的恢复保证。

## 结构核对

| 主题 | prodagent 当前实现 | cognacta 本次实现与原因 |
| --- | --- | --- |
| 唯一提交 | scheduler._commit 先 append、Run.apply、再 Bus；replay 调用 Run.apply | Session.commit_locked 先 append、再 Projection.apply；replay 共用 apply。未配置后端也记录内存日志 |
| 节点结果 | 整波 gather 后记录 output；原始写入／控制暂存在本地变量 | 每个节点返回即记录完整 Outcome，保留下一阶段所需事实，缩小结果丢失窗口 |
| StateDelta | wave_delta 汇总写入，再由 apply 的 reducer 更新当前 State；不是最终 State Patch | 事件有序引用完整 Outcome，由 apply 消费原始 Delta、merge_batch 原子提交；保留强类型 reducer 语义 |
| Control | scheduler 检查并整理指令，apply 生效 | 原始 Directive 属于节点输出；Control.apply 统一校验并投影路由／实例，scheduler 查询其结果 |
| wave 边界 | 完成结果与增量／控制之间没有显式可恢复阶段 | 首条 NodeStarted 固定成员；StateDelta 标明归并阶段；Control 关闭 wave，包括空批次。不增 WaveSelected／WaveSettled |
| 未知节点 | resume 对 Running 节点直接 rearm 后重新调度 | 保留 Running 和逻辑 attempt；用已记录 Input 重新进入，只有新结果产生新事件 |
| 递归 | 同一 scheduler 运行独立子 Run；DELEGATED 保存 child ID，但默认 activator 每次新建 child | 相同递归模型；CallLinked 固定父 attempt、稳定 key、child ID 与输入，再启动子 Run；恢复接回原 child |
| 复用包装器 | 普通节点和子计划在统一执行接口上组合 | Graph 实现 NodeInstance，泛型 Retry<N> 可选稳定 call key，无需识别 Graph，也不新增按深度区分的调度类型 |
| 存储与身份 | 事件日志为存储边界 | 独立 cognacta-eventlog 实现每 Run 一个 JSONL；框架生成 UUID v7，事件因果仍以 seq 和调用关联为准 |
| 业务值 | 由各节点和计划解释各自数据 | Input、Output、Delta、payload 和子调用输入以普通 JSON／Serde 记录；节点在入口解析业务 schema，最终 O 由静态泛型恢复，不依赖 ValueTypes |

prodagent 对照入口：`src/kernel/scheduler.py` 的 `_commit`、`resume`、barrier 与 `InProcessActivator.activate`，`src/kernel/run.py` 的 `wave_delta`／`apply`，`src/kernel/replay.py` 的逐事件折叠。共同点是事件投影与递归调用模型；本次差异主要解决中断时事实是否足够，以及控制解释应归谁负责。

此前本地故障注入确认了两个窗口：NodeCompleted 已保存而 StateDelta 未保存时，prodagent 可恢复成完成但丢失该增量；子已完成而父结果未保存时，默认 activator 会再次执行子调用。本次 Rust 的逐前缀测试与 JSONL 重开测试覆盖对应窗口。prodagent 工作区未因此修改。

## 验证证据

- `crates/cognacta-core/src/history/tests.rs`：成功／失败 wave 每个事件前缀，比较 State、节点输入输出／attempt、稳定失败、波数、终态；恢复后的结果与首次完整运行一致。包含动态实例顺序、归并溢出保持全部 State 原值、控制错误抑制整批派发。
- 同文件：在每个 append 位置分别模拟“未保存即失败”和“保存后返回错误”，从实际历史接续；已记录结果不重复执行，StateDelta／Control 不重复提交。
- 同文件：四层同一 Graph 自递归，每个跨 Run 因果前缀恢复后保持原 child ID、独立 State、已初始化状态与完成子结果；不重跑已记录 leaf。
- 同文件：仅 Send 的 `Cell<u32>` Delta、无 Clone 的 State／输出，在 NodeCompleted 与 StateDelta 之间恢复，节点仅执行一次；损坏引用、非法 JSON 值及旧 format=1 明确拒绝。
- `crates/cognacta-core/src/event_log.rs`、`src/input.rs` 与 `src/scheduler/recording_tests.rs`：Event 不依赖 Graph 独立 JSON 往返；同形值按真实来源和顺序查询；缺省输出与显式 null、Delta 的不更新与清空、输入 schema 错误、最终 O 解码失败前不追加终态均有测试。
- `crates/cognacta-eventlog/src/lib.rs` 的 UT：每 Run 单文件、重开与连续 seq、非法路径／损坏尾行拒绝；子已完成而父结果未保存时关闭／重开文件后端，再接回原子 Run，确认只执行一次。
- 原有 kernel、subgraph、recording、公开 API、编译契约和 CLI 验收继续覆盖：替代 Scheduler、不同准入／完成顺序、三／五层 Graph 组合、显式重试、不同资源、静态边／Deliver／Transition、非 Clone 业务值经 JSON 传递、原诊断来源与遥测行为。

验证结果：fmt、check、Clippy、deny 全部通过；workspace 无数据库 UT 95 项通过，core 公开 API／事件存储／编译契约测试组 16 项通过，CLI 验收 4 项和文档测试 2 项通过。编译契约组另覆盖 18 个 pass／compile-fail fixture。`cargo deny` 保留现有重复依赖版本警告，advisories／bans／licenses／sources 均通过。

验证命令：

```sh
cargo fmt --all -- --check
SQLX_OFFLINE=true cargo check --workspace --all-targets --all-features --locked
SQLX_OFFLINE=true cargo clippy --workspace --all-targets --all-features --locked -- -D warnings
SQLX_OFFLINE=true cargo test --workspace --lib --bins --all-features --locked
SQLX_OFFLINE=true cargo test -p cognacta-core --test compile --test public_api --test event_log --locked
SQLX_OFFLINE=true cargo test -p cognacta-core -p cognacta-eventlog --doc --locked
SQLX_OFFLINE=true cargo test -p cognacta-cli --test graph_check --all-features --locked
cargo deny check --disable-fetch
```

未修改 SQL／迁移，不运行 PostgreSQL 集成测试。没有新增依赖豁免或关闭 lint。首次并行 UT 中 `dropping_a_five_level_run_cancels_every_started_run_and_releases_execution_handles` 曾缺少一条 `run_started` 观测；单独重跑及随后两次完整无数据库 UT 均通过，尚未复现其原因。OpenSpec CLI 当前未安装，无法运行 `openspec validate`；正式规格按 change 中四份差异手工同步并检查了内容与空白。

## 使用与边界

[API 附录](event-log-api.md) 与 [主设计](event-log.md) 描述已实现的 format=2 协议。旧日志不自动迁移；恢复需使用兼容的 Graph、业务 schema 和 reducer 语义，无需维护业务类型注册表。JSONL 目录同一时刻由一个活跃后端拥有；损坏尾行不自动截断。未记录的外部副作用仍可能重复，稳定子调用关联不等于恢复任意 async 栈或通用 exactly-once。
