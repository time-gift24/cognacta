# Graph 内核设计

> 历史内核设计快照。下文旧的 TypeId、SourceRef、无 Serde State 和 RunOutput 等接口代码不代表当前实现；当前公开签名见 [EventLog API 附录](../../../docs/design/event-log-api.md)，行为要求见 [图执行规格](spec.md) 与 [JSON 业务值规格](../json-event-values/spec.md)。EventLog、状态写入、wave 和递归恢复见 [EventLog 设计](../../../docs/design/event-log.md) 与 [恢复规格](../event-log-recovery/spec.md)。

## Context

本文保留首版 Cognacta 图内核与 CLI dev 验收入口的设计快照。当前 JSON 输入、输出及恢复接口以 [图执行规格](spec.md)、[State/reducer 规格](../typed-state-reducers/spec.md)、[JSON 业务值规格](../json-event-values/spec.md)和 [API 附录](../../../docs/design/event-log-api.md)为准。

核心名词为 Graph、NodeInstance、Outcome、Directive、Transition、Deliver。Run Completed 表示图无剩余工作。CLI dev feature 默认关闭，提供六类确定性图；预期失败通过断言后退出 0；仅提供最终报告，不新增日志、span、指标或逐 wave 观察接口。

## Goals / Non-Goals

**Goals:**

- 实现可复用的内存图内核，包含统一 Input、强类型 State/Delta、固定 wave、有限并发、条件边、join、Sweep、template 实例及动态路由。
- 以公开 API 完成构图、执行和只读检查，保留全部实际错误，明确 Output、State 和路由的不同提交边界。
- CLI 运行六类确定性图，显示真实最终结果并自动验证；覆盖关键反例、并发与波次数边界。

**Non-Goals:**

- agent loop、模型/工具/数据库/HTTP 接入、前端、图文件或 DSL、插件系统。
- EventLog、序列化、崩溃恢复、重试、业务超时、interrupt/resume、人机审批、子 Run、分布式执行。
- 逐 wave 报告、观察器、事件总线、通用 Any 序列化、性能基准或生产运维埋点。保留 Suspended 名称，但 MVP 无产生它的公开入口。

## Decisions

### 1. crate 职责和依赖

| crate | 职责与根导出 | 依赖边界 |
| --- | --- | --- |
| cognacta-core | 图定义、执行、Input、State、reducer、错误；下节列出全部根导出 | std、Tokio、thiserror、bon，重导出 cognacta-derive 的 State；不依赖 CLI、Collector、axum、sqlx |
| cognacta-derive | 唯一公开项为 `#[proc_macro_derive(State, attributes(reducer))]` | syn/quote/proc-macro2、thiserror；不反向依赖 core，生成代码引用 `::cognacta_core` |
| cognacta-cli | 参数解析、私有样例、断言、报告及退出码 | 复用 Collector；core/Tokio 仅由 CLI dev feature 开启 |

core 仅承载各入口可共享的图业务能力；样例 State、控制完成先后的同步对象、报告类型不进入 core。derive 是过程宏必须独立 crate 的实际需要。core 库本身正常提供能力，不设置 dev 开关；CLI 的可选依赖仅避免默认二进制带入样例运行路径。

依赖统一在根 workspace.dependencies 管理。Tokio 复用已有版本，按实际用途启用 rt/sync 等 feature；bon、syn、quote、proc-macro2 的版本由 Cargo.lock 锁定，依赖调整运行 cargo deny。

### 2. cognacta-core 完整公共契约

以下代码是签名与类型契约，省略函数体；实现位于 crates/cognacta-core。根导出本节全部公开业务类型、错误类型及 State derive；内部模块、类型擦除 adapter、ready/Sweep 算法、Input 组装器、路由计划和 task 映射保持私有。标准 trait 实现：身份类型 Clone/Eq/Hash/Debug；状态枚举 Copy/Eq/Debug；所有错误实现 thiserror 的 Error/Display/source。

#### 2.1 身份、输入与节点

```rust
pub struct NodeId(String);
impl NodeId {
    pub fn new(value: impl Into<String>) -> Self;
    pub fn as_str(&self) -> &str;
}
pub enum NodeKey {
    Static(NodeId),
    Instance { template: NodeId, key: String },
}
pub type SharedValue = std::sync::Arc<dyn std::any::Any + Send + Sync>;
pub enum Origin { Run, Node(NodeKey) }
pub struct SourceRef {
    pub origin: Origin,
    pub value_type: std::any::TypeId,
    pub index: usize,
}
pub struct Input { /* private */ }
impl Input {
    pub fn entry<T: std::any::Any + Send + Sync>(&self) -> Result<&T, Error>;
    pub fn one<T: std::any::Any + Send + Sync>(&self, source: &NodeId)
        -> Result<&T, Error>;
    pub fn many<T: std::any::Any + Send + Sync>(&self, source: &NodeId)
        -> Result<Vec<&T>, Error>;
    pub fn all<T: std::any::Any + Send + Sync>(&self) -> Result<Vec<&T>, Error>;
    pub fn origins(&self, source: &NodeId) -> &[SourceRef];
    pub fn entry_origins(&self) -> &[SourceRef];
}
pub struct NodeContext<S: State> {
    pub state: std::sync::Arc<S>,
    pub run_id: String,
    pub key: NodeKey,
}
pub struct Outcome<S: State, O = SharedValue> {
    pub value: Option<O>,
    pub state_delta: S::Delta,
    pub directive: Option<Directive>,
}
pub enum Directive {
    Transition { target: NodeId, payload: Option<SharedValue>, immediate: bool },
    Deliver(Vec<DeliverTarget>),
}
pub struct DeliverTarget {
    pub template: NodeId,
    pub payload: SharedValue,
    pub key: String,
}
pub trait NodeInstance<S: State>: Send + Sync + 'static {
    type Output: Send + Sync + 'static;
    fn run<'a>(&'a self, input: &'a Input, ctx: NodeContext<S>)
        -> impl std::future::Future<Output = Result<Outcome<S, Self::Output>, Error>>
            + Send + 'a;
}
```

NodeId 为不解析的逻辑身份，不额外添加字符规范；Graph 检查重复及引用关系。Instance 的 `(template,key)` 在一份 Run 内唯一。普通节点重跑仍用同一个 NodeKey，不引入 CallId。Output 的外层 None 表示没有输出；Output 本身为 Option<T> 时 Some(None) 仍是一份值。

输入真实值只存于 TypeId→Vec<SharedValue>；来源索引与 entry 仅存 SourceRef。TypeId 取 Arc 内真实值的类型，不能取 Arc 类型。Input 只由内部组装器创建和冻结，不公开可变入口。

entry/one 按来源和类型过滤后必须恰好一份，many/all 可空，读取错误为 Error::Input。普通输入来自已 Completed 且 live 的直接前驱，同一前驱有多条 live 边也只贡献一份 Output；普通 Output 为 Vec 时不展开。普通来源按 Graph 注册顺序，template 来源内按实例创建顺序，外部值在前并保留调用方顺序。

外部输入为 Origin::Run，不伪造节点。Transition 有 payload 时替换本次普通输入，没有 payload 按 entry/边规则组装；Deliver 实例只接收自己的 payload。动态 payload 来源是 writer 的 NodeId/NodeKey；template 扇入按 template NodeId 分组、保留每个 Instance Origin。entry 被重新激活且无 payload 时仍可读原 Run 输入。

#### 2.2 State、reducer 与 derive

```rust
pub enum WritePolicy { SingleWriter, MultiWriter }
pub struct StateField<F> {
    pub id: F,
    pub name: &'static str,
    pub policy: WritePolicy,
}
pub trait State: Send + Sync + 'static {
    type Delta: Default + Send + 'static;
    type Field: Copy + Eq + std::hash::Hash + Send + Sync + 'static;
    fn fields() -> &'static [StateField<Self::Field>];
    fn merge_batch(&mut self, deltas: Vec<Self::Delta>) -> Result<(), Error>;
}
pub trait Reducer<T> {
    type Delta: Send + 'static;
    const POLICY: WritePolicy;
    fn reduce(&mut self, current: &T, delta: Self::Delta) -> Result<T, Error>;
    fn finish(self, value: T) -> Result<T, Error>;
}
pub struct Override;
pub struct Append;
pub struct Merge;
pub struct Add;
pub struct Sort<R, F> { /* private */ }
impl<R, F> Sort<R, F> {
    pub fn new(reducer: R, compare: F) -> Self;
}
```

四个无状态 reducer 实现 Default，允许结构体字面量构造。Override: Reducer<T,Delta=T>（T: Send+'static），策略 SingleWriter，不要求 Clone；Append 用 Vec<T>，T: Clone+Send+'static；Merge 用 HashMap<K,V>，K: Eq+Hash+Clone+Send+'static、V: Clone+Send+'static；Add 为各 Rust 整数类型实现，使用 checked_add。后三者 MultiWriter。Sort<R,F> 为 Vec<T> 组合 R: Reducer<Vec<T>> 与 F: Fn(&T,&T)->Ordering，继承 Delta/POLICY，finish 调用内部 finish 后稳定排序一次。

`#[derive(State)]` 首版支持具名字段 struct（含其泛型与 where 约束）；不支持 enum/union/tuple struct，给出字段或类型位置诊断。每字段恰好一个 `#[reducer(R)]` 或 `#[reducer(R, init = expression)]`。生成同可见性的 `<Name>Delta`、`<Name>Field`（字段名转 PascalCase，歧义报编译错误），关联类型与必要字段对调用方可达。Delta 字段为 `Option<<R as Reducer<T>>::Delta>`；Default 逐字段 None，不要求内层 Delta Default；Field 为可枚举的强类型字段身份。

默认通过 R::default() 构造；指定 init 时只要求表达式产生 R。Sort 属性写完整类型，例如 `Sort<Append, fn(&String, &String) -> Ordering>`，init 提供匹配函数指针。derive 生成的 core 路径固定为 `::cognacta_core`，本版不支持依赖重命名；在 core 自测中设置自身 crate 别名。编译期检查实际类型与 Send/Sync 约束，不要求 State 整体 Clone 或 Delta Clone/Sync/序列化。

proc-macro crate 因 Rust 导出限制不提供普通公共 Error。其唯一公开调用是 `state(input: proc_macro::TokenStream) -> proc_macro::TokenStream`（由 derive 机制调用）；内部私有 thiserror Error 保存 syn::Error/span 等来源，并转换为定位准确的 compile_error，不 panic。生成代码中所有可失败业务入口返回 core::Error。这是宏编译诊断边界，不另设运行时错误体系。

#### 2.3 构图、配置与执行

```rust
pub enum Join {
    All,
    Any,
    Custom(std::sync::Arc<dyn Fn(usize, usize) -> bool + Send + Sync>),
}
pub struct Edge<S: State> {
    pub source: NodeId,
    pub target: NodeId,
    pub when: Option<std::sync::Arc<dyn Fn(&S) -> bool + Send + Sync>>,
}
pub enum DirectiveTarget { Transition(NodeId), Deliver(NodeId) }
pub struct Node<S: State> { /* private */ }
impl<S: State> Node<S> {
    pub fn new<N: NodeInstance<S>>(id: NodeId, instance: N) -> Self;
    pub fn join(self, join: Join) -> Self;
    pub fn template(self, enabled: bool) -> Self;
    pub fn terminal(self, enabled: bool) -> Self;
    pub fn writes(self, fields: Vec<S::Field>) -> Self;
    pub fn declared_targets(self, targets: Vec<DirectiveTarget>) -> Self;
}
pub struct Graph<S: State> { /* private */ }
impl<S: State> Graph<S> {
    pub fn build(nodes: Vec<Node<S>>, edges: Vec<Edge<S>>, entries: Vec<NodeId>)
        -> Result<Self, Error>;
}
pub struct SchedulerConfig { /* private */ }
impl SchedulerConfig {
    pub fn new(max_concurrency: usize, max_waves: usize) -> Result<Self, Error>;
    pub fn max_concurrency(&self) -> std::num::NonZeroUsize;
    pub fn max_waves(&self) -> usize;
}
pub struct Scheduler { /* private */ }
impl Scheduler {
    pub fn new(config: SchedulerConfig) -> Self;
    pub async fn run<S: State>(&self, graph: &Graph<S>, run_id: String,
        initial_state: S, entry_values: Vec<SharedValue>) -> Run<S>;
}
```

多参数入口使用 bon：Graph::build 配置显式 start_fn=builder、finish_fn=build、builder_type=GraphBuilder；SchedulerConfig::new 配置 builder/build/SchedulerConfigBuilder；Scheduler::run 配置 run_builder/call/SchedulerRunBuilder。显式 start_fn 保留上面的公开位置参数函数，并提供命名参数入口；两者调用同一校验逻辑。三个 builder 类型及其 bon 状态模块在根公开可达，不手写第二套校验。

Node 默认普通、非 terminal、Join::All、无声明写入/动态目标；Graph 接收配置后不可变。Graph::build 一次检查重复 ID、未知端点/entry、template 角色、已声明目标、无合法入口和可证明的 SingleWriter 冲突。entries 空时选无普通入边的非 template 节点；显式 entry 可以有入边，但不能是 template。template 只能作为普通边的 source，由 Deliver 创建实例，不能作为普通边 target 或最终 terminal。重复边保留 join 的按边计票语义。

`writes` 是完整、保守的可能写入集合，不授予可变 State。静态检查至少覆盖纯无条件静态图的同时 entry 和 diamond 并行层；顺序链允许重复写字段。仅在能证明分组时拒绝同波 SingleWriter 潜在冲突。含 when/template/动态重激活的关系不作假证明，运行时仍按实际 Some 计数；声明不能用来跳过真实 Delta 校验。未声明的动态目标仍允许计算，但路由时必须检查。

配置明确拒绝并发数 0；max_waves=0 合法，任何待启动非空 wave 都因配额失败。run 返回完整 Run，不以单个 Result 丢弃错误集合。库调用方应 await 完成；强制 drop/abort 不承诺完整结算。

#### 2.4 Run 只读入口

```rust
pub enum NodeStatus { Pending, Running, Completed, Skipped, Failed }
pub enum RunStatus { Running, Suspended, Completed, Failed }
pub struct NodeRun { /* private input/output/status/attempts */ }
pub struct RunOutput { pub values: std::collections::HashMap<NodeId, SharedValue> }
pub struct Run<S: State> { /* private */ }
impl<S: State> Run<S> {
    pub fn state(&self) -> &S;
    pub fn status(&self) -> RunStatus;
    pub fn node(&self, key: &NodeKey) -> Option<&NodeRun>;
    pub fn instances(&self, template: &NodeId) -> &[NodeKey];
    pub fn errors(&self) -> &[RunError];
    pub fn final_output(&self) -> Option<&RunOutput>;
    pub fn waves(&self) -> usize;
}
impl NodeRun {
    pub fn input(&self) -> Option<&Input>;
    pub fn status(&self) -> NodeStatus;
    pub fn output(&self) -> Option<&SharedValue>;
    pub fn attempts(&self) -> u32;
}
```

普通节点在 Run 开始时创建 Pending 记录；template 定义不建静态 NodeRun；合法 Deliver 才创建实例。Input 保存为 Arc<Input>，在实际执行前冻结；attempts 仅实际 spawn 加一。Transition rearm 清除旧 Input/Output、设为 Pending，保留 NodeKey 与 attempts。只保留同身份最近一次记录，没有可变 Run/State 接口或历史事件读取入口。

#### 2.5 统一 Error 与跨边界转换

根 Error 以及下列所有分类均为公开 thiserror 类型。以下是完整变体载荷契约；所有真实错误载荷通过标准 source 链保留。

```rust
pub enum Error {
    Graph(GraphError), Config(ConfigError), Input(InputError),
    Node(NodeError), Merge(MergeError),
}
pub enum GraphError {
    DuplicateNode { node: NodeId },
    UnknownEdgeEndpoint { node: NodeId },
    UnknownEntry { node: NodeId },
    NoEntry,
    InvalidTemplateRole { node: NodeId },
    InvalidDeclaredTarget { writer: NodeId, target: NodeId },
    ConcurrentSingleWriter { field: &'static str, writers: Vec<NodeId> },
}
pub enum ConfigError { ZeroConcurrency }
pub enum InputError {
    MissingSource { source_node: NodeId },
    Cardinality { operation: &'static str, source_node: Option<NodeId>,
        expected_type: &'static str, actual: usize },
    TypeMismatch { expected_type: &'static str },
}
pub enum NodeError {
    Execution(Box<dyn std::error::Error + Send + Sync + 'static>),
    Task(Box<dyn std::error::Error + Send + Sync + 'static>),
}
pub enum MergeError {
    SingleWriterConflicts { fields: Vec<&'static str> },
    Overflow { field: Option<&'static str> },
    Reduce { field: Option<&'static str>,
        source: Box<dyn std::error::Error + Send + Sync + 'static> },
    Finish { field: Option<&'static str>,
        source: Box<dyn std::error::Error + Send + Sync + 'static> },
}
pub enum DirectiveError {
    UnknownTarget { target: NodeId },
    WrongTargetKind { target: NodeId },
    DuplicateInstanceKey { template: NodeId, key: String },
}
pub enum RunError {
    Node { key: NodeKey, source: Error },
    Merge(Error),
    InvalidDirective { writer: NodeKey, source: DirectiveError },
    Stalled,
    MaxWaves,
    Invariant(&'static str),
}
impl Error {
    pub fn execution<E: std::error::Error + Send + Sync + 'static>(source: E) -> Self;
}
```

GraphError/ConfigError/InputError/NodeError/MergeError 单向 From 到根 Error，保留 source；根 Error 公开 execution 构造器，供业务错误归入 Error::Node(NodeError::Execution)。标准错误 source 只指真实错误对象；输入的业务来源字段命名为 source_node，不让 thiserror 将 NodeId 误识别为错误来源。

错误边界：Input、NodeInstance、State、Reducer 都是本 crate 自有 API，统一使用 Result<T,Error>；Run.errors 仍是 Vec<RunError>。Scheduler 在节点出口包装 RunError::Node{key,source:原Error}，在 merge 出口包装 RunError::Merge(原Error)，因此自定义 reducer 的真实错误也有明确阶段，不靠无上下文互转识别。非法指令在内部校验边界直接产生 DirectiveError，再附 writer；它不是节点执行错误。Task 的 JoinError 装箱保留真实 source，避免把 Tokio 类型写进公共签名。

独立 reducer 不知道 State 字段名时使用 field=None，derive 在实际字段边界填 Some(字段名)，保留内置 Overflow 分类；自定义 reduce/finish 返回其他 Error 时以 MergeError::Reduce/Finish 保留原 Error 为 source。SingleWriter 预检列出全部冲突字段。根 Error 的 Display 只给安全分类与受控上下文，不能展开业务文本/source 链。

CLI 二进制 Error 继续汇总 Arguments、Io、Observability，dev 增加 Core(core::Error) 和 CheckFailed；只在验收失败时返回 CheckFailed。Run.errors 不自动 `?` 到 CLI Error：它们首先参与期望比较。报告构图失败时注明 `run=not-started` 并判 FAIL；不存在的场景仍为参数错误 2。

### 3. ready、join 与 Sweep

每次全量重算 ready：普通节点按注册顺序，实例随后按 Deliver 创建顺序。只选 Pending；实例、entry、一次性 immediate 激活直接 ready；其余无入边普通节点等待。先检查全部入边的前驱 terminal（包括 when=false 的边），然后只读 State 求 live edges；无 live 或 done=0 均不 ready；All 要求 done>=total，Any 要求 done>=1，Custom 接收相同 done/total 且不能绕过闸门。

普通 Completed 为 terminal 且计 done；Skipped/Failed 为 terminal 不计 done；Pending/Running 均不 terminal。Skipped 的 live 边仍计 total，因此 All 可能 Stalled。Any 不竞速、不取消其他路径。when 与 Custom 必须为纯只读判断，同一 State/票数下结果一致，不用内部可变状态、随机数或外部 I/O 改变结果。

template 前驱按每条 live 边投一票；有实例时全体实例 terminal 才算 terminal/done，Input 只收 Completed 且有 Output 的实例。实例失败仍使 Run 在本 wave 后失败，不能借此继续聚合。无实例默认不 terminal；正常 ready 空、Sweep 无进展后才以 empty_fanout 再算 ready，空 template 贡献一票，聚合读到空列表。

只在正常 ready 空时 Sweep Pending、非 entry、有入边的普通节点。所有前驱 terminal 且没有 live+done 前驱才成为 Skipped 候选。当前候选在同轮临时判断中按 terminal+done 处理；提交 Skipped 后重算，允许 D、E 分两次 Sweep 清理；Sweep 不计 wave。孤立非 entry 无入边节点不被自动跳过。

### 4. wave、所有权与固定结算

ready Vec 冻结为一个逻辑 wave；K 只限制同时运行数，不能把补位拆成新 wave。task 用 Arc 执行体、Arc<Input> 和拥有值的 NodeContext，调用内部才借 &Input；私有适配器把 typed Output 包装一次为 SharedValue，Delta 按值移动。NodeInstance 本身使用原生 async 实现；异构存储仅内部使用对象安全 adapter，不把原生异步 trait 直接当 dyn。

task id→ready 下标只用于 JoinError 归属。完成顺序腾出槽位，结果保存在固定槽位；本 wave 有错误也继续排队成员，收齐后按 ready 顺序结算。所有 task State Arc 释放后 Arc::get_mut 获得唯一 State；业务不得泄露 State Arc、保留 Weak 借用阻止唯一访问、或通过内部可变性改变 State。唯一性失败记 Invariant，保留 Output，跳过合并和路由；此约束来自既有所有权契约，不增加锁、State Clone 或恢复路径。

barrier 固定为：

1. 保存全部成功 Output 并标 Completed；失败节点标 Failed、无 Outcome，按 ready 顺序收 Node 错误。
2. 对成功 Delta 尝试一次 merge_batch，即使已有节点错误；归并或唯一性错误追加在节点错误之后。
3. 无副作用验证全部成功 directive，收集所有可独立判断的错误，按 writer ready 顺序及 Deliver 列表顺序追加。
4. 有任何错误则 Run Failed、final_output=None，零路由；否则应用整批路由再重算 ready。

merge_batch 先检查所有 SingleWriter Some 数量，然后每个有更新字段构造一次 reducer，按 Delta ready 顺序和字段声明顺序暂存 reduce，全部成功后每字段 finish 一次，最后统一替换字段。None 不写，Some(None)/Some(空值) 也算一次写；任何 Result 错误使所有原字段不变，但不撤销成功 Output。Add 检查每步中间溢出；Append 与 Merge 按顺序工作，不假设交换律。外部副作用、内部可变性与 panic 不在 reducer 回滚保证内。

### 5. 路由和终止

Transition 目标必须为普通节点；Deliver 目标必须为 template，key 在已有实例和本批中均唯一。整批先验证后应用，合法项不能在发现非法项前先创建实例。Transition rearm 目标，immediate=true 添加下一次 spawn 消费的一次性许可；false 按正常规则等待。相同目标多个 Transition 按固定顺序处理，最后一个覆盖 payload/immediate（None/false 也覆盖），最终只有一次待执行调用。

执行循环依次为正常 ready → 若空则 Sweep 并提交重算 → 无新 Skipped 则空扇出兜底 → 有 ready 时在启动前检查 wave 配额 → 执行完整 wave。无 ready 后，errors 空且全部普通 NodeRun/已创建实例终态则 Completed，否则残留 Pending 导致 Stalled；不能把 Pending 改为 Failed/Skipped。恰好用完波次数且已无工作仍成功；有下一波才 MaxWaves。

final_output 仅 Completed 时为 Some(RunOutput)。优先选显式 terminal 普通节点；无显式标记时选无普通出边的普通 sink，拓扑判定不取决于 when 当前真假或 directive。只收 Completed 且有 Output 的候选；零值映射允许，单值也不拆包。template/实例经普通聚合节点提供最终值，不直接进入映射。

### 6. 仅通过公开 API 的调用示范

可执行示范见 [公开 API 集成测试](../../../crates/cognacta-core/tests/public_api.rs)。该测试仅从 cognacta_core 根导入类型，构造不同 Output 类型的节点，通过 builder 执行并复用 Graph，读取 Run 的状态、State 和 final_output，不访问私有模块。

### 7. dev 命令及六类图

调用方式：`cargo run -p cognacta-cli --features dev -- graph-check <SCENARIO>`。clap 只接受 `chain|diamond|branch|fanout|transition|settlement|all`。每个场景运行其固定变体；all 按表顺序跑全部 16 个变体，每个新建 Run，独立 State/同步对象。参数暂不开放任意图、输入、并发或波次数，以固定断言保证可复现。

| 家族 / 变体 | 图与固定输入 | 必须匹配的事实 |
| --- | --- | --- |
| chain / complete、limit | A→B→C；entry="hello"；A 输出 String，B 输出长度5并提交 length=5，C 输出 len=5；K=1；上限分别3/2 | complete 为3 waves、全部 Completed、terminal C；limit 为2 waves、C Pending/attempts=0、MaxWaves、保留 length=5、无 final_output |
| diamond / serial、parallel | A→{B,C}→D(All)；A 提交 count=10、labels=[A]；B/C 各返回所见count并 Add1、Append自身标记；K分别1/2，最大3波 | B/C 都读10；最终 count=12、labels=[A,B,C]、3 waves；D 收到两份有正确来源的值。parallel 受控先完成C，仍按B/C顺序结算 |
| branch / any、all | A→B→C 与 A→D→E→C；A→D 条件恒false，其余live；C分别Any/All；最大3波 | D/E Skipped、attempts=0；any 为3波 Completed；all 为2波 Failed(Stalled)，C Pending；all 中B成功不能掩盖E未提供成功票 |
| fanout / empty、one、many | planner Deliver worker 的0/1/3个实例，worker→aggregate(All)；Job依次1/2/3，实例返回同值并Add到total、Append到items；K=2，最大3波 | 0项为2波、空many、total=0；1项/3项为3波，total=1/6，items=[1]/[1,2,3]；Origin保留实例，多个实例的one读取报Cardinality；仅aggregate为最终输出 |
| transition / immediate、wait | A→P→Q→T；A另发Transition(T,payload=7,immediate=true/false)；P/Q各Add1到count，初始0；K=2，最大4波 | immediate：T与P同wave读count=0，共3波；wait：T在Q后读count=2，共4波；两者T的Input均只来自A的payload7，不含Q Output；每节点执行一次，无回边 |
| settlement / node-error、merge-error、directive-error、single-writer、multi-error | seed Deliver若干worker实例，worker→aggregate；seed已提交基准State；详见下一表 | 全部为2波Failed、aggregate Pending/attempts=0、final_output=None；按错误阶段精确检查产出、State和零路由，不以“发生任意错误”视为通过 |

branch 的 when 采用固定 false 使预期易算；另以核心单测检查“当仍有 ready 时不 Sweep”，最终报告不能证明内部 Sweep 发生时点。fanout 的一个 template 不因三个实例产生三票，核心 join 单测检查其按边计票。

settlement 共用字段 title:Option<String>/Override、items:Vec<String>/Append、count:u8/Add。seed 基准为 title=Some("seed"), items=["seed"], count=1；每个成功 worker 返回自身名称 Output、Append名称、Add1。所有变体 max_waves=3，node-error 使用K=1，其余使用K=2；worker实例key按w1、w2等创建。均注册 aux template 以检查有合法目标时也不得部分路由；不创建 aux 静态记录。

| 变体 | 本 wave 注入 | 期望 State / errors |
| --- | --- | --- |
| node-error | K=1，w1返回业务Err，排队w2/w3正常 | count=3、items=[seed,w2,w3]；1条Node(w1)，w2/w3仍执行并保存Output |
| merge-error | seed count改为255，w1/w2正常 | 全字段仍为seed基准、count=255；1条Merge/Overflow；w1/w2 Completed及Output保留 |
| directive-error | 仅w1正常并返回Deliver[合法aux实例,未知目标] | count=2、items=[seed,w1]；1条InvalidDirective/UnknownTarget；aux实例数0，w1仍Completed |
| single-writer | w1/w2都成功并额外写不同title | 全字段仍为seed基准；1条Merge/SingleWriterConflicts(title)；输出保留。动态实例使构图期不能提前确定数量 |
| multi-error | w1/w2返回Err；w3/w4成功、都写title、各发一个未知目标指令 | 全字段仍为seed基准；依次2条Node、1条Merge、2条InvalidDirective；5条全部保留，成功输出保留 |

纯静态 diamond 的声明冲突应在构图期拒绝，不能拿它假装测试运行时 SingleWriter；对应构图反例放 core UT。核心还须测试 Input 类型/数量错误、批次finish失败、重复实例key、无合法入口、回边一次性许可、max_waves=0与编译失败等契约，六类图不冒充全量测试。

CLI dev 分支建立 current-thread Tokio runtime 驱动异步任务，不把并发等同多线程；正式 Scheduler 不限制宿主 runtime。并行样例用私有通知/屏障及计数控制节点执行，K=1时不用需要兄弟同时启动的屏障；K=2时C完成路径最后释放B且不再await，单线程保证B后续poll晚于C返回。样例记录节点入口、所见State和完成证据，帮助断言；不打印成内核轨迹，不给 Run 增加观察口。核心单测直接检查 Pending/Running/补位和barrier边界。

所有有意失败以 Result 表达，不用panic制造普通样例失败；panic归属在核心task单测验证。断言器收集全部差异，不用第一个assert panic退出；测试框架可对验证结果作assert。测试宿主设置有界等待来发现调度回归，不把业务超时或自动重试加入Scheduler。

### 8. 最终报告和验收退出码

CLI 私有报告按家族/变体固定顺序输出，节点按注册顺序、实例按创建顺序。每个case显示 `case`、`run`、`check=PASS|FAIL`、实际waves、各NodeKey的status/attempts、样例State字段、每个实际Output和final_output、全部错误分类/节点上下文，以及每项断言的expected/actual或匹配结论。已知样例类型可downcast后手写格式化；不要求SharedValue实现Debug或Serialize。

示意（内容必须由实际数据生成）：

```text
case=branch/all run=failed check=PASS waves=2
node=A status=completed attempts=1
node=B status=completed attempts=1
node=C status=pending attempts=0
node=D status=skipped attempts=0
node=E status=skipped attempts=0
errors=[Stalled] final_output=none
assert=run-status expected=failed actual=failed PASS
assert=error-kind expected=Stalled actual=Stalled PASS
```

示意省略该图其余业务字段；实际实现按上述报告字段完整输出。预期值只用于比较，禁止将它们填成actual。Run Failed与Check PASS可同时成立；错误条数、分类、归属、状态和保留State全部匹配才通过，不能“任何失败都算预期”。Output缺失或downcast不符也是差异。all继续独立后续case，最终输出cases/passed/failed汇总；stdout写入失败立即返回1，不重跑图。

| 情况 | 进程结果 |
| --- | --- |
| 所有被选case符合预期，包括预期失败 | 0 |
| 任一断言不符、样例意外构图失败、报告I/O失败 | 1 |
| 缺少/未知场景，未启用dev却传graph-check | 2 |
| help/version | 0 |

默认构建的帮助不显示graph-check；dev帮助显示全部七个选择。现有无参数版本输出保持不变。缺少场景不默认运行all，避免误触全部案例。

### 9. 观测、安全与公共边界

沿用入口Collector初始化/关闭和现有3秒关闭/最终诊断总预算；该预算在业务结束后开始，不限制图执行时间。遥测不可用、输出背压或关闭超时不改变验收结论或业务stdout。报告写入失败是CLI自身I/O失败，与允许丢弃的遥测不同。

当前不新增日志、span或指标，原因是：最终报告与断言足以满足当前开发验收，不存在运维接入需求。样例报告只展示固定合成数据，不打印真实业务输入、凭据或完整source链，也不转发为tracing事件。已有Collector的安全诊断保持原行为。测试验证未初始化core、不可用遥测端点和stderr背压下相同结论，不新建exporter。

## Risks / Trade-offs

- [最终报告无法证明所有过程性质] → CLI由受控节点补充证据；ready/Sweep/排队状态和barrier顺序由core单测验证，报告不伪造历史轨迹。
- [语义与直觉不同] → 单列Any仍等待前驱、Skipped不计成功票、失败wave仍合并成功Delta三类反例，写成可执行断言。
- [强类型不覆盖动态输入与路由] → 编译诊断、构图检查、运行时访问分别验收；不声称跨边Input编译期匹配。
- [Append/Merge暂存复制成本] → 首版按字段复制保证Result原子性；实际规模证明瓶颈后再改，不要求整体State Clone。
- [自定义回调破坏纯度或泄露State所有权] → 保留已确认的只读/不逃逸契约和Invariant分类，不通过新增锁或补偿框架掩盖。
- [开发报告与运行错误混淆] → 分列run与check，expected/actual和全错误集合决定退出码。
