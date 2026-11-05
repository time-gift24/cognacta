# graph-check-cli Specification

## Purpose

定义默认关闭的 CLI dev 图验收入口，以六类确定性图和真实运行结果验证内核行为，明确最终报告、预期失败、退出码及遥测故障隔离，供开发时重复执行验收。

## Requirements

### Requirement: Graph checks are gated by the dev Cargo feature

cognacta-cli SHALL 通过默认关闭的dev feature提供graph-check子命令、私有样例和所需可选依赖。正式core能力 SHALL 不由该feature限制。命令 SHALL 接受chain、diamond、branch、fanout、transition、settlement、all七个值，必须提供场景。

#### Scenario: Default build rejects the development command

- **WHEN** 未启用dev的CLI收到graph-check或显示帮助
- **THEN** 命令参数解析退出2，帮助中不列出graph-check，原无参数/help/version行为保持

#### Scenario: Enabled help shows all selections

- **WHEN** 启用dev后运行graph-check --help
- **THEN** 列出六个家族及all，退出0；缺少或未知场景退出2且不执行任何图

### Requirement: Fixtures execute the actual public kernel

每个变体 SHALL 使用 core 根公开 API、LocalScheduler、GraphInput 和 RunContext 执行独立 Run，并声明 Graph 的输出类型及唯一非 template 返回节点。State SHALL 通过图的 Default 或显式初始化策略创建。业务值、State、执行体和报告 SHALL 留在 CLI 私有模块，使用固定合成数据与内存计算，无 agent loop、模型调用、网络业务服务或数据库。期望值 SHALL 仅用于断言，不能用作 actual 或绕过调度器手动调用节点。

#### Scenario: Repeating a selection produces the same report

- **WHEN** 无模型、API key 或 DATABASE_URL 的环境重复执行同一场景
- **THEN** 每次新建并初始化 Run，最终事实、断言和退出码一致，不依赖前一 Run 状态或真实外部服务；每个最终 entry 均有显式 Input，无数据时提供空 Input

#### Scenario: Existing fixtures declare their business return

- **WHEN** 构造 chain、diamond、branch、fanout、transition 或 settlement 图
- **THEN** 返回节点依次为 C、D、C、aggregate、T、aggregate，Graph 的 O 与对应声明 Output 一致；普通节点使用 Option<Arc<Output>>，不使用 terminal 标记或 RunOutput 映射

### Requirement: Chain checks data flow and wave limits

chain SHALL 运行 complete 和 limit 两个变体：A→B→C，GraphInput 为 A 提供 "hello"，K=1，A 输出 String，B 输出5并提交 length=5，C 输出 len=5；max_waves 分别3和2。Graph SHALL 显式以 C 为唯一类型化返回。

#### Scenario: Exact quota completes

- **WHEN** 执行 chain/complete
- **THEN** 三节点各执行一次、waves=3、Run Completed、State.length=5，final_output 为从 C 的 JSON 输出恢复的业务值 len=5，断言通过

#### Scenario: Limited chain preserves prior work

- **WHEN** 执行 chain/limit
- **THEN** waves=2、A/B Completed、C Pending 且 attempts=0、State.length=5、唯一错误 MaxWaves、final_output=None，不追加 MissingOutput；符合期望时 check=PASS

### Requirement: Diamond checks concurrency and barrier ordering

diamond SHALL 运行serial(K=1)与parallel(K=2)：A→{B,C}→D(All)，A提交count=10/labels=[A]；B/C返回所见count并各Add1、Append自身标记。parallel SHALL 使用受控同步使C先于B完成，不以sleep推测顺序。

#### Scenario: Both concurrency settings produce the same committed state

- **WHEN** 执行diamond两个变体
- **THEN** B/C都观察count=10，D读取count=12及labels=[A,B,C]，Input来源正确，waves=3，结果不随完成顺序变化

### Requirement: Branch checks skipped predecessors and join semantics

branch SHALL 构造A→B→C及A→D→E→C，A→D条件false，其余live；运行C为Any和All两个变体，max_waves=3。

#### Scenario: Any completes after the dead branch is skipped

- **WHEN** 执行branch/any
- **THEN** D/E为Skipped且attempts=0，A/B/C Completed，waves=3，Run Completed

#### Scenario: All remains blocked by a missing success vote

- **WHEN** 执行branch/all
- **THEN** D/E Skipped，C Pending且attempts=0，waves=2，Run Failed且仅含Stalled，final_output=None；这些事实匹配时PASS

### Requirement: Fanout checks instance identity input and empty work

fanout SHALL 运行 empty/one/many 三个变体，planner Deliver worker 的0/1/3个实例，Job 值按顺序为1/2/3；worker 返回同值并 Add 到 total、Append 到 items，worker→aggregate(All)，K=2、max_waves=3。Graph SHALL 以 aggregate 为唯一返回节点；空、单个和多个实例 SHALL 都由 aggregate 生成业务结果。

#### Scenario: Empty fanout still aggregates

- **WHEN** 执行 fanout/empty
- **THEN** 无实例、aggregate 收到空 many、total=0、items=[]、waves=2、Run Completed；final_output 为 aggregate 的实际业务值，不是缺失返回或空 NodeId 映射

#### Scenario: Multiple instances keep their order and origin

- **WHEN** 执行 fanout/many
- **THEN** 恰有三个不同 Instance 身份、各 attempts=1，many 值与 Origin 按创建顺序，one 读取报 Cardinality，total=6、items=[1,2,3]、waves=3，最终结果直接为 aggregate 的类型化业务值

#### Scenario: A single instance is not implicitly unwrapped from RunOutput

- **WHEN** 执行 fanout/one
- **THEN** 一个实例，total=1、items=[1]、waves=3，aggregate 单值可读；final_output 为 aggregate 结果的 Arc，不根据实例数量改为直接返回 worker，也不保留旧 RunOutput 映射形状

### Requirement: Forward transitions check payload and activation without an agent loop

transition SHALL 构造 A→P→Q→T，A 发出 payload7 到 T，分别运行 immediate=true/false。P/Q 各 Add1 到初始 count=0；K=2、max_waves=4。图 SHALL 无模型、工具回调或回边，以 T 为唯一返回节点；T 提前产出值 SHALL 不结束尚有工作的 Run。

#### Scenario: Immediate transition sees the earlier snapshot

- **WHEN** 执行 transition/immediate
- **THEN** T 与 P 在下一 wave 执行并观察 count=0，总 waves=3，最终 count=2，T 输入只来自 A 的 payload7，各节点执行一次；Q 完成后才交付 T 的类型化最终结果

#### Scenario: Normal transition obeys predecessors

- **WHEN** 执行 transition/wait
- **THEN** T 在 Q 完成后观察 count=2，总 waves=4，输入仍为 A 的 payload7，不混入 Q 输出，各节点执行一次，最终结果为 T 的实际业务值

### Requirement: Settlement checks distinct failure commit boundaries

settlement SHALL 按design的固定State和注入运行node-error、merge-error、directive-error、single-writer、multi-error五个变体。seed成功后Deliver worker，worker→aggregate；失败变体 SHALL 精确检查全部错误、成功Output、State和零路由。普通失败 SHALL 用Result注入。

#### Scenario: Queued siblings complete despite the first failure

- **WHEN** node-error以K=1运行w1失败、w2/w3成功
- **THEN** w2/w3均Completed且Output保留，count从seed的1变3，items=[seed,w2,w3]，仅Node(w1)错误，aggregate Pending，waves=2

#### Scenario: Overflow rejects every field update

- **WHEN** merge-error从count=255的seed基准运行两个成功worker
- **THEN** count=255且items/title仍为seed基准，两个Output保留，仅Merge/Overflow，aggregate未执行

#### Scenario: Invalid routing retains committed state

- **WHEN** directive-error的w1成功并发出合法aux项与未知目标项
- **THEN** count=2、items=[seed,w1]、w1 Completed且Output保留，aux实例0，仅InvalidDirective/UnknownTarget

#### Scenario: Dynamic writers conflict at the barrier

- **WHEN** single-writer的两个实例成功且都更新title
- **THEN** 所有State字段保持seed基准，Output保留，仅Merge/SingleWriterConflicts(title)，不会误用构图失败当作通过

#### Scenario: Five actual errors survive settlement

- **WHEN** multi-error中w1/w2失败、w3/w4成功但冲突写title且各发一条非法指令
- **THEN** errors依次为2条Node、1条Merge、2条InvalidDirective，State保持seed基准，w3/w4 Output保留

### Requirement: Final reports show actual facts and all assertion results

CLI SHALL 只输出最终文本报告，不增加逐 wave 观察接口。每变体 SHALL 展示实际 Run 状态、waves、节点身份/status/attempts、固定样例 State、Output/类型化 final_output、全部受控错误分类，以及各断言 expected/actual 或匹配结论。排序 SHALL 固定，不依赖 HashMap；SharedValue 和 Graph 的 O SHALL 不被要求通用 Debug/Serialize，报告按各样例已知业务类型读取实际值。

#### Scenario: A failed run passes its expected assertions

- **WHEN** branch/all 的全部事实符合预期
- **THEN** 报告同时显示 run=failed 与 check=PASS，列出 Stalled 及 C Pending 等检查结果

#### Scenario: An unrelated failure cannot satisfy a case

- **WHEN** 本应 Stalled 的案例实际发生 Input 错误、初始化错误或构图失败
- **THEN** check=FAIL，显示真实分类及差异，不能因为执行未成功就通过；尚未形成 Run 的启动错误不伪造 Run 状态或节点事实

#### Scenario: An output has the wrong type

- **WHEN** 实际 NodeRun JSON Output 无法反序列化为该样例约定类型
- **THEN** 报告该项断言失败，不省略该项或以期望输出替代 actual；类型化 final_output 则直接读取 O，无需重新按节点映射定位

### Requirement: Exit codes describe verification results

所有选中变体通过 SHALL 退出0，包括预期 Run 失败；任一断言、意外构图、启动或报告 I/O 失败 SHALL 退出1；参数错误 SHALL 退出2。all SHALL 按六类固定顺序执行全部16变体，收集差异并输出 cases/passed/failed；一个 case 失败 SHALL 不跳过其他独立 case。报告 I/O 失败 SHALL 停止输出且不重跑业务图。

#### Scenario: All expected outcomes pass

- **WHEN** all 的16个变体均符合各自契约
- **THEN** 汇总 cases=16、passed=16、failed=0 并退出0，不能把预期的 Run Failed 统计为验收失败

#### Scenario: One assertion is deliberately changed in a test

- **WHEN** 测试让一个真实结果与期望不符
- **THEN** 报告该差异、最终退出1，并继续报告其余独立 case

#### Scenario: A case fails before a run exists

- **WHEN** 测试使某变体的入口校验或 State 初始化返回错误
- **THEN** 该 case 统计为失败，显示受控启动错误分类，其他独立 case 继续，最终退出1且不自动重试

### Requirement: Process observation preserves verification behavior

CLI SHALL 复用现有 Collector 初始化/关闭和业务结束后的3秒关闭/最终诊断总预算，沿用 core 的 Run 生命周期日志与 span，不在验收入口重复结算或新增调度指标。最终报告 SHALL 仅包含固定合成业务数据与安全错误分类，不输出凭据、真实用户内容或完整 source 链。遥测失败/背压 SHALL 不改变业务报告与验收退出码。

#### Scenario: Telemetry cannot export or stderr is blocked

- **WHEN** 相同图分别在无远程配置、不可用遥测端点、stderr 背压条件下运行
- **THEN** stdout 报告和验收退出码相同，Collector 按既有预算关闭，不重复执行节点；测试以有界宿主等待检测挂起

### Requirement: CLI checks complement kernel and compile-time tests

CLI报告 SHALL 不声称证明不可从最终Run观察的内部时点。实现 SHALL 通过core UT验证ready/Sweep时机、Pending/Running补位及barrier，通过公开API测试验证边界可达，通过独立编译诊断验证类型约束；并发验证 SHALL 使用受控同步，不依赖墙钟或sleep。

#### Scenario: A final state could hide an early merge

- **WHEN** 一个错误实现可能得到相同终值却在wave中提前提交Delta
- **THEN** 同wave节点所见State断言及core barrier测试必须能检测该错误，不能只比较最终数字
