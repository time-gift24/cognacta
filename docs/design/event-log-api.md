# EventLog 公开接口、编码与错误契约

更新日期：2026-11-05。本文是 [EventLog 设计](event-log.md) 的接口附录，状态：**format=2 JSON 载荷接口已实现**。变更和验证见 [use-json-event-values](../../openspec/changes/use-json-event-values/tasks.md) 与 [实现核对报告](event-log-validation.md)。

## 1. crate 根公开导出

现有公共 API 除下述明确变化外保留。新增或调整的根导出完整清单：

```text
Event, EventBuilder, event_builder, EventData, NodeAttempt,
CallSite, ChildCall, FaultKind, TerminalFailure, FailureKind,
WaveStage, Failure, FailureCause, MergeFailureKind, ControlFailureKind,
EventLog, InMemoryEventLog, EventLogError, HistoryError, HistoryViolation,
JsonValue, SharedValue, InputEntry, RecordedOutcome, History, ReplayedRun, replay, new_run_id,
RunContext, RunContextRootBuilder, run_context_root_builder,
NodeContext, NodeCallBuilder, node_call_builder,
Scheduler, SchedulerRunBuilder, scheduler_run_builder,
SchedulerResumeBuilder, scheduler_resume_builder,
State, Reducer, NodeInstance, Run, Error
```

继续使用已有的 NodeId、NodeKey、Graph、GraphInput、Input、Outcome、Directive、DeliverTarget、StateField、WritePolicy、RunError、CallError 等根导出。NodeCallBuilder 和 SchedulerResumeBuilder 为 bon 生成的可达类型及状态模块，不手写第二套构造／校验。

事件数据、稳定失败类型和 WaveStage 支持 Serialize／Deserialize。Event 字段私有；协议结构体／枚举可通过字面量构造，但不能直接修改运行投影。内部 Projection、已校验事实、执行缓存及存储擦除适配保持私有。移除 Value trait、ValueTypes、SourceRef、手工 register、with_value_types，以及 ValueWire／ControlWire／OutcomeWire 和 postcard 业务字节层。SharedValue 改为 Arc<JsonValue>；JsonValue 是 serde_json::Value 的根重导出，不是新值系统。

## 2. Event 与 EventLog

```rust
pub struct Event {
    seq: NonZeroU64,
    run_id: String,
    parent_run_id: Option<String>,
    ts: SystemTime,
    data: EventData,
}

impl Event {
    pub fn builder() -> EventBuilder<event_builder::Empty>;
    pub fn seq(&self) -> NonZeroU64;
    pub fn run_id(&self) -> &str;
    pub fn parent_run_id(&self) -> Option<&str>;
    pub fn ts(&self) -> SystemTime;
    pub fn data(&self) -> &EventData;
    pub fn kind(&self) -> &'static str;
}

pub trait EventLog: Send + Sync {
    fn append(&self, event: Event)
        -> impl Future<Output = Result<(), Error>> + Send;
    fn events(&self, run_id: &str, after_seq: u64)
        -> impl Future<Output = Result<Vec<Arc<Event>>, Error>> + Send;
    fn all_events(&self)
        -> impl Future<Output = Result<Vec<Arc<Event>>, Error>> + Send;
}

pub struct InMemoryEventLog { /* private */ }
impl InMemoryEventLog {
    pub fn new() -> Self;
}
```

Event 支持标准 Serde。builder 必填 seq、run_id、ts、data，可选 parent_run_id，build() -> Event；不提供 setter。kind 从枚举推导固定 snake_case，不另存 EventKind。

InMemoryEventLog 实现 Default。单次 append 原子保存完整事件，返回 Ok 后可读取；它不承诺进程退出后的持久性。外部实现说明自己的持久性。读取共享不可变 Arc，后续追加不改变旧集合；after_seq=0 读取全量，未知 Run 返回空集合。

Run 分配 seq，存储边界检查同一 Run 的下一序号，拒绝重复、倒序和缺号。存储不解析 Outcome、Graph 或 wave；同一逻辑 Run 由一个执行所有者写入，不据此增加多写者调度。append 确认不明时停止旧执行并读取实际历史，不能盲目重试。

EventLog 仍采用静态分派，其 RPIT Future 不能直接用作 dyn EventLog。History 内部复用私有擦除适配，不新增公开存储 trait。

## 3. State、Reducer 与节点接口

```rust
pub trait State: serde::Serialize + serde::de::DeserializeOwned + Send + Sync + 'static {
    type Delta: serde::Serialize + serde::de::DeserializeOwned + Default + Send + 'static;
    type Field: Copy + Eq + std::hash::Hash + Send + Sync + 'static;
    fn fields() -> &'static [StateField<Self::Field>];
    fn merge_batch(&mut self, deltas: Vec<Self::Delta>) -> Result<(), Error>;
}

pub trait Reducer<T> {
    type Delta: serde::Serialize + serde::de::DeserializeOwned + Send + 'static;
    const POLICY: WritePolicy;
    fn reduce(&mut self, current: &T, delta: Self::Delta) -> Result<T, Error>;
    fn finish(self, value: T) -> Result<T, Error>;
}

pub trait NodeInstance<S: State, R: Send + Sync + 'static = ()>: Send + Sync + 'static {
    type Output: serde::Serialize + Send + Sync + 'static;
    fn run<'a>(
        &'a self,
        input: &'a Input,
        ctx: NodeContext<S, R>,
        scheduler: Arc<dyn Scheduler>,
    ) -> impl Future<Output = Result<Outcome<S, Self::Output>, Error>> + Send + 'a;
}
```

State、State::Delta 与 Reducer::Delta 均要求 DeserializeOwned。derive 为生成的 Delta 提供 Serialize／Deserialize，直接依赖 Reducer 关联类型的契约，不对泛型参数猜测额外的 Serde bound；因此关联类型、递归 Self 与名称遮蔽仍可用。用户 State 自身实现 Serialize／Deserialize；内建 Override／Append／Merge 对所保存业务值要求可反序列化。

不增加 State::Patch，不要求 State／Delta／Output: Clone，也不要求 Delta: Sync。merge_batch 保持全部字段成功后原子回写；错误用 core::Error 返回，原 Merge 分类和 source 保留。自定义归并是纯业务计算，不访问外部服务、不依赖时间／随机数，也不通过内部可变性修改当前 State。

NodeInstance 和 Outcome 的业务形状不变。NodeInstance::Output 仍只要求 Serialize + Send + Sync，普通节点可以继续返回业务 struct；节点适配器使用 serde_json::to_value 把输出转成 JSON 后提交 NodeCompleted。Input／GraphInput 作为输出时也使用各自普通 Serde 实现，不再有特殊动态类型分支。

为限制本次改动范围，保留 Graph<S, O, R>、Run<S, O> 和 Outcome<S, O>。Graph 最终返回的 O 在运行／重放入口增加 DeserializeOwned；RunCompleted 从返回节点的已记录 JSON 经 O 的标准 Deserialize 建立 Arc<O> 返回投影。O 由泛型调用点确定，不查任何注册表；除选定的 Graph 返回值外，内核不把各节点输出重新变为业务 struct。Graph 构造仍可检查所选返回节点声明的 Output 与 O 一致，此进程内类型检查不写进日志。

## 4. 统一 JSON 业务值与节点输入边界

所有跨节点值、入口值、控制 payload 和历史载荷使用普通 Serde 数据。JSONL 对整个 Event 使用 serde_json::to_writer／from_reader 或逐行 from_slice；业务载荷直接是对象、数组、数字、字符串、布尔值或 null。没有 TypeId、type_name、稳定类型 key 或 postcard 字节数组。事件身份／来源不是业务类型标签。

```rust
pub use serde_json::Value as JsonValue;
pub type SharedValue = Arc<JsonValue>;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct InputEntry {
    pub origin: Origin,
    pub value: SharedValue,
}

pub struct Input { /* private: ordered Vec<InputEntry> */ }
impl Input {
    pub fn new(values: Vec<SharedValue>) -> Self;
    pub fn entry(&self) -> Result<&JsonValue, Error>;
    pub fn entry_shared(&self) -> Result<SharedValue, Error>;
    pub fn one(&self, source: &NodeId) -> Result<&JsonValue, Error>;
    pub fn one_shared(&self, source: &NodeId) -> Result<SharedValue, Error>;
    pub fn many(&self, source: &NodeId) -> Vec<&JsonValue>;
    pub fn values(&self) -> &[InputEntry];
}

pub struct GraphInput { /* private: HashMap<NodeId, Input> */ }
impl GraphInput {
    pub fn new(entries: HashMap<NodeId, Input>) -> Self;
    pub fn entry(&self, node: &NodeId) -> Result<&Input, Error>;
}

pub struct RecordedOutcome {
    pub value: Option<SharedValue>,
    pub state_delta: JsonValue,
    pub directive: Option<Directive>,
}

pub enum Directive {
    Transition {
        target: NodeId,
        payload: Option<SharedValue>,
        immediate: bool,
    },
    Deliver(Vec<DeliverTarget>),
}
pub struct DeliverTarget {
    pub template: NodeId,
    pub key: String,
    pub payload: SharedValue,
}
```

上述对象均可通过 core 根公开入口使用。Input／GraphInput／RecordedOutcome／Directive／DeliverTarget 实现 Serialize、Deserialize，并支持值相等比较；Input 序列化为按真实输入顺序排列的 InputEntry 数组，GraphInput 序列化为 `{ "entries": { "入口 ID": [...] } }`。GraphInput::new 在进入新 Run 前将输入 Origin 归一为 Run，并记录归一后的数据，父来源留在父日志和 CallSite。Deserialize 原样恢复记录结构；统一事件入口检查 RunStarted／CallLinked 的入口来源，不悄悄重写历史。NodeStarted 的 Input 完整保存该 Run 内的 Node／Instance 来源。

Input 不再按 Rust 类型建立索引。entry 选择所有 Origin::Run 值，one 选择指定节点来源（模板来源包含其各实例），两者必须恰好一个，缺少来源或多值通过 InputError 返回。many 返回指定来源的全部值，空来源返回空 Vec，保留原输入顺序；不尝试逐个反序列化再过滤。values 返回完整有序来源和值。移除 entry::<T>／one::<T>／many::<T>／all::<T>、Any downcast 与 SourceRef.value_type；同形 JSON 不再被隐式区分为不同 Rust 类型。业务若需要区分 Invoice／Receipt，使用不同来源或业务自己的 Serde tagged enum。

节点在输入处显式解析一次，例如：

```rust
#[derive(serde::Deserialize)]
struct Job { amount: u64 }

let job: Job = serde_json::from_value(input.entry()?.clone())
    .map_err(|source| InputError::Decode { source })?;
// 从此处起，节点内部使用 job.amount 等业务类型。
```

这段调用位于返回 core::Error 的 NodeInstance::run 中，InputError 从 core 根导出；不增加一套 decode<T> 门面。单值 getter 只检查来源与数量，不检查业务 schema；from_value 才是业务 schema 转换。节点可对 &JsonValue 直接读取；若业务确有借用式 Deserialize 需要，也可使用 Serde 的借用接口。框架不缓存任意业务 T，不承诺返回旧的 &T／Arc<T>。

### Output、payload 与共享

NodeInstance::Output 和 Outcome<S, O>::value: Option<Arc<O>> 保留，方便业务节点返回已有对象且不要求 Clone；适配器在返回边界将 Some(O) 转成 Some(Arc<JsonValue>)，None 保持无输出。NodeRun.output() 改为 Option<&SharedValue>，所有下游 Input、路由及动态实例只传递 JSON。最终 Graph 的 Arc<O> 是从该 JSON 派生的返回投影；不再承诺它与节点最初的 Arc<O> 指针相同。

DeliverTarget.payload 和 Transition.payload 只接受 JSON SharedValue。节点用 serde_json::to_value(&business_payload) 显式构造；payload 转换失败可用 Error::execution 保留业务错误 source。apply 校验控制目标、角色和实例 key，不解析目标节点业务 schema。合法路由中不符合目标 schema 的 JSON，会在目标节点进入后形成 NodeFailed(Input)，不会倒推撤销已记录的 Control。

同一进程内现成 Arc<JsonValue> 可继续共享；serde_json::from_value(value.clone()) 可能复制 JSON 并分配业务 struct。重开日志后只保证 JSON 值、顺序、来源和行为相同，不保证 Rust 对象类型身份或 Arc 指针身份。资源连接／句柄留在 RunContext.resources，不进入 JSON。

### 缺省与 null 必须分别保留

标准 Serde 足以承载本方案，但直接 derive Option 字段会把部分业务区别合并。以下是协议契约，不可忽略：

| 内存语义 | JSON | Deserialize 结果 |
| --- | --- | --- |
| RecordedOutcome.value=None | 省略 value 字段 | 没有输出 |
| value=Some(JSON null)，含节点输出 () | `"value": null` | 有输出，值为 null |
| Transition.payload=None | 省略 payload 字段 | 无 payload／覆盖时清除旧 payload |
| payload=Some(JSON null) | `"payload": null` | 向目标提供一个 null 输入值 |
| Delta.title=None | 省略 title 字段 | 不写该字段 |
| Delta.title=Some(None)，title 用 Override<Option<String>> | `"title": null` | 写入 None，清空旧 title |
| Delta.title=Some(Some("new")) | `"title": "new"` | 写入新值 |

上述可缺省字段使用 Serde 的 skip_serializing_if、default 及“字段出现时包装 Some”的字段反序列化规则；小型私有字段函数即可，不引入业务类型注册或第二套 codec。State derive 为生成的 Delta 字段生成相同规则，默认空 Delta 序列化为 `{}`。仅有 skip_serializing_if 仍不足以区分反序列化时的缺省与 null。State 本体的 Option 字段保持业务自己的 Serde 约定；只有 Delta 外层 Option 表示写入与否。

JSON 不是任意 Rust 对象图的无损格式。业务类型须定义与 JSON 兼容的 Serde 表示；JSON 无法直接表达的数值／map key，以及业务自身需要区分的嵌套 Option 状态，由业务 Serde 明确表达，不使用 Rust 类型标签或二进制回退。

### State／Delta 与实时投影

State 及原始 Delta 仍是强类型 S／S::Delta，不把 reducer 改写成 JSON patch。RunInitialized.state 和 RecordedOutcome.state_delta 使用 JsonValue；入投影时通过静态类型的 Deserialize 得到 S／S::Delta。StateDelta 事件继续仅引用结果，apply 才执行 merge_batch。

实时与 replay 共用 JSON 事实准备入口：先把产出变为 EventData 的 JSON 载荷，再按已知 S／S::Delta 和当前协议校验一次；只有准备成功才 append，然后同步 apply。实时 apply 消费从记录表示恢复的类型化事实，不能继续使用与 JSON 表示不同的原始 S／Delta。RunCompleted 同样在 append 前从引用输出按已知 O 解析一次；失败不追加终态。replay 使用同一路径，已校验值不在 apply 再次反序列化。

读取 Event 本身只需要 Serde，无需 Graph 或业务类型清单；按 EventData 检索、展示、转发、导出可以直接处理 JSON 字段。只有需要执行投影时才提供 Graph<S, O, R> 来解释 S、Delta 和最终 O；不会执行业务节点来补足类型信息。

## 5. History 与 RunContext

```rust
pub struct History { /* private */ }

impl History {
    pub fn new<L: EventLog + 'static>(
        log: Arc<L>,
    ) -> Self;
    pub fn events(&self, run_id: &str, after_seq: u64)
        -> impl Future<Output = Result<Vec<Arc<Event>>, Error>> + Send;
    pub fn all_events(&self)
        -> impl Future<Output = Result<Vec<Arc<Event>>, Error>> + Send;
}

impl<R: Send + Sync + 'static> RunContext<R> {
    pub fn root(run_id: String, max_depth: usize, resources: Arc<R>) -> Self;
    pub fn with_event_log<L: EventLog + 'static>(self, log: Arc<L>) -> Self;
    pub fn history(&self) -> History;
    pub fn with_resources<T: Send + Sync + 'static>(
        &self,
        resources: Arc<T>,
    ) -> RunContext<T>;
    pub fn run_id(&self) -> &str;
    pub fn parent_run_id(&self) -> Option<&str>;
    pub fn parent_node(&self) -> Option<&NodeKey>;
    pub fn depth(&self) -> usize;
    pub fn max_depth(&self) -> usize;
    pub fn resources(&self) -> &Arc<R>;
}
```

History 实现 Clone，是持有存储的读取／恢复句柄，不公开 append。内部运行入口可借助它提交事实。独立根调用的记录故障闸门不属于共享 History，避免一个根失败阻断其他根。

root 默认创建 InMemoryEventLog；with_event_log 替换后端，不再配置类型绑定。root_builder 沿用现有 bon 入口。这些配置在执行开始前完成，宿主先取 History，context 移交后仍可在成功、失败或取消时读取日志。

RunContext 保持 Clone；with_resources 保留身份、历史和当前调用关联。公共 child 方法移除，子身份由 NodeContext::call 的 CallLinked 流程派生。进入 resume 时，身份、输入、深度及预算从历史恢复，资源由宿主重新提供。

默认内存历史随最后一个存储／History／context 句柄释放而销毁，不会静默覆盖旧事件；它会随日志增长占用内存，不承诺跨进程持久化。

## 6. 执行、重放和继续执行接口

```rust
pub trait Scheduler: Send + Sync + 'static {
    fn config(&self) -> SchedulerConfig;
    fn drive<'a>(
        self: Arc<Self>,
        execution: &'a mut (dyn Execution + 'a),
    ) -> Pin<Box<dyn Future<Output = Result<(), Error>> + Send + 'a>>;
}

pub trait Execution: Send {
    fn advance(&mut self)
        -> Pin<Box<dyn Future<Output = Result<Option<Vec<NodeKey>>, Error>> + Send + '_>>;
    fn dispatch(&mut self, key: &NodeKey)
        -> Result<Pin<Box<dyn Future<Output = Result<(), Error>> + Send + 'static>>, Error>;
    fn complete(&mut self, key: NodeKey, result: Result<(), Error>)
        -> Pin<Box<dyn Future<Output = Result<(), Error>> + Send + '_>>;
}

impl dyn Scheduler {
    pub fn run<'a, S, O, R>(
        self: Arc<Self>,
        graph: &'a Graph<S, O, R>,
        input: impl Into<Arc<GraphInput>> + Send + 'a,
        context: RunContext<R>,
    ) -> Pin<Box<dyn Future<Output = Result<Run<S, O>, Error>> + Send + 'a>>
    where
        S: State,
        O: serde::de::DeserializeOwned + Send + Sync + 'static,
        R: Send + Sync + 'static;

    pub fn resume<'a, S, O, R>(
        self: Arc<Self>,
        graph: &'a Graph<S, O, R>,
        run_id: &'a str,
        history: History,
        resources: Arc<R>,
    ) -> Pin<Box<dyn Future<Output = Result<Run<S, O>, Error>> + Send + 'a>>
    where
        S: State,
        O: serde::de::DeserializeOwned + Send + Sync + 'static,
        R: Send + Sync + 'static;
}

pub fn replay<S, O, R>(
    graph: &Graph<S, O, R>,
    events: &[Arc<Event>],
) -> Result<ReplayedRun<S, O>, Error>
where
    S: State,
    O: serde::de::DeserializeOwned + Send + Sync + 'static,
    R: Send + Sync + 'static;
```

run 的 run_builder 保留；resume 同时提供 bon 的 resume_builder，命名参数对应上面签名，finish 为 call()，返回同一 Future。二者都进入同一个运行时和 Scheduler::drive，不暗中选择 LocalScheduler。

Execution 的三个方法签名不变。恢复后的 advance 返回本活动 wave 仍需要实际驱动的成员，包含尚未开始及已有 Running 但没有结果的成员；dispatch 对后者重新进入同一个 attempt，不调用直接 rearm。已有结果不再进入队列。状态、归并、控制和终态始终通过共用提交入口；驱动器只管理准入、任务和回收。

replay 接受单一 Run、从 seq=1 开始的完整前缀；空历史、错序、身份或阶段不合法明确报错，不排序、跳过或补写事件。它不读取其他 Run，也不验证跨流调用的完整性；递归 resume 在实际接入子调用时验证父子引用。History.all_events 的调用方先按 run_id 分组。

resume 拒绝未知、已终态及非根 Run；不接受新的 GraphInput，不接收或重置深度／wave 预算。初始 run_id 已有历史时 run 不得覆盖它，应使用 resume 或新 ID。单个子 Run 仍可公开 replay 查看；其继续执行由根恢复流程驱动。

## 7. 重放结果与业务失败读取

```rust
pub struct ReplayedRun<S: State, O> { /* private */ }

impl<S: State, O: Send + Sync + 'static> ReplayedRun<S, O> {
    pub fn run_id(&self) -> &str;
    pub fn parent_run_id(&self) -> Option<&str>;
    pub fn caller(&self) -> Option<&CallSite>;
    pub fn last_seq(&self) -> NonZeroU64;
    pub fn input(&self) -> &GraphInput;
    pub fn run(&self) -> Option<&Run<S, O>>;
    pub fn into_run(self) -> Option<Run<S, O>>;
    pub fn failures(&self) -> &[Failure];
    pub fn is_terminal(&self) -> bool;
    pub fn wave(&self) -> Option<(usize, WaveStage)>;
    pub fn members(&self) -> &[NodeKey];
    pub fn calls(&self) -> &[ChildCall];
}

impl<S: State, O: Send + Sync + 'static> Run<S, O> {
    pub fn failures(&self) -> &[Failure];
    pub fn errors(&self) -> &[RunError];
    pub fn final_output(&self) -> Option<&Arc<O>>;
    pub fn into_result(self) -> Result<Arc<O>, Error>;
}
```

ReplayedRun 包装同一份私有投影，不另写状态机。RunInitialized 前 run 为 None；RunStarted → RunFailed 可以 is_terminal=true 而没有 S。没有活动 wave 时 wave 为 None、members 为空；calls 按 CallLinked 顺序保存本 Run 各 attempt 的调用事实，不假装包含子 Run 当前状态。

into_run 消耗包装，仅提取已初始化的 Run，丢弃其余恢复缓冲；不能拿它绕过 History 驱动恢复。resume 总是从实际日志创建完整投影。

Run 保持现有 state／node／instances／final_output／waves 等只读方法。failures 为可重建业务视图；errors 保留原始 source 诊断，重放时可为空，不再决定成功与否。into_result 依据已投影终态、稳定失败和最终输出判断：Completed 返回 Arc<O>，单独 MissingOutput 沿用 CallError::MissingOutput，其他失败用 CallError::Execution。

历史调用错误的 source 用私有 thiserror 类型包装稳定失败。实时诊断可额外保留原始 source；绝不把缺少原始 source 当作成功。初始化前失败由递归 call／resume 按 TerminalFailure 恢复为 CallError::Input／Initialization。

## 8. 节点中的可恢复子调用

```rust
impl<P: State, R: Send + Sync + 'static> NodeContext<P, R> {
    pub fn with_call_key(&self, key: impl Into<String>) -> Result<Self, Error>;
    pub fn call<'a, C, O, T>(
        &'a self,
        key: impl Into<String> + Send + 'a,
        graph: &'a Graph<C, O, T>,
        input: impl Into<Arc<GraphInput>> + Send + 'a,
        resources: Arc<T>,
        scheduler: Arc<dyn Scheduler>,
    ) -> Pin<Box<dyn Future<Output = Result<Arc<O>, Error>> + Send + 'a>>
    where
        C: State,
        O: serde::Serialize + serde::de::DeserializeOwned + Send + Sync + 'static,
        T: Send + Sync + 'static;
}
```

提供 bon call_builder，参数名与直接方法一致，finish 为 call()。需要显式资源和 scheduler，NodeContext 不长期持有 Scheduler，也不新增子图专属执行器。直接 Graph 的 NodeInstance 实现默认使用保留 key @graph，其余语义与公开 call 相同。with_call_key 克隆上下文并为下一次 Graph-as-Node 调用指定稳定 key，不生成 Run、不追加事件；构造时拒绝空 key 与 @ 前缀，返回 core::Error::History(InvalidCallKey)。通用 Retry<N> 可对任意 NodeInstance 使用 ctx.with_call_key("try/1")?、ctx.with_call_key("try/2")?：N 为叶节点时没有子 Run，N 为 Graph 时每个 key 对应独立子调用；包装器不需要识别 N 的具体类型。

public call 要求有效的当前 Running attempt、非空且非保留 key。同一物理进入内重复 key 是调用协议错误；不能把两个并行工作误合成一个子调用。恢复重新进入后允许复用已记录 key，输入以首次记录为准。不同 Graph／不同业务调用应使用不同 key。

子业务失败返回对应 core::Error::Call，可由父节点处理。存储、解码和调用关联错误保持 EventLog／History 分类，使调用树停止推进，不伪装成可重试的普通子业务失败。

下面示例只通过公开 API 完成一次可恢复子调用；在普通 NodeInstance::run 中可直接使用：

```rust
use std::sync::Arc;
use cognacta_core::{Error, Graph, GraphInput, NodeContext, Scheduler, State};

async fn call_worker<P, C, O, R, T>(
    ctx: &NodeContext<P, R>,
    child: &Graph<C, O, T>,
    input: GraphInput,
    resources: Arc<T>,
    scheduler: Arc<dyn Scheduler>,
) -> Result<Arc<O>, Error>
where
    P: State,
    C: State,
    O: serde::Serialize + serde::de::DeserializeOwned + Send + Sync + 'static,
    R: Send + Sync + 'static,
    T: Send + Sync + 'static,
{
    ctx.call("worker", child, input, resources, scheduler).await
}
```

这里涉及的类型均从 core 根导出；示例中的 Arc 来自 std::sync，Future／Pin／NonZeroU64 等签名类型使用其标准库定义。

## 9. 稳定失败协议

```rust
pub enum FailureKind {
    Input, Initialization, Execution, Task, DepthExceeded, Merge,
    InvalidDirective, Scheduling, Stalled, MaxWaves, MissingOutput, Invariant,
}

pub struct Failure {
    pub wave: Option<usize>,
    pub cause: FailureCause,
}

pub enum FailureCause {
    Node { node: NodeAttempt, reason: FailureKind },
    Abandoned { node: NodeAttempt },
    Merge { reason: MergeFailureKind, fields: Vec<String> },
    Control {
        writer: NodeAttempt,
        target: NodeId,
        key: Option<String>,
        reason: ControlFailureKind,
    },
    Fault(FaultKind),
    Terminal(TerminalFailure),
}

pub enum MergeFailureKind { SingleWriterConflict, Overflow, Reduce, Finish }
pub enum ControlFailureKind { UnknownTarget, WrongTargetKind, DuplicateInstanceKey }
```

Failure、FailureCause 等是公开 Serde 数据，通过字面量／枚举构造；不携带 source 或自由错误文本。NodeFailed 的 reason 保留现有 FailureKind 分类，表示节点出口结果，不能让其分类绕过整波处理。

Error::Merge 的字段和类别映射为 MergeFailureKind；自定义 merge_batch 返回其他 core::Error 时归入 Reduce，字段为空，原错误留在诊断 sidecar。控制错误保留 writer、target 和相关 key；RunFault 的 Abandoned 节点归属由已记录 starts／results 推导。节点失败、Merge 失败和控制失败均由对应事件的 apply 建立，不由 scheduler 另行 push 业务错误。

## 10. 统一错误与转换边界

cognacta-core 根 Error 继续由 thiserror 定义，完整分类为：

```rust
pub enum Error {
    Call(CallError),
    Graph(GraphError),
    Config(ConfigError),
    Input(InputError),
    Node(NodeError),
    Merge(MergeError),
    EventLog(EventLogError),
    History(HistoryError),
    Scheduling {
        source: Box<dyn std::error::Error + Send + Sync + 'static>,
    },
}

pub enum EventLogError {
    Append { source: Box<dyn std::error::Error + Send + Sync + 'static> },
    Read { source: Box<dyn std::error::Error + Send + Sync + 'static> },
    Encode { source: Box<dyn std::error::Error + Send + Sync + 'static> },
    Decode { source: Box<dyn std::error::Error + Send + Sync + 'static> },
    Sequence { run_id: String, expected: u64, actual: u64 },
}

pub enum InputError {
    EntrySetMismatch { missing: Vec<NodeId>, unexpected: Vec<NodeId> },
    MissingEntry { node: NodeId },
    MissingSource { source_node: NodeId },
    Cardinality { operation: &'static str, source_node: Option<NodeId>, actual: usize },
    Decode { source: serde_json::Error },
}

pub enum HistoryError {
    Empty,
    UnsupportedFormat { found: u16 },
    Invalid { seq: u64, reason: HistoryViolation },
    TerminalRun { run_id: String },
    NotRoot { run_id: String },
    CallContext,
    InvalidCallKey { key: String },
    DuplicateCall { key: String },
    CallLinkMismatch { child_run_id: String },
}

pub enum HistoryViolation {
    Sequence, Identity, Parent, EventOrder, WaveMembers,
    Attempt, ResultReference, StateStage, ControlStage, Terminal,
}
```

省略 thiserror 属性，不省略分类。各 wrapper 保留 source；EventLogError 的 source 指向具体存储／Serde 错误。HistoryError 使用受控分类及可读取字段，不伪造底层 source。其 Display 采用固定安全文本，不默认展开业务 key、run_id、原始载荷或来源链。

| 可失败入口 | 对外 Error 与处理 |
| --- | --- |
| EventLog.append | Error::EventLog(Append／Sequence)，具体后端错误在接入处包装并保留来源 |
| EventLog／History 读取 | Error::EventLog(Read) |
| Input 单值读取／GraphInput.entry | Error::Input(MissingSource／MissingEntry／Cardinality) |
| 节点输入 JSON → 业务 T | 调用方 map_err 为 Error::Input(Decode)，保留 serde_json::Error；属于节点业务失败 |
| initializer 输入 JSON → 业务 T | 由 initializer 返回 core::Error，外层按原 CallError::Initialization 记录初始化失败 |
| 节点输出／S／Delta → JSON，JSON → S／Delta／最终 O | Error::EventLog(Encode／Decode)，停止记录推进，不伪造成普通 NodeFailed |
| replay | 结构／引用／阶段错误用 History；S／Delta／最终 O 解码不兼容用 EventLogError::Decode；业务 Merge／Control 失败进入投影，replay 本身仍可成功 |
| Scheduler.run | 启动业务失败用原 CallError；初始化后业务失败返回 Failed Run；记录／历史故障直接 Err |
| Scheduler.resume | 开始前的拒绝或非法历史用 History；执行后沿用 run 的错误规则 |
| NodeContext.with_call_key | Error::History(InvalidCallKey) |
| NodeContext.call | 子业务结果用 CallError；协议／记录故障用 History／EventLog，不包装成普通节点业务失败 |
| State.merge_batch／Reducer | core::Error，apply 按上述规则保存稳定 Merge 失败与原始诊断 |
| Run.into_result | Error::Call，依据稳定投影而非诊断 source 是否存在 |
| Scheduler::drive／Execution 协议入口 | Error::Scheduling，运行时在可用日志中记录 RunFault 后收尾 |

Serde trait 与 serde_json 函数继续返回自己的 Error，core 自有入口在对应边界转为 core::Error。InputError 移除 TypeMismatch 与 Cardinality.expected_type，因为 Input 只保存 JSON；新增 Decode 使用固定 Display，source 仅作诊断。最终 O 的 JSON 解码失败属于记录／版本契约错误，不允许先记 RunCompleted 再把内存结果改为失败。框架记录故障通过父子调用传播时保持 EventLog／History 分类；不能被默认 Graph 适配包装成 NodeFailed。

外部数据只在入口校验为合法类型化事实；apply 执行业务规则，不重复检查已验证的序号／引用。对未知或不兼容历史不自动修复、改写、迁移或执行节点兜底。

## 11. 完整公开调用示例

下例为目标 API 示范：只使用公开入口，没有类型登记；代码实施后应成为可执行的公开 API 测试。

```rust
use std::sync::Arc;
use cognacta_core::{
    Add, Error, Graph, GraphInput, Input, InputError, LocalScheduler,
    Node, NodeContext, NodeId, NodeInstance, Outcome, RunContext,
    Scheduler, SchedulerConfig, State, new_run_id, replay,
};

#[derive(Default, serde::Serialize, serde::Deserialize, State)]
struct Counter { #[reducer(Add)] count: u64 }
#[derive(serde::Deserialize)]
struct Job { amount: u64 }
#[derive(serde::Serialize, serde::Deserialize)]
struct Receipt { accepted: u64 }
struct Accept;
impl NodeInstance<Counter> for Accept {
    type Output = Receipt;
    async fn run(
        &self, input: &Input, _: NodeContext<Counter>, _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Counter, Receipt>, Error> {
        let job: Job = serde_json::from_value(input.entry()?.clone())
            .map_err(|source| InputError::Decode { source })?;
        Ok(Outcome {
            value: Some(Arc::new(Receipt { accepted: job.amount })),
            state_delta: CounterDelta { count: Some(job.amount) },
            directive: None,
        })
    }
}
async fn example() -> Result<(), Error> {
    let graph: Graph<Counter, Receipt> = Graph::build(
        vec![Node::new(NodeId::new("accept"), Accept)],
        vec![], vec![], NodeId::new("accept"),
    )?;
    let input = GraphInput::new(std::collections::HashMap::from([
        (NodeId::new("accept"), Input::new(vec![Arc::new(serde_json::json!({"amount": 7}))])),
    ]));
    let context = RunContext::root(new_run_id(), 4, Arc::new(()));
    let history = context.history();
    let scheduler: Arc<dyn Scheduler> = Arc::new(LocalScheduler::new(SchedulerConfig::new(1, 4)?));
    let run = scheduler.run(&graph, input, context).await?;
    let events = history.events(run.run_id(), 0).await?;
    let restored = replay(&graph, &events)?;
    assert_eq!(restored.run().unwrap().state().count, 7);
    assert_eq!(run.into_result()?.accepted, 7);
    Ok(())
}
```

取消后继续执行时，宿主保留创建运行前取得的 History，停止并回收旧执行，再调用 `scheduler.resume(&graph, &root_id, history, resources).await`。跨进程只需重新打开后端并构造 History::new(log)，再传入相同 Graph 和根 ID；业务 schema／reducer 版本仍须兼容，不需要重建类型注册表。

## 12. 兼容性清单与实施范围

- use-json-event-values 已实施并通过 format=2 相关测试；旧 format=1 日志仍不自动转换。
- format 从 1 升为 2。EventData 的业务字节字段替换为 Input／GraphInput／RecordedOutcome／JsonValue，不提供旧 postcard 日志自动迁移或混写。Seq、时间、父子关联、StateDelta／Control 及其他事件顺序保持原契约。
- 删除 ValueTypes、register、with_value_types、历史／replay 参数中的类型绑定；删除 Value trait、动态 type_name、SourceRef 和 Any downcast。移除 core 的 postcard／erased-serde 依赖；serde_json 从 dev 依赖调整为运行时依赖，复用 workspace 版本，serde rc 功能沿用。
- Input 改为来源和顺序查询 JSON；业务类型转换在节点／initializer 边界使用标准 Serde。输入 schema 不再预先由框架按类型名验证。
- NodeInstance::Output／Outcome<S, O> 保留；节点出口自动序列化 JSON。Graph<S, O, R> 与 Run<S, O> 保留，执行／replay／call 的最终 O 增加 DeserializeOwned；原始输出 Arc 身份不再跨节点或父子调用保留。
- GraphInput 能用普通 Serde 嵌套为节点输出或 payload。Graph-as-Node 在入口转换 JSON GraphInput，复用原 CallLinked 协议。
- State／Delta 继续强类型；derive 增加字段存在性规则，确保缺省不更新、null 可清空。相同字段规则用于可选 JSON 输出／payload。
- graph! 的组图结构、output 声明保留；graph_input! 保留语法但普通／多值项改接收 JsonValue，shared 项接收 Arc<JsonValue>。业务 struct 由调用者显式 serde_json::to_value 后传入；宏不隐式吞掉转换错误。
- RunContext.child 移除、逻辑 attempts、固定 wave 基线、StateDelta／Control apply、故障停止语义、稳定 call key、每 Run 一文件及 UUID v7 均沿用已实现协议，不新增调度或恢复分支。

本 change 不新增日志／span／指标：它调整既有事实载荷，现有执行观测边界足够；JSON 业务内容不得因为变得易读而流入 tracing。AGENTS.md／CONTEXT.md 保持只读，不引入数据库、快照、Schema registry 或兼容层。

## 13. JsonlEventLog 与时间有序 ID

core 根保留 `pub fn new_run_id() -> String`，使用现有 uuid 依赖的 v7 功能。RunContext::root 的显式 run_id 参数保留；框架内部子 ID 统一使用该函数。

cognacta-eventlog 为实际文件接入 crate，依赖 core；core 不反向依赖它。根公开导出只有 JsonlEventLog 和本 crate 的 Error：

```rust
pub struct JsonlEventLog { /* private */ }

impl JsonlEventLog {
    pub async fn open(directory: impl Into<std::path::PathBuf>) -> Result<Self, Error>;
    pub fn directory(&self) -> &std::path::Path;
}

pub enum Error {
    Io { source: std::io::Error },
    Json { line: usize, source: serde_json::Error },
    InvalidRunId,
    InvalidHistory { line: usize },
    IncompleteLine,
    Task { source: tokio::task::JoinError },
}
```

Error 使用 thiserror；保留 I/O、JSON 和任务来源，Display 不展开路径、业务 ID、载荷或 source。open 创建或打开目录，只做存储初始化；实例可经 Arc 共享。EventLog 的 append／events／all_events 签名与 core trait 完全一致，返回 core::Error：存储错误在对应出口包装成 EventLogError::Append／Read，source 为本 crate::Error；重复或缺号追加直接返回 core 的 EventLogError::Sequence。读取的格式、身份或序号错误属于 Read，不自动修正。

一次 append 在内存中编码整行，再在文件尾 write_all、sync_data，成功后才更新可重建的序号缓存。缓存不是业务状态，不接受跳号。读取只接受以换行结尾的完整 JSON 行，并验证文件归属和从 1 连续的序号。整个 Event 及业务载荷都是可见 JSON，无内嵌二进制业务编码。EventData 使用 Serde 的 type 标签与 snake_case 变体名；通常不需要自定义 Serializer。可以独立 Deserialize Event 后展示／过滤字段，无需启动 Graph。

```rust
use std::sync::Arc;
use cognacta_core::{History, RunContext, new_run_id};
use cognacta_eventlog::JsonlEventLog;

async fn durable_context() -> Result<(RunContext<()>, History), cognacta_eventlog::Error> {
    let log = Arc::new(JsonlEventLog::open("./run-logs").await?);
    let context = RunContext::root(new_run_id(), 8, Arc::new(()))
        .with_event_log(log);
    let history = context.history();
    Ok((context, history))
}
```

跨进程恢复用重新打开的 JsonlEventLog 构造 History::new(log)，再调用第 11 节的 resume；子文件由递归调用协议按原 child_run_id 查找。JsonlEventLog 的公开入口和 Error 分类保持不变。
