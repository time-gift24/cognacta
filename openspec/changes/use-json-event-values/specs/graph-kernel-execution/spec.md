## RENAMED Requirements

- FROM: `### Requirement: Input preserves type and real origin`
- TO: `### Requirement: Input preserves JSON values and real origin`
- FROM: `### Requirement: Node outputs share the business value Arc`
- TO: `### Requirement: Node outputs cross boundaries as JSON`

## MODIFIED Requirements

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

### Requirement: Node outputs cross boundaries as JSON

NodeInstance::Output SHALL 保留业务 O，Outcome<S, O>.value SHALL 保持 Option<Arc<O>>，不要求 O: Clone。适配器 SHALL 将 Some(O) 用 serde_json::to_value 转为 JSON 后记录，NodeRun、普通边和实例输入 SHALL 保存 JSON SharedValue。None SHALL 表示无输出，显式 null SHALL 保留存在性；框架 SHALL 不保证原业务 Arc 在这些位置的指针身份。

#### Scenario: A non-cloneable child result is forwarded

- **WHEN** 子图 O 不实现 Clone，Graph 的 NodeInstance 适配把子返回值作为自己的 Outcome.value
- **THEN** SHALL 用普通出口 Serde 转为父节点 JSON 结果；消费者自行解码，不注册 O，不要求业务 Clone 或原 Arc 身份。

### Requirement: Explicit call input resets entry origins

Input::new SHALL 用显式 JSON 值构造 Origin::Run 入口，允许空 Vec。GraphInput 构造 SHALL 共享已有 Arc<JsonValue> 并按值顺序重建本次调用的入口来源，不沿用父图 NodeKey 来源或自动附加父输入。图内普通边、Transition payload 与 Deliver payload SHALL 保持既有来源及覆盖规则。

#### Scenario: A parent forwards only selected values

- **WHEN** 父节点从自身输入选择一份 JSON 值组装子图 GraphInput
- **THEN** 子入口只读取该值且来源为 Origin::Run，不出现父节点来源索引或父输入的其他值；现有 JSON Arc 可共享，恢复后不承诺原指针身份

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

### Requirement: Nested execution is self similar at every depth

父子 SHALL 共用 Run<S, O>、同一 Scheduler 实例、Execution 协议和 Run/NodeRun 状态转换。Graph 的 NodeInstance 适配 SHALL 只定义一次，不增加随深度变化的类型、分支、包装或业务调用代码。增加层数 SHALL 仅增加实际调用所需的普通 Run 数据，不改变各层调度与错误规则。

#### Scenario: Three and five levels use the same path

- **WHEN** 同一参数化组图方式分别构造三层和五层，覆盖 K=1、K=2、静态边和 Deliver，并使用本地及替代 Scheduler
- **THEN** 每层经过同一入口与所选 drive，身份、输入、State、NodeRun 和实例集合独立；深度逐层增加，重复内部 NodeId/key 不冲突，非 Clone 返回值可经 Serde 传递，跨层无类型登记或按深度区分的编码路径

#### Scenario: An inner failure uses the same state machine

- **WHEN** 五层调用内层发生节点、输入/初始化错误或深度拒绝且未显式处理
- **THEN** 已启动外层按普通节点和 Run 失败规则收齐本波并保留来源；未启动的下一层不伪造 Run，所有层均无专属失败状态机
