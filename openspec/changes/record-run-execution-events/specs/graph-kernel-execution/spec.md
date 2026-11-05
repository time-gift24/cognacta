# Graph execution recording delta

## MODIFIED Requirements

### Requirement: Input preserves type and real origin

Input SHALL 用 TypeId 索引唯一的真实值存储，以 NodeId 来源索引及独立 entry 保存 SourceRef。外部值 SHALL 使用 Origin::Run，普通值和实例值 SHALL 使用真实 NodeKey。entry/one SHALL 要求过滤后恰好一值；many/all SHALL 允许空值。访问失败 SHALL 返回 Error::Input，并保留数量/类型分类。SharedValue SHALL 为 Arc<dyn Value>，Value 同时提供 Any 类型识别、Serde 序列化与 Send／Sync；保留 downcast_ref／downcast 入口及原 Arc 身份，不要求业务值 Clone 或 Debug。

#### Scenario: External and node values have the same type

- **WHEN** 一个 entry 节点同时收到 String 外部值与合格 String 前驱输出
- **THEN** entry<String> 只读取外部值，one<String>(前驱) 只读取该来源，all<String> 按规则包含两份；不创建虚拟 NodeId

#### Scenario: Multiple instances share one source

- **WHEN** template T 的两个实例各产生 Finding
- **THEN** many<Finding>(T) 按创建顺序返回两份，one<Finding>(T) 返回 Cardinality，origins(T) 可区分两个 Instance

#### Scenario: Output is not cloneable

- **WHEN** 一个非 Clone 的 Output 经普通边或 template 扇入传递
- **THEN** Input 与 NodeRun 共享底层 Arc 值，业务读取不需要复制该 Output

### Requirement: Node outputs share the business value Arc

NodeInstance::Output SHALL 仍为业务类型 O，Outcome<S, O>.value SHALL 统一为 Option<Arc<O>>。节点记录、普通边输入、类型化图返回和父节点直接转发 SHALL 共享原 Arc，不额外包装 Arc，也不要求 O: Clone。普通非返回节点的 None SHALL 继续表示无输出。NodeInstance::Output SHALL 增加标准 Serialize 约束，以便在类型擦除后自动记录实际输出。

#### Scenario: A non-cloneable child result is forwarded

- **WHEN** 子图返回非 Clone 的业务值，Graph 的 NodeInstance 实现把子 Run.into_result 的结果直接放入本节点 Outcome.value
- **THEN** 子结果、父节点记录和父最终输出指向同一业务对象，Output 的类型仍为 O 而非 Arc<O>；原有 Input 读取能够按 O 访问

### Requirement: Scheduler drives the shared execution protocol

Scheduler SHALL 是无目标/State/资源类型参数的 Send + Sync + 'static trait，提供 config 和对象安全的 drive；drive SHALL 接收 Arc<Self> 及借用的 dyn Execution，返回 Send boxed future<Result<(), core::Error>>。Execution SHALL 仅公开 advance、dispatch、complete，类型化状态和结果保持私有，不增加第二种 Run。共用类型化 run SHALL 完成入口校验、初始化、运行时组装和诊断交付，由所选 Scheduler::drive 负责实际调度循环；不得固定调用 LocalScheduler 或让业务节点选择子调度器。Execution::advance 和 complete SHALL 返回对象安全的 Send boxed future，driver 必须 await；dispatch 保持同步返回任务 future。共用执行内核 SHALL 在日志启用时等待相关事实追加，不能通过同步阻塞或仅修改 LocalScheduler 实现记录。

#### Scenario: A custom driver executes every nesting level

- **WHEN** 外部 Scheduler 实现await advance 获取 ready、按自身准入次序 dispatch 并回收任务、逐一 await complete，驱动含图节点的父 Graph
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

### Requirement: Startup failures and execution failures have distinct diagnostics

Arc<dyn Scheduler> 的共用 run SHALL 返回 Result<Run<S, O>, Error>。入口校验或初始化返回错误 SHALL 直接 Err，不构造缺少 State 的 Run；初始化成功后的执行失败 SHALL 返回包含完整记录的 Failed Run。Run.state SHALL 始终返回 &S。Run SHALL 保留只读身份信息，不为诊断持有整份 RunContext 或调度资源；调度临时数据 SHALL 在交付 Run 时释放。启用业务事件记录时，编码或追加故障 SHALL 直接返回 Error::EventLog，初始化之后也不返回伪造的 Failed Run；该错误跨默认子调用边界保持记录故障分类。

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

#### Scenario: A recording failure does not become a failed business run

- **WHEN** 启用日志后初始化已成功，但节点完成事件的序列化失败
- **THEN** 调用直接 Err(Error::EventLog)，不返回 Failed Run 或追加业务 RunFailed


### Requirement: Run state transitions have one shared owner

Run/NodeRun SHALL 通过集中内部方法完成既有状态转换，各 Scheduler 后端和嵌套层 SHALL 使用这些相同方法，不直接改写状态字段。Run SHALL 在驱动结束后按全部诊断与返回值一次性进入 Completed 或 Failed，终态不再变化；NodeRun 的 barrier 结算与 Transition 重激活仍遵守原规则。可选 EventLog SHALL 由共用执行内核记录状态事实，追加成功后才发布相应业务提交；记录故障直接返回 Error::EventLog。本变更 SHALL 不增加 Run 状态、恢复或暂停协议。

#### Scenario: Missing output never passes through Completed

- **WHEN** 所有工作结束但唯一返回节点无输出，且没有其他错误
- **THEN** Run 从 Running 直接进入 Failed(MissingOutput)，不经历 Completed 再改 Failed

#### Scenario: Driver errors prevent successful completion

- **WHEN** 节点均产生成功结果，但 drive 返回真实调度错误
- **THEN** 共用入口保留已结算节点诊断并一次性置 Run 为 Failed，final_output=None，无 Completed→Failed 倒退
