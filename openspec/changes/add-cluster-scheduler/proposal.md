# Proposal

## Why

Cognacta 已有单次 Generation 的模型接口，但缺少把节点执行、共享状态结算和下一跳路由组合起来的通用运行时。需要将本次讨论的最小 Scheduler 落成清晰的公共接口，并通过 CLI 装配的确定性测试图验证完整运行路径。

## What Changes

- 统一采用 `Cluster` 表示可复用的节点集合与执行定义；此前讨论中的 `Plan` 不作为新 API 名称或兼容别名。
- 在现有 core 增加 `State`、`NodeInstance`、`Node`、`Outcome`、`Control`、`Cluster`、`Run`、`Scheduler` 等公开契约。异步 trait 及实现统一使用 `async_trait`，节点 Input/Payload 保持具体类型，类型擦除限于框架内部。
- `Run` 借用一份 Cluster，拥有独立 State 与执行阶段；由 Cluster 的具名构造入口接收初始节点和 Input。只支持 `Goto` / `Finish` 路由。
- Scheduler 串行执行节点，成功后应用 `S::Delta`，再处理路由；执行失败先标记 Run，再返回完整 Error。Delta 被拒绝必须保持应用前 State，不回滚此前成功步骤。
- 完整定义根导出、构造与读取入口、统一 core Error 的分类、节点上下文及 source 保留规则，不新增第二套公共错误体系。
- CLI 在已有 `cognacta-test` feature 下增加 `cluster-demo`：六张 Rust 装配图、七个运行案例，覆盖异构链、两种分支、模型—工具循环、节点失败、Delta 失败及 Input 类型失败。
- 按用户已确认的最小观测方案增加 Run/节点 span 和安全的开始、完成、失败、取消日志；本版不新增 Scheduler 指标。复用现有 Collector，不改变 Generation 指标或业务结果。

## Capabilities

### New Capabilities

- `cluster-execution`: 类型化节点注册、Cluster/Run 生命周期、Outcome 路由、Delta 结算、统一错误及最小观测。
- `cluster-demo-cli`: CLI 装配确定性测试图，稳定摘要、失败退出码与可重复验收。

### Modified Capabilities

无。当前 `openspec/specs/` 没有已发布规格；既有模型、流式聊天和 Collector 的业务契约保持兼容。

## Impact

- 后续实现限于现有 `cognacta-core` 和 `cognacta-cli` 的实际职责：core 承载通用运行时，CLI 承载 clap 参数、示例节点、图装配与输出；不新增 crate 或图配置语言。
- 复用 workspace 的 `async-trait`、`bon`、`thiserror`、`tracing`、`clap`、Tokio。CLI 的 `async-trait` 需增加为受 `cognacta-test` 门控的正常依赖，所有版本仍由 workspace 管理。
- 扩充既有 core ErrorKind 和安全分类映射；CLI 将目前仅称为 Generation 的 core 错误包装调整为通用 Core 包装，保留来源与原退出码规则。
- 不引入 Send/fan-out/join、静态条件边、重试、恢复、持久化、真实工具接入或自动模型请求。本轮只生成 OpenSpec 设计文件，不实施 Rust 代码，不修改 AGENTS.md、CONTEXT.md 或历史讨论记录。
- 2026-10-17 的用户确认覆盖 `Cluster` 命名、Run 借用定义、Error 返回、主循环与 begin_step 语义；测试边界由本次 CLI 测试图要求具体化，详细场景见设计与规格。
