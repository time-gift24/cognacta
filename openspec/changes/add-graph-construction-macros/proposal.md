# 图构建与输入组装宏

## Why

当前 Graph 已通过普通 NodeInstance 纳入静态边、Transition 和 Deliver 调度，但调用方仍需重复书写 NodeId、Node::new、Edge、HashMap、Input、Arc 和 SharedValue。样板代码掩盖业务流程，并增加节点 ID 重复和输入 Arc 二次包装的风险。

## What Changes

- 在现有 cognacta-derive 增加函数式 `graph!` 与 `graph_input!` proc macro，并由 cognacta-core 根导出。
- `graph!` 生成现有 Graph builder 调用，支持资源类型、异步初始化、显式/自动入口、条件边和普通 Node 的全部链式配置。
- `graph_input!` 生成 GraphInput，支持普通业务值、已有 Arc、多值及空 Input。
- 宏只生成构造代码；Graph 仍直接作为普通 NodeInstance，由静态边、Transition 或 Deliver 调度，不增加 call_graph、子图调用入口或第二套运行语义。
- 增加公开 API、宏展开行为、编译诊断及真实嵌套执行验收。

## Capabilities

### Modified Capabilities

- `graph-kernel-execution`：根导出增加构造宏及编译期输入契约；现有构图校验、调度和错误分类不变。

## Impact

- `cognacta-derive`：新增 syn 解析与 quote/proc-macro2 展开，无新依赖。
- `cognacta-core`：根宏导出、文档示例和公开执行测试。
- 不修改 State derive、Scheduler、Execution、Run、数据库、CLI 或遥测行为。
