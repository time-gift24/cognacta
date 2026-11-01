# 子图调度公开 API 与实施契约

状态：拟议接口，尚未实现。需求和测试决策见 [规格正文](proposal.md)。本文件用于满足库 crate 的完整公开接口、构造入口、统一错误和调用示范要求；不修改现行正式规格。

## 1. 职责与根导出

本次能力位于现有 cognacta-core：Graph 保持静态，State 保持归并职责，NodeInstance 保持普通节点执行体职责，Scheduler trait 定义调度调用，LocalScheduler 是现有本地实现的新名称。调用方分别持有调度器和目标，不创建 GraphCall 或 LocalGraphCall。

core 根新增或调整的导出如下：

| 导出 | 说明 |
| --- | --- |
| Scheduler<T, O, R = ()> | 只有 call 的公开调度 trait |
| LocalScheduler | 原具体 Scheduler 的本地实现；new、run 及 Scheduler 实现 |
| SchedulerConfig、SchedulerConfigBuilder、scheduler_config_builder | 保留每 Run 并发与 max_waves 配置契约 |
| SchedulerRunBuilder、scheduler_run_builder | LocalScheduler.run 的 bon 具名入口及状态模块 |
| Graph<S, O, R = ()> | 静态节点/边/入口、唯一返回节点、初始化函数 |
| GraphBuilder、graph_builder | 使用 Default 初始化的构图 builder 及状态模块 |
| GraphWithInitializerBuilder、graph_with_initializer_builder | 自定义初始化构图 builder 及状态模块 |
| Node<S, R = ()>、NodeContext<S, R = ()>、NodeInstance<S, R = ()> | 增加资源类型，沿用普通节点及 template 规则 |
| Outcome<S, O> | 值为 Option<Arc<O>>，O 是业务类型 |
| GraphInput、Input、SharedValue | 按入口分配的调用输入及既有节点输入读取能力 |
| RunContext<R = ()>、RunContextRootBuilder、run_context_root_builder | 运行身份、深度预算、资源及根上下文构造入口 |
| Run<S, O> | 已完成初始化的一次运行及类型化最终输出 |
| Error、CallError | crate 统一错误及稳定调用错误分类 |

既有 State trait/derive、NodeId、NodeKey、Origin、SourceRef、Edge<S>、Join、Directive、DeliverTarget、DirectiveTarget、NodeRun、NodeStatus、RunStatus、StateField、WritePolicy、Reducer、Add、Append、Merge、Override、Sort 及既有错误类型继续从根可达。State trait 和 derive 不增加初始化方法。

旧 RunOutput 节点映射和 Node.terminal 标记由唯一类型化图返回契约替代。内部类型擦除、初始化回调保存形式、标识生成辅助、批量执行错误聚合及调度算法保持私有。bon 生成的必要 builder 与状态模块公开可达，但不引入额外的业务标记 trait。

core 不依赖 axum、clap、sqlx、Collector 或遥测 SDK。实现时按实际需要通过 workspace 引入已存在的 tracing 和 uuid；子 ID 可使用现有 UUID v4 能力，公开 API 只承诺新的 String 身份，不把格式作为业务或测试契约。无新 crate、数据库迁移或服务客户端。

## 2. 输入和节点契约

以下 Rust 块是公开声明草案；除明确标注的调用示范外，不包含库函数实现。未调整的读取方法保留现有语义。

```rust
pub type SharedValue = std::sync::Arc<dyn std::any::Any + Send + Sync>;

pub struct Input { /* private */ }
impl Input {
    pub fn new(values: Vec<SharedValue>) -> Self;
    pub fn entry<T: std::any::Any + Send + Sync>(&self) -> Result<&T, Error>;
    pub fn one<T: std::any::Any + Send + Sync>(
        &self, source: &NodeId,
    ) -> Result<&T, Error>;
    pub fn many<T: std::any::Any + Send + Sync>(
        &self, source: &NodeId,
    ) -> Result<Vec<&T>, Error>;
    pub fn all<T: std::any::Any + Send + Sync>(&self) -> Result<Vec<&T>, Error>;
    pub fn origins(&self, source: &NodeId) -> &[SourceRef];
    pub fn entry_origins(&self) -> &[SourceRef];
}

pub struct GraphInput { /* private */ }
impl GraphInput {
    pub fn new(entries: std::collections::HashMap<NodeId, Input>) -> Self;
    pub fn entry(&self, node: &NodeId) -> Result<&Input, Error>;
}

pub struct Outcome<S: State, O> {
    pub value: Option<std::sync::Arc<O>>,
    pub state_delta: S::Delta,
    pub directive: Option<Directive>,
}

pub struct NodeContext<S: State, R = ()> {
    pub state: std::sync::Arc<S>,
    pub key: NodeKey,
    pub run: RunContext<R>,
}

pub trait NodeInstance<S: State, R = ()>: Send + Sync + 'static
where
    R: Send + Sync + 'static,
{
    type Output: Send + Sync + 'static;
    fn run<'a>(
        &'a self,
        input: &'a Input,
        ctx: NodeContext<S, R>,
    ) -> impl std::future::Future<
        Output = Result<Outcome<S, Self::Output>, Error>,
    > + Send + 'a;
}

pub struct Node<S: State, R = ()> { /* private */ }
impl<S: State, R: Send + Sync + 'static> Node<S, R> {
    pub fn new<N: NodeInstance<S, R>>(id: NodeId, instance: N) -> Self;
    pub fn join(self, join: Join) -> Self;
    pub fn template(self, enabled: bool) -> Self;
    pub fn writes(self, fields: Vec<S::Field>) -> Self;
    pub fn declared_targets(self, targets: Vec<DirectiveTarget>) -> Self;
}
```

Input.new 建立只含 Origin::Run 的入口输入，允许空 Vec。GraphInput.new 按传入 Input 的值顺序建立新调用的入口来源，不沿用任何父节点来源；共享已有业务值的 Arc，不深复制业务对象。只读构造后的数据不提供可变绕过入口。

GraphInput 构造不依赖某张 Graph，入口键集合在 LocalScheduler.run 开始初始化之前对该 Graph 验证一次。缺失/多余键统一报告；HashMap 的迭代顺序不决定节点调度或 wave 结算顺序。GraphInput.entry 只负责一次按键读取，失败返回 Error::Input；节点数据的类型和数量仍在 Input 的读取边界处理，不新增重复预检或动态输入 schema。

NodeInstance.Output 是业务 O。内部 adapter 将 Arc<O> 直接擦除为 SharedValue；不能再次 Arc::new 包装，也不能继续把新的 Outcome<S, SharedValue> 当作无需调整的旧擦除记录。内部表示如何承载擦除后的 Outcome 不扩大公开范围。

普通输出 None 仍表示该节点没有输出。若返回节点最终没有值，则为图返回缺失；O = () 时必须产生 Some(Arc::new(()))。若业务 O = Option<T>，Some(Arc::new(None)) 是合法业务值。

## 3. 运行上下文与资源

```rust
pub struct RunContext<R = ()> { /* private */ }

impl<R: Send + Sync + 'static> RunContext<R> {
    pub fn root(
        run_id: String,
        max_depth: usize,
        resources: std::sync::Arc<R>,
    ) -> Self;

    pub fn child(&self, parent_node: &NodeKey) -> Result<Self, Error>;

    pub fn with_resources<T: Send + Sync + 'static>(
        &self,
        resources: std::sync::Arc<T>,
    ) -> RunContext<T>;

    pub fn run_id(&self) -> &str;
    pub fn parent_run_id(&self) -> Option<&str>;
    pub fn parent_node(&self) -> Option<&NodeKey>;
    pub fn depth(&self) -> usize;
    pub fn max_depth(&self) -> usize;
    pub fn resources(&self) -> &std::sync::Arc<R>;
}
```

root 配套 root_builder，以 run_id、max_depth、resources 为具名参数，build 返回 Self。max_depth = 0 合法。根 ID 继续由调用方提供，不新增未经讨论的 ID 格式限制；观测端负责安全编码和限长。

RunContext 可克隆身份和资源句柄，不要求 R: Clone。克隆上下文不代表创建新 Run；新的子身份必须通过 child 产生。child 先检查父 depth 是否已达到上限，允许时生成新 ID、设置 parent_run_id 和父 NodeKey、将 depth 加一并继承 max_depth。失败返回 Error::Call(CallError::DepthExceeded)，不启动子初始化或执行。

with_resources 保留全部身份和深度预算，仅显式替换资源句柄及其类型。父节点可以把该上下文交给另一个资源类型的调度实现；不能借资源替换重置深度或父关系。默认 child 复用本次显式传入上下文中的资源 Arc。RunContext 从不包含父 State。

NodeContext 由本次 Run 的调度过程建立，state 仍为当前 wave 的只读 State 快照。执行体不应泄漏该 State Arc 或通过内部可变性绕过 Delta 归并；这沿用现有规则，不新增子图专属生命周期机制。

## 4. 静态 Graph 与初始化构造

```rust
pub struct Graph<S: State, O, R = ()> { /* private */ }

impl<S, O, R> Graph<S, O, R>
where
    S: State + Default,
    O: Send + Sync + 'static,
    R: Send + Sync + 'static,
{
    pub fn build(
        nodes: Vec<Node<S, R>>,
        edges: Vec<Edge<S>>,
        entries: Vec<NodeId>,
        return_node: NodeId,
    ) -> Result<Self, Error>;
}

impl<S, O, R> Graph<S, O, R>
where
    S: State,
    O: Send + Sync + 'static,
    R: Send + Sync + 'static,
{
    pub fn build_with_initializer<F, Fut>(
        nodes: Vec<Node<S, R>>,
        edges: Vec<Edge<S>>,
        entries: Vec<NodeId>,
        return_node: NodeId,
        state_initializer: F,
    ) -> Result<Self, Error>
    where
        F: Fn(std::sync::Arc<GraphInput>, RunContext<R>) -> Fut
            + Send + Sync + 'static,
        Fut: std::future::Future<Output = Result<S, Error>> + Send + 'static;
}
```

build 配套 Graph::builder；build_with_initializer 配套 Graph::builder_with_initializer。二者均使用 nodes、edges、entries、return_node 具名配置并以 build 结束；后者额外必填 state_initializer。这些是 bon 构造入口，不是两套执行模式。

两个构造入口经过相同图校验。已有重复 ID、引用、入口、template、动态目标和静态写冲突检查继续有效。新增检查为返回节点存在、为普通静态节点、输出类型与 O 一致。Node.new 捕获其声明输出类型；由于节点列表异构，匹配在构图边界验证，不声称 Rust 编译器能证明任意 NodeId 所指节点的输出类型。构造成功后内部依靠该约束流转，不增加多层类型预检。

return_node 必填，不再扫描 terminal 标记或默认叶子作为返回值；不要求返回节点零出度。重激活及其输入/输出清除沿用普通节点规则。执行结束时读取该返回节点当前有效的完成结果；先前某次执行的旧输出不能绕过后续重激活或失败。

构图不执行初始化。每次 run 校验入口后，调用本图初始化函数得到新的 S，或者执行 S::default()。初始化函数拿到本次调用的 GraphInput Arc 和拥有本次身份/资源的 RunContext，可以使用 async fn 实现；初始化函数的 future 必须 Send。此形式不新增 async-trait、初始化 trait 或 Default 的全局约束。

## 5. Scheduler trait 与本地实现

```rust
pub trait Scheduler<T, O, R = ()>: Send + Sync
where
    T: Sync,
    O: Send + Sync + 'static,
    R: Send + Sync + 'static,
{
    fn call<'a>(
        &'a self,
        target: &'a T,
        input: GraphInput,
        parent: &'a RunContext<R>,
        parent_node: &'a NodeKey,
    ) -> impl std::future::Future<Output = Result<std::sync::Arc<O>, Error>>
        + Send + 'a;
}

pub struct SchedulerConfig { /* private */ }
impl SchedulerConfig {
    pub fn new(max_concurrency: usize, max_waves: usize) -> Result<Self, Error>;
    pub fn max_concurrency(&self) -> std::num::NonZeroUsize;
    pub fn max_waves(&self) -> usize;
}

pub struct LocalScheduler { /* private */ }
impl LocalScheduler {
    pub fn new(config: SchedulerConfig) -> Self;

    pub async fn run<S, O, R>(
        &self,
        graph: &Graph<S, O, R>,
        input: GraphInput,
        context: RunContext<R>,
    ) -> Result<Run<S, O>, Error>
    where
        S: State,
        O: Send + Sync + 'static,
        R: Send + Sync + 'static;
}
```

LocalScheduler 为每组合法的 S、O、R 实现 Scheduler<Graph<S, O, R>, O, R>，call 方法签名严格遵循上述 trait。默认泛型静态分派，节点通过构造注入 Arc<E> 或其他实际所需所有权的 E；不把该原生异步 trait 直接当作对象安全 dyn trait。

SchedulerConfig 保留 builder/build。LocalScheduler.run 保留 run_builder/call 具名入口，参数为 graph、input、context；其中 builder 的终结方法 call 不等于 Scheduler trait 的子调用方法。文档及样例优先使用直接 run 调用来避免歧义；不另增一套同义执行入口。

一次本地 call 的顺序：从 parent.child(parent_node) 派生本次身份并检查深度；调用同一个 LocalScheduler 的 run；将成功获得的 Run 消费为结果。run 完成入口检查和异步初始化后，再使用既有 wave 调度流程。每次 run 独立建立执行任务集合，不能引入由父子共享并发名额造成的等待环。

run 是本地诊断入口，不放进统一 Scheduler trait。后续其他目标的实现可以实现 Scheduler<其目标类型, O, R> 并返回业务 Arc，不需要伪造 Graph、S 或本地 Run。外部实现仍须履行身份派生、深度继承、显式错误及观测契约；本次不实现该接入。

目标在 call 时显式传入。非循环嵌套可以由节点直接持有目标 Arc；自递归或相互调用使用应用资源中的固定 OnceLock 槽位，在图构造完毕后填入目标，节点执行时经 Context 读取。资源持有图，图及节点不反向持有资源对象，初始化闭包也不捕获该资源 Arc；这样组装值时不需要先拥有尚未构造的图，也不形成永久的强引用环。第 8.2 节给出包含深度拒绝验收的公开 API 示例。core 不因此新增目标注册表、GraphCall、LocalGraphCall、SubgraphNode 或节点工厂。

### 5.1 本地执行的内部结构与生命周期

本地 implementation 使用私有 Execution 对象直接持有一次执行的 Run，以及跨 wave 使用的调度临时数据。Execution 同时承载操作这些数据的调度行为，结束时交出其中的 Run；不另建一份运行记录或复制快照来同步状态。Execution 是内部实现名称，不新增公开类型、trait 或调用 interface。

入口与执行分文件，建议结构如下；这些文件随本次功能实现建立，不提前创建空 module：

```text
crates/cognacta-core/src/scheduler/
├── mod.rs          # Scheduler trait、必要导出
├── local.rs        # LocalScheduler、SchedulerConfig、run / call 入口
├── execution.rs    # Execution 及完整调度算法
└── observation.rs  # Run 生命周期观测的私有 implementation
```

scheduler 及其内部 module 保持私有；公开类型、bon builder 和必要状态 module 仍按第 1 节从 crate 根可达。Execution 的使用范围限制在 scheduler module 内。ready、Sweep、输入组装、wave 执行、归并与路由共同维护一组调度不变量，集中在 execution.rs，不按步骤再拆出可替换的 module 或 adapter。

状态按实际生命周期归属：

| 存放位置 | 数据与职责 |
| --- | --- |
| Run | State、运行状态、节点输入/输出与执行记录、按 template 查询的实例记录、错误列表、最终输出、波数及公开读取所需的运行身份信息；执行后继续供调用方检查 |
| Execution | 直接持有上述 Run，并保存 Graph 引用、本次调用输入与 RunContext、执行配置、Transition 许可、实例输入、实例创建顺序等跨 wave 数据 |
| 单次 wave 的局部变量 | ready 列表、State 快照、JoinSet、任务与结果位置映射、任务结果、待归并 Delta 和待处理 Directive；随该 wave 执行和结算使用 |

当前 Run 中仅用于安排实例调度顺序的 instance_order 移入 Execution；Run 中供 instances 读取的按 template 实例记录继续保留。Run 只保存公开诊断所需的身份信息，不为复用上下文而持有整份 RunContext<R> 或资源对象。调度持有的 wave State 快照在归并前释放，保持既有 State 所有权及归并约束。

调用与交付顺序为：

```text
call：派生子身份、检查深度 → run → Run.into_result
run：开始观测 → 校验入口 → 初始化 State → 创建 Execution → 执行并结算 → 返回 Run
```

1. LocalScheduler 保存配置，由 run 管理一次执行的启动与收尾。run 的 future 首次被 poll 时开始观测，随后对目标 Graph 校验一次入口集合，再执行本次 State 初始化；总耗时包含这些启动步骤。
2. 入口校验或初始化失败直接返回第 7 节规定的 Error，此时尚未创建 Execution 和完整 Run。只有取得有效 State 后才创建 Run 并交给 Execution，因此 Run.state 始终保持返回 &S 的契约。
3. Execution 使用本次输入、上下文和配置驱动既有调度流程；各 Run 的任务集合与并发名额独立。节点、归并、路由、停滞及 wave 上限等执行错误继续保存在所持有的 Run 中，保持原有稳定结算和错误顺序。
4. Execution 在整图执行结束时按第 6、7 节确认最终状态与类型化返回：返回节点提前完成不结束图，执行失败阻止结果交付，只有其他阶段成功而返回值缺失时记录 MissingOutput。结束时移交已有 Run，调度临时数据随 Execution 结束释放。
5. call 通过同一个 LocalScheduler.run 执行子调用；启动错误直接传播，取得 Run 后交由 Run.into_result 统一转换为业务 Arc 或调用错误。call 不再次解释 RunStatus 或错误列表，也不维护第二套本地执行生命周期。

observation.rs 使用 tracing 承载已确认的 span、安全字段和完成/失败/本地取消结算，由 run 统一管理其生命周期；观测 guard 覆盖初始化和 Execution 执行，不随返回的 Run 延后收尾。深度拒绝在 call 派生身份时关联发起调用的父位置，不创建未执行子 Run 的观测。未 poll、正常 drop、预期错误和 panic 的处理沿用第 9.1 节，不新增日志类别、调度指标、观测回调 seam 或停止协议。

此次组织调整改善状态与行为的 locality，公开 interface 和测试 seam 保持第 9 节约定。继续通过 LocalScheduler.run 与 Scheduler.call 验证固定 wave、稳定结算、路由及子调用行为；保留根导出使用样例和编译约束验收，不为测试开放 Execution 或其临时状态。

## 6. Run 的公开读取与结果交付

```rust
pub struct Run<S: State, O> { /* private */ }
impl<S, O> Run<S, O>
where
    S: State,
    O: Send + Sync + 'static,
{
    pub fn state(&self) -> &S;
    pub fn status(&self) -> RunStatus;
    pub fn node(&self, key: &NodeKey) -> Option<&NodeRun>;
    pub fn instances(&self, template: &NodeId) -> &[NodeKey];
    pub fn errors(&self) -> &[RunError];
    pub fn final_output(&self) -> Option<&std::sync::Arc<O>>;
    pub fn into_result(self) -> Result<std::sync::Arc<O>, Error>;
    pub fn waves(&self) -> usize;
    pub fn run_id(&self) -> &str;
    pub fn parent_run_id(&self) -> Option<&str>;
    pub fn parent_node(&self) -> Option<&NodeKey>;
    pub fn depth(&self) -> usize;
    pub fn max_depth(&self) -> usize;
}
```

只有初始化成功后才有完整 Run，因此 state 继续返回 &S，不引入 Option<S>。run 的启动阶段失败直接 Err；完成初始化后的节点、merge、directive、停滞及 wave 上限失败按现有诊断机制保留在 Run。返回缺失同样使 Run Failed，记录相应 RunError。成功 Run 必须持有唯一的 Arc<O>。

into_result 消费 Run：Completed 且有最终输出时交付同一个 Arc；失败转换为稳定调用错误。调用方若要保留诊断记录，应先通过只读方法检查 Run，或在成功时克隆 final_output 的 Arc。该消费操作不向父节点暴露子 State。

RunStatus 和 NodeStatus 不新增成员。本轮执行入口仍只交付已经完成或失败的 Run；原有 Suspended 名称及未来恢复语义留待 interrupt/resume 变更，不通过本次结果接口推导停止协议。

## 7. thiserror 统一错误与边界转换

所有 crate 自有的可失败公开入口返回 Result<_, cognacta_core::Error>。根 Error 继续保留 Graph、Config、Input、Node、Merge 五个既有变体，新增 Call。以下声明给出新增的统一错误出口和完整调用分类；原有变体的来源字段及格式维持现有契约。

```rust
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("graph error: {0}")]
    Graph(#[from] GraphError),
    #[error("configuration error: {0}")]
    Config(#[from] ConfigError),
    #[error("input error: {0}")]
    Input(#[from] InputError),
    #[error("node error: {0}")]
    Node(#[from] NodeError),
    #[error("merge error: {0}")]
    Merge(#[from] MergeError),
    #[error("call error: {0}")]
    Call(#[from] CallError),
}

#[derive(Debug, thiserror::Error)]
pub enum CallError {
    #[error("invalid graph input")]
    Input {
        #[source]
        source: Box<dyn std::error::Error + Send + Sync + 'static>,
    },
    #[error("maximum run depth exceeded")]
    DepthExceeded { parent_depth: usize, max_depth: usize },
    #[error("state initialization failed")]
    Initialization {
        #[source]
        source: Box<dyn std::error::Error + Send + Sync + 'static>,
    },
    #[error("execution failed")]
    Execution {
        #[source]
        source: Box<dyn std::error::Error + Send + Sync + 'static>,
    },
    #[error("graph return value missing")]
    MissingOutput,
}
```

必要的既有错误扩展如下；它们本身仍使用 thiserror，并通过原有统一出口返回：

| 类型 | 新增变体及字段 | 来源 |
| --- | --- | --- |
| GraphError | UnknownReturnNode { node: NodeId } | 无底层 source |
| GraphError | InvalidReturnNode { node: NodeId } | 返回节点为 template 等非法角色 |
| GraphError | ReturnTypeMismatch { node: NodeId, expected_type: &'static str, actual_type: &'static str } | 已捕获的节点类型声明与图 O 不一致 |
| InputError | EntrySetMismatch { missing: Vec<NodeId>, unexpected: Vec<NodeId> } | 一次入口集合校验的完整差异 |
| InputError | MissingEntry { node: NodeId } | GraphInput.entry 查询不存在的入口 |
| RunError | MissingOutput { node: NodeId } | 其他执行阶段成功结束但缺少当前返回值 |

转换规则：

1. 图构造错误返回 Error::Graph；并发配置非法返回 Error::Config。不把这些组装失败伪装成某次已执行的子调用失败。
2. Input 和 GraphInput 的读取错误返回 Error::Input。run 的入口集合校验失败在启动边界包为 Error::Call(CallError::Input)，保留 EntrySetMismatch 来源。普通节点内部读取失败仍先成为节点失败，再由整个调用转换为 Execution。
3. child 超限返回 DepthExceeded；该错误表示本地没有启动更深一层调用，不附加自动重试建议。
4. 自定义初始化返回的 Error 在初始化出口包为 Initialization，保留原 source。业务输入的预期失败不得 panic；普通 Rust panic 的现有行为不扩展为新的业务恢复承诺。
5. Run.errors 保留现有稳定顺序的全部实际执行错误。into_result 将它们放入私有执行失败聚合，作为 CallError::Execution 的 source；不得只保留第一条错误而丢失其他错误。该诊断聚合无需新增公开业务类型，也不承诺通过标准 Error::source 单链枚举全部并列错误。
6. 若整图的其他执行阶段已成功而唯一问题是最终返回缺失，则 into_result 返回 MissingOutput。已发生其他执行错误时，不追加推测性的返回缺失来掩盖真实失败。
7. Error::execution<E>(source: E) -> Error 的既有节点错误构造能力保留，E: std::error::Error + Send + Sync + 'static。其他 crate 实现 Scheduler 时使用该 trait 的 core Error 契约，并通过合适 CallError 来源字段保留接入错误；不引入无上下文的双向错误转换。
8. source 用于诊断，不允许直接将 Error Debug 或完整来源链写入日志。call 的父节点只依赖稳定分类；有意丢弃失败需要父节点明确返回自己的正常 Outcome。

## 8. 仅通过根公开 API 的调用示范

### 8.1 非循环嵌套

以下为面向拟议 API 的完整使用示范，不是当前已编译验证的实现。它展示不同父子 State、一个共享调度实例、显式入口输入、默认初始化、自定义普通节点调用子图以及 Arc 原样转发。业务样例使用 R = ()；资源和异步初始化签名见前述契约。

```rust
use std::{collections::HashMap, sync::Arc};
use cognacta_core::{
    Error, Graph, GraphInput, Input, LocalScheduler, Node, NodeContext,
    NodeId, NodeInstance, Outcome, Override, RunContext, Scheduler,
    SchedulerConfig, SharedValue, State,
};

#[derive(Default, State)]
struct ChildState {
    #[reducer(Override)]
    length: usize,
}

#[derive(Default, State)]
struct ParentState {
    #[reducer(Override)]
    last_length: usize,
}

struct Count;
impl NodeInstance<ChildState> for Count {
    type Output = usize;

    async fn run(
        &self,
        input: &Input,
        _ctx: NodeContext<ChildState>,
    ) -> Result<Outcome<ChildState, usize>, Error> {
        let length = input.entry::<String>()?.chars().count();
        Ok(Outcome {
            value: Some(Arc::new(length)),
            state_delta: ChildStateDelta { length: Some(length) },
            directive: None,
        })
    }
}

struct Report<E, T> {
    scheduler: Arc<E>,
    target: Arc<T>,
    child_entry: NodeId,
}

impl<E, T> Report<E, T> {
    fn new(scheduler: Arc<E>, target: Arc<T>, child_entry: NodeId) -> Self {
        Self { scheduler, target, child_entry }
    }
}

impl<E, T> NodeInstance<ParentState> for Report<E, T>
where
    E: Scheduler<T, usize> + 'static,
    T: Send + Sync + 'static,
{
    type Output = usize;

    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<ParentState>,
    ) -> Result<Outcome<ParentState, usize>, Error> {
        let text = input.entry::<String>()?.clone();
        let child_input = GraphInput::new(HashMap::from([(
            self.child_entry.clone(),
            Input::new(vec![Arc::new(text) as SharedValue]),
        )]));
        let output = self.scheduler
            .call(self.target.as_ref(), child_input, &ctx.run, &ctx.key)
            .await?;
        Ok(Outcome {
            state_delta: ParentStateDelta { last_length: Some(*output) },
            value: Some(output),
            directive: None,
        })
    }
}

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<(), Error> {
    let scheduler = Arc::new(LocalScheduler::new(SchedulerConfig::new(1, 4)?));
    let child_entry = NodeId::new("count");
    let child = Arc::new(Graph::<ChildState, usize>::builder()
        .nodes(vec![Node::new(child_entry.clone(), Count)
            .writes(vec![ChildStateField::Length])])
        .edges(vec![])
        .entries(vec![child_entry.clone()])
        .return_node(child_entry.clone())
        .build()?);

    let parent_entry = NodeId::new("report");
    let parent = Graph::<ParentState, usize>::builder()
        .nodes(vec![Node::new(
            parent_entry.clone(),
            Report::new(Arc::clone(&scheduler), child, child_entry),
        ).writes(vec![ParentStateField::LastLength])])
        .edges(vec![])
        .entries(vec![parent_entry.clone()])
        .return_node(parent_entry.clone())
        .build()?;

    let input = GraphInput::new(HashMap::from([(
        parent_entry,
        Input::new(vec![Arc::new(String::from("hello")) as SharedValue]),
    )]));
    let context = RunContext::root_builder()
        .run_id(String::from("example-root"))
        .max_depth(4)
        .resources(Arc::new(()))
        .build();
    let run = scheduler.run(&parent, input, context).await?;
    assert_eq!(run.state().last_length, 5);
    let output: Arc<usize> = run.into_result()?;
    assert_eq!(*output, 5);
    Ok(())
}
```

Report 是应用自己写的普通 NodeInstance，不是 core 新增的子图包装类型。父节点类型参数只要求 T 和 Scheduler<T, usize>，不需要读取子 State。公开 Graph 构造、RunContext 构造和类型化结果提取足以完成整条调用链。

### 8.2 自递归和相互调用的固定目标组装

本例独立于上一示例。应用先分配资源对象，构造 A/B 两张静态图，再一次性填入资源的 a/b 槽位；所有槽位填写完成之后才创建根调用。节点只持有调度器和固定目标选择，在 run 中经 Context 读取目标。资源中的调用记录只是示例验收数据，不是新增的 core 监控接口或运行状态机制。

所有权关系为：宿主及活跃 Run 持有资源，资源持有图，图的节点持有调度器和目标选择。节点没有指向资源或对方图的永久 Arc，初始化采用 Default 也不捕获资源；Context 对资源的引用随调用结束释放。OnceLock 仅用于应用组装阶段的一次赋值，执行期间不修改图定义或替换目标。

以下代码使用拟议公开 API；尚未针对未实施的新接口做编译或运行验证。expect/assert 仅断言示例中的组装与测试不变量，实际的深度拒绝仍通过 Error 传播。

```rust
use std::{
    collections::HashMap,
    sync::{Arc, Mutex, OnceLock},
};
use cognacta_core::{
    CallError, Error, Graph, GraphInput, Input, LocalScheduler, Node,
    NodeContext, NodeId, NodeInstance, Outcome, Override, RunContext,
    Scheduler, SchedulerConfig, State,
};

#[derive(Default, State)]
struct DemoState {
    #[reducer(Override)]
    value: usize,
}

type DemoGraph = Graph<DemoState, (), Resources>;

#[derive(Default)]
struct Resources {
    a: OnceLock<Arc<DemoGraph>>,
    b: OnceLock<Arc<DemoGraph>>,
    started: Mutex<Vec<(&'static str, usize)>>,
    rejected: Mutex<Vec<(usize, usize)>>,
}

#[derive(Clone, Copy)]
enum Next {
    A,
    B,
}

struct Recur {
    scheduler: Arc<LocalScheduler>,
    name: &'static str,
    next: Next,
}

impl NodeInstance<DemoState, Resources> for Recur {
    type Output = ();

    async fn run(
        &self,
        _input: &Input,
        ctx: NodeContext<DemoState, Resources>,
    ) -> Result<Outcome<DemoState, ()>, Error> {
        let resources = ctx.run.resources();
        resources.started.lock().expect("fixture lock not poisoned")
            .push((self.name, ctx.run.depth()));
        let target = match self.next {
            Next::A => resources.a.get(),
            Next::B => resources.b.get(),
        }.expect("both graph targets are bound before starting a run");
        let input = GraphInput::new(HashMap::from([(
            NodeId::new("invoke"), Input::new(vec![]),
        )]));
        let result = self.scheduler
            .call(target.as_ref(), input, &ctx.run, &ctx.key)
            .await;
        if let Err(Error::Call(CallError::DepthExceeded {
            parent_depth, max_depth,
        })) = &result {
            resources.rejected.lock().expect("fixture lock not poisoned")
                .push((*parent_depth, *max_depth));
        }
        Ok(Outcome {
            value: Some(result?),
            state_delta: Default::default(),
            directive: None,
        })
    }
}

async fn verify_recursion(next_from_a: Next) -> Result<(), Error> {
    let scheduler = Arc::new(LocalScheduler::new(SchedulerConfig::new(1, 4)?));
    let resources = Arc::new(Resources::default());
    let entry = NodeId::new("invoke");
    let a = Arc::new(DemoGraph::builder()
        .nodes(vec![Node::new(entry.clone(), Recur {
            scheduler: Arc::clone(&scheduler), name: "A", next: next_from_a,
        })])
        .edges(vec![])
        .entries(vec![entry.clone()])
        .return_node(entry.clone())
        .build()?);
    let b = Arc::new(DemoGraph::builder()
        .nodes(vec![Node::new(entry.clone(), Recur {
            scheduler: Arc::clone(&scheduler), name: "B", next: Next::A,
        })])
        .edges(vec![])
        .entries(vec![entry.clone()])
        .return_node(entry.clone())
        .build()?);
    let weak_a = Arc::downgrade(&a);
    let weak_b = Arc::downgrade(&b);
    assert!(resources.a.set(a).is_ok());
    assert!(resources.b.set(b).is_ok());

    let input = GraphInput::new(HashMap::from([(
        entry, Input::new(vec![]),
    )]));
    let context = RunContext::root_builder()
        .run_id(String::from(match next_from_a {
            Next::A => "self-recursion-example",
            Next::B => "mutual-recursion-example",
        }))
        .max_depth(2)
        .resources(Arc::clone(&resources))
        .build();
    let run = scheduler.run(
        resources.a.get().expect("A is bound").as_ref(), input, context,
    ).await?;
    assert!(matches!(
        run.into_result(),
        Err(Error::Call(CallError::Execution { .. })),
    ));
    let expected = match next_from_a {
        Next::A => vec![("A", 0), ("A", 1), ("A", 2)],
        Next::B => vec![("A", 0), ("B", 1), ("A", 2)],
    };
    assert_eq!(
        *resources.started.lock().expect("fixture lock not poisoned"), expected,
    );
    assert_eq!(
        *resources.rejected.lock().expect("fixture lock not poisoned"),
        vec![(2, 2)],
    );
    drop(resources);
    assert!(weak_a.upgrade().is_none());
    assert!(weak_b.upgrade().is_none());
    Ok(())
}

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<(), Error> {
    verify_recursion(Next::A).await?;
    verify_recursion(Next::B).await?;
    Ok(())
}
```

两个验收分别形成 A(0) → A(1) → A(2) 和 A(0) → B(1) → A(2)。深度二的节点继续调用时，Scheduler.call 在 parent.child 中返回 DepthExceeded，尚未开始深度三的 State 初始化或节点执行。完整测试再使用初始化计数核对零、一步、恰好上限和越界场景，不把样例中节点开始记录误当成对初始化次数的证明。

最深处收到的 DepthExceeded 被原样返回，未吞掉或替换为成功。向外传播时，各已开始的图把节点失败保留在各自 Run 中，再转换成调用层 Execution；因此根结果断言 Execution，深度拒绝的精确字段在直接发起被拒调用的节点处记录。source 继续保留诊断来源，父业务逻辑无需遍历内部错误来解释执行进度。

最后的 Weak 检查验证示例组装没有留下图与资源的永久强引用环。对于自定义初始化，函数应读取传入的 RunContext 资源；若闭包改为永久捕获同一个资源 Arc，就会改变上述所有权关系，不能再沿用该释放结论。

## 9. 实施与验证边界

用户已确认以 LocalScheduler.run／Scheduler.call 为主要测试边界。用现有受控节点和小型 Scheduler fake 验证行为，测试矩阵见规格正文；保持现有 wave 结算、静态写冲突和动态路由回归。实施时同步公开 API 样例、CLI dev 图定义和报告对返回值的读取，不保留两套输出约定。

观测使用开始前身份、包含初始化的总耗时、受控阶段/错误分类和安全关联字段。失败 source 的保留与遥测安全分开处理；core 不依赖或初始化 Collector。取消日志只是 future 生命周期诊断，本次不承诺新的取消/恢复行为，也不测试未来的 InterruptPolicy。

### 9.1 panic 与取消的观测测试矩阵

以下“失败/完成/取消”均指按 run_id 归属的生命周期事件，不是 stderr 的 panic hook 文本，也不是重复统计 span 的关闭通知。断言按每个 Run 的身份进行，不将子 Run 和父 Run 的正常各自结算误判为重复事件。

| 场景 | 测试控制方式 | 预期结果与观测断言 |
| --- | --- | --- |
| 未 poll 即丢弃执行 future | 创建 future 后直接 drop | 没有开始、完成、失败或 cancel 事件 |
| 已开始的 future 正常丢弃 | 受控初始化或节点通知已开始，再在非 unwind 路径 drop | 开始一次、DEBUG cancel 一次；无伪造完成/失败 |
| 根 Run 初始化 panic | 在测试外层 catch_unwind，poll 真实 run 直到初始化抛出 panic | 测试捕获 unwind；根 Run 开始一次，普通 cancel 为零，不生成完成或伪造业务失败；没有节点开始执行 |
| 普通节点 panic | 执行真实 run，让既有任务边界捕获节点 panic；测试外层也可以使用 catch_unwind 观察是否意外逃逸 | 外层不应捕获逃逸的节点 panic；得到 Failed Run，保留任务错误 source；该 Run 恰好一条 WARN 失败，完成与 cancel 均为零 |
| 子图初始化 panic | 父节点通过真实 Scheduler.call 调用子图，子初始化 panic 向外展开到父节点任务边界 | 子 Run 已开始，但没有普通 cancel、伪造完成/业务失败；父任务失败由原有边界转换，父 Run 恰好记录一次失败，无额外 cancel 或完成 |
| 正常完成或预期 Err 后释放对象 | 分别执行成功、初始化返回 Err、节点返回 Err，再清理 future/Run | 各身份只在实际边界完成或失败一次，后续清理不补发 cancel，也不重复结算 |

初始化 panic 的 caught-unwind 用例采用普通同步测试，在测试外层用 std::panic::catch_unwind 包住独立 Tokio runtime 对公开执行 future 的 block_on。若测试捕获环境需要 AssertUnwindSafe，仅在这一层声明；每个用例独立创建输入、资源和事件记录器，不在 panic 后继续或 resume 原 Run。这样 panic 确实穿过运行期观测 guard，随后测试仍能检查已记录事件；不通过直接调用私有 guard 或增设产品 hook 完成验收。

节点 panic 由现有 JoinSet/任务边界转为任务错误，这是运行失败，允许且要求 Run 的一次正常失败结算。“panic 不记为取消”不等于“任何关联 Run 都不得记录失败”。初始化 panic 本身也不应被观测代码捕获并转换成 Initialization 错误；业务初始化显式返回 Err 与 unwind 是不同路径。

测试运行在支持 unwind 的配置中；不声称 catch_unwind 可以验证进程 abort 场景。这里的捕获只服务观测断言，不给产品添加通用 panic 捕获、恢复、interrupt/resume 或新的 Run 状态。

本次仅交付设计及规格文档，未编写上述 Rust 实现、修改依赖、运行 Rust 功能测试、更新现行正式规格或发布 issue。配套行为见 [内核 delta](specs/graph-kernel-execution/spec.md) 与 [CLI delta](specs/graph-check-cli/spec.md)，后续实施与验收步骤见 [任务清单](tasks.md)；所有实现任务在实施前保持未完成。
