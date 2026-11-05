# graph-kernel-execution Specification

## Purpose

定义 Cognacta 内存图内核的公共边界、统一输入、构图校验、ready 与 Sweep、固定 wave 调度、动态路由、错误汇总及结束条件，使不同并发配置下的执行和结算行为确定且可验证。
## Requirements
### Requirement: Kernel has a reachable public API independent of dev

cognacta-core SHALL 从根导出 Scheduler trait、Execution trait、LocalScheduler、Graph<S, O, R = ()>、GraphInput、RunContext<R = ()>、Run<S, O>、统一 thiserror Error/CallError，以及调用所需的节点、输入、State、错误、bon builder 和状态模块。公开能力 SHALL 不受 CLI dev feature 限制；Run SHALL 仅提供只读检查及消费式结果交付，内部 adapter、输入组装、类型化结果槽与调度状态 SHALL 不开放原始可变访问；调度器只通过 Execution 的 advance/dispatch/complete 操作当前运行。

#### Scenario: A downstream crate runs a graph

- **WHEN** 一个外部测试目标仅导入 cognacta_core 根导出，构造两个不同 Output 类型的 NodeInstance、Graph 和 LocalScheduler
- **THEN** 它能通过公开 API 执行、读取 Input/Output、State、状态、全部错误和类型化 final_output，无需访问私有模块或启用 CLI dev

#### Scenario: Builders remain reachable from the crate root

- **WHEN** 外部调用方使用默认或自定义初始化的 Graph builder、RunContext 根 builder、SchedulerConfig builder 和 Arc<dyn Scheduler> 的共用 run_builder
- **THEN** 所需生成类型及状态模块均公开可达；run_builder 的 call 终结方法遵守 run 契约，不保留旧 Scheduler::call 子调用接口

#### Scenario: The same graph accepts another real scheduler

- **WHEN** 外部测试仅通过根导出实现 Scheduler::drive，将同一个 Graph 交给它和 LocalScheduler
- **THEN** 两者都能执行并交付 Run，替代后端实际控制任务调度而非返回预制结果；Graph/Node/Run 不含后端类型或调度器字段

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

#### Scenario: Recursive bindings are not traversed at construction

- **WHEN** Node::new 接收尚未绑定目标的 OnceLock/Weak 执行体并构建 Graph
- **THEN** 只验证节点声明、边与输出类型，不解析目标、执行初始化或递归展开调用关系；具体绑定在实际节点执行时解析

### Requirement: Input preserves JSON values and real origin

Input SHALL 保存有序的 JSON SharedValue 与真实 Origin，不按 TypeId 索引或过滤。外部值 SHALL 使用 Origin::Run，普通和实例值 SHALL 使用真实 NodeKey；entry／one SHALL 按来源选择恰好一个值，many SHALL 返回来源下全部 JSON 并允许空列表，values SHALL 暴露完整有序来源和值。业务转换 SHALL 在节点入口使用标准 Serde，数量错误和转换错误 SHALL 分别属于 InputError::Cardinality 和 Decode。

#### Scenario: External and node values have the same JSON shape

- **WHEN** 入口同时有外部字符串 JSON 与一个合格前驱字符串 JSON
- **THEN** entry 只读取外部值，one(前驱) 只读取该来源，values 保留两份及真实来源；不创建虚拟 NodeId 或类型 key。

#### Scenario: Multiple instances share one source

- **WHEN** template T 的两个实例各产生一份 JSON
- **THEN** many(T) 按创建顺序返回两份，one(T) 返回 Cardinality；values 中的 Origin 区分各 Instance，不按解码类型筛选。

#### Scenario: Business schema fails at the consumer

- **WHEN** 输入来源及数量正确，但节点无法将值解析成业务类型
- **THEN** SHALL 返回 InputError::Decode，保留 Serde source，并按节点失败记录；replay 不重新调用该节点的业务反序列化代码。

### Requirement: Input assembly follows eligible edges and explicit payloads

普通 Input SHALL 仅收已 Completed、入边 live、实际有 Output 的直接前驱；重复 live 边 SHALL 不重复同一 Output。来源 SHALL 按注册顺序，实例 SHALL 按创建顺序；业务 Vec SHALL 保持单份值。Transition payload SHALL 替换本次普通输入；Deliver 实例 SHALL 只接收自己的 payload，来源均为真实 writer。

#### Scenario: A false template edge contributes nothing

- **WHEN** T 有已完成实例，但 T→N 的 when 为 false
- **THEN** N 的 Input 不包含该边下的实例输出

#### Scenario: Transition overrides predecessor values

- **WHEN** A 向 T 发送 payload7，T 的普通前驱 Q 已有 Output
- **THEN** T 的本次 Input 只包含来自 A 的 payload7，不包含 Q Output；无 payload 时才走正常输入规则

### Requirement: Readiness checks open predecessors before join

ready SHALL 是按普通节点注册顺序、随后实例创建顺序的全量只读重算。Pending 的 entry、实例或一次性 immediate 激活 SHALL 直接 ready。其他候选 SHALL 先等待所有前驱 terminal（包括 when=false 的边），再计算 live/total/done；无 live 或 done=0 SHALL 不执行 join。All/Any/Custom SHALL 遵守相同闸门。

#### Scenario: Any still waits for an open predecessor

- **WHEN** 一个 live 前驱 Completed，另一个前驱仍 Pending 或 Running
- **THEN** Any 和始终返回 true 的 Custom 均不能使目标 ready

#### Scenario: Skipped is not a success vote

- **WHEN** 两条 live 入边的普通前驱分别 Completed 和 Skipped
- **THEN** total=2、done=1，Any 可以 ready，All 不 ready；Skipped 不被重新解释为 Completed

#### Scenario: Instances retain global creation order across templates

- **WHEN** template 注册顺序为 first、second，Deliver 列表依次创建 second、first 的实例
- **THEN** ready 中的实例顺序为 second、first，顺序敏感的 Delta 和路由按此顺序结算，不按 template 重新分组

### Requirement: Sweep is delayed and committed before recomputing

Scheduler SHALL 仅在正常 ready 为空时 Sweep Pending、非 entry、有入边的普通节点。Sweep SHALL 返回候选而不自行修改 Run；本轮候选在临时判断中按 terminal/done 对待，提交 Skipped 后 SHALL 重新计算。Sweep SHALL 不计 wave、不跳过无入边的孤立非 entry。

#### Scenario: A dead branch is cleared in successive sweeps

- **WHEN** A→D 为 false、D→E 为 live，且图已有其他 ready 工作
- **THEN** 不立即跳过 D/E；正常 ready 为空后先提交 D Skipped，再重新计算并提交 E Skipped

#### Scenario: Sweep candidates settle before another branch changes conditions

- **WHEN** seed→D 与 D→E 均为 false，seed→E 的 gate 条件当前为 false，D 已成为本轮候选，另有等待 D terminal 的 F 会写入 gate=true
- **THEN** E 将 D 临时视为 terminal 并同轮成为候选；先提交 D/E 为 Skipped，再执行可推进的 F，E 不因之后的 gate 变化执行

### Requirement: Template joins account for complete instance sets

template 定义 SHALL 无静态 NodeRun。每条 live template 边 SHALL 计一票；有实例时全实例 terminal 才算前驱 terminal/done。只有正常 ready 为空且 Sweep 无新候选后 SHALL 启用空扇出兜底，使空 template 贡献一票并允许聚合空 Input。

#### Scenario: Three workers contribute one predecessor vote

- **WHEN** worker 的三个实例全部完成，worker→aggregate 是一条 live 边
- **THEN** 此前驱的 done=1、total=1，aggregate 收到三份实例输出，不把实例数量当成边数

#### Scenario: Empty fanout is settled last

- **WHEN** planner 发出空 Deliver，其他正常工作与 Sweep 都无法推进
- **THEN** aggregate 可以作为下一逻辑 wave 执行，many 返回空列表，未创建虚拟实例

### Requirement: A wave is fixed while concurrency slots refill

每个 wave SHALL 固定一个 ready Vec；K SHALL 仅限制同时运行 task 数量。排队成员 SHALL 保持 Pending/attempts不变，调度器取得本 Run 名额并实际 poll dispatch 返回的任务、成功追加 NodeStarted 后，才由共享 apply 置 Running/attempts+1；首条 NodeStarted 同时记录完整有序 wave 成员并增加 waves。完成腾出槽位后 SHALL 继续同 wave 成员，即使已收到错误；新 ready SHALL 不插入当前 wave。

#### Scenario: Failure does not cancel queued members

- **WHEN** ready=[w1,w2,w3]、K=1，w1返回Err
- **THEN** w2/w3仍依次执行，三者收齐后才结算一次，waves只增加1

#### Scenario: Concurrency does not change the state snapshot

- **WHEN** B/C在同一个固定 wave，K分别为1或2，B提出 count+1
- **THEN** C仍读取wave开始时State，不看到B尚未提交的Delta；两种K按相同ready顺序结算

#### Scenario: Admission order does not change settlement order

- **WHEN** 替代 Scheduler 改变同一 ready 集合的实际启动与完成顺序
- **THEN** 结果仍按最初 ready 顺序结算，各成员读取相同 wave State，补位不新增 wave；不能提前 dispatch 尚无名额的成员

### Requirement: Tasks own their temporary references

NodeRun SHALL 长期保存 Arc<Input>；task SHALL 持有执行体Arc、InputArc及拥有StateArc的NodeContext，调用时仅借Input。Scheduler SHALL 回收全部已提交任务并释放 task State 引用后取得独占 State；LocalScheduler 使用 JoinSet，其他后端遵守相同所有权契约。task 临时持有传入的 Arc<dyn Scheduler>，NodeContext 本身不保存它。业务 SHALL 不泄露State共享所有权或通过内部可变性直接修改State。

#### Scenario: A panicking task remains attributable

- **WHEN** 一个task panic，未返回正常NodeKey结果
- **THEN** LocalScheduler依据task id找到其ready槽和NodeKey，保留真实JoinError来源，继续收齐其他成员

#### Scenario: State ownership is retained outside the task

- **WHEN** 测试节点故意保留StateArc导致barrier无法取得唯一可变引用
- **THEN** 成功Output仍保留，Run.errors包含Invariant，不合并State或应用路由

#### Scenario: Erasure preserves existing business bounds

- **WHEN** 节点返回非 Clone Output 和 Send 但非 Sync 的 State::Delta，分别经本地和替代调度器执行
- **THEN** 接口可编译并完成相同结算，Execution 不暴露 Any/Outcome 槽或要求 Delta: Sync；返回 Run 不保留 task future 或 Scheduler

### Requirement: Barrier preserves results and collects all actual errors

barrier SHALL 按ready顺序保存成功Output并标Completed，失败节点标Failed且无Outcome；之后尝试成功Delta归并，再无副作用检查全部成功Directive。错误 SHALL 按Node、Merge/Invariant、Directive顺序完整保留。任一错误 SHALL 使Run失败并阻止整批路由及下一wave。

#### Scenario: A sibling fails after another succeeds

- **WHEN** B成功并返回Output/Delta，D返回Err
- **THEN** B的Output保留且Delta尝试提交，D无Output/Delta，Run Failed，不执行下游

#### Scenario: Multiple stages fail in one wave

- **WHEN** 两节点返回Err，两个成功节点引起归并冲突且各自发出非法指令
- **THEN** errors依次包含两条Node、一条Merge和两条InvalidDirective；成功节点仍Completed，final_output=None

### Requirement: Routing validates the entire batch before applying it

Transition SHALL 指向已有普通节点，Deliver SHALL 指向已有template。实例key SHALL 在当前Run和本批内均唯一。成功Outcome的全部指令 SHALL 先验证；存在任一错误时 SHALL 不创建任何本批实例或rearm目标，已保存Output和已提交State SHALL 不回滚。

#### Scenario: A valid delivery precedes an invalid one

- **WHEN** 同批Deliver含合法aux实例及未知目标
- **THEN** 收集UnknownTarget，aux实例数保持不变，writer仍Completed，保留其已提交Delta

#### Scenario: Duplicate instance identities are rejected

- **WHEN** 同一template/key在Run已有或本批重复
- **THEN** 报DuplicateInstanceKey且整批零路由；不同template使用相同key仍合法

### Requirement: Transition reactivation is deferred and one shot

Transition SHALL 将目标rearm为Pending、清除旧Input/Output并保留身份与attempts。immediate许可 SHALL 仅作用于下一次spawn，false SHALL 走普通ready规则。多个同目标指令 SHALL 按固定顺序应用，最后一个覆盖payload与immediate，包括None/false；最终只形成一个待执行调用。

#### Scenario: An immediate forward transition bypasses pending predecessors

- **WHEN** A→P→Q→T且A发送immediate Transition(T)
- **THEN** T最早在下一wave与P执行，不能插入A所在wave；false时等待Q及正常join

#### Scenario: Reactivation clears a previously granted permit

- **WHEN** 一个目标先收到true许可，随后同批收到false且payload=None的Transition
- **THEN** 旧许可和payload被清除，目标只执行普通ready规则；不并发创建两个同身份调用

### Requirement: Completion distinguishes no work from blocked or limited work

共用运行时 SHALL 在正常 ready、Sweep 提交重算和空扇出兜底之后判断结束。有 ready 时 SHALL 在启动前检查 max_waves；无 ready、errors 为空且全部普通 NodeRun 与已创建实例终态时，SHALL 检查唯一返回值，存在才 Completed。残留 Pending SHALL 导致 Stalled 并保持其状态；可推进但超配额 SHALL 导致 MaxWaves。已有执行错误时 SHALL 不追加推测性的 MissingOutput。advance SHALL 形成结束判断；共用 run SHALL 在 drive 返回且任务引用释放后，通过 Run 的统一方法一次性提交终态，不经过 Completed→Failed。

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

#### Scenario: Scheduling errors retain their sources

- **WHEN** driver 或驱动协议边界返回 Error::Scheduling
- **THEN** 保留真实 source；初始化后的错误保存为 RunError::Scheduling 并返回 Failed Run，不伪装成节点或初始化错误；实际 Node、Merge/Invariant、Directive 错误顺序不变，调度错误附后；Display 和日志不展开 source 链

#### Scenario: Binding errors belong to the invoking node

- **WHEN** OnceLock 执行体未绑定，或 Weak 的目标已释放
- **THEN** 分别返回 Error::Node(UnboundInstance / DroppedInstance)，添加当前 NodeKey；不 panic、不等待绑定、不伪造子 Run

### Requirement: Core requires no telemetry initialization

内核 SHALL 使用宿主既有 tracing 配置记录 Run 生命周期，不初始化 Subscriber、Collector 或 exporter，不读取隐式遥测端点，不依赖 Collector 或 SDK。本次 SHALL 不新增调度指标。执行结果、错误及重试决策 SHALL 不依赖遥测初始化、过滤、导出成功或输出容量。

#### Scenario: A graph runs without a collector

- **WHEN** 外部库调用方未初始化任何遥测而执行确定性图
- **THEN** 节点结果、State、errors、waves 和 final_output 均符合相同契约

#### Scenario: Telemetry fails or applies backpressure

- **WHEN** 相同调用分别遇到不可用导出端点、日志过滤或 stderr 背压
- **THEN** 业务结果和错误分类不变，节点及子调用次数不增加；遥测沿用宿主的有界后台输出与关闭预算，不阻塞业务等待容量

### Requirement: Graph input exactly covers the resolved entries

GraphInput SHALL 以 NodeId 映射 Input，提供公开构造和只读 entry 查询。Arc<dyn Scheduler> 的共用 run SHALL 在初始化之前一次性验证键恰好覆盖 Graph 最终 entries，缺失和多余键一起保留在 EntrySetMismatch 来源中。空 Input SHALL 合法，类型和数量要求 SHALL 由节点的既有 Input 读取契约决定，不增加重复数据预检。HashMap 顺序 SHALL 不改变调度与结算顺序。

#### Scenario: Different entries receive different business inputs

- **WHEN** 调用为两个入口分别提供 String 与数值 Input，任意调整键的插入顺序
- **THEN** 各入口只获得自己对应的外部值，执行及结算仍遵守图注册和实例创建顺序

#### Scenario: Invalid keys fail before initialization

- **WHEN** GraphInput 缺少入口或包含非入口/未知键
- **THEN** run 返回 Error::Call(CallError::Input)，source 保留 missing/unexpected 的完整差异，初始化和节点执行次数均为零

#### Scenario: Empty input is judged by the entry node

- **WHEN** 调用显式提供入口的空 Input
- **THEN** 键集合校验通过；无需值的节点可以成功，要求 `entry()` 的节点按既有数量错误失败；省略该入口的键仍为启动错误

#### Scenario: Reading an absent entry preserves its input error

- **WHEN** 调用方直接读取 GraphInput 中不存在的 NodeId
- **THEN** entry 返回 Error::Input(InputError::MissingEntry)，不隐式创建空输入

### Requirement: Explicit call input resets entry origins

Input::new SHALL 用显式 JSON 值构造 Origin::Run 入口，允许空 Vec。GraphInput 构造 SHALL 共享已有 Arc<JsonValue> 并按值顺序重建本次调用的入口来源，不沿用父图 NodeKey 来源或自动附加父输入。图内普通边、Transition payload 与 Deliver payload SHALL 保持既有来源及覆盖规则。

#### Scenario: A parent forwards only selected values

- **WHEN** 父节点从自身输入选择一份 JSON 值组装子图 GraphInput
- **THEN** 子入口只读取该值且来源为 Origin::Run，不出现父节点来源索引或父输入的其他值；现有 JSON Arc 可共享，恢复后不承诺原指针身份

### Requirement: Node outputs cross boundaries as JSON

NodeInstance::Output SHALL 保留业务 O，Outcome<S, O>.value SHALL 保持 Option<Arc<O>>，不要求 O: Clone。适配器 SHALL 将 Some(O) 用 serde_json::to_value 转为 JSON 后记录，NodeRun、普通边和实例输入 SHALL 保存 JSON SharedValue。None SHALL 表示无输出，显式 null SHALL 保留存在性；框架 SHALL 不保证原业务 Arc 在这些位置的指针身份。

#### Scenario: A non-cloneable child result is forwarded

- **WHEN** 子图 O 不实现 Clone，Graph 的 NodeInstance 适配把子返回值作为自己的 Outcome.value
- **THEN** SHALL 用普通出口 Serde 转为父节点 JSON 结果；消费者自行解码，不注册 O，不要求业务 Clone 或原 Arc 身份。

### Requirement: Final output is the declared typed return

Run<S, O>.final_output SHALL 仅在整图 Completed 时为 Some(&Arc<O>)，Run.into_result SHALL 消费成功 Run 并交付同一 Arc。返回节点提前完成 SHALL 不终止整图；返回值 SHALL 来自该节点当前有效的 JSON 完成结果。最终 O SHALL 满足 DeserializeOwned，并在 RunCompleted 的统一准备入口通过静态泛型解码一次，append 后 apply 安装返回投影；不需要注册表，不保证与节点原业务 Arc 相同。解码失败 SHALL 返回 EventLogError::Decode 且不追加 RunCompleted。其他阶段均成功而返回节点被跳过或无值时，Run SHALL Failed 并记录 MissingOutput，不能用空映射或外层可空结果表示成功。

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

RunContext<R = ()> SHALL 保存强类型 Arc<R>、身份及深度信息，不包含 State。NodeContext<S, R> SHALL 提供本 Run 的 wave State 快照、NodeKey 和 RunContext。上下文克隆 SHALL 不要求 R: Clone；with_resources SHALL 显式替换资源类型和 Arc，同时保留全部身份及深度预算。资源副作用 SHALL 不获得 State 归并或自动回滚语义。Graph、Node、Run、RunContext 和 NodeContext SHALL 不保存 Scheduler，也不引入调度器泛型；NodeInstance::run SHALL 仅在执行参数中接受 Arc<dyn Scheduler>。

#### Scenario: Parent and child use different state and resource types

- **WHEN** 普通 Node 通过 with_resources 投影给图执行体提供另一资源类型，父子采用不同 State
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

### Requirement: Subgraphs follow ordinary node instantiation rules

Graph<C, O, R> SHALL 对任意父状态 P: State 直接实现 NodeInstance<P, R, Output = O>，通过 Node::new(id, graph) 声明，遵守普通静态/template、Deliver、Transition、join 和 wave 规则。图执行体 SHALL 从 Input 的所有实际来源中取得恰好一个 JSON 值并通过标准 Serde 转为 GraphInput，派生子身份，以传入的同一 Scheduler 执行并交付从记录 JSON 恢复的 Arc<O>，最终 O 增加 DeserializeOwned；父 Delta 为默认值且无 Directive。不得新增子图专属类型、构造器或运行时按子图类型分支。父子及同图不同 Run SHALL 隔离 State、输入、节点记录和实例集合，不隐式共享父 Run 数据。图及节点执行体 SHALL 沿用既有复用方式，不增加子图节点工厂、克隆或重建协议。

#### Scenario: Template instances invoke the same graph independently

- **WHEN** Deliver 创建多个调用同一子图的 template 实例，各子 Run 使用相同内部 NodeId 和实例 key
- **THEN** 各子 Run 的身份、初始化和记录独立，无跨 Run key 冲突；父图仍按普通 template 完整实例集等待及聚合结果

#### Scenario: Static edges reach a graph instance

- **WHEN** 前驱输出 GraphInput，普通静态边连接 Node::new(id, child_graph)
- **THEN** 按普通 ready/dispatch 路径执行，业务前驱不保存 Scheduler 或手写 Scheduler::call；子结果成为普通 O 输出

#### Scenario: Deliver and Transition use the same graph implementation

- **WHEN** Deliver 将 GraphInput payload 发给 template 图 Node，或 Transition 将其发给普通图 Node
- **THEN** 使用同一 NodeInstance 实现和既有来源/路由规则，新逻辑调用使用新 Run；恢复原 attempt 与 call key 时接回原 Run，重激活不交付旧 attempt 的结果

#### Scenario: A graph node checks its input contract

- **WHEN** Input 的所有来源合计零个或多个 JSON 值，或者唯一值不能反序列化为 GraphInput
- **THEN** 按 InputError::Cardinality 或 Decode 失败，子初始化未开始；不按“能否解析成 GraphInput”过滤其他输入。唯一有效值进入普通 call，子入口键集合只在共用 run 入口校验一次

### Requirement: Concurrency limits are independent per run

同一 Scheduler 的各次 drive SHALL 为每个 Run 独立计算并发名额并保留固定 wave 行为。等待子调用的父节点 SHALL 继续占用父 Run 名额，子 Run SHALL 使用自己的名额；本次 SHALL 不引入全调用树共享名额或全树预算。

#### Scenario: A concurrency limit of one permits nesting

- **WHEN** 父子复用同一 LocalScheduler 且 max_concurrency=1，父节点等待子图结果
- **THEN** 子图仍能执行并使父节点完成，不形成等待共享名额的死锁

#### Scenario: Each run obeys its own limit

- **WHEN** 受控节点同时启动多个子 Run 并跟踪各 Run 的执行数量
- **THEN** 每个 Run 的同时运行任务数不超过 K，调用树总数可以超过 K；完成先后不改变各 Run 的固定结算顺序

### Requirement: Startup failures and execution failures have distinct diagnostics

Arc<dyn Scheduler> 的共用 run SHALL 返回 Result<Run<S, O>, Error>。入口校验或初始化返回错误 SHALL 直接 Err，不构造缺少 State 的 Run；初始化成功后的执行失败 SHALL 返回包含完整记录的 Failed Run。Run.state SHALL 始终返回 &S。Run SHALL 保留只读身份信息，不为诊断持有整份 RunContext 或调度资源；调度临时数据 SHALL 在交付 Run 时释放。

#### Scenario: Initialization returns an expected error

- **WHEN** 异步初始化显式返回 Err
- **THEN** run 返回 CallError::Initialization 并保留 source，没有节点执行或可供读取的完整 Run

#### Scenario: Execution fails after successful initialization

- **WHEN** 节点、归并、路由、停滞、wave 配额或调度驱动导致执行失败
- **THEN** run 返回 Ok(Failed Run)，可读取 State、节点、全部实际错误和身份，final_output=None；into_result 再返回调用错误

#### Scenario: Diagnostic ownership does not retain scheduler resources

- **WHEN** 节点、State 和输出未自行保存资源，执行完成后宿主保留 Run 并释放其他资源和 Scheduler 句柄
- **THEN** Run 仍能提供身份与诊断读取，但不会仅因内部保存执行上下文而阻止资源或 Scheduler 释放

#### Scenario: Driver failure settles started work

- **WHEN** driver 已提交部分本波任务后发生预期失败
- **THEN** driver 回收已提交任务并逐个 complete，释放 State 引用；共用入口结算实际成功结果和错误，禁止整批路由及后续 wave 并返回 Failed Run；已启动记录不遗留 Running，未启动记录保持 Pending，final_output=None

### Requirement: Call errors preserve stable categories and diagnostic sources

Error::Call SHALL 区分 Input、DepthExceeded、Initialization、Execution、MissingOutput。输入校验和初始化 SHALL 保留真实 source；Execution SHALL 保留完整实际执行错误集合的私有诊断聚合，不只保留首条，也不承诺标准 source 单链可枚举并列错误。MissingOutput SHALL 仅用于其他阶段成功后的返回缺失。错误类别 SHALL 不自动决定是否重试。

#### Scenario: Every actual execution error survives conversion

- **WHEN** 同一 wave 产生多个节点、归并及指令错误后消费 Run
- **THEN** into_result 返回 Execution，聚合保留原有全部错误与稳定顺序，公共错误不要求父节点解析内部 NodeId 或错误文本

#### Scenario: Nested depth rejection remains an execution source

- **WHEN** 节点收到直接调用的 DepthExceeded 并未经处理向外传播
- **THEN** 该节点所在图失败，其调用方收到 Execution；深度错误保留为来源，不把外层已执行的图误分类为未启动的深度拒绝

### Requirement: Parents explicitly decide retries and handled failure outcomes

子调用 SHALL 明确交付成功或错误，不静默失败。默认图 Node SHALL 传播子错误；应用需要显式处理时 SHALL 以普通 NodeInstance 组合调用被包装实例的 run，自行决定再次执行、正常返回降级 Outcome 或传播错误，不使用业务 Scheduler::call；框架不自动重试或回滚副作用。每次重试 SHALL 新建子 run_id、初始 State 和记录，保持同一父 run_id、父 NodeKey 及深度，不从失败位置继续。正常 Outcome SHALL 按 Completed 处理而非 Skipped。

#### Scenario: A retry is a fresh sibling invocation

- **WHEN** 显式普通 NodeInstance 组合首次执行图实例失败后，以同一父上下文和传入 Scheduler 再次执行同一实例
- **THEN** 两次子身份不同、各自初始化，父关联与深度相同；先前外部副作用仍存在，同层重试不消耗额外嵌套深度，重试终止条件由父节点控制

#### Scenario: A handled failure completes normally

- **WHEN** 父节点显式处理子错误并正常返回自身 Outcome
- **THEN** 父节点 Completed，其 Delta、Directive 和值按普通成功规则参与结算；父未处理而传播的错误使父节点及所属 Run 失败

#### Scenario: Default graph nodes do not install retries

- **WHEN** 直接通过 Node::new 声明的图执行体失败
- **THEN** 父节点及所属 Run 按普通错误规则失败，框架不自动重试、降级、回滚或增加专属策略类型

### Requirement: Run observations cover startup and settle once

Run 执行 future 首次 poll 时 SHALL 在入口校验和初始化前建立 tracing span 与 DEBUG 开始事件；总耗时 SHALL 包含启动阶段。整图成功 SHALL DEBUG 完成，预期启动或执行失败 SHALL WARN 并记录阶段、受控分类及耗时。观测 SHALL 在返回结果前结算，每个正常结束的 Run 恰好一次；深度拒绝 SHALL 关联发起父位置而不伪造子开始。

#### Scenario: Startup failure is attributable

- **WHEN** 入口校验或异步初始化返回 Err
- **THEN** 该运行身份下有一次开始和一次 WARN 失败，阶段区分输入校验与初始化，且能够关联父 Run 与父 NodeKey

#### Scenario: Holding or dropping a returned run does not settle it again

- **WHEN** 完成或失败的 Run 已返回，调用方随后读取、消费或丢弃它
- **THEN** 不延后或重复记录完成、失败、取消，总耗时截止于本次执行结束

### Requirement: Dropped futures and panics have different observation outcomes

未 poll 的执行 future SHALL 不记录开始或取消。已经开始而正常 drop 的 future SHALL 仅记录一次 DEBUG 本地取消，表示本地停止观察，不新增 Run 状态或停止结果。panic unwind SHALL 不误报普通取消或伪造完成/业务失败；已有任务边界把节点 panic 转为执行错误时 SHALL 正常结算一次失败。遥测取消 SHALL 不改写业务历史；业务继续执行遵守 event-log-recovery 规格，不把遥测结束当作 Run 终态。

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

- **WHEN** 普通 Graph 节点通过共用 run 入口进入子初始化，子初始化 panic 展开至父节点任务边界
- **THEN** 按各自 run_id 检查：子 Run 有开始但无普通 cancel、伪造完成/失败；父 Run 因任务错误恰好记录一次失败，无额外完成或 cancel

#### Scenario: Dropping a parent does not detach child tasks

- **WHEN** LocalScheduler 中父图节点等待子 Run 时，宿主丢弃已开始的根执行 future
- **THEN** 各层沿自身拥有的任务和 future 释放路径请求本地取消，不把子任务 detach 到后台；现有观测仅结算一次，不承诺外部副作用回滚或远程停止

### Requirement: Run telemetry contains only safe fields

Run span SHALL 关联 run_id、parent_run_id、父 NodeKey 与 depth；日志 SHALL 仅选择受控阶段、错误分类、耗时等安全字段。身份文本 SHALL 限长并编码控制字符，不改变业务中保存的原始身份。遥测 SHALL 不记录输入、输出、State、凭据、原始配置或完整错误 source 链，不以任意 ID 或错误文本引入指标维度。

#### Scenario: User-controlled identity and error data do not leak

- **WHEN** 身份含控制字符或超长文本，业务错误 source、输入及资源含敏感测试标记
- **THEN** 本地与远程观测仅含经过处理的身份和受控分类，不出现敏感内容或完整 source，业务诊断仍保留真实错误来源

### Requirement: Scheduler drives the shared execution protocol

Scheduler SHALL 是无目标/State/资源类型参数的 Send + Sync + 'static trait，提供 config 和对象安全的 drive；drive SHALL 接收 Arc<Self> 及借用的 dyn Execution，返回 Send boxed future<Result<(), core::Error>>。Execution SHALL 仅公开 advance、dispatch、complete，类型化状态和结果保持私有，不增加第二种 Run。共用类型化 run SHALL 完成入口校验、初始化、运行时组装和诊断交付，由所选 Scheduler::drive 负责实际调度循环；不得固定调用 LocalScheduler 或让业务节点选择子调度器。

#### Scenario: A custom driver executes every nesting level

- **WHEN** 外部 Scheduler 实现使用 advance 获取 ready、按自身准入次序 dispatch 并回收任务、逐一 complete，驱动含图节点的父 Graph
- **THEN** 根与所有子层进入同一 Scheduler 实例的 drive，无隐含 LocalScheduler；后端共享图规则、State 归并及 Run 状态转换

#### Scenario: Ordinary failures remain wave results

- **WHEN** 一个 dispatch 返回的 future 产生节点 Err
- **THEN** complete 登记错误并返回 Ok，driver 继续执行当前固定 wave 的其他成员；advance 收齐后结算并停止后续工作，不把业务失败改成调度启动失败

#### Scenario: Invalid operation ordering is rejected at the driver boundary

- **WHEN** driver 对非本波 key dispatch、重复 dispatch/complete，或未收齐本波便 advance
- **THEN** Execution 返回 Error::Scheduling 并保留操作来源，不重复校验图定义或新增公共调度状态结构

#### Scenario: The driver reaches the end of execution

- **WHEN** advance 返回 None
- **THEN** driver 不再启动节点，正常返回 Ok；共用入口结合驱动结果与执行诊断一次性提交 Run 终态；尚未推进至结束便返回 Ok 按调度失败处理

### Requirement: Node resource projection is generic and identity preserving

Node<S, R>::with_resources<T, F> SHALL 接收 Fn(&T) -> Result<Arc<R>, core::Error> 并返回 Node<S, T>，保留原 Node 的全部外围配置及输出声明。资源选择 SHALL 在每次节点实际执行时同步发生，替换 RunContext 资源而不改变 State 快照、节点身份、运行身份或预算。该能力 SHALL 适用于所有 NodeInstance，不增加资源标记 trait、动态注册中心或 Clone 约束。

#### Scenario: Resource projection fails before child startup

- **WHEN** 图 Node 的资源投影返回 core::Error
- **THEN** 当前父 NodeKey 记录错误和来源，子初始化、子节点及子 Run 开始事件均未发生

#### Scenario: Resource types alternate during nesting

- **WHEN** 父图使用 A、子图使用 B、下一层通过普通投影重新获得 A，各层 State 类型不同
- **THEN** 每层只收到声明的强类型资源，深度仅由图调用逐层增加，投影不创建 Run 或重置身份

### Requirement: Recursive node instances bind through standard ownership containers

core SHALL 为 Arc<N>、Weak<N>、OnceLock<N> 提供通用 NodeInstance 转发，保持 N 的父 State/资源约束与 Output。应用 SHALL 可用 Arc<OnceLock<Weak<Graph<...>>>> 先声明普通 Node、正常 fallible 构图、再填目标，不引入专属引用类型、构造器、工厂或运行时构图。宿主 SHALL 显式持有强引用，Weak 只在节点实际执行时升级；OnceLock 的 get 不等待绑定。组装时重复 set 保留标准库错误契约。

#### Scenario: Self and mutual recursion obey the depth limit

- **WHEN** 仅通过根公开 API 和标准 OnceLock/Weak 组装 A 调 A 及 A/B 互调，max_depth=2
- **THEN** 实际开始深度仅为0、1、2，下一层在初始化前拒绝；直接图执行体得到 DepthExceeded(2, 2)，向外传播后的根结果为 Execution，绑定转发不增加深度

#### Scenario: Recursive definitions are released after use

- **WHEN** 调用完成后释放宿主持有的图和资源，保留不含用户自存图/资源的诊断 Run
- **THEN** 图的 Weak 无法升级；Run 不因内部执行上下文保留图、资源或 Scheduler，验证不访问私有调度状态

#### Scenario: Missing and expired bindings are distinguished

- **WHEN** OnceLock 执行体未填值，或 Weak 的目标已经释放
- **THEN** 分别返回 UnboundInstance / DroppedInstance 并归属当前节点，不阻塞、不 panic、不开始子 Run

### Requirement: Nested execution is self similar at every depth

父子 SHALL 共用 Run<S, O>、同一 Scheduler 实例、Execution 协议和 Run/NodeRun 状态转换。Graph 的 NodeInstance 适配 SHALL 只定义一次，不增加随深度变化的类型、分支、包装或业务调用代码。增加层数 SHALL 仅增加实际调用所需的普通 Run 数据，不改变各层调度与错误规则。

#### Scenario: Three and five levels use the same path

- **WHEN** 同一参数化组图方式分别构造三层和五层，覆盖 K=1、K=2、静态边和 Deliver，并使用本地及替代 Scheduler
- **THEN** 每层经过同一入口与所选 drive，身份、输入、State、NodeRun 和实例集合独立；深度逐层增加，重复内部 NodeId/key 不冲突，非 Clone 返回值可经 Serde 传递，跨层无类型登记或按深度区分的编码路径

#### Scenario: An inner failure uses the same state machine

- **WHEN** 五层调用内层发生节点、输入/初始化错误或深度拒绝且未显式处理
- **THEN** 已启动外层按普通节点和 Run 失败规则收齐本波并保留来源；未启动的下一层不伪造 Run，所有层均无专属失败状态机

### Requirement: Run state transitions have one shared owner

Run/NodeRun、State、路由及动态实例 SHALL 仅由 append 后的共享 apply 修改；replay SHALL 调用相同入口。所有 Scheduler 后端和嵌套层 SHALL 使用该投影，不直接归并或重激活节点。NodeCompleted SHALL 提前保存完整结果，StateDelta SHALL 原子归并，Control SHALL 批量校验控制并关闭 wave。Run SHALL 依据可重建的稳定失败与返回值，通过 RunCompleted／RunFailed 一次性进入终态，原始诊断 source 不决定业务结论。恢复 Running 节点 SHALL 重新进入同一逻辑 attempt，不直接 rearm。完整协议见 event-log-recovery 规格。

#### Scenario: Missing output never passes through Completed

- **WHEN** 所有工作结束但唯一返回节点无输出，且没有其他错误
- **THEN** Run 从 Running 直接进入 Failed(MissingOutput)，不经历 Completed 再改 Failed

#### Scenario: Driver errors prevent successful completion

- **WHEN** 节点均产生成功结果，但 drive 返回真实调度错误
- **THEN** 共用入口保留已结算节点诊断并一次性置 Run 为 Failed，final_output=None，无 Completed→Failed 倒退
