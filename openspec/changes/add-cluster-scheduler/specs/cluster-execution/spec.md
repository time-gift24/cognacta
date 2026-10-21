# Spec Delta

## Purpose

为 Cognacta 提供可复用的节点执行定义与单次运行实例，让业务节点保留具体输入类型，并通过统一的状态增量结算和动态路由完成多步流程。调用方能够观察运行状态、取得完整错误，并明确区分一次 Generation 完成与整次 Run 完成。

## ADDED Requirements

### Requirement: Public execution vocabulary uses Cluster

系统 SHALL 通过 core 的公开 API 提供 Cluster、节点、状态、Outcome、Run 和 Scheduler 契约。可复用的节点集合 SHALL 命名为 Cluster，不提供 Plan 兼容别名；运行时 SHALL 不依赖模型或工具的业务含义。

#### Scenario: A caller assembles a generic flow

- **WHEN** 调用方使用 core 根导出的类型注册普通业务节点并创建 Run
- **THEN** 调用方可以仅通过公开 API 完成构造、执行和结果读取，无需访问内部类型擦除或调度模块

### Requirement: Node registration rejects invalid or duplicate identities

节点构造 SHALL 拒绝空白名称、首尾空白或控制字符。Cluster 注册 SHALL 拒绝重复标识并保留原节点；节点标识在构造后 SHALL 不提供可绕过校验的公开修改入口。

#### Scenario: A duplicate is registered

- **WHEN** 同一 Cluster 已有名为 count 的节点，又注册第二个 count
- **THEN** 注册返回 DuplicateNode 错误，原节点仍可被执行

#### Scenario: A name is invalid

- **WHEN** 调用方用空名称、带首尾空白或换行的名称构造节点
- **THEN** 构造返回 InvalidRequest 错误，不产生可注册的节点

### Requirement: Shared State and call Input have independent types

同一 Cluster SHALL 使用一种共享 State 类型及其关联 Delta 类型；不同节点 SHALL 可声明不同的 Input 和 Payload 类型。节点 SHALL 同时获得拥有所有权的 Input 和共享 State 的只读访问，业务状态变更 SHALL 通过返回 Delta 表达。

#### Scenario: Different input types are connected

- **WHEN** 一个节点接收 String 并向另一个接收 usize 的节点发送 usize 载荷
- **THEN** 两个节点可以注册到同一 Cluster，节点作者按具体类型访问数据，State 和 Delta 保持原有业务类型

#### Scenario: One body has one outgoing payload type

- **WHEN** 同一种节点实现选择多个不同目标
- **THEN** 它的各个 Goto 使用同一种已声明 Payload 类型；框架不自动把枚举载荷解包为目标要求的变体内部类型

### Requirement: A Run is constructed against one borrowed Cluster

Cluster 的构造 Run 入口 SHALL 接收初始 State、入口节点和 Input，校验入口存在后创建 Ready 的 Run，不执行节点。Run SHALL 借用这份 Cluster，独立拥有 State；驱动时 SHALL 不再接受另一份 Cluster。借用存续期间 SHALL 不允许通过可变注册接口改变该 Cluster。

#### Scenario: Constructing a run does not execute its entry

- **WHEN** 调用方为有效入口创建 Run
- **THEN** Run 为 Ready，状态保持传入值，入口 body 尚未调用

#### Scenario: The entry does not exist

- **WHEN** 初始入口不在 Cluster 中
- **THEN** 构造直接返回 UnknownNode 错误，不创建 Run

#### Scenario: The initial input has an incompatible type

- **WHEN** 有效入口要求 usize，但构造时传入 String
- **THEN** Run 可以创建；首次驱动在进入该 body 前返回 InputTypeMismatch，Run 变为该入口的 Failed

#### Scenario: The same definition serves two runs

- **WHEN** 同一 Cluster 创建两个带不同初始 State 的 Run
- **THEN** 两个 Run 分别拥有其 State 和执行阶段，一次 Run 的 Delta 不直接修改另一次 Run 的 State

### Requirement: Beginning a step transfers input exactly once

只有 Ready 的 Run SHALL 能开始下一次调用。开始后 SHALL 进入记录相同节点标识的 Running，并把 Input 所有权交给本次调用，不要求 Input 可克隆。非 Ready 的驱动 SHALL 返回 RunNotReady，保留原有阶段和 State。

#### Scenario: A non-cloneable input is delivered

- **WHEN** Ready 携带一个不实现 Clone 的输入并开始调用
- **THEN** 运行进入 Running，原输入完整交给节点，不复制或重复交付

#### Scenario: A terminal or in-progress run is driven again

- **WHEN** 对 Completed、Failed 或遗留 Running 的 Run 再次驱动
- **THEN** 返回 RunNotReady，不重新执行节点，不覆盖既有失败位置，也不重放上一次 Error

### Requirement: A completed step applies Delta before routing

Scheduler SHALL 串行等待当前节点成功返回，结束只读 State 借用后应用可选 Delta，再处理 Goto 或 Finish。没有 Delta SHALL 不调用增量应用；单个节点返回成功或一次 Generation 完成 SHALL 不自动结束整次 Run。

#### Scenario: A downstream node observes updated state

- **WHEN** count 返回设置 length 为 5 的 Delta 和发送 usize(5) 给 render 的 Goto
- **THEN** render 同时读到 Input 5 和 State.length 5

#### Scenario: Finish carries a final update

- **WHEN** 节点返回最终答案 Delta 和 Finish
- **THEN** Delta 成功应用后 Run 才进入 Completed，调用方可以从 State 读出最终答案

#### Scenario: There is no state update

- **WHEN** 节点返回 None 增量和合法路由
- **THEN** State 不调用增量应用逻辑，Scheduler 正常处理路由

### Requirement: Goto schedules one next call and Finish terminates

Goto SHALL 指定一个目标节点及其 Input，驱动 SHALL 在同一次调用内继续执行该目标。Finish SHALL 将 Run 置为 Completed 并成功返回，不携带独立终值；本版结果从 State 读取。图中的分支与循环 SHALL 由节点返回的 Outcome 表达。

#### Scenario: A model-tool loop completes

- **WHEN** model 首次返回 Goto(tool)，tool 返回 Goto(model)，model 第二次返回 Finish
- **THEN** 实际调用顺序为 model、tool、model，前两次节点成功不会使 Run 提前完成

#### Scenario: A branch selects only one target

- **WHEN** route 根据输入返回 Goto(even)
- **THEN** 只执行 even，不执行注册在同一 Cluster 的 odd

### Requirement: Delta rejection stops execution without partial application

State 的 Delta 应用 SHALL 同步执行内存业务变更，成功时完整应用，返回错误时保持应用前 State。增量被拒绝 SHALL 使当前 Run 失败，对应 Outcome 的 Goto/Finish SHALL 不执行；此前成功应用的增量 SHALL 保留。

#### Scenario: Rejection blocks a downstream node

- **WHEN** State.value 已为 1，当前节点返回被拒绝的 Delta 和 Goto(sentinel)
- **THEN** Run 为当前节点的 Failed，value 仍为 1，sentinel 不被调用，驱动返回 StateDeltaRejected

#### Scenario: Rejection blocks successful completion

- **WHEN** 当前节点返回被拒绝的 Delta 和 Finish
- **THEN** Run 为 Failed，驱动返回错误，不返回成功

### Requirement: Execution errors retain their category and source

运行失败 SHALL 先记录 Failed 及失败节点位置，再从驱动返回 core 的统一 Error。未知节点、输入类型不匹配、body 执行失败、Delta 应用失败 SHALL 分别分类；body 和 Delta 错误 SHALL 保留完整原始 source。Run SHALL 不保存完整 Error 或其克隆。

#### Scenario: A body returns an external-service error

- **WHEN** body 返回一个带原始外部错误 source 的 core Error
- **THEN** 驱动返回 NodeExecution，包含节点上下文且 source 可追溯到原错误；Run 为该节点的 Failed

#### Scenario: The next target is absent

- **WHEN** A 的 Delta 已成功应用，随后 Goto 的目标 missing 不存在
- **THEN** 驱动返回 UnknownNode 并记录 missing 为失败位置，保留 A 的增量

#### Scenario: The next input is incompatible

- **WHEN** A 成功应用 Delta 后向要求 usize 的 B 发送 String
- **THEN** B 的 body 不进入执行，Run 为 Failed(B)，驱动返回 InputTypeMismatch，并保留 A 的增量

### Requirement: Run exposes read-only execution results

Run SHALL 公开 State 只读访问、Ready/Running/Completed/Failed 状态，以及 Ready/Running/Failed 对应节点标识；Completed 的节点标识 SHALL 为 None。公开 API SHALL 不允许外部直接改变运行阶段、待执行 Input 或通过 Run 获得可变 State 引用。

#### Scenario: A failed caller examines retained data

- **WHEN** 驱动返回错误且调用方仍持有 Run
- **THEN** 调用方可以读出 Failed、失败位置和保留的 State，详细原因从返回的 Error 取得

### Requirement: Minimal observation explains run and step boundaries

运行观察 SHALL 提供 INFO 的 Run span 和 DEBUG 的节点步骤 span。Run 开始/完成日志 SHALL 为 INFO，步骤开始/完成 SHALL 为 DEBUG，执行失败 SHALL 为 WARN。步骤观察 SHALL 包含查找、输入适配、body 执行及 Delta 结算；Failed 节点标识 SHALL 表示调用尝试位置，不暗示 body 已开始。

#### Scenario: A Delta failure is correlated with its run

- **WHEN** body 成功返回但 Delta 应用失败
- **THEN** 同一 Run 下可关联该步骤的开始、StateDeltaRejected 失败与 Run 失败，不把该步骤记录为成功

#### Scenario: Input is rejected before the body

- **WHEN** 调用尝试因 Input 类型不匹配失败
- **THEN** 观察显示该步骤的输入适配失败，不声称 body 已执行

### Requirement: Local cancellation is observable without new recovery semantics

已开始执行的驱动 future 被正常丢弃时，每个已开始且未结算的 Run 和活跃步骤 SHALL 各产生一次 DEBUG 本地取消事件，不改变 Run 阶段、不返回伪造 Error，也不承诺上游停止或运行可恢复。尚未轮询的 future SHALL 不记录开始或取消；已完成或失败 SHALL 不再结算取消，panic SHALL 不被误记为正常取消。

#### Scenario: An active call is dropped

- **WHEN** 节点异步调用挂起时调用方丢弃驱动 future
- **THEN** Run 保留 Running，观察结束当前步骤与 Run 的本地取消，后续驱动返回 RunNotReady

#### Scenario: A completed future is dropped

- **WHEN** 驱动已完成或已返回错误，调用方释放 future
- **THEN** 不新增取消事件，不覆盖既有 Completed 或 Failed

#### Scenario: An unpolled future is dropped

- **WHEN** 创建驱动 future 后立即丢弃且从未轮询
- **THEN** Run 保持 Ready，不产生运行开始、步骤开始或取消日志

### Requirement: Observation uses only bounded safe fields

调度遥测 SHALL 只记录常量事件名、安全节点标识、运行阶段、步骤阶段和受控错误分类；节点标识 SHALL 编码控制字符且最终不超过 256 UTF-8 字节。遥测 SHALL 排除 State、Input、Payload、Delta、提示词、回复、错误正文及完整 source 链，本版 SHALL 不增加 Scheduler 指标。

#### Scenario: Business content contains secret markers

- **WHEN** 输入、状态、增量和源错误分别包含可识别的秘密标记
- **THEN** 本地和远程遥测均不包含这些内容，调用方收到的 Error 仍保留 source

#### Scenario: A dynamic target contains unsafe text

- **WHEN** 动态目标标识包含控制字符或超过字段容量
- **THEN** 遥测字段被安全编码并限制在最终容量内，不改变实际节点查找和错误分类

### Requirement: Observation never changes execution outcomes

core SHALL 复用宿主已有观测配置，不初始化 Subscriber 或 exporter。未初始化、遥测导出失败、输出背压和关闭超时 SHALL 不改变节点顺序、State、错误、stdout 或退出码；执行路径 SHALL 不等待遥测容量或为日志创建独立异步任务。

#### Scenario: A flow runs with a failing telemetry backend

- **WHEN** 同一确定性流程分别在无初始化、正常遥测、遥测故障与输出背压条件下运行
- **THEN** 可观察的业务结果及退出码相同，遥测可以被丢弃，不触发节点重试
