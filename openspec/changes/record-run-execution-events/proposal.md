# 自动记录 Run 与节点事件

## Why

EventLog 基础模块已经能保存和读取事实，但执行内核尚未产生这些事实。将既定写入边界接入共用执行路径，使父子 Run、节点结果和 wave 提交能够留下完整业务历史。

## What Changes

- 通过 RunContext 显式注入 EventLog，根与子 Run 自动写入开始、初始化、节点开始／完成／失败／跳过、wave 提交和业务终态。
- 每个逻辑 Run 串行维护自己的 seq；节点完成时间在序列化之前采集；不新增 WaveStarted、offset、取消／挂起事件。
- **BREAKING**：SharedValue 改为同时满足 Any、Serde、Send、Sync 的共享值，保留类型读取与 Arc 身份；State、Delta、节点输出增加标准 Serialize 约束。使用 erased-serde 适配对象安全，不增加类型登记或 Codec。
- State derive 为 Delta 生成标准 Serialize；使用 postcard 保存完整输入、初始 State、Outcome 和路由 payload，保留嵌套 Option 的意义。
- **BREAKING**：Execution 的 advance、complete 改为对象安全的异步操作，允许真正等待追加；更新本地和外部调度器示例。
- 日志／编码故障停止新任务、子 Run 和路由，返回 EventLogError，不伪造业务 RunFailed；普通节点错误仍收齐固定 wave。
- 本次不实现 replay／resume；已确定的重放契约继续保留。

## Capabilities

### New Capabilities

- `run-event-recording`：执行路径自动产生完整、按 Run 有序的业务事件，包含序列化、父子关联及记录失败边界。

### Modified Capabilities

- `graph-kernel-execution`：可序列化共享值与输出约束、异步驱动协议、统一状态与记录所有权、记录故障的调用错误契约。
- `typed-state-reducers`：State／Delta 的 Serialize 约束及派生 Delta 的标准实现。

## Impact

- 依赖当前工作树已完成的 add-run-event-log，不覆盖该 change 或构造宏改动。
- core 的 input、context、graph、run、event_log、scheduler 及相应公开调用／测试；derive 的 Delta 生成；CLI 示例 State 与输出补 Serialize。
- workspace 增加 erased-serde 与 postcard 依赖；不增加 crate、数据库、遥测或恢复入口。
- 调用方为业务类型补 Serialize，外部 Scheduler 对 advance／complete 增加 await。现有非 Clone 输出、仅 Send 的 Delta 和异构父子 State 继续可用。
