## Why

当前 `Scheduler<T, O, R>` 只描述结果调用，真正调度固定在本地执行器内；业务节点需要保存调度器并手写 `call` 才能进入子图。这使“Graph 也是 NodeInstance”的组合关系没有落实，增加嵌套层数时仍要补调用适配代码。

本变更将 Graph、Node、Run 与具体调度实现分开，让父子共用一种 Run、同一调度器及状态机。prodagent 的同一 `Scheduler.drive` 递归驱动路径作为参考，不引入它的 SubPlanBody、激活器、事件存储或恢复协议。

## What Changes

- **BREAKING**：用实际驱动任务的 `Scheduler::drive` 替代 `Scheduler<T, O, R>::call`。类型化 `run` 为所有调度器共用入口，保留完整 Run 诊断。
- 公开一个通用、对象安全的 `Execution` 操作接口，让调度器控制任务准入、并发、补位及回收；类型化结果、输入组装和队列数据继续私有。它不定义另一种 Run 或状态机。
- **BREAKING**：`NodeInstance::run` 接收本次执行临时传入的 `Arc<dyn Scheduler>`。Graph、Node、Run、RunContext 和 NodeContext 不保存调度器，也不增加调度器类型参数。
- Graph 直接实现 NodeInstance，通过既有 `Node::new(id, graph)` 声明，静态边、Transition 和 Deliver 进入同一路径。每次图节点执行创建独立的普通 Run。
- 用普通 Node 的资源投影支持不同资源类型；用标准库 Arc、Weak、OnceLock 的通用 NodeInstance 转发支持递归绑定，不增加子图专属类型、构造器或注册中心。
- 集中现有 Run/NodeRun 状态转换，保留固定 wave、稳定结算、错误来源、逐 Run 并发预算和现有安全观测。
- 更新所有受影响的调用方、公开示例及测试；以真实替代调度器和三层/五层嵌套验证正交性，不能用只模拟 `call` 的 fake 代替调度验证。

## Capabilities

### New Capabilities

无。子图组合属于既有图内核，不另建子图能力或运行模型。

### Modified Capabilities

- `graph-kernel-execution`：实际调度边界、Graph 作为普通 NodeInstance、统一 Run 状态转换、资源投影、递归绑定、错误及公开 API 契约。

## Impact

- `cognacta-core`：根导出、NodeInstance、Graph/Node、Run/NodeRun、Scheduler/LocalScheduler、输入适配和错误边界；不改 State/derive 的归并契约，不引入新 crate 或依赖。
- 迁移 core 单测、`tests/public_api.rs`、嵌套/递归示例、编译测试、文档示例和 CLI graph-check 的调用签名；CLI 的六类图及输出行为不改变。
- 旧 `Scheduler<T, O, R>` 实现者需要迁移；外部服务调用属于普通 NodeInstance 或业务边界，不能继续冒充 Scheduler。
- 不新增日志、span、指标或遥测依赖；现有生命周期观测移动到共用入口，父子调用保持相同口径。
- 本次只形成 proposal、design、差量 specs 和 tasks。实现任务保持未完成，不修改正式规格、架构规范、产品代码或 prodagent 参考仓库。
