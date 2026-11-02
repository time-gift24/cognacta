## Context

当前 `cognacta-core` 的 Graph/Node/Run/NodeContext 没有调度器字段，这一边界应保留。问题在于 `Scheduler<T, O, R>` 只有 `call`，真正的任务循环固定在私有 `scheduler::execution::Execution` 中；嵌套和递归示例通过业务执行体保存 Scheduler 并手写调用。

参考 `/Users/wanyaozhong/Projects/prodagent/src/kernel/scheduler.py` 的 `run`、`InProcessActivator.activate` 和 `drive`：根和子都使用同一 Run 类与同一 Scheduler.drive。参考 `src/kernel/run.py` 的集中状态转换，但不照搬 SubPlanBody、InProcessActivator、事件溯源及恢复模型。Python 的动态类型也不能直接替代 Rust 异构节点的类型擦除边界。

2026-11-02 的只读验证：cognacta-core 43 项 lib 单测通过；直接调用 prodagent `tests/test_subrun.py` 的 9 个无 fixture 异步测试通过；另以现有公开 Python API 验证三层、五层、K=1 的调用链，同一个 Scheduler.drive 收到所有层，各层为 Run，身份、State 分离且结果对象不复制。这些仅是现状与参考证据，新 Rust API 尚未实现或编译。

本次授权仅覆盖本 change 内的 proposal、design、差量 specs、tasks。正式规格、项目规范、实现和参考仓库均不在本次写入范围。

## Goals / Non-Goals

**Goals:**

- Graph 直接满足 NodeInstance，通过普通 Node 声明；静态边、Transition、Deliver 共用节点执行路径。
- Scheduler 真正驱动任务，Graph/Node/Run 不依赖具体调度器类型；NodeContext 不持有调度器。
- 父子共用 `Run<S, O>`、调度协议及状态转换；每层只多一份该层本来需要的运行数据，不增加随深度变化的类型、分支或组装代码。
- 明确递归绑定、异构 State/资源、非 Clone 输出、Send 而非 Sync 的 Delta、错误归属及生命周期。
- 保留固定 wave、确定性结算、逐 Run 并发预算、完整诊断和安全观测。

**Non-Goals:**

- 本轮不写实现。后续实施不新增子图专属类型/构造器、节点工厂、注册中心、资源 TypeMap、公共 Task/Session/ChildRun。
- 不增加远程序列化、分布式调度、持久化、恢复、全树并发预算、自动重试或自动回滚。
- 不增加 timeout/retry 策略类型、日志事件、span、指标、依赖或 crate；外围策略仍由普通 Node 及显式普通执行体组合承载。

## Decisions

### 1. 定义、执行体、运行记录和驱动分开

| 对象 | 持有与职责 | 生命周期 |
| --- | --- | --- |
| Graph | 不可变节点/边/入口/返回声明、State 初始化策略 | 可复用定义 |
| Node | NodeInstance 句柄、join/template/writes/declared_targets、可选资源投影 | 随 Graph 复用 |
| NodeInstance | 节点行为，返回 Outcome；Graph 直接实现它 | 由 Node 管理；不要求逐调用克隆 |
| Run / NodeRun | 一次运行的 State、身份、状态、输入/输出、实例记录、错误 | 每次调用独立，返回后可保留诊断 |
| Scheduler | 准入顺序、并发、补位、任务执行与回收 | 宿主创建，嵌套复用同一实例 |
| Execution | 当前运行向 Scheduler 暴露的操作视图 | 仅运行期间，内部引用同一个 Run |
| NodeContext / RunContext | State 快照、节点身份；强类型资源及 Run 身份/预算 | 显式传递的数据 |

Graph、Node、Run、NodeContext、RunContext 均不增加 Scheduler 字段或调度器泛型。私有运行时暂存 Graph 引用、RunContext、所选 Scheduler、当前 wave 及类型化结果槽；返回 Run 前释放它们。运行时引用 Scheduler 是执行协作关系，不进入可复用定义或保留的诊断模型。

Deliver 创建的是独立 NodeRun 激活记录及 NodeKey；沿用当前规则复用 Node 内的执行体 Arc。Graph 作为该执行体时，每次调用再初始化自己的 Run。不能把 NodeRun、NodeInstance 和子 Run 合并成一种记录。

### 2. Scheduler 的公共边界是实际驱动

以下代码块为接口契约，省略方法实现，不是提前实现。`Future`、`Pin`、`Arc` 均来自 std。

```rust
pub trait Scheduler: Send + Sync + 'static {
    fn config(&self) -> SchedulerConfig;

    fn drive<'a>(
        self: Arc<Self>,
        execution: &'a mut (dyn Execution + 'a),
    ) -> Pin<Box<dyn Future<Output = Result<(), Error>> + Send + 'a>>;
}

pub trait Execution: Send {
    fn advance(&mut self) -> Result<Option<Vec<NodeKey>>, Error>;

    fn dispatch(
        &mut self,
        key: &NodeKey,
    ) -> Result<
        Pin<Box<dyn Future<Output = Result<(), Error>> + Send + 'static>>,
        Error,
    >;

    fn complete(
        &mut self,
        key: NodeKey,
        result: Result<(), Error>,
    ) -> Result<(), Error>;
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
        O: Send + Sync + 'static,
        R: Send + Sync + 'static;
}

impl LocalScheduler {
    pub fn new(config: SchedulerConfig) -> Self;
}

impl SchedulerConfig {
    pub fn new(max_concurrency: usize, max_waves: usize) -> Result<Self, Error>;
    pub fn max_concurrency(&self) -> std::num::NonZeroUsize;
    pub fn max_waves(&self) -> usize;
}
```

`LocalScheduler` 实现 Scheduler，保留 Tokio task/JoinSet 作为这个具体后端的机制。共用入口和 Execution 不通过 LocalScheduler 兜底，也不偷偷创建一个本地调度器。宿主先将具体实现装入 `Arc<dyn Scheduler>`，之后同一 Graph 可以由不同实现执行，Graph 的类型和构图代码不改变。

`run` 是 dyn Scheduler 的泛型固有方法，不放进 trait 的动态分派表。它首次 poll 时建立现有观测，校验输入、初始化 State、建立普通 Run 和私有操作视图，调用 `self.clone().drive(...)`，交付 Run。它不包含 ready/dispatch 的驱动循环。多参数入口通过 bon 生成 `run_builder`，start_fn=`run_builder`、finish_fn=`call`、builder_type=`SchedulerRunBuilder`、state_mod(vis=`pub`)；生成的类型与状态模块在根导出。builder 与位置参数入口执行同一校验，`.call()` 只是 builder 终结方法。

不保留第二套 `LocalScheduler::run`/`run_builder` 实现；旧调用方迁移到 Arc<dyn Scheduler> 的共用入口。

`Execution` 是本次唯一新增的公共运行时 trait，没有公开构造器，也没有另一份 Run/状态机。调度器作者通过它操作内核运行；业务节点不接触它。当前私有泛型执行状态继续私有，只把必需操作暴露给驱动者。

| 操作 | 契约 |
| --- | --- |
| advance | 首次调用求 ready；之后在本波全部结果登记后统一结算、Sweep 和求下一波；Some 必为非空、固定且有序的 ready 集合；None 表示没有后续可执行工作，包括业务执行失败；共用入口在 drive 返回后一次性提交 Run 终态 |
| dispatch | 仅对本波未启动成员调用；在调度器已取得本 Run 的可用名额、准备提交任务时组装 Input、消费一次性激活、标记 Running/attempts+1，取得 Node 执行体并交付拥有所需引用的任务 future |
| complete | 每个已 dispatch 成员恰好一次，登记正常结果或真实任务错误；节点返回 Err 是待结算结果，complete 本身返回 Ok，不提前截断本波 |

Scheduler 自己维护任务队列、并发控制和任务到 NodeKey 的映射，调用 advance/dispatch/complete 驱动整个循环。它可以改变实际准入及完成顺序，结算始终按最初 ready 顺序。普通节点失败后仍启动并收齐当前 wave 的排队成员；全部 complete 后才 advance，不把新 ready 插入本波。

业务 Outcome 保存在私有的类型化结果槽，调度 future 只返回 `Result<(), Error>`。不得因这一擦除边界把 `State::Delta: Send` 加强为 Sync，或向公共 API 暴露 Any、类型化 Outcome 槽、Tokio JoinError/JoinHandle。

非法 key、重复 dispatch/complete、未收齐即 advance 等驱动协议错误仅在该公开边界报告 Error::Scheduling，不重复做已通过的图结构校验。正常 drive 返回 Ok 前必须推进至 None。drive 返回错误前必须完成已提交任务的回收并登记结果，释放任务持有的 State；未启动成员可保持 Pending，不能遗留 Running 任务并把 Run 交付。共用入口处理驱动失败时结算已登记结果、禁止后续路由并记录调度失败；驱动异常提前返回 Ok 也按调度失败处理。

执行 future 被 drop 时，本地后端使用现有任务所有权取消本地任务，不 detach 子任务；不承诺外部副作用已停止或回滚，不新增取消状态、panic 恢复或后台重试。

选择依据：[Rust dyn compatibility](https://doc.rust-lang.org/reference/items/traits.html#dyn-compatibility) 允许生命周期泛型和 Arc<Self> receiver，不允许可动态分派方法拥有类型参数或返回 impl Future。考虑过保留 call-only、只替换并发配置、把 Scheduler 泛型传播到 Graph，以及公开整份可变 Run；分别不能替换真实调度、耦合定义或扩大可变面。一个三操作视图能保留业务类型并限制可变入口，无需子图协议。

### 3. Graph 实现普通 NodeInstance

```rust
pub trait NodeInstance<S: State, R: Send + Sync + 'static = ()>:
    Send + Sync + 'static
{
    type Output: Send + Sync + 'static;

    fn run<'a>(
        &'a self,
        input: &'a Input,
        context: NodeContext<S, R>,
        scheduler: Arc<dyn Scheduler>,
    ) -> impl Future<Output = Result<Outcome<S, Self::Output>, Error>> + Send + 'a;
}

pub struct NodeContext<S: State, R = ()> {
    pub state: Arc<S>,
    pub run: RunContext<R>,
    pub key: NodeKey,
}

pub struct Outcome<S: State, O> {
    pub value: Option<Arc<O>>,
    pub state_delta: S::Delta,
    pub directive: Option<Directive>,
}
```

调度器由运行时作为执行参数传入，普通节点可以忽略。不能把参数改成 LocalScheduler、写回 NodeContext，或要求业务节点保存调度器。

对任意 `P: State, C: State, O: Send + Sync + 'static, R: Send + Sync + 'static`，`Graph<C, O, R>` 实现 `NodeInstance<P, R, Output = O>`。父子 State 不需相同。内部仍使用当前对象安全 adapter 保存异构 NodeInstance；不把带 RPITIT 的公开 NodeInstance 直接作为 dyn。

Graph 的 run 实现统一执行：

1. 从本节点 Input 的所有实际来源中提取恰好一个 GraphInput 类型的值并共享其 Arc，不限定它来自 entry 或某个硬编码前驱。不自动转发其他值，不为 Graph 引入另一套 Input 类型。零份/多份按既有 InputError 分类失败。
2. 调用 `context.run.child(&context.key)`，预算拒绝时保留现有深度观测，不初始化或启动子 Run。
3. 使用传入的同一个 Scheduler 调用共用 run；正常结果经子 Run.into_result 取得原 Arc<O>。
4. 返回 `Outcome { value: Some(原 Arc), state_delta: P::Delta::default(), directive: None }`。子错误直接传播，外层运行在节点边界附加父 NodeKey。

这里的适配只写一次，是 Graph 自己的 NodeInstance 实现；运行时不按“是不是子图”做 downcast 分支。唯一输入中的其他业务类型不会自动成为子入口数据；多入口输入必须显式组装 GraphInput，目标入口键集合只在子 run 入口校验一次。

静态边上游的 Output=GraphInput；Deliver/Transition 的 payload 为 Arc<GraphInput>。模板属性、join、声明动态目标及唯一返回类型仍通过普通 Node/Graph API 配置和校验。模板图实例复用图定义，每次调用有独立子 Run。

### 4. 既有构造及普通资源投影

```rust
impl<S: State, R: Send + Sync + 'static> Node<S, R> {
    pub fn new<N: NodeInstance<S, R>>(id: NodeId, instance: N) -> Self;
    pub fn join(self, join: Join) -> Self;
    pub fn template(self, enabled: bool) -> Self;
    pub fn writes(self, fields: Vec<S::Field>) -> Self;
    pub fn declared_targets(self, targets: Vec<DirectiveTarget>) -> Self;

    pub fn with_resources<T, F>(self, project: F) -> Node<S, T>
    where
        T: Send + Sync + 'static,
        F: Fn(&T) -> Result<Arc<R>, Error> + Send + Sync + 'static;
}

impl<S: State + Default, O: Send + Sync + 'static, R: Send + Sync + 'static>
    Graph<S, O, R>
{
    pub fn build(
        nodes: Vec<Node<S, R>>, edges: Vec<Edge<S>>,
        entries: Vec<NodeId>, return_node: NodeId,
    ) -> Result<Self, Error>;
}

impl<S: State, O: Send + Sync + 'static, R: Send + Sync + 'static> Graph<S, O, R> {
    pub fn build_with_initializer<F, Fut>(
        nodes: Vec<Node<S, R>>, edges: Vec<Edge<S>>,
        entries: Vec<NodeId>, return_node: NodeId, state_initializer: F,
    ) -> Result<Self, Error>
    where
        F: Fn(Arc<GraphInput>, RunContext<R>) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<S, Error>> + Send + 'static;
}

impl<R: Send + Sync + 'static> RunContext<R> {
    pub fn root(run_id: String, max_depth: usize, resources: Arc<R>) -> Self;
    pub fn child(&self, parent_node: &NodeKey) -> Result<Self, Error>;
    pub fn with_resources<T: Send + Sync + 'static>(
        &self, resources: Arc<T>,
    ) -> RunContext<T>;
    pub fn resources(&self) -> &Arc<R>;
}
```

Graph 两个多参数构造保留 `builder` / `builder_with_initializer`，结束方法为 build；RunContext 保留 `root_builder`，SchedulerConfig 保留 builder。校验规则与错误分类不变。Node::new 和资源投影组装不执行图或资源访问。

with_resources 是同步资源选择函数，在每次节点实际执行时调用；它保留 Node 的所有已有外围配置和声明输出类型，只替换执行体所见 RunContext 的资源。身份、State 快照、NodeKey 和预算不变。投影失败是当前节点失败，尚未开始子 Run。相同资源类型直接共享原 Arc；跨类型投影返回显式 Arc，不要求 R/T: Clone、不暗中强制同一种资源、不做动态 downcast。

示例：`Node::<ParentState, ChildResources>::new(id, child).with_resources(|r: &ParentResources| Ok(r.child.clone()))`。互递归采用不同资源类型时，投影可以从共同服务句柄构造所需资源；不能通过两个资源对象相互强持有来制造生命周期环。

### 5. 递归只使用通用标准库绑定

为以下标准类型实现普通 NodeInstance 转发，Output=N::Output，父 State/资源参数与 N 相同，除此之外不新增业务类型：

- `Arc<N>`，其中 N: NodeInstance<S, R>。
- `Weak<N>`，其中 N: NodeInstance<S, R>；执行时 upgrade，调用期间持有所得 Arc。
- `OnceLock<N>`，其中 N: NodeInstance<S, R>；执行时 get，不阻塞等待绑定，不增加惰性构图。

自递归与互递归都使用 `Arc<OnceLock<Weak<Graph<...>>>>`。先创建槽位，将槽位通过普通 Node::new 放入图，调用 fallible build，成功后将目标 Weak 写入槽，最后由宿主启动运行并保留目标强引用。输出类型由具体 N 保证；构图不能升级未填槽位，也不遍历调用图。

例如 A 的节点引用 b_slot、B 的节点引用 a_slot；两图 build 成功后分别 set(downgrade(&b))、set(downgrade(&a))。自递归复用相同步骤，仅目标为自身。Graph::build 的错误正常传播；[Arc::new_cyclic](https://doc.rust-lang.org/std/sync/struct.Arc.html#method.new_cyclic) 的闭包返回 T 而不是 Result<T, Error>，不用它强迫构图错误走 unwrap/panic。

重复 set 是 std OnceLock::set 的组装错误，调用方处理其标准 Result；未绑定和目标已释放分别在普通节点入口返回 NodeError::UnboundInstance / DroppedInstance。Weak 的失效是该所有权接口的正常失败，不是扫描整个图或重复防御的理由。GraphInput、State、资源和 Scheduler 的泛型兼容性均不因递归而变化。

### 6. 一种 Run、一套转换和预算

运行时仍只创建 `Run<S, O>`。State 成功初始化前不构造缺少 State 的 Run。Run/NodeRun 对外保持只读；内部将 Running、Completed、Failed、Skipped、重激活等既有状态修改集中到这些对象的方法中，避免不同后端分别实现状态机。

advance 负责形成结束判断和诊断；共用 run 入口等待 drive 返回、任务引用释放后，通过同一 Run 内部方法一次性提交终态。只有驱动成功、无错误、无剩余工作和有效返回值同时满足才 Completed；缺失输出或驱动错误直接 Failed，不经过 Completed→Failed。交付前的调度暂存仍为私有，Run 不增加新状态。NodeRun 的成功/失败按 barrier 提交，Transition 的重激活仍清除旧输入/输出并保留 attempts。Suspended 仍为已有保留状态，本变更不增加进入/恢复路径。

每个 Run 独立配置 max_waves/并发名额。父节点等待子调用时仍占用父 Run 名额，子 Run 使用自己的名额，K=1 可递归完成。深度只在 Graph 的 NodeInstance 调用派生子身份时增加一次；资源投影、Arc/Weak/OnceLock 转发不增加深度。

默认子节点错误使父节点失败；不自动重试。应用若显式需要处理错误，可用普通 NodeInstance 组合调用所包装实例的 run，使用同一个父 NodeContext 数据和传入 Scheduler；图实例仍统一完成身份派生和调度。重复执行得到同深度的新子 Run。框架不新增专属重试 wrapper、第二个 call API 或失败回滚语义。

### 7. crate 根公开 API 与诊断

根导出的完整名称集合如下，除了 Execution 和下述方法/错误调整之外，已有辅助值、读取接口及 State/reducer API 保持不变：

```text
Scheduler, Execution, LocalScheduler, SchedulerConfig,
SchedulerConfigBuilder, SchedulerRunBuilder,
scheduler_config_builder, scheduler_run_builder,
Graph, GraphBuilder, GraphWithInitializerBuilder,
graph_builder, graph_with_initializer_builder,
Node, NodeInstance, NodeContext, NodeId, NodeKey, NodeRun, NodeStatus,
Run, RunStatus, RunContext, RunContextRootBuilder, run_context_root_builder,
Outcome, Directive, DeliverTarget, DirectiveTarget, Edge, Join,
GraphInput, Input, Origin, SharedValue, SourceRef,
State (trait 与 derive), StateField, WritePolicy, Reducer,
Add, Append, Merge, Override, Sort,
Error, CallError, ConfigError, GraphError, InputError,
NodeError, MergeError, DirectiveError, RunError
```

调用方所需的现有输入和运行读取入口保留：

```rust
impl GraphInput {
    pub fn new(entries: std::collections::HashMap<NodeId, Input>) -> Self;
    pub fn entry(&self, node: &NodeId) -> Result<&Input, Error>;
}
impl Input {
    pub fn new(values: Vec<SharedValue>) -> Self;
    pub fn entry<T: std::any::Any + Send + Sync>(&self) -> Result<&T, Error>;
    pub fn one<T: std::any::Any + Send + Sync>(&self, source: &NodeId) -> Result<&T, Error>;
    pub fn entry_shared<T: std::any::Any + Send + Sync>(&self) -> Result<Arc<T>, Error>;
    pub fn one_shared<T: std::any::Any + Send + Sync>(&self, source: &NodeId)
        -> Result<Arc<T>, Error>;
}
impl<S: State, O: Send + Sync + 'static> Run<S, O> {
    pub fn state(&self) -> &S;
    pub fn status(&self) -> RunStatus;
    pub fn node(&self, key: &NodeKey) -> Option<&NodeRun>;
    pub fn instances(&self, template: &NodeId) -> &[NodeKey];
    pub fn errors(&self) -> &[RunError];
    pub fn final_output(&self) -> Option<&Arc<O>>;
    pub fn waves(&self) -> usize;
    pub fn run_id(&self) -> &str;
    pub fn parent_run_id(&self) -> Option<&str>;
    pub fn parent_node(&self) -> Option<&NodeKey>;
    pub fn depth(&self) -> usize;
    pub fn max_depth(&self) -> usize;
    pub fn into_result(self) -> Result<Arc<O>, Error>;
}
```

core 自有可失败入口统一返回 core::Error。统一 Error 继续由 thiserror 定义，保留 `Call(CallError)`、`Graph(GraphError)`、`Config(ConfigError)`、`Input(InputError)`、`Node(NodeError)`、`Merge(MergeError)`，只增加：

```rust
// Error 的新增 variant；source 不进入 Display 正文。
#[error("scheduler failed")]
Scheduling {
    #[source]
    source: Box<dyn std::error::Error + Send + Sync + 'static>,
}

// NodeError 的新增 variants。
#[error("node instance is not bound")]
UnboundInstance,
#[error("node instance is no longer available")]
DroppedInstance,

// RunError 的新增 variant。
#[error("scheduler failed during execution")]
Scheduling {
    #[source]
    source: Error,
}

impl Error {
    pub fn execution<E: std::error::Error + Send + Sync + 'static>(source: E) -> Self;
    pub fn scheduling<E: std::error::Error + Send + Sync + 'static>(source: E) -> Self;
}
```

以上是各枚举成员的契约摘录，不是多个同名类型或新错误层次。既有 NodeError::Execution/Task 及 RunError 的其他成员保留。各边界的分类和转换为：

| 可失败入口/边界 | 对外结果 |
| --- | --- |
| Graph 构造/构造 builder | Error::Graph，保留当前全部构图分类 |
| SchedulerConfig 构造/builder | Error::Config(ZeroConcurrency)；max_waves=0 合法 |
| Input / GraphInput 读取 | Error::Input，保留来源、类型和数量错误 |
| root run 输入校验 / 初始化 | Error::Call(Input / Initialization)，保留真实 source，无完整 Run |
| RunContext::child | Error::Call(DepthExceeded)，拒绝发生于子初始化前 |
| 节点执行、资源投影、绑定解析 | 原 Error 加 RunError::Node { key, source }，保留实际阶段 |
| 单个 task panic/执行机制失败 | NodeError::Task 保留真实来源，再归属 NodeKey；Tokio 类型不外露 |
| driver 或驱动协议失败 | Error::Scheduling；初始化后由共用入口保存为 RunError::Scheduling，返回 Failed Run |
| State 归并 / 指令校验 | 原 Merge、Invariant、InvalidDirective 规则和顺序不变 |
| Run.into_result | 成功交付原 Arc；其余为 CallError::Execution 或仅返回缺失时 MissingOutput，保留全部错误聚合 |

Scheduler 返回错误前仍收齐已启动任务；结算顺序为实际 Node 错误、Merge/Invariant、Directive，最后附加驱动错误。驱动失败禁止整批路由。外层不能把已执行图中的深度/调度错误重新分类为外层启动失败，不建立无上下文的双向 From 转换。外部 Scheduler 实现遵守 core 的 trait 错误契约，可通过 Error::scheduling 保存自己的真实错误来源。

### 8. 仅经公开 API 的组合示例

下面函数只做构图与调用，child 由调用方通过公开 Graph API 提供。它不定义任何调度器或 NodeInstance 实现，不访问私有字段，展示父/子 State 可以不同。

```rust
use cognacta_core::*;
use std::{collections::HashMap, sync::Arc};

async fn execute_nested<P, C, O, R>(
    child: Graph<C, O, R>,
    child_input: GraphInput,
    resources: Arc<R>,
    scheduler: Arc<dyn Scheduler>,
) -> Result<Run<P, O>, Error>
where
    P: State + Default,
    C: State,
    O: Send + Sync + 'static,
    R: Send + Sync + 'static,
{
    let id = NodeId::new("child");
    let parent = Graph::<P, O, R>::builder()
        .nodes(vec![Node::new(id.clone(), child)])
        .edges(vec![])
        .entries(vec![id.clone()])
        .return_node(id.clone())
        .build()?;
    let input = GraphInput::new(HashMap::from([(
        id,
        Input::new(vec![Arc::new(child_input)]),
    )]));
    scheduler.run_builder()
        .graph(&parent)
        .input(input)
        .context(RunContext::root("root".into(), 5, resources))
        .call()
        .await
}
```

宿主通过 `let scheduler: Arc<dyn Scheduler> = Arc::new(LocalScheduler::new(SchedulerConfig::new(1, 64)?));` 选后端。调用结果可用 `.into_result()?` 得到原 Arc<O>。静态边只需将返回 GraphInput 的前驱连接到该 Node；Deliver 使用 `.template(true)` 的相同 Node，payload=Arc::new(child_input)，并沿用 declared_targets 声明。不会增加一套子图 edge 或 Deliver 类型。

### 9. 观测与验收

复用现有 Run span、DEBUG 开始/成功/取消、WARN 预期失败及深度拒绝事件；字段、级别、受控分类、耗时口径均不增加。驱动错误归入既有 execution 失败阶段。原因是本变更调整执行入口和调度实现边界，没有新增需独立计数的业务过程。相同入口覆盖根与所有子层，不初始化 Collector，不读取额外配置，不记录源链或业务数据。

验收必须覆盖实际调度行为，而非仅返回预制结果的 fake：

| 要证明的契约 | 必需证据 |
| --- | --- |
| 定义正交 | 同一个 Graph 对象经 LocalScheduler 和独立测试 Scheduler 执行；公开示例只在宿主选择后端 |
| 真正替换调度 | 替代 driver 控制准入顺序及并发，记录每层 drive；稳定结算不受完成顺序影响 |
| 自相似 | 同一参数化组图路径测试 3/5 层，K=1/K=2；混合静态边与 Deliver，各层只有普通 Run |
| 数据隔离 | 父子异构 State，重复子图/同名内部 key，不同 Run 输入/状态/记录独立 |
| 类型/所有权 | 非 Clone Output 保持 Arc 身份，Delta 仅 Send；返回 Run 不保留执行上下文和 Scheduler |
| 递归 | 自递归、互递归、未绑定、目标失效、深度拒绝、宿主释放后 Weak 失效；不同资源类型可往返投影 |
| 调度失败 | 真实 driver 错误和 task panic 有来源与节点归属；已启动任务收齐、无 Running 遗留、禁止下一波路由 |
| 现有语义 | 固定 wave、补位、Sweep、模板聚合、重新激活、完整错误、State 原子归并与观测测试继续通过 |

## Risks / Trade-offs

- [一次公共 API 迁移] → NodeInstance 参数、Scheduler trait 与根运行入口同步迁移全部调用方，不长期保留 call-only 兼容层。
- [公开 Execution 增加一个接口] → 仅三种必需操作，无公开内部结构、构造器或第二份状态机；它服务所有节点，不以子图命名或分支。
- [类型擦除和异步递归需要装箱] → 只在现有异构执行边界与调度协议边界使用 boxed future；普通业务 NodeInstance 仍使用原生 async 实现，不传播调度器泛型。
- [Weak 不负责延长目标生命周期] → 宿主显式持有目标，执行时升级；失效报告普通节点错误，不引入全局强引用注册中心。
- [每 Run 并发不等于全树限流] → 保留已确认语义并测试 K=1 嵌套；本次不承诺全树资源上限。
- [第三方 driver 必须遵守完成与回收协议] → 用外部实现测试驱动边界及错误结算，不添加假设的分布式恢复或层层校验。

## Migration Plan

1. 先迁移通用状态转换与调度边界，再接入 LocalScheduler；保留原有波次和错误测试。
2. 将所有 NodeInstance 签名迁移为运行时传入 Scheduler，根调用统一使用 Arc<dyn Scheduler>；更新 CLI、编译测试、文档示例及 bon 根导出。
3. 增加 Graph/Arc/Weak/OnceLock 的普通 NodeInstance 实现、Node 资源投影；删除旧业务 child-call 适配和 call-only fake。外部服务 fake 迁移为普通 NodeInstance；调度 fake 必须真实驱动 Execution。
4. 运行任务清单中的编译、行为和观测验收；随后由用户决定实施验收及归档。当前不执行以上实施步骤，也不更新正式规格。
5. 无持久化数据或 schema 迁移。若尚未发布的新 API 未通过验收，回退整组代码/API 改动；不能只回退调用方而保留新 trait，也不改写用户原有工作。

## Open Questions

无需要新增业务概念才能解决的设计问题。新接口与 bon 生成入口仍需实施阶段的外部编译测试证明，不能把本提案的 CLI 校验视为 Rust API 已可用。当前仅获设计材料写入授权，实施须由用户另行发起。
