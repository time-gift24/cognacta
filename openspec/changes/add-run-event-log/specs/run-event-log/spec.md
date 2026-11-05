# Run event log specification delta

## Purpose

定义可独立使用的 Run 业务事件模型和追加读取边界，使调用方能够按运行身份保存、读取和共享历史事实。首版以内存存储交付该能力，并为后续节点记录及基于 Delta 的执行恢复保留明确的数据契约，不将普通遥测当作业务历史。

## ADDED Requirements

### Requirement: Event log APIs are reachable from the crate root

cognacta-core SHALL 从根公开导出 Event、EventBuilder、event_builder、EventData、NodeAttempt、FailureKind、EventLog、InMemoryEventLog 和 EventLogError。调用方 SHALL 能仅使用根导出构造事件、实现日志边界、追加及读取历史；内部存储和可变执行状态不公开。

#### Scenario: A downstream caller stores and reads an event

- **WHEN** 外部调用方仅导入 cognacta_core 根公开名称，创建内存日志并通过 Event builder 构造事件
- **THEN** 能追加事件并通过按 Run、游标和全部历史三种方式读取，无需访问私有模块或启用 CLI dev

### Requirement: Event identity and time belong to the caller

Event SHALL 保存非零 seq、run_id、可选 parent_run_id、真实时间 ts 及 EventData，字段仅通过构造和只读入口访问。事件身份 SHALL 是 `(run_id, seq)`；日志 SHALL 保留调用方提供的完整内容，不分配序号、独立事件 ID 或时钟偏移。调用方 SHALL 保证同一 Run 序号从 1 开始、按追加顺序递增且唯一。

#### Scenario: Parent and child use independent sequences

- **WHEN** 父 Run 和子 Run 各自追加 seq=1 的事件，子事件填写父 run_id
- **THEN** 两条事件身份不同，各自原始编号、时间和父关联保持不变

### Requirement: Event data represents node outcomes and wave commit markers

EventData SHALL 支持 RunStarted、RunInitialized、NodeStarted、NodeCompleted、NodeFailed、NodeSkipped、WaveSettled、RunCompleted、RunFailed。节点调用 SHALL 以 NodeKey 和非零 attempt 关联；节点执行事件保存 wave 编号。WaveSettled SHALL 仅携带 wave 编号，不保存 State、失败列表或 ready 集合；事件集合不提供 wave 开始事件。kind SHALL 从数据变体推导固定 snake_case 名称。

#### Scenario: A wave commit has no state snapshot

- **WHEN** 调用方构造 WaveSettled 数据
- **THEN** 只需 wave 编号，事件 kind 为 wave_settled；没有 state_after、failures 或 ready 字段

#### Scenario: Node completion is distinct from wave commitment

- **WHEN** 日志中存在某 wave 的 NodeCompleted，但没有对应 WaveSettled
- **THEN** 读取保留这个历史前缀，不自动补写提交标记、修改数据或进行 State 归并

### Requirement: Standard serialization preserves event envelopes and opaque payloads

事件封套、事件数据、尝试身份及必要的节点标识 SHALL 提供标准 Serde Serialize／Deserialize 实现。输入、初始化 State 和完整 Outcome SHALL 以字节保存，日志不解释或重写这些业务字节，也不要求自定义 Codec。封套反序列化 SHALL 保留非零序号和 attempt 的类型约束。

#### Scenario: An encoded outcome survives a round trip

- **WHEN** 包含实例 NodeKey、attempt、父运行身份和任意 outcome 字节的 Event 经标准 Serde 格式往返
- **THEN** 所有公开字段及 kind 保持一致，outcome 字节逐字节相同

#### Scenario: Zero is not a valid sequence or attempt

- **WHEN** 外部编码尝试将 Event seq 或 NodeAttempt attempt 解码为 0
- **THEN** Serde 解码返回所用格式的错误，不能产生违反非零类型约束的对象

### Requirement: Append stores complete events without executing them

EventLog SHALL 提供可跨线程等待的异步 append，接收完整 Event 并返回 Result<(), core::Error>。成功追加 SHALL 使完整事件可读；日志 SHALL 不执行节点、推导终态、检查 Graph 规则、分配编号或自动重试。内存追加 SHALL 是完整操作，读取不能看到半条事件。

#### Scenario: A custom log reports an append failure

- **WHEN** 外部日志实现无法保存事件
- **THEN** 能以 core::Error::EventLog 的 Append 分类返回真实错误来源；调用方不能把失败的返回值当作成功提交

### Requirement: Run history supports an exclusive sequence cursor

events(run_id, after_seq) SHALL 返回该 Run 中 seq 大于游标的记录，按 seq 升序排列；游标 0 表示全部历史。未知 Run 或无更大序号 SHALL 返回空集合。读取 SHALL 返回只读 Arc<Event> 集合而不移除或修改历史。

#### Scenario: A reader advances its cursor

- **WHEN** Run 有 seq=1、2、3 的记录，调用 events(run_id, 2)
- **THEN** 只返回 seq=3；使用 3 或更大游标返回空集合，使用 0 返回全部三条

### Requirement: Global reads retain independent run ordering

all_events SHALL 返回同一日志实例中全部 Run 的历史，保证每个 Run 内有序，不承诺不同 Run 的全局顺序。不同 Run SHALL 能并发共享同一日志实例，不混淆相同 seq；同一 Run 的写入串行化由调用方负责。

#### Scenario: Two runs share one store

- **WHEN** 两个 Run 并发追加各自的连续序号
- **THEN** 全部读取包含两者完整历史，各 Run 子序列保持顺序，按 Run 读取不泄露另一 Run 的事件

### Requirement: Memory history exposes stable read snapshots

InMemoryEventLog SHALL 提供 new 构造入口，初始历史为空。读取返回调用时可见事件的集合快照，并共享已有事件的 Arc；后续追加 SHALL 不改变已返回集合。内存日志 SHALL 不提供跨进程持久化，日志释放后已有读取句柄仍可持有事件。

#### Scenario: Appending does not mutate a prior read

- **WHEN** 调用方读取一条事件后再追加第二条，并重新读取
- **THEN** 先前集合仍只有一条，新集合有两条；两次读取的第一条共享同一 Event

### Requirement: Log errors preserve categories and sources

自有日志可失败入口 SHALL 返回 core::Error，EventLogError SHALL 使用 thiserror 定义 Append、Read、Encode、Decode 并保留真实 source。实现外部 Serde trait SHALL 遵守其错误契约；在实际业务格式调用边界才映射 Encode／Decode。错误 Display SHALL 不展开业务内容或完整来源链。

#### Scenario: A source remains available without being printed

- **WHEN** 自定义日志返回带敏感标记来源的 Read 错误
- **THEN** 调用方能按分类匹配并经 source 检查原错误，公共 Display 不包含来源中的敏感标记

### Requirement: Storage does not change graph execution or telemetry

创建、追加或读取内存 EventLog SHALL 不启动 Graph、初始化业务 State、执行恢复或隐式配置 tracing。现有图执行入口 SHALL 保持原行为；本能力不自动为 Run 写入事件、不新增日志、span 或指标，也不将事件业务内容转发给 Collector。

#### Scenario: The store works without a scheduler or collector

- **WHEN** 调用方在未构造 Scheduler 且未初始化遥测的情况下使用 EventLog
- **THEN** 可以正常追加和读取历史，不产生业务执行或外部导出行为
