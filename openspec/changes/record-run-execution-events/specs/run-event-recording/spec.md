# Run execution event recording

## Purpose

定义共用图执行路径如何自动保存 Run、节点及 wave 的完整事实，使日志真实反映已发生的调用、结果和提交边界。该能力覆盖父子运行的身份关联、每 Run 序号及编码或存储失败后的停止行为，为之后的执行恢复提供历史基础。

## ADDED Requirements

### Requirement: Recording is explicitly attached to the invocation context

调用方 SHALL 能通过 RunContext 的公开入口注入 EventLog；资源替换和子调用 SHALL 保留日志配置，父子 Run 仍各自拥有身份和序号。未注入日志 SHALL 不执行事件编码或追加。普通节点 SHALL 无需直接调用 EventLog，所有调度后端共享相同记录边界。

#### Scenario: A nested graph shares the store

- **WHEN** 根调用启用日志，普通 Graph 节点经资源投影启动子 Run
- **THEN** 同一日志内可读取父子历史，子 RunStarted 关联父 run_id 和实际父 NodeAttempt，子 seq 从 1 开始

### Requirement: Each logical run serializes sequence allocation and append

执行内核 SHALL 在逻辑 Run 首次执行时建立编号状态，按取号、构造、追加成功、推进 last_seq 的顺序串行写入。seq SHALL 从 1 开始，属于 Run 而非日志；同一 Run 并发节点不得使追加顺序和 seq 顺序分离。不同独立 Run SHALL 不共享序号或失败状态。

#### Scenario: Concurrent completions have ordered facts

- **WHEN** 两节点并发完成且存储追加会异步等待
- **THEN** 该 Run 历史 seq 连续且按序保存，节点完成先后不改变固定 wave 的结算顺序

### Requirement: Startup facts precede startup work

首次 poll 后运行时 SHALL 编码输入并追加 RunStarted，成功后校验和初始化；初始化成功 SHALL 追加 RunInitialized 后才调度。输入校验或初始化业务失败 SHALL 在日志可用时记录 RunFailed，并按既有启动错误返回。没有被 poll 的调用 SHALL 不产生事件。

#### Scenario: Initialization is gated by the first append

- **WHEN** RunStarted 编码或追加失败
- **THEN** 初始化和节点均不执行，调用返回 EventLogError，不补写业务终态

#### Scenario: Initialization succeeds before state encoding fails

- **WHEN** 初始 State 编码失败
- **THEN** 历史仅保留成功写入的前缀，没有节点开始或伪造的 RunFailed

### Requirement: A node starts only after its start fact is stored

节点 task 取得并发名额并首次 poll 时 SHALL 捕获开始时间、追加 NodeStarted，成功后才做资源投影和调用执行体。开始失败 SHALL 阻止该调用。重激活 SHALL 保留 NodeKey 并增加 attempt，排队成员 SHALL 不提前产生开始事实。

#### Scenario: Start append failure prevents side effects

- **WHEN** 某节点的 NodeStarted 追加失败
- **THEN** 该节点的资源投影和业务执行计数均为零，后续未准入成员不执行

### Requirement: Node results preserve complete serializable outcomes

成功返回时 SHALL 先捕获 ts，再序列化并追加包含输出、原始 Delta、Directive 和完整 payload 的 NodeCompleted，成功后交给 wave 结算。业务错误 SHALL 记录 NodeFailed，继续收齐固定 wave；任务 panic SHALL 在现有回收边界归属到实际节点并只记录一次失败。结束 ts SHALL 不包含结束编码和追加耗时。

#### Scenario: Optional values and delivery payloads survive recording

- **WHEN** 节点返回单位输出、含显式 None 的 Delta 以及带实例 key 和 payload 的 Deliver
- **THEN** 存储字节保留这些值及其存在性，能够通过对应 Serde 数据表示验证，不能用空内容或调试文本替代

#### Scenario: A panic does not create duplicate failures

- **WHEN** 一个已开始 task panic，被原有任务边界转换为执行错误
- **THEN** 仅有一条对应 NodeFailed，其他本波普通成员继续收齐

### Requirement: Skip wave and terminal publication follow stored facts

Sweep SHALL 先写 NodeSkipped 再提交跳过。完整波次 SHALL 在结果记录完成并按原序归并、校验后写 WaveSettled，成功后才路由或开始下一波。WaveSettled SHALL 仅有 wave 编号。Run SHALL 在交付业务终态前写 RunCompleted 或 RunFailed；异常未完成波次不得伪造完整提交标记。

#### Scenario: Commit append failure blocks downstream work

- **WHEN** 所有节点结果已保存，但 WaveSettled 追加失败
- **THEN** 不执行本批路由、下游或新子 Run，不交付已提交 Run，也不补写业务 RunFailed

#### Scenario: A completed return is reactivated

- **WHEN** 已记录完成的节点被合法 Transition 重激活
- **THEN** 后续调用使用新 attempt，旧事实保留；最终输出与 wave 规则仍按现有执行语义判断

### Requirement: Recording failures remain operational errors

编码／追加失败 SHALL 返回 core::Error::EventLog 并保留来源，不转成普通节点、初始化或调度错误。该调用树 SHALL 停止新任务、子调用和路由，收齐已开始任务；不自动重试、不向失败记录路径补写 RunFailed。独立根 Run SHALL 不因共享同一日志配置而被错误标为失败。

#### Scenario: A child log failure reaches the root

- **WHEN** 子 Run 的日志追加失败，默认 Graph 节点传播错误
- **THEN** 根调用收到记录错误，父层不把它当作普通 NodeFailed 后继续调度，不伪造父层业务终态

### Requirement: Cancellation preserves only committed history

Drop 取消 SHALL 保留已成功追加的前缀，不要求写入取消、暂停或终态事件。已完成的外部副作用 SHALL 不获得回滚或恰好一次保证。事件内容 SHALL 不复制到 tracing／Collector，不新增观测管线或指标；本次 SHALL 不新增恢复入口。

#### Scenario: Cancellation while an append waits

- **WHEN** 已开始的执行在追加等待期间被取消
- **THEN** 历史只包含存储实际完成的事实，没有推测性的 WaveSettled、RunCompleted 或 RunFailed
