# Spec Delta

## Purpose

提供从 CLI 参数解析、具体节点装配到 Scheduler 驱动及最终结果输出的确定性验证入口。通过几张小型测试图呈现成功、分支、循环和失败行为，使使用者无需配置真实模型、网络服务或数据库即可重复检查框架的执行契约。

## ADDED Requirements

### Requirement: Cluster demos are explicitly feature gated

CLI SHALL 在启用 cognacta-test feature 时提供 `cluster-demo <SCENARIO>` 命令，支持 chain、branch-even、branch-odd、react-loop、node-error、delta-error、input-error 七个案例。默认构建 SHALL 不暴露该命令；已有 chat、帮助与版本行为 SHALL 保持兼容。

#### Scenario: Enabled help lists available scenarios

- **WHEN** 用户运行启用该 feature 的 `cognacta-cli cluster-demo --help`
- **THEN** 帮助展示七个合法场景名称，正常退出 0

#### Scenario: The feature is disabled

- **WHEN** 默认构建接收 cluster-demo 命令
- **THEN** 参数解析失败并退出 2，帮助不列出该命令

#### Scenario: The scenario is invalid

- **WHEN** 用户传入不存在的场景名称或缺少场景
- **THEN** CLI 显示参数错误并退出 2，不创建 Run

### Requirement: Each demo exercises real framework assembly

每个案例 SHALL 从 CLI 的具体装配逻辑创建节点、Cluster、初始 State 与 Input，并调用公开 Scheduler 驱动 Run。摘要 SHALL 根据真实 Run 和 State 生成，不硬编码期望结果或绕过调度手工调用 body。测试专用对象 SHALL 不扩展 core 的业务职责。

#### Scenario: Run a known scenario repeatedly

- **WHEN** 用户以相同命令多次执行同一个案例
- **THEN** 每次都创建新的 Run 并产生相同业务摘要与退出码，不依赖前次执行留下的状态

### Requirement: Demos require no external business services

所有案例 SHALL 使用固定输入、确定性业务节点和内存 State，不读取 Provider 配置、不请求模型或工具网络服务、不连接数据库。测试图 SHALL 由 CLI 中的 Rust 装配代码定义，不要求图文件、DSL 或动态插件。

#### Scenario: No model configuration is available

- **WHEN** 环境没有 Provider 配置、API key 或数据库连接配置
- **THEN** 七个案例仍能完成各自预期的成功或失败路径，观测配置缺失不阻断执行

### Requirement: The chain demonstrates typed input and committed state

chain SHALL 把 String("hello") 交给 count，将 usize(5) 路由给 render。count 的 Delta SHALL 先把共享 length 设为 5，render SHALL 同时读到 Input 5 和 State.length 5，并通过最终 Delta 写入 output="len=5" 后 Finish。

#### Scenario: Run the successful chain

- **WHEN** 用户运行 `cognacta-cli cluster-demo chain`
- **THEN** 顺序为 count、render，stdout 为 `status=completed length=5 output=len=5` 加换行，退出 0

### Requirement: The branch demonstrates exclusive Outcome routing

分支图 SHALL 由 route 根据初始 i64 的奇偶性返回一个 Goto，even 和 odd 目标均注册但只执行选中的一个。branch-even 的固定输入 SHALL 为 2，branch-odd SHALL 为 3；终值由被选节点的 Delta 写入 State。

#### Scenario: An even input selects even

- **WHEN** 用户运行 `cognacta-cli cluster-demo branch-even`
- **THEN** 顺序为 route、even，stdout 为 `status=completed branch=even` 加换行，退出 0

#### Scenario: An odd input selects odd

- **WHEN** 用户运行 `cognacta-cli cluster-demo branch-odd`
- **THEN** 顺序为 route、odd，stdout 为 `status=completed branch=odd` 加换行，退出 0

### Requirement: The loop demonstrates model tool model orchestration

react-loop SHALL 由两个普通确定性节点表达 model → tool → model → Finish。首个 model 请求内存加法 2+3，tool 返回带标记的工具结果 Input，第二个 model 把答案 5 写入 State；调用次数 SHALL 由每次实际节点执行的 Delta 更新，不伪造真实 Generation 或模型用量。

#### Scenario: The second model call sees the tool update

- **WHEN** 用户运行 `cognacta-cli cluster-demo react-loop`
- **THEN** 第二次 model 调用看到 model_calls=1、tool_calls=1 和工具结果 5，最终 stdout 为 `status=completed model_calls=2 tool_calls=1 answer=5` 加换行，退出 0

### Requirement: A node error retains prior state and fails the command

node-error SHALL 先通过 seed 的成功 Delta 把 State.value 从 0 变为 1，再调用返回错误的 fail 节点。CLI SHALL 保留失败 Run 的可读状态，并传播真实执行错误。

#### Scenario: Run the node failure graph

- **WHEN** 用户运行 `cognacta-cli cluster-demo node-error`
- **THEN** stdout 为 `status=failed node=fail value=1` 加换行，stderr 包含受控分类 NodeExecution，退出 1

### Requirement: A rejected Delta prevents the next node

delta-error SHALL 先通过 seed 把 State.value 置为 1，再调用 reject 返回非法 Delta 与 Goto(sentinel)。业务 State SHALL 在拒绝时保持 value=1，sentinel SHALL 不执行。

#### Scenario: Run the Delta failure graph

- **WHEN** 用户运行 `cognacta-cli cluster-demo delta-error`
- **THEN** stdout 为 `status=failed node=reject value=1` 加换行，stderr 包含 StateDeltaRejected，退出 1，sentinel 没有业务副作用

### Requirement: A type mismatch prevents the target body

input-error SHALL 让 seed 成功应用 value=1 后向期待 usize 的 typed_target 发送 String。框架 SHALL 在执行目标 body 前拒绝该输入，不把它包装成 body 执行失败，也不回滚 seed 的增量。

#### Scenario: Run the input failure graph

- **WHEN** 用户运行 `cognacta-cli cluster-demo input-error`
- **THEN** stdout 为 `status=failed node=typed_target value=1` 加换行，stderr 包含 InputTypeMismatch，退出 1，目标 body 不被调用

### Requirement: Summaries and diagnostics preserve process semantics

正常 I/O 下，CLI SHALL 在驱动返回后输出恰好一行业务摘要，再将运行错误交给统一退出路径；成功退出 0、运行或输出失败退出 1、参数错误退出 2。预期失败案例 SHALL 不吞掉错误。调度错误诊断 SHALL 只输出安全分类和节点上下文，不输出原始业务错误内容或 source 链。

#### Scenario: A failure is intentional for a demo

- **WHEN** 运行 node-error、delta-error 或 input-error
- **THEN** 即使这是案例的预期结果，进程仍退出 1，stdout 的失败摘要与 stderr 的安全诊断相互独立

#### Scenario: Output cannot be written

- **WHEN** 业务摘要或诊断输出遇到 I/O 错误
- **THEN** 进程返回失败，不声称摘要已成功交付，也不重新执行图

### Requirement: Demo observation reuses the host lifecycle

测试图 SHALL 复用 CLI 已有 Collector 初始化与关闭流程，不自行创建第二套观测后端。观测开关、导出失败或输出背压 SHALL 不改变上述业务 stdout 和退出码；固定业务摘要 SHALL 不被当作遥测事件解析。

#### Scenario: Telemetry fails while a demo runs

- **WHEN** 同一案例分别在未配置遥测、正常遥测和不可用遥测端点下运行
- **THEN** 业务摘要与退出码一致，Collector 仍按既有总时间预算关闭，不发生节点重试
