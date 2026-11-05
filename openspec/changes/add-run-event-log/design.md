# EventLog 基础模块与执行接入设计

> 历史阶段设计，由 [EventLog 事实协议与递归恢复设计](../../../docs/design/event-log.md) 及其 [公开接口附录](../../../docs/design/event-log-api.md) 取代，修订日期为 2026-11-05。新文档已明确事件载荷、共享 apply、wave 提交边界和递归恢复流程。下文保留本 change 的原始交付依据；对应 proposal、specs 和 tasks 的完成状态不代表新设计已经实现。

## Context

当前 core 已有固定 wave 调度、NodeRun 状态、State::merge_batch 和父子 Run，但尚无业务事件存储。动机与本次交付范围见 proposal.md。

Input 和 Directive payload 使用 Arc<dyn Any>；Execution 的 advance／complete 仍为同步方法，Graph 节点默认创建新的子身份。这三个接缝决定运行时记录与 resume 不能仅靠新增日志 trait 自动完成。用户先前讨论的完整协议保留在本文和 docs/design/event-log.md，本 change 先实现独立可用的存储边界。

## Goals / Non-Goals

**Goals:**

- 事件可通过 core 根公开 API 构造、读取和标准 Serde 往返。
- 一个日志实例保存多个 Run 的不可变历史，序号和业务解释仍属于调用侧。
- 明确只有 wave 提交标记的事件形状，并记录如何以初始 State 加 Delta 重放。

**Non-Goals:**

- 本 change 不修改 Scheduler／Execution／Run 的运行路径，不交付 replay／resume 入口或节点自动记录。
- 不增加持久化数据库、额外 crate、类型注册器、自定义 Codec、逐波 State 快照或新遥测。
- 不改变既有 NodeInstance、State、Delta 的泛型约束，也不修改构造宏。

## Decisions

### 1. 模块位置、使用方与所有权

在 cognacta-core 内新增私有 event_log 模块，通过 crate 根导出公共契约。它属于后续多个执行后端和宿主共同使用的业务存储边界，无须单独建 crate。core 不引入 SQL、HTTP、Collector 或导出器依赖。

宿主构造 InMemoryEventLog，调用侧持有并共享实例。后续逻辑 Run 负责 seq，节点包装层采集事实与 ts，Graph／Node 类型适配层通过 Serde 编解码，恢复器解释历史。存储只追加和读取，普通业务节点不直接调用日志。

### 2. 公开类型和完整接口

#### 2.1 根导出

新增公开名称为：

```text
Event, EventBuilder, event_builder,
EventData, NodeAttempt, FailureKind,
EventLog, InMemoryEventLog, EventLogError
```

继续使用已有的 `Error`、`NodeKey`、`GraphInput`、`Outcome` 等类型。`EventBuilder` 和 `event_builder` 为 bon 构造入口所需的生成类型和状态模块。内部存储、写入同步和类型擦除适配保持私有。

#### 2.2 Event

```rust
pub struct Event {
    seq: NonZeroU64,
    run_id: String,
    parent_run_id: Option<String>,
    ts: SystemTime,
    data: EventData,
}
```

通过 `Event::builder()` 构造，提供 `seq`、`run_id`、`ts`、`data`，可选 `parent_run_id`，以 `.build() -> Event` 结束。字段不提供修改入口。

```rust
impl Event {
    pub fn builder() -> EventBuilder<event_builder::Empty>;
    pub fn seq(&self) -> NonZeroU64;
    pub fn run_id(&self) -> &str;
    pub fn parent_run_id(&self) -> Option<&str>;
    pub fn ts(&self) -> SystemTime;
    pub fn data(&self) -> &EventData;
    pub fn kind(&self) -> &'static str;
}
```

`NonZeroU64` 表达序号从 1 开始。相邻记录的序号关系由 Run 的记录入口保证，builder 不查询日志。Run ID 沿用现有 `String`，不增加 ID 包装类型或新格式约束。

`kind()` 从 `EventData` 推导为固定的 snake_case 名称，例如 `node_completed`。内部业务判断匹配枚举，不匹配字符串；不再维护第二份 `EventKind` 枚举。

#### 2.3 NodeAttempt

```rust
pub struct NodeAttempt {
    pub key: NodeKey,
    pub attempt: NonZeroU32,
}
```

通过结构体字面量构造。节点事件以 `(run_id, key, attempt)` 关联一次调用；Transition 重激活或重新执行未知结果的调用时，使用新的 attempt。没有发生调用的 `NodeSkipped` 不创建 attempt。

#### 2.4 Serde 序列化边界

直接使用 `serde::Serialize` 和 `serde::de::DeserializeOwned`，通过选定的 Serde 格式库转换为字节；调用方不需要实现或注入自定义编解码器。

首版存储模块为 Event、EventData、NodeAttempt、FailureKind 及关联的 NodeId／NodeKey 提供 Serialize／Deserialize。业务 payload 仍是 Vec<u8>；下面的业务类型约束在后续可恢复执行接入时落实，不在本次给 State、NodeInstance 或任意 Any 强加新约束。serde_json 仅作为封套往返测试的开发依赖，不据此选定业务 Delta 的格式。

| 数据 | 可恢复执行所需约束 |
| --- | --- |
| State `S` | 在现有 State 约束之外实现 Serialize 和 DeserializeOwned |
| 原始 Delta `S::Delta` | 实现 Serialize 和 DeserializeOwned；继续允许非 Clone、仅 Send 的 Delta |
| 节点输出 `O` | 实现 Serialize 和 DeserializeOwned，沿用现有 Send／Sync 等业务约束 |
| 输入及 Directive payload 中的具体值 | 在类型擦除前具备对应的 Serialize 和 DeserializeOwned 实现 |

这些约束在参与可恢复执行的具体类型与接入入口明确表达。State derive 生成的 Delta 也需要能够获得标准 Serde 实现，具体宏接入方式随实施设计确定。

序列化和反序列化是同步操作。得到字节后再等待日志追加，避免要求非 Sync 的 Delta 以共享借用跨越 await。EventLog 保存字节，不承担按业务类型查找反序列化实现的职责。

完整 Outcome 的序列化表示必须包含 `value`、原始 `state_delta`、`directive` 以及指令中的 payload。格式及表示要保留 `None` 与 `Some(())`，以及 Delta 中“未修改”和“显式写入 None”的区别；不能仅凭 derive 就假定这些情况在所有格式中都能正确往返。

当前 GraphInput／Input 和 Directive payload 中含有 `Arc<dyn Any>`。Serde 无法自动从这些类型擦除值恢复具体业务类型，需要在已有 Graph／Node 类型适配边界落实序列化表示和类型关联。这里不重新引入通用编解码 trait；接入接口见待定项。

Serde 及格式库的依赖版本在根 `Cargo.toml` 的 workspace.dependencies 声明，使用方按实际用途引入。首版使用 serde 作为运行依赖、serde_json 作为封套测试的开发依赖；业务格式库等待执行接入时确定。

#### 2.5 EventLog

```rust
pub trait EventLog: Send + Sync {
    fn append(
        &self,
        event: Event,
    ) -> impl Future<Output = Result<(), Error>> + Send;

    fn events(
        &self,
        run_id: &str,
        after_seq: u64,
    ) -> impl Future<Output = Result<Vec<Arc<Event>>, Error>> + Send;

    fn all_events(
        &self,
    ) -> impl Future<Output = Result<Vec<Arc<Event>>, Error>> + Send;
}

pub struct InMemoryEventLog {
    // 私有存储。
}

impl InMemoryEventLog {
    pub fn new() -> Self;
}
```

InMemoryEventLog 同时实现 Default，与 new() 创建相同的空日志。

接口契约：

- `append` 追加调用方已经编号的完整事件，不修改事件内容或分配新序号。
- `events(run_id, 0)` 返回该 Run 全部事件；其他游标返回 `seq > after_seq` 的事件，按 seq 升序排列。
- 没有符合条件的事件时返回空集合。
- `all_events` 返回日志实例中的全部 Run 历史。每个 Run 内有序，不承诺不同 Run 之间的全局顺序。
- 每次读取返回调用时可见的历史集合；事件通过 `Arc<Event>` 只读共享，后续追加不改变已有集合。
- 同一 Run 由一个执行所有者驱动。并行运行不同 Run 可以共享同一日志实例。
- EventLog 不检查节点生命周期、Graph 业务规则或恢复策略；调用方的 Run 入口负责产生合法序列。

调用侧默认使用泛型。此 RPIT 异步 trait 不能直接用于 `dyn EventLog`；若现有执行边界必须擦除具体类型，在私有适配层处理，不假设该 trait 可以直接动态分派。

#### 2.6 错误契约

```rust
#[derive(Debug, thiserror::Error)]
pub enum EventLogError {
    #[error("event append failed")]
    Append {
        #[source]
        source: Box<dyn std::error::Error + Send + Sync + 'static>,
    },
    #[error("event read failed")]
    Read {
        #[source]
        source: Box<dyn std::error::Error + Send + Sync + 'static>,
    },
    #[error("event payload encoding failed")]
    Encode {
        #[source]
        source: Box<dyn std::error::Error + Send + Sync + 'static>,
    },
    #[error("event payload decoding failed")]
    Decode {
        #[source]
        source: Box<dyn std::error::Error + Send + Sync + 'static>,
    },
}
```

现有 `cognacta_core::Error` 增加 `EventLog(#[from] EventLogError)`。日志实现将追加、读取错误分别转换为 Append、Read；Graph／Node 的序列化调用边界将格式库错误转换为 Encode、Decode。core 自有的公开可失败入口统一返回 `Result<T, cognacta_core::Error>`，保留真实来源，不建立无上下文的反向转换。

实现 Serde 的外部 trait 时，遵守其 Serializer／Deserializer 错误契约；在 core 调用格式库的边界再转换为本 crate 的 Error。

用于保存业务失败摘要的类型为：

```rust
pub enum FailureKind {
    Input,
    Initialization,
    Execution,
    Task,
    DepthExceeded,
    Merge,
    InvalidDirective,
    Scheduling,
    Stalled,
    MaxWaves,
    MissingOutput,
    Invariant,
}
```

`FailureKind` 表达业务执行失败，`EventLogError` 表达记录或读取失败。二者不互相替代。

实时执行路径保留原始业务错误及 source。历史保存受控分类和事件上的节点归属，不承诺重建任意 `std::error::Error` 对象或原始 source 链。失败摘要的粒度是否足以服务后续诊断，列入实施前审查。

### 3. 事件内容与后续重放约定

```rust
pub enum EventData {
    RunStarted {
        input: Vec<u8>,
        parent_node: Option<NodeAttempt>,
        depth: usize,
        max_depth: usize,
    },
    RunInitialized {
        state: Vec<u8>,
    },
    NodeStarted {
        wave: usize,
        node: NodeAttempt,
    },
    NodeCompleted {
        wave: usize,
        node: NodeAttempt,
        outcome: Vec<u8>,
    },
    NodeFailed {
        wave: usize,
        node: NodeAttempt,
        reason: FailureKind,
    },
    NodeSkipped {
        key: NodeKey,
    },
    WaveSettled {
        wave: usize,
    },
    RunCompleted,
    RunFailed {
        reasons: Vec<FailureKind>,
    },
}
```

`RunStarted` 是每个逻辑 Run 的第一次记录，resume 不重复写入。`RunInitialized` 保存实际初始化结果，恢复已经初始化的 Run 时不重新调用初始化函数。

本波 ready 仍在内存中固定。恢复时从该波开始前的 State、节点状态、Transition 和 Deliver 记录重算，按普通节点注册顺序、随后实例创建顺序排列。必须在套用本波节点开始／完成记录之前固定 ready；不能根据日志中已出现的节点拼出成员集合，也不能把事件追加顺序当作结算顺序。

`NodeCompleted` 表示执行体成功返回且完整 Outcome 已记录。该节点对共享 State 的增量和路由指令仍等待 wave 结算。`NodeFailed` 没有对应成功 Outcome。

`NodeSkipped` 表示内核已经确定跳过该节点，恢复时可以区分“尚未执行”和“已经跳过”，不用通过缺少开始事件猜测状态。

`WaveSettled { wave }` 表示该波已完成结算提交，不表示该波所有节点都成功，也不携带结算结果副本。恢复从 RunInitialized 解码初始 State，按 wave 顺序读取完整 Outcome，按重算的 ready 顺序对成功 Delta 执行一次 merge_batch，再验证并恢复路由。

- 本波没有节点、归并或指令错误：恢复成功输出、State 和全部合法路由。
- 有已记录节点失败或确定性归并／指令错误：保留成功输出和实际归并结果，禁止整批路由，继续 RunFailed 收尾。归并失败沿用整批原子性，State 保持该波之前的值。

重放会再次运行 reducer 及指令校验，不再次调用已完成节点的执行体。每次重建从初始 State 开始，每个已提交 wave 的 Delta 只参与一次归并；不能在已经包含该波结果的 State 上重复应用 Add／Append。纯重放不追加事件，resume 继续执行时才产生新事实。

这里只保存一份初始化 State，不保存逐波 State 快照；代价是重建需要遍历已提交历史并重新执行归并。

#### 无开始事件的 wave 恢复

例如本波 ready 为 `[A, B, C]`，并发数为 2。A 和 B 已经启动，B 的完整结果已记录，A 尚未结束，C 尚未启动，此时取消执行。

- 从此前已提交状态重新计算得到同一个 `[A, B, C]`。恢复时复用 B 的结果，重新执行结果未知的 A，并执行 C；A 和 C 仍读取该波开始时的 State。
- 若没有 WaveSettled，三个结果仍属于待结算的同一批。即使 B 已完成，也不能先应用 B 的 Delta，再让 A 或 C 读取更新后的 State。
- 若已经有 WaveSettled，即使执行在发布结算结果之前停止，恢复也通过重放本波 Delta 与指令重建已提交状态，不重新执行这批节点。内存实现的恢复以日志实例仍然存活为前提。

例如 A、B 分别向 Append 字段追加 `a`、`b`，B 虽先完成，结算仍须得到原 ready 顺序的 `a, b`。节点完成顺序不能代替 wave 的结算顺序。

这一方案要求恢复使用兼容的 Graph、稳定的节点注册与实例创建顺序，以及确定性的 when、Custom join、reducer 初始化／reduce／finish 和指令校验。它们不能依赖当前时间、随机数或可变外部资源，也不能在重放中产生业务副作用。非确定性的模型、工具调用仍放在节点执行体中，其已记录 Outcome 直接复用。

wave 从 1 开始。已提交标记恢复已结算计数；未提交节点事件所属的下一 wave 不再次增加预算。若已经选定 ready 但尚无任何节点事件，恢复重新选择同一批即可，无须持久化这次纯计算。

### 4. 首版内存存储

私有存储使用同步 Mutex 包含按 run_id 分组的 Vec<Arc<Event>>。临界区只做内存追加或克隆 Arc，不运行用户代码，不持锁跨 await；无需每条记录创建 task 或异步后台队列。

调用方保证同一 Run 串行、从 1 开始递增且不重复的 seq，因此按追加顺序存储即可提供该 Run 的序号顺序。不同 Run 的追加通过同一内存锁完成完整插入，但 all_events 不承诺跨 Run 的全局先后。读取返回当时可见的集合快照，已返回的 Arc 与后续读取共享事件对象。

不增加重复编号、Graph 合法性、节点状态或版本检测。没有匹配的 Run／游标返回空 Vec。内存增长随保留历史增长，不做自动淘汰；日志及读取句柄释放后相应事件可释放。

### 5. 记录与恢复协议（后续接入）

本表固定业务边界，不是本 change 已实现的调用链。

| 边界 | 记录与推进 |
| --- | --- |
| 调用实际开始 | 输入编码后追加 RunStarted，成功后才校验入口及初始化 |
| 初始化成功 | 追加包含初始 State 的 RunInitialized，成功后调度 |
| ready 确定 | 仅内存固定成员、顺序和 wave 编号，不写开始事件 |
| 节点取得名额且 future 首次 poll | 先追加 NodeStarted，再执行资源投影与执行体 |
| 节点返回 | 先捕获 ts，再编码完整 Outcome 并追加 NodeCompleted；失败记 NodeFailed |
| Sweep 确定跳过 | 先追加 NodeSkipped，再提交跳过状态 |
| 本波结果收齐 | 按固定 ready 顺序归并 Delta、校验指令；追加 WaveSettled 后才发布结算并路由 |
| 全图结束 | 先追加 RunCompleted／RunFailed，再发布业务终态 |

每次记录由逻辑 Run 串行完成取号、构造 Event、append；成功后推进 last_seq。不要让每个节点各自用原子计数取号后并行追加。

cancel 停止当前执行，不要求成功补写取消／挂起事件，不引入 interrupt。resume 沿用 run_id，从保存历史恢复 last_seq、已结算 wave 数、attempts 和父子关联；已有业务终态默认拒绝 resume。未知结果的节点调用可能重复产生外部副作用，不承诺恰好一次。

恢复从 RunInitialized 开始，在新的 State 投影上对每个已提交 wave 重放一次 Delta；无标记的波次先固定重算的 ready，再恢复结果槽，补齐未知／未启动成员，所有成员读取相同的波初 State。若所有结果均已记录，只需结算和写标记；若标记已存在，只做重放，不再追加同一标记。重放不调用已完成节点，不写新的历史。

标记追加失败时停止执行，丢弃未提交的内存投影，由之后恢复从初始状态重建；不能把已在内存归并的状态作为已提交 Run 返回。记录路径失败报告 EventLogError，不补写业务 RunFailed。初始 State 只保存一次，归并使用原有整批原子契约，不要求 S 或 Delta: Clone。

细节及半波次示例见 docs/design/event-log.md 第 4 至 7 节。后续接入需单独修改 graph-kernel-execution 规格；本次不把这些行为写成已交付的执行要求。

### 6. 仅通过公开 API 的调用

以下示例展示拟议存储接口的构造、追加和读取，输入字节已由 Graph 适配边界通过 Serde 格式库生成。正式运行中序号由 Run 的统一入口维护，示例中的首个序号仅用于说明存储接口。

```rust
use std::{num::NonZeroU64, sync::Arc, time::SystemTime};
use cognacta_core::{Error, Event, EventData, EventLog};

async fn record_root_start<L>(
    log: &L,
    input: Vec<u8>,
) -> Result<Vec<Arc<Event>>, Error>
where
    L: EventLog,
{
    let data = EventData::RunStarted {
        input,
        parent_node: None,
        depth: 0,
        max_depth: 4,
    };
    let event = Event::builder()
        .seq(NonZeroU64::MIN)
        .run_id("example-run".to_owned())
        .ts(SystemTime::now())
        .data(data)
        .build();
    log.append(event).await?;
    log.events("example-run", 0).await
}
```

宿主可通过 `InMemoryEventLog::new()` 创建具体实现，再传给此类泛型调用。外部实现者可通过公开 Event 构造与读取入口实现 EventLog，无需访问 core 私有模块。

## Risks / Trade-offs

- [仅内存保存] → 宿主须保留同一日志实例；进程退出后的恢复等待持久化实现。
- [完整历史占用内存] → 首版由日志及 Arc 句柄生命周期管理，不引入未经需求支持的淘汰策略。
- [标记不保存 State] → 后续恢复成本随历史增长，ready 条件、reducer 和指令校验须确定且没有业务副作用；不能用节点完成顺序替代 ready 顺序。
- [类型擦除限制 Serde 接入] → 本次只序列化封套及保存业务字节，不承诺任意 Any 可自动重建。
- [新增公开 Error 变体影响穷尽匹配] → 更新 crate 内匹配及公开调用测试；错误来源保留，Display 不展开业务内容。
- [业务日志包含敏感正文] → 不接入 tracing／Collector／终端输出；现有观测保持原行为。本次没有需新增的日志、span 或指标。

## Migration Plan

1. 增加事件类型、标准 Serde 实现、统一 Error 分类和根导出；CLI graph-check 的穷尽错误分类补充 EventLog，保留现有宏相关改动。
2. 实现 trait 与内存存储，增加无外部服务的 UT 和公开 API 验证。
3. 使用根 workspace.dependencies 管理 serde；serde_json 仅为 core 开发依赖。更新锁文件并执行仓库检查和依赖审计。
4. 本次无数据库迁移或部署步骤，现有图调用方无需改动；移除新模块即可回退未被执行路径使用的能力。

## Open Questions

以下问题属于后续执行接入，不改变本次存储规格或实施任务：

- 选定业务 payload 的 Serde 格式，并为 Input／Directive 中的具体类型提供关联；格式必须保留 Some(())、None 及 Delta 中 Some(None) 的区别。
- 明确初始化前逻辑 Run 记录状态、异步 Execution 的完整签名及保持 dyn Scheduler 的私有适配方式。
- 明确 replay／resume 的公开签名、恢复入口的单次校验与错误分类、资源和预算兼容性。
- 明确父 Node attempt 与已有子 Run 的接续；标准 Graph 节点和普通业务节点多次手工子调用的边界分别处理，不能盲目新建子身份。
- 明确调度器提前返回、State 所有权泄露等不能仅由 Outcome 推导的异常终结记录；不借此向 WaveSettled 添加隐藏数据。

实施这些接缝前需要新的具体设计及规格变更，本次任务不以实现占位函数代替它们。
