## ADDED Requirements

### Requirement: Kernel has a reachable public API independent of dev

cognacta-core SHALL 提供 design 第2节的根公开 API、统一 thiserror Error 和只读 Run 检查入口。Graph、Scheduler 及 State 能力 SHALL 不受 CLI dev feature 限制；内部 adapter、Input 组装器和调度状态 SHALL 不开放可变访问。

#### Scenario: A downstream crate runs a graph

- **WHEN** 一个外部测试目标仅导入 cognacta_core 根导出，构造两个不同 Output 类型的 NodeInstance、Graph 和 Scheduler
- **THEN** 它能通过公开 API 执行、读取 Input/Output、State、状态、全部错误和 final_output，无需访问私有模块或启用 CLI dev

### Requirement: Graph validates configuration once

Graph::build 及其 bon builder SHALL 经过同一入口检查重复节点、未知边端点/entry、无合法入口、非法 template 角色、已声明动态目标及可证明的 SingleWriter 冲突。Graph SHALL 保持不可变并可供多个 Run 复用。SchedulerConfig SHALL 在入口拒绝并发数0，内部使用 NonZeroUsize；max_waves=0 SHALL 合法。

#### Scenario: Invalid graph is rejected before execution

- **WHEN** 图含重复 ID、未知端点、template entry/terminal 或不存在的声明目标
- **THEN** 构图返回带对应 GraphError 分类的 core::Error，任何节点均未开始执行

#### Scenario: Entries are derived or selected

- **WHEN** entries 为空
- **THEN** Graph 依注册顺序选无普通入边的非 template 节点；没有合法入口则返回 NoEntry

#### Scenario: Two runs reuse one definition

- **WHEN** 同一 Graph 以两份初始 State 启动 Run
- **THEN** 各 Run 独立拥有状态、节点记录、实例集合、错误和输出，一份 Run 的 Delta 不修改另一份 State

### Requirement: Input preserves type and real origin

Input SHALL 用 TypeId 索引唯一的真实值存储，以 NodeId 来源索引及独立 entry 保存 SourceRef。外部值 SHALL 使用 Origin::Run，普通值和实例值 SHALL 使用真实 NodeKey。entry/one SHALL 要求过滤后恰好一值；many/all SHALL 允许空值。访问失败 SHALL 返回 Error::Input，并保留数量/类型分类。

#### Scenario: External and node values have the same type

- **WHEN** 一个 entry 节点同时收到 String 外部值与合格 String 前驱输出
- **THEN** entry<String> 只读取外部值，one<String>(前驱) 只读取该来源，all<String> 按规则包含两份；不创建虚拟 NodeId

#### Scenario: Multiple instances share one source

- **WHEN** template T 的两个实例各产生 Finding
- **THEN** many<Finding>(T) 按创建顺序返回两份，one<Finding>(T) 返回 Cardinality，origins(T) 可区分两个 Instance

#### Scenario: Output is not cloneable

- **WHEN** 一个非 Clone 的 Output 经普通边或 template 扇入传递
- **THEN** Input 与 NodeRun 共享底层 Arc 值，业务读取不需要复制该 Output

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

### Requirement: Sweep is delayed and committed before recomputing

Scheduler SHALL 仅在正常 ready 为空时 Sweep Pending、非 entry、有入边的普通节点。Sweep SHALL 返回候选而不自行修改 Run；本轮候选在临时判断中按 terminal/done 对待，提交 Skipped 后 SHALL 重新计算。Sweep SHALL 不计 wave、不跳过无入边的孤立非 entry。

#### Scenario: A dead branch is cleared in successive sweeps

- **WHEN** A→D 为 false、D→E 为 live，且图已有其他 ready 工作
- **THEN** 不立即跳过 D/E；正常 ready 为空后先提交 D Skipped，再重新计算并提交 E Skipped

### Requirement: Template joins account for complete instance sets

template 定义 SHALL 无静态 NodeRun。每条 live template 边 SHALL 计一票；有实例时全实例 terminal 才算前驱 terminal/done。只有正常 ready 为空且 Sweep 无新候选后 SHALL 启用空扇出兜底，使空 template 贡献一票并允许聚合空 Input。

#### Scenario: Three workers contribute one predecessor vote

- **WHEN** worker 的三个实例全部完成，worker→aggregate 是一条 live 边
- **THEN** 此前驱的 done=1、total=1，aggregate 收到三份实例输出，不把实例数量当成边数

#### Scenario: Empty fanout is settled last

- **WHEN** planner 发出空 Deliver，其他正常工作与 Sweep 都无法推进
- **THEN** aggregate 可以作为下一逻辑 wave 执行，many 返回空列表，未创建虚拟实例

### Requirement: A wave is fixed while concurrency slots refill

每个 wave SHALL 固定一个 ready Vec；K SHALL 仅限制同时运行 task 数量。排队成员 SHALL 保持 Pending/attempts不变，实际 spawn 才 Running/attempts+1。完成腾出槽位后 SHALL 继续同 wave 成员，即使已收到错误；新 ready SHALL 不插入当前 wave。

#### Scenario: Failure does not cancel queued members

- **WHEN** ready=[w1,w2,w3]、K=1，w1返回Err
- **THEN** w2/w3仍依次执行，三者收齐后才结算一次，waves只增加1

#### Scenario: Concurrency does not change the state snapshot

- **WHEN** B/C在同一个固定 wave，K分别为1或2，B提出 count+1
- **THEN** C仍读取wave开始时State，不看到B尚未提交的Delta；两种K按相同ready顺序结算

### Requirement: Tasks own their temporary references

NodeRun SHALL 长期保存 Arc<Input>；task SHALL 持有执行体Arc、InputArc及拥有StateArc的NodeContext，调用时仅借Input。Scheduler SHALL 回收整个JoinSet并释放task State引用后取得独占State。业务 SHALL 不泄露State共享所有权或通过内部可变性直接修改State。

#### Scenario: A panicking task remains attributable

- **WHEN** 一个task panic，未返回正常NodeKey结果
- **THEN** Scheduler依据task id找到其ready槽和NodeKey，保留真实JoinError来源，继续收齐其他成员

#### Scenario: State ownership is retained outside the task

- **WHEN** 测试节点故意保留StateArc导致barrier无法取得唯一可变引用
- **THEN** 成功Output仍保留，Run.errors包含Invariant，不合并State或应用路由

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

Scheduler SHALL 在正常ready、Sweep提交重算和空扇出兜底之后判断结束。有ready时 SHALL 在启动前检查max_waves；无ready且errors为空、全部普通NodeRun与已创建实例终态才Completed。残留Pending SHALL 导致Stalled并保持其状态；可推进但超配额 SHALL 导致MaxWaves。

#### Scenario: Exact wave quota succeeds

- **WHEN** 三节点链在第三wave完成全部工作，max_waves=3
- **THEN** Run Completed，不因已经达到配额而追加MaxWaves

#### Scenario: Quota stops an unstarted node

- **WHEN** 同一链max_waves=2
- **THEN** C保持Pending/attempts=0，errors包含MaxWaves，已提交State保留

#### Scenario: A disconnected non-entry blocks completion

- **WHEN** 显式入口路径已完成，另一无入边非entry节点仍Pending
- **THEN** Run Failed(Stalled)，不把该节点自动标为Skipped或Failed

### Requirement: Final output is a completed-run mapping

final_output SHALL 仅在Run Completed时设置。候选 SHALL 优先为显式terminal普通节点，否则为无普通出边的普通sink；只收Completed且有Output的候选。template及实例 SHALL 不直接进入最终映射；零或单值结果 SHALL 保持RunOutput映射形状。

#### Scenario: A completed run has no value outputs

- **WHEN** 所有工作终结且候选节点均无Output
- **THEN** final_output为Some(empty mapping)，与失败Run的None区分

### Requirement: Error boundaries preserve crate errors and sources

自有公开可失败API SHALL 使用core::Error；Run SHALL 保留Vec<RunError>而非单条错误。节点、归并与指令边界 SHALL 分别补充NodeKey、阶段和writer，保留真实source，不做无上下文双向转换；公共Display SHALL 不展开原始业务错误链。

#### Scenario: An input error crosses the node boundary

- **WHEN** NodeInstance读取Input得到Cardinality并通过问号传播
- **THEN** 返回Run的错误是该NodeKey的RunError::Node，source保留Error::Input及Cardinality，不变成归并错误

### Requirement: Core requires no telemetry initialization

内核 SHALL 不初始化Subscriber、Collector或exporter，本版 SHALL 不增加日志、span和指标。执行语义 SHALL 不依赖宿主观测配置。

#### Scenario: A graph runs without a collector

- **WHEN** 外部库调用方未初始化任何遥测而执行确定性图
- **THEN** 节点结果、State、errors、waves和final_output均符合相同契约
