# Graph Kernel Execution Delta

## MODIFIED Requirements

### Requirement: Kernel has a reachable public API independent of dev

cognacta-core SHALL 从根导出 Scheduler trait、LocalScheduler、Graph<S, O, R = ()>、GraphInput、RunContext<R = ()>、Run<S, O>、统一 thiserror Error/CallError，以及调用所需的节点、输入、State、错误、bon builder 和状态模块。公开能力 SHALL 不受 CLI dev feature 限制；Run SHALL 仅提供只读检查及消费式结果交付，内部 adapter、输入组装与调度状态 SHALL 不开放可变访问。

#### Scenario: A downstream crate runs a graph

- **WHEN** 一个外部测试目标仅导入 cognacta_core 根导出，构造两个不同 Output 类型的 NodeInstance、Graph 和 LocalScheduler
- **THEN** 它能通过公开 API 执行、读取 Input/Output、State、状态、全部错误和类型化 final_output，无需访问私有模块或启用 CLI dev

#### Scenario: Builders remain reachable from the crate root

- **WHEN** 外部调用方使用默认或自定义初始化的 Graph builder、RunContext 根 builder、SchedulerConfig builder 和 LocalScheduler.run_builder
- **THEN** 所需生成类型及状态模块均公开可达；run_builder 的 call 终结方法遵守 run 契约，不被解释为 Scheduler trait 的子调用

### Requirement: Graph validates configuration once

Graph 的默认与自定义初始化构造函数及 bon builder SHALL 经过同一入口检查重复节点、未知边端点/entry、无合法入口、非法 template 角色、已声明动态目标及可证明的 SingleWriter 冲突，并验证必填返回节点存在、非 template、声明输出类型与 O 一致。Graph SHALL 是可复用的静态定义，不保存一次执行的 State、进度或结果。SchedulerConfig SHALL 在入口拒绝并发数0，内部使用 NonZeroUsize；max_waves=0 SHALL 合法。

#### Scenario: Invalid graph is rejected before execution

- **WHEN** 图含重复 ID、未知端点、template entry/return 或不存在的声明目标
- **THEN** 构图返回带对应 GraphError 分类的 core::Error，初始化与任何节点均未开始执行

#### Scenario: Entries are derived or selected

- **WHEN** entries 为空
- **THEN** Graph 依注册顺序选无普通入边的非 template 节点；没有合法入口则返回 NoEntry；显式指定的合法有入度入口仍被接受

#### Scenario: Two runs reuse one definition

- **WHEN** 同一 Graph 启动两个 Run
- **THEN** 每次独立初始化 State，并独立拥有节点记录、实例集合、错误和输出，一份 Run 的 Delta 不修改另一份 State

#### Scenario: Return declarations are checked at construction

- **WHEN** 返回 NodeId 不存在、指向 template 或其声明 Output 与 Graph 的 O 不同
- **THEN** 构图分别返回 UnknownReturnNode、InvalidReturnNode 或 ReturnTypeMismatch；异构节点列表的类型匹配在该构造边界完成，不要求返回节点零出度

### Requirement: Completion distinguishes no work from blocked or limited work

LocalScheduler SHALL 在正常 ready、Sweep 提交重算和空扇出兜底之后判断结束。有 ready 时 SHALL 在启动前检查 max_waves；无 ready、errors 为空且全部普通 NodeRun 与已创建实例终态时，SHALL 检查唯一返回值，存在才 Completed。残留 Pending SHALL 导致 Stalled 并保持其状态；可推进但超配额 SHALL 导致 MaxWaves。已有执行错误时 SHALL 不追加推测性的 MissingOutput。

#### Scenario: Exact wave quota succeeds

- **WHEN** 三节点链在第三 wave 完成全部工作并产生声明返回值，max_waves=3
- **THEN** Run Completed，不因已经达到配额而追加 MaxWaves

#### Scenario: Quota stops an unstarted node

- **WHEN** 同一链 max_waves=2
- **THEN** C 保持 Pending/attempts=0，errors 包含 MaxWaves，已提交 State 保留，不追加 MissingOutput

#### Scenario: A disconnected non-entry blocks completion

- **WHEN** 显式入口路径已完成，另一无入边非 entry 节点仍 Pending
- **THEN** Run Failed(Stalled)，不把该节点自动标为 Skipped 或 Failed，也不以已经产生的返回值提前完成

### Requirement: Error boundaries preserve crate errors and sources

自有公开可失败 API SHALL 使用 core::Error；Run SHALL 保留 Vec<RunError> 而非单条错误。节点、归并与指令边界 SHALL 分别补充 NodeKey、阶段和 writer，保留真实 source，不做无上下文双向转换；公共 Display SHALL 不展开原始业务错误链。构图、配置、输入读取和节点错误 SHALL 保留既有分类；调用边界 SHALL 通过 Error::Call 提供稳定分类而不吞掉来源。

#### Scenario: An input error crosses the node boundary

- **WHEN** NodeInstance 读取 Input 得到 Cardinality 并通过问号传播
- **THEN** 返回 Run 的错误是该 NodeKey 的 RunError::Node，source 保留 Error::Input 及 Cardinality，不变成归并错误；消费该失败 Run 得到 CallError::Execution

### Requirement: Core requires no telemetry initialization

内核 SHALL 使用宿主既有 tracing 配置记录 Run 生命周期，不初始化 Subscriber、Collector 或 exporter，不读取隐式遥测端点，不依赖 Collector 或 SDK。本次 SHALL 不新增调度指标。执行结果、错误及重试决策 SHALL 不依赖遥测初始化、过滤、导出成功或输出容量。

#### Scenario: A graph runs without a collector

- **WHEN** 外部库调用方未初始化任何遥测而执行确定性图
- **THEN** 节点结果、State、errors、waves 和 final_output 均符合相同契约

#### Scenario: Telemetry fails or applies backpressure

- **WHEN** 相同调用分别遇到不可用导出端点、日志过滤或 stderr 背压
- **THEN** 业务结果和错误分类不变，节点及子调用次数不增加；遥测沿用宿主的有界后台输出与关闭预算，不阻塞业务等待容量

## REMOVED Requirements

### Requirement: Final output is a completed-run mapping

**Reason**: 每张图现在声明唯一业务输出类型及唯一返回节点，调用方不再解析终点/叶子的 NodeId 映射。

**Migration**: 删除 Node.terminal 与 RunOutput 使用；构图时指定 return_node 和 Graph 的 O，多分支在图内聚合。读取 Run.final_output 的 Option<&Arc<O>> 或消费 Run.into_result 的 Result<Arc<O>, Error>。无业务返回使用 O = () 并显式产生单元值；缺失返回不再作为空映射成功。

## ADDED Requirements

### Requirement: Graph input exactly covers the resolved entries

GraphInput SHALL 以 NodeId 映射 Input，提供公开构造和只读 entry 查询。LocalScheduler.run SHALL 在初始化之前一次性验证键恰好覆盖 Graph 最终 entries，缺失和多余键一起保留在 EntrySetMismatch 来源中。空 Input SHALL 合法，类型和数量要求 SHALL 由节点的既有 Input 读取契约决定，不增加重复数据预检。HashMap 顺序 SHALL 不改变调度与结算顺序。

#### Scenario: Different entries receive different business inputs

- **WHEN** 调用为两个入口分别提供 String 与数值 Input，任意调整键的插入顺序
- **THEN** 各入口只获得自己对应的外部值，执行及结算仍遵守图注册和实例创建顺序

#### Scenario: Invalid keys fail before initialization

- **WHEN** GraphInput 缺少入口或包含非入口/未知键
- **THEN** run 返回 Error::Call(CallError::Input)，source 保留 missing/unexpected 的完整差异，初始化和节点执行次数均为零

#### Scenario: Empty input is judged by the entry node

- **WHEN** 调用显式提供入口的空 Input
- **THEN** 键集合校验通过；无需值的节点可以成功，要求 entry<T> 的节点按既有数量错误失败；省略该入口的键仍为启动错误

#### Scenario: Reading an absent entry preserves its input error

- **WHEN** 调用方直接读取 GraphInput 中不存在的 NodeId
- **THEN** entry 返回 Error::Input(InputError::MissingEntry)，不隐式创建空输入

### Requirement: Explicit call input resets entry origins

Input::new SHALL 用显式业务值构造 Origin::Run 入口，允许空 Vec。GraphInput 构造 SHALL 共享已有业务值 Arc 并按值顺序重建本次调用的入口来源，不沿用父图 NodeKey 来源或自动附加父输入。图内普通边、Transition payload 与 Deliver payload SHALL 保持既有来源及覆盖规则。

#### Scenario: A parent forwards only selected values

- **WHEN** 父节点从自身输入选择一份业务值组装子图 GraphInput
- **THEN** 子入口只读取该值且来源为 Origin::Run，不出现父节点来源索引或父输入的其他值；业务值无需深复制

### Requirement: Node outputs share the business value Arc

NodeInstance::Output SHALL 仍为业务类型 O，Outcome<S, O>.value SHALL 统一为 Option<Arc<O>>。节点记录、普通边输入、类型化图返回和父节点直接转发 SHALL 共享原 Arc，不额外包装 Arc，也不要求 O: Clone。普通非返回节点的 None SHALL 继续表示无输出。

#### Scenario: A non-cloneable child result is forwarded

- **WHEN** 子图返回非 Clone 的业务值，父节点把 call 的结果直接放入自己的 Outcome.value
- **THEN** 子结果、父节点记录和父最终输出指向同一业务对象，Output 的类型仍为 O 而非 Arc<O>；原有 Input 读取能够按 O 访问

### Requirement: Final output is the declared typed return

Run<S, O>.final_output SHALL 仅在整图 Completed 时为 Some(&Arc<O>)，Run.into_result SHALL 消费成功 Run 并交付同一 Arc。返回节点提前完成 SHALL 不终止整图；返回值 SHALL 来自该节点当前有效的完成结果。其他阶段均成功而返回节点被跳过或无值时，Run SHALL Failed 并记录 MissingOutput，不能用空映射或外层可空结果表示成功。

#### Scenario: An early return does not hide later failures

- **WHEN** 返回节点已成功，但后续节点、归并、路由或停滞使整图失败
- **THEN** final_output 为 None，into_result 返回执行错误，已完成节点的诊断输出仍可读取

#### Scenario: Reactivation invalidates the old return

- **WHEN** 返回节点曾产生输出，随后被 Transition 重激活
- **THEN** 旧输出按普通规则清除，最终结果只取重执行后的当前值；重执行无值时 MissingOutput，重执行失败时 Execution

#### Scenario: Unit and business optional values are real returns

- **WHEN** O = () 且返回 Some(Arc::new(()))，或 O = Option<T> 且返回 Some(Arc::new(None))
- **THEN** 二者均可成功；Outcome.value = None 不表示这些业务值，其他工作成功时它使图报告 MissingOutput

#### Scenario: A skipped return cannot silently succeed

- **WHEN** 全部工作已终结且没有其他错误，但唯一返回节点为 Skipped
- **THEN** Run Failed，errors 包含该节点的 RunError::MissingOutput，into_result 返回 CallError::MissingOutput

### Requirement: Each run initializes its own state

Graph SHALL 选择默认或异步自定义初始化策略，构图时不执行初始化。每次 run 在入口校验后、节点执行前 SHALL 得到独立 S。自定义初始化 SHALL 接收本次 Arc<GraphInput> 与 RunContext<R> 并异步返回 Result<S, Error>；仅默认构造路径要求 S: Default，不增加 S: Clone，也不修改 State trait 或 derive 的归并职责。

#### Scenario: The default strategy runs for every invocation

- **WHEN** 未配置自定义初始化的同一图被重复或并发调用
- **THEN** 每个调用执行自己的 S::default，State 和执行记录独立，前一调用的 Delta 不作为下一调用的初值

#### Scenario: Async initialization uses only explicit inputs and resources

- **WHEN** 无 Default、无 Clone 的 State 通过异步函数读取本次输入和 Context 资源进行初始化
- **THEN** 公开构图与执行 API 可用，初始化完成前零节点执行，初始化函数不获得父 State

### Requirement: Context carries explicit resources without sharing state

RunContext<R = ()> SHALL 保存强类型 Arc<R>、身份及深度信息，不包含 State。NodeContext<S, R> SHALL 提供本 Run 的 wave State 快照、NodeKey 和 RunContext。上下文克隆 SHALL 不要求 R: Clone；with_resources SHALL 显式替换资源类型和 Arc，同时保留全部身份及深度预算。资源副作用 SHALL 不获得 State 归并或自动回滚语义。

#### Scenario: Parent and child use different state and resource types

- **WHEN** 父节点通过 with_resources 给子图提供另一资源类型，父子采用不同 State
- **THEN** 子初始化和节点仅获得显式资源与自己的 State，父 State 不共享；资源替换前的 run_id、父关系、depth、max_depth 全部保留，子调用再正常派生下一层身份

#### Scenario: Resources are shared only by explicit handles

- **WHEN** 父子使用同一个资源 Arc，或无资源时使用 Arc<()>
- **THEN** 节点直接通过强类型对象访问资源，不需要资源标记 trait 或动态注册中心；共享资源不使父子 Delta 写入同一 State

### Requirement: Run identity derives bounded child contexts

RunContext SHALL 通过构造入口封装身份和预算，提供只读 getter。根 ID SHALL 由宿主提供，depth=0 且无父关联。child SHALL 先检查深度，允许时生成新 run_id、记录父 run_id 与完整父 NodeKey、depth 加一并继承 max_depth。max_depth=0 SHALL 合法；拒绝 SHALL 发生于子初始化及执行之前。

#### Scenario: Root child and grandchild keep their lineage

- **WHEN** 根允许 max_depth=2，节点依次发起子和孙调用
- **THEN** 深度依次为0、1、2，各子身份新建，parent_run_id 指向直接父 Run，parent_node 能区分 template 实例；不要求 ID 特定字符串格式

#### Scenario: The next depth is rejected before starting

- **WHEN** depth 已等于 max_depth 的上下文尝试派生 child，包括根 max_depth=0
- **THEN** 返回 DepthExceeded { parent_depth, max_depth }，无更深层初始化、节点执行或子 Run 开始事件；根本身仍可执行

### Requirement: Scheduler owns the result-oriented call boundary

Scheduler<T, O, R = ()> SHALL 以显式目标、GraphInput、父 RunContext 和父 NodeKey 为 call 参数，返回 Send future，其结果为 Result<Arc<O>, core::Error>。LocalScheduler SHALL 实现本地 Graph 目标，先派生子身份，再复用自身 run，并通过 Run.into_result 交付。该 trait SHALL 不要求目标是 Graph 或实现构造本地 Run；节点通过构造注入具体实现，不增加绑定目标的调用包装或专属子图节点。

#### Scenario: A parent depends only on the scheduler contract

- **WHEN** 父节点注入小型 Scheduler fake，目标不是本地 Graph，fake 仅处理显式输入并返回结果或 core::Error
- **THEN** 父节点能够执行及处理失败，无需读取子 State、NodeStatus、RunStatus 或内部节点记录

#### Scenario: A local call uses the diagnostic execution contract

- **WHEN** 同一目标通过 LocalScheduler.run 与本地 Scheduler.call 执行
- **THEN** 两者遵守相同初始化、wave、归并、路由及完成规则；call 额外派生子身份并把 run 的诊断结果统一转换为业务结果

### Requirement: Subgraphs follow ordinary node instantiation rules

发起子调用的节点 SHALL 遵守普通 NodeInstance 的静态/template、Deliver、join 和 wave 规则。父子及同图不同 Run SHALL 隔离 State、输入、节点记录和实例集合，不隐式共享父 Run 数据。图及节点执行体 SHALL 沿用既有复用方式，不增加子图节点工厂、克隆或重建协议。

#### Scenario: Template instances invoke the same graph independently

- **WHEN** Deliver 创建多个调用同一子图的 template 实例，各子 Run 使用相同内部 NodeId 和实例 key
- **THEN** 各子 Run 的身份、初始化和记录独立，无跨 Run key 冲突；父图仍按普通 template 完整实例集等待及聚合结果

### Requirement: Concurrency limits are independent per run

同一 LocalScheduler SHALL 为每个 Run 独立计算并发名额并保留固定 wave 行为。等待子调用的父节点 SHALL 继续占用父 Run 名额，子 Run SHALL 使用自己的名额；本次 SHALL 不引入全调用树共享名额或全树预算。

#### Scenario: A concurrency limit of one permits nesting

- **WHEN** 父子复用同一 LocalScheduler 且 max_concurrency=1，父节点等待子图结果
- **THEN** 子图仍能执行并使父节点完成，不形成等待共享名额的死锁

#### Scenario: Each run obeys its own limit

- **WHEN** 受控节点同时启动多个子 Run 并跟踪各 Run 的执行数量
- **THEN** 每个 Run 的同时运行任务数不超过 K，调用树总数可以超过 K；完成先后不改变各 Run 的固定结算顺序

### Requirement: Startup failures and execution failures have distinct diagnostics

LocalScheduler.run SHALL 返回 Result<Run<S, O>, Error>。入口校验或初始化返回错误 SHALL 直接 Err，不构造缺少 State 的 Run；初始化成功后的执行失败 SHALL 返回包含完整记录的 Failed Run。Run.state SHALL 始终返回 &S。Run SHALL 保留只读身份信息，不为诊断持有整份 RunContext 或调度资源；调度临时数据 SHALL 在交付 Run 时释放。

#### Scenario: Initialization returns an expected error

- **WHEN** 异步初始化显式返回 Err
- **THEN** run 返回 CallError::Initialization 并保留 source，没有节点执行或可供读取的完整 Run

#### Scenario: Execution fails after successful initialization

- **WHEN** 节点、归并、路由、停滞或 wave 配额导致执行失败
- **THEN** run 返回 Ok(Failed Run)，可读取 State、节点、全部实际错误和身份，final_output=None；into_result 再返回调用错误

#### Scenario: Diagnostic ownership does not retain scheduler resources

- **WHEN** 节点、State 和输出未自行保存资源，执行完成后宿主保留 Run 并释放其他资源句柄
- **THEN** Run 仍能提供身份与诊断读取，但不会仅因内部保存执行上下文而阻止资源释放

### Requirement: Call errors preserve stable categories and diagnostic sources

Error::Call SHALL 区分 Input、DepthExceeded、Initialization、Execution、MissingOutput。输入校验和初始化 SHALL 保留真实 source；Execution SHALL 保留完整实际执行错误集合的私有诊断聚合，不只保留首条，也不承诺标准 source 单链可枚举并列错误。MissingOutput SHALL 仅用于其他阶段成功后的返回缺失。错误类别 SHALL 不自动决定是否重试。

#### Scenario: Every actual execution error survives conversion

- **WHEN** 同一 wave 产生多个节点、归并及指令错误后消费 Run
- **THEN** into_result 返回 Execution，聚合保留原有全部错误与稳定顺序，公共错误不要求父节点解析内部 NodeId 或错误文本

#### Scenario: Nested depth rejection remains an execution source

- **WHEN** 节点收到直接调用的 DepthExceeded 并未经处理向外传播
- **THEN** 该节点所在图失败，其调用方收到 Execution；深度错误保留为来源，不把外层已执行的图误分类为未启动的深度拒绝

### Requirement: Parents explicitly decide retries and handled failure outcomes

子调用 SHALL 明确交付成功或错误，不静默失败。父节点 SHALL 自行决定重新 call、正常返回降级 Outcome 或传播错误；框架不自动重试或回滚副作用。每次重试 SHALL 新建子 run_id、初始 State 和记录，保持同一父 run_id、父 NodeKey 及深度，不从失败位置继续。正常 Outcome SHALL 按 Completed 处理而非 Skipped。

#### Scenario: A retry is a fresh sibling invocation

- **WHEN** 父节点第一次 call 失败后再次调用同一子图
- **THEN** 两次子身份不同、各自初始化，父关联与深度相同；先前外部副作用仍存在，同层重试不消耗额外嵌套深度，重试终止条件由父节点控制

#### Scenario: A handled failure completes normally

- **WHEN** 父节点显式处理子错误并正常返回自身 Outcome
- **THEN** 父节点 Completed，其 Delta、Directive 和值按普通成功规则参与结算；父未处理而传播的错误使父节点及所属 Run 失败

### Requirement: Recursive targets can be assembled through public resources

公开 API SHALL 支持应用先创建强类型资源中的固定一次写入目标槽位，再构图并填齐目标后执行；节点在运行时通过 Context 解析自身或另一图。该组装 SHALL 不要求 core 注册中心或节点工厂。示例图、节点及初始化闭包 SHALL 不永久反向持有资源 Arc，以免与资源所持图构成强引用环。

#### Scenario: Self recursion and mutual recursion stop at the depth boundary

- **WHEN** 仅通过公开 API 和应用 OnceLock 槽位分别组装 A 调 A 及 A/B 相互调用，max_depth=2
- **THEN** 实际开始深度仅为0、1、2，下一层在初始化前被拒绝；直接发起方得到 DepthExceeded(2, 2)，向外传播后的根结果为 Execution

#### Scenario: Recursive definitions are released after use

- **WHEN** 上述调用完成后释放 Run、资源与宿主持有的图句柄
- **THEN** 对图定义的 Weak 无法升级，证明组装没有保留永久强引用环；验证不访问私有调度状态

### Requirement: Run observations cover startup and settle once

Run 执行 future 首次 poll 时 SHALL 在入口校验和初始化前建立 tracing span 与 DEBUG 开始事件；总耗时 SHALL 包含启动阶段。整图成功 SHALL DEBUG 完成，预期启动或执行失败 SHALL WARN 并记录阶段、受控分类及耗时。观测 SHALL 在返回结果前结算，每个正常结束的 Run 恰好一次；深度拒绝 SHALL 关联发起父位置而不伪造子开始。

#### Scenario: Startup failure is attributable

- **WHEN** 入口校验或异步初始化返回 Err
- **THEN** 该运行身份下有一次开始和一次 WARN 失败，阶段区分输入校验与初始化，且能够关联父 Run 与父 NodeKey

#### Scenario: Holding or dropping a returned run does not settle it again

- **WHEN** 完成或失败的 Run 已返回，调用方随后读取、消费或丢弃它
- **THEN** 不延后或重复记录完成、失败、取消，总耗时截止于本次执行结束

### Requirement: Dropped futures and panics have different observation outcomes

未 poll 的执行 future SHALL 不记录开始或取消。已经开始而正常 drop 的 future SHALL 仅记录一次 DEBUG 本地取消，表示本地停止观察，不新增 Run 状态或停止结果。panic unwind SHALL 不误报普通取消或伪造完成/业务失败；已有任务边界把节点 panic 转为执行错误时 SHALL 正常结算一次失败。本次 SHALL 不增加 panic 恢复或 interrupt/resume 协议。

#### Scenario: Unpolled and normally dropped futures differ

- **WHEN** 分别丢弃未 poll 的 future 与经受控通知确认已开始的未完成 future
- **THEN** 前者零事件；后者开始一次、DEBUG cancel 一次，无完成或失败，不承诺外部工作已停止

#### Scenario: Initialization panic crosses the run observation guard

- **WHEN** 测试外层 catch_unwind 包住独立 runtime 对真实 run 的执行，初始化发生 panic
- **THEN** 测试捕获 unwind；该 Run 开始一次，普通 cancel、完成及伪造业务失败均为零，没有节点执行，不继续或恢复原 Run

#### Scenario: Node panic is caught at the existing task boundary

- **WHEN** 普通节点 panic，由既有任务边界保留 JoinError 来源
- **THEN** run 返回 Failed Run 而不向测试外层逃逸；该 Run 恰好记录一次 WARN 失败，没有完成或普通 cancel，清理不重复结算

#### Scenario: Child initialization panic has separate parent and child observations

- **WHEN** 父节点通过真实 call 进入子初始化，子初始化 panic 展开至父节点任务边界
- **THEN** 按各自 run_id 检查：子 Run 有开始但无普通 cancel、伪造完成/失败；父 Run 因任务错误恰好记录一次失败，无额外完成或 cancel

### Requirement: Run telemetry contains only safe fields

Run span SHALL 关联 run_id、parent_run_id、父 NodeKey 与 depth；日志 SHALL 仅选择受控阶段、错误分类、耗时等安全字段。身份文本 SHALL 限长并编码控制字符，不改变业务中保存的原始身份。遥测 SHALL 不记录输入、输出、State、凭据、原始配置或完整错误 source 链，不以任意 ID 或错误文本引入指标维度。

#### Scenario: User-controlled identity and error data do not leak

- **WHEN** 身份含控制字符或超长文本，业务错误 source、输入及资源含敏感测试标记
- **THEN** 本地与远程观测仅含经过处理的身份和受控分类，不出现敏感内容或完整 source，业务诊断仍保留真实错误来源
