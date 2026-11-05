# EventLog：事实协议、共享 apply 与递归恢复

更新日期：2026-11-05。状态：**format=2 JSON 载荷已实现并验证**。

本设计落实已确认的职责：节点产出事实；EventLog 只追加和读取；apply 投影状态与控制效果；scheduler 从投影计算并安排执行。本文确定事件载荷、应用顺序、中断恢复和递归调用协议；完整 crate 根导出、调用签名、编解码和错误契约见 [公开接口附录](event-log-api.md)。format=2 已按 [use-json-event-values](../../openspec/changes/use-json-event-values/tasks.md) 实施；旧 format=1 日志不自动迁移。

## 1. 总体模型与本次选择

```text
节点 Outcome / 错误 → 编码 → append → apply → 运行投影
                                                 │
                                       scheduler 计算可执行工作
                                                 │
                                          执行产生新事实
```

实时与重放共用同一个私有 apply。State、节点状态、attempt、输入输出、实例、路由、调用关联、wave 进度和终态均由该入口改变。scheduler 管理任务和名额，但不能直接 merge、rearm 或创建业务实例。

本次确定以下选择：

- NodeCompleted 提前保存完整 Outcome。StateDelta、Control 分别消费其中的增量和控制，采用有序结果引用，不重复保存最终字段 Patch。
- StateDelta 的 apply 调用现有 merge_batch；Control 的 apply 统一校验本批原始指令，再按既定规则生效。没有追加前的另一套归并／路由裁决。
- 不增加 WaveSelected。首条 NodeStarted 同时保存完整 wave 成员顺序；后续 NodeStarted 仅保存各自调用和实际 Input。
- 每波固定经过一次 StateDelta 和一次 Control，包括空批次。Control 处理完成即关闭本波，不再增加 WaveSettled。
- 递归调用先在父日志记录 CallLinked，再打开子日志。恢复使用相同调用 key 和 child_run_id；已完成的子调用不重新执行。
- 未返回的节点在恢复时可重新进入同一个逻辑 attempt，保留 Running，不直接 rearm，不新建 attempt；这不是对未记录外部副作用的 exactly-once 承诺。
- 业务载荷统一使用 serde_json::Value 和普通 Serde 数据对象，整个 Event 可直接 Serialize／Deserialize；移除 ValueTypes、手工类型 key 和 postcard。节点按来源读取 JSON，在输入边界自行反序列化业务类型。节点声明的 Output 与 Graph 最终 O 保留，具体影响见第 11 节。
- 所有 Run 默认有内存日志；持久化后端只改变存储能力。协议和投影位于 cognacta-core；沿用 cognacta-eventlog 的 JsonlEventLog。

`apply` 是业务状态投影；`schedule(Graph, projection)` 是调度查询。实际执行节点、initializer 和子调用会产生行为，只在实时执行／继续执行时运行。只读 replay 不驱动它们。

## 2. 事件包络与完整载荷

沿用 Event 的私有字段和 bon builder：

```text
seq: NonZeroU64
run_id: String
parent_run_id: Option<String>
ts: SystemTime
data: EventData
```

seq 在单个 Run 内从 1 连续递增；parent_run_id 在该流内不变。不同 Run 没有共享序号或全局排序要求，递归因果关系由调用引用表达。所有下列协议类型从 core 根公开导出，支持 Serialize／Deserialize；合法历史在入口转为私有类型化事实，apply 不重复结构校验。

```rust
pub struct NodeAttempt {
    pub key: NodeKey,
    pub attempt: NonZeroU32,
}

pub struct CallSite {
    pub node: NodeAttempt,
    pub key: String,
}

pub struct ChildCall {
    pub caller: CallSite,
    pub child_run_id: String,
    pub input: Arc<GraphInput>, // 已记录的子调用 JSON 输入
}

#[derive(Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum EventData {
    RunStarted {
        format: u16, // 本修订为 2；format=1 的 postcard 日志不自动迁移
        input: Arc<GraphInput>, // 普通 Serde 对象
        caller: Option<CallSite>, // 父 run_id 来自包络
        depth: usize,
        max_depth: usize,
        max_waves: usize,
    },
    RunInitialized { state: serde_json::Value }, // S 的 JSON 表示
    NodeStarted {
        wave: usize,
        node: NodeAttempt,
        input: Arc<Input>, // 本 attempt 的有序 JSON 值及来源
        members: Option<Vec<NodeKey>>, // 仅本波第一条开始事件为 Some
    },
    NodeCompleted {
        wave: usize,
        node: NodeAttempt,
        outcome: RecordedOutcome, // 输出 JSON、原始 Delta JSON、Directive 及 JSON payload
    },
    NodeFailed {
        wave: usize,
        node: NodeAttempt,
        reason: FailureKind,
    },
    NodeSkipped { key: NodeKey },
    CallLinked { call: ChildCall },
    RunFault { wave: Option<usize>, reason: FaultKind },
    StateDelta {
        wave: usize,
        outcomes: Vec<NodeAttempt>, // 本波所有成功结果，按成员顺序
    },
    Control {
        wave: usize,
        outcomes: Vec<NodeAttempt>, // 本波含 Directive 的成功结果，按成员顺序
    },
    RunCompleted { output: NodeAttempt },
    RunFailed { reason: Option<TerminalFailure> },
}

pub enum FaultKind { Driver, Protocol, StateOwnership }

pub enum TerminalFailure {
    Input { missing: Vec<NodeId>, unexpected: Vec<NodeId> },
    Initialization,
    Stalled,
    MaxWaves { limit: usize },
    MissingOutput { node: NodeId },
}
```

RecordedOutcome、Input、GraphInput、Directive 与 JSON null／缺省约定见 [接口附录第 4 节](event-log-api.md#4-统一-json-业务值与节点输入边界)。这些公开数据实现标准 Serde，Event 不嵌套 opaque 业务字节或 Rust 类型名。

StateDelta／Control 的引用限定在当前 run_id 和 wave。它们引用节点真正产生的原始 Delta／Directive，不引用内核提前计算的最终状态或胜出路由。顺序和确切消费集合都是事件载荷的一部分。不得遗漏、重复或替换本波应处理的结果；没有结果的任意载荷不能伪装成状态提交。

NodeCompleted 同时保存输出、Delta、Directive 和全部 payload；即使该波后来失败，也不能改写这条产出事实。NodeFailed 表示该 attempt 的节点调用明确失败；取消或结果未知不能伪造成 NodeFailed。

RunFault 记录驱动器／执行协议／State 所有权异常。它不替代节点执行结果，也不直接将 Run 置为终态。RunFailed.reason 为 None 时，要求投影已有失败；Some 只加入尚未出现的终态阶段失败，不重复拷贝全部错误。

### 各事件的应用边界

| 事件 | 接受条件与 apply 效果 |
| --- | --- |
| RunStarted | 必须为 seq=1；建立输入、身份和预算投影。根的 parent／caller 均为空且 depth=0；子调用同时提供 parent／caller。此时还没有 S，不执行 initializer |
| RunInitialized | 仅在已开始、未初始化且未终态时接受；安装记录的 S，建立静态节点 Pending、空实例／路由表，Run 进入 Running，waves=0 |
| NodeStarted | 已初始化、无 RunFault，首次开始还要求尚无失败和活动 wave；按下节打开 wave 或启动其中尚未开始的成员。后续开始允许已有同波节点失败 |
| NodeCompleted／NodeFailed | 只接收当前收集阶段、对应 Running attempt 的唯一结果；保存完整产出或稳定失败，更新节点状态。最后一个结果使本波进入 Collected |
| NodeSkipped | 只在无活动 wave、无失败时接收已有 Pending 静态非入口节点；将其标记 Skipped，不增加 attempt，不改 State |
| CallLinked | 只在父节点当前 Running attempt 中接收尚未记录的 key；保存 caller、child_run_id 和输入，不直接创建或执行子 Run |
| RunFault | 保存故障归属；收集阶段封口、未知结果处置及已提交阶段保护见第 7 节 |
| StateDelta／Control | 分别只在 Collected／StateApplied 或 StateRejected 阶段接受，规则见第 5、6 节 |
| RunCompleted／RunFailed | 提交终态，不隐式结算活动 wave，规则见第 10 节；终态之后拒绝新的业务事件 |

结构、身份和引用在事件入口校验一次。实时提交先将结果转换为 EventData 的 JSON 载荷，再通过与 replay 相同的准备入口解码已知 S／Delta／最终 O、校验为类型化事实，随后 append 并同步 apply；重放读取外部 Event 后使用相同入口。两条路径均以记录中的 JSON 为依据，不能实时用原始 Rust 对象而重放用另一个解码结果。只有 append 成功才可消费 Delta 或修改业务投影。通知在 apply 之后发出，通知失败不能撤销事实或让同一事件再次应用。

## 3. wave 成员、输入与节点开始

波次从 1 开始。scheduler 只读计算 ready，得到固定成员顺序。第一项真正获得执行名额并进入提交入口时：

```text
NodeStarted {
    wave: 上一已打开波次 + 1,
    node: 此次实际开始的成员及新 attempt,
    input: 此次实际 Input,
    members: Some(完整 ready 顺序),
}
```

此项不必是 members[0]，替代 Scheduler 可以采用不同准入顺序。apply 原子建立本波成员、推进波次计数、标记该节点 Running、保存输入、增加逻辑 attempt、消费其一次性 Transition 许可。其余成员保持 Pending 和原 attempt 计数。

后续成员的 NodeStarted 使用同一 wave，members=None。它们必须在名单中且未开始。名单唯一、非空；只有首次开始允许携带它。既有动态实例已由先前 Control 建立，不能通过 NodeStarted 偷建实例。

没有第一条 NodeStarted，就没有已提交的新波次：ready 计算和任务派发候选本身不增加 Run.waves。max_waves 在首条开始前按已打开波数检查；超限追加 RunFailed(MaxWaves)。沿用已实现的首条开始事件计数，本次 JSON 调整不改变波数规则。

### 固定读取视图

第一条 NodeStarted 之前的投影前缀是本波输入基线，序号可由该事件 seq - 1 得到，不额外存第二份业务真相。当前波的 State 在 StateDelta 前不变；节点依赖输出、实例输入和路由 payload 从这份基线读取。

NodeCompleted.apply 可以立即把节点标为 Completed 并保存输出；NodeFailed.apply 标为 Failed。排队兄弟组装 Input 时仍读本波基线，不能看到同波新输出。下一波的 ready 只能在 Control 关闭本波后计算。

基线是可由历史重建的只读投影缓存。实现共享不可变值引用，不要求 Clone 整份 State；开始过的 attempt 直接使用 NodeStarted.input。未开始成员首次执行时，从已固定基线装配 Input 并记录，不重新决定历史成员名单。

apply 可以从日志恢复完整名单和先后顺序，无须单独 WaveSelected。此载荷用于遵守现有固定 wave、顺序敏感归并及中断恢复约束，不表示排队成员已开始执行。

### scheduler 的查询边界

没有活动 wave 且没有失败时，scheduler 沿用现有 ready／sweep／空 fanout 规则：按 Graph 静态节点顺序、再按 Control 登记的实例顺序计算候选；Transition 的 immediate 许可、边条件和 Join 参与此次查询。没有 ready 时，先把 sweep 的结果逐条记录为 NodeSkipped，再从新投影继续查询；仍无工作时才判断完成或 Stalled。

这些是面向尚未执行工作的查询，条件／Join 必须是只读纯函数。replay 不调用它们重选历史成员或推翻已记录的 NodeSkipped。resume 有活动 wave 时沿用其名单；只有缺少 NodeStarted 的成员需要从固定基线组装首次 Input。真正的状态修改仍由相应事件的 apply 完成。

## 4. 一波的阶段与正常流程

公开观察阶段为：

```rust
pub enum WaveStage {
    Collecting,
    Collected,
    StateApplied,
    StateRejected,
}
```

没有活动 wave 表示可以选择下一波或判断 Run 终态。正常流程：

```text
首条 NodeStarted（完整成员 + 自己的 Input）
→ 其余 NodeStarted 与返回结果可以交错
→ 每个返回结果立即 NodeCompleted / NodeFailed → apply
→ 全部成员有结果：Collected
→ 回收任务、释放 State 引用
→ StateDelta（含空批次）→ apply → StateApplied / StateRejected
→ Control（含空批次）→ apply → 关闭本波
→ 下一波，或 RunCompleted / RunFailed
```

节点失败不取消同波尚未执行的成员，继续收齐结果。NodeStarted 顺序、结果返回顺序和固定结算顺序分别表达不同事实，不能相互替代。

StateDelta 与 Control 是两次独立提交。日志可以停在两者之间；投影明确记录该阶段，resume 只继续尚未发生的处理。不存在由 scheduler 偷补的 State／路由修改。

## 5. StateDelta 的 apply

StateDelta 只在 Collected 阶段接受。outcomes 必须恰好引用本波所有 NodeCompleted，并按 members 顺序排列；NodeFailed 不提供 Delta。引用结构和 Delta 解码在事实进入投影前校验，非法历史返回 HistoryError。

apply 执行：

1. 从已保存结果取得拥有所有权的有序 S::Delta。
2. 对当前 S 调用一次 merge_batch，沿用 SingleWriter 检查、字段顺序及 finish 语义。
3. 成功则安装该批修改，阶段变为 StateApplied。
4. 返回业务错误则保持本批之前的 S，记录稳定 Merge 失败，阶段变为 StateRejected。
5. 标记这些增量已处理；无论成功或拒绝，都不再次归并该批。

空 outcomes 也提交并执行相同的 merge_batch 流程，按返回结果进入 StateApplied／StateRejected；内建 derive 对空批次返回成功且不改字段。不能因“没有字段改变”省略阶段事实。节点失败不阻止成功兄弟的 Delta 参与归并，SingleWriter 检查仍执行。

不在 append 前消耗 pending Delta，也不为准备候选提交复制或重跑 reducer。实时路径把原始 Delta 序列化为 JSON，在统一准备入口恢复为 S::Delta，append 后 apply 才移交；replay 也从该记录恢复相同类型再移交。原始 JSON 保留在不可变历史中，Delta 不新增 Clone／Sync 要求。生成的 Delta 必须区分“省略字段＝不更新”与“字段 null＝写入 null”，详见接口附录；不能直接依赖 Option<Option<T>> 的默认 JSON 表示。

### 归并失败是投影结果

StateDelta 的事实含义是“这一批节点增量进入归并”，不是“归并必然成功”。合法增量导致 Overflow、SingleWriter 冲突、Reduce／Finish 错误，属于可确定恢复的业务结果，不是日志损坏。

apply 捕获这些 Result 错误并形成稳定失败投影，不把已记录事件应用到一半后直接退出。实时与重放执行相同 reducer，采用相同版本和顺序；不补写一份最终 Patch，也不要求恢复原始错误对象。自定义 State 必须保持已有整批原子回写契约；panic 或外部副作用不由 merge_batch 回滚。

StateDelta 之后的 Control 仍处理，用于收集控制错误并关闭波次；已有 Merge／Node 失败会抑制路由效果。

## 6. Control 的 apply

Control 仅在 StateApplied／StateRejected 阶段接受。outcomes 必须恰好引用本波带 Directive 的成功结果，保留固定成员顺序；Deliver 内部目标保留节点返回的顺序。

apply 分两步完成本批控制解释：

1. 读取原始指令，检查全部目标是否存在、静态／模板角色、已有实例及本批实例键冲突，按固定顺序记录全部稳定 Control 失败。
2. 如果本 Run 已有节点、归并、控制或 RunFault 失败，不执行任何本批路由；否则依次解释整批指令。

Transition 的效果是 rearm 目标为 Pending、清空旧 Input／Output、保留逻辑 attempt 计数、设置当前 writer／payload／immediate。同一 target 后写覆盖前写，包括 None 清空旧 payload、false 清除旧 immediate 许可；这些规则只存在于 apply。

Deliver 的效果是建立具体 NodeKey::Instance、Pending 状态及输入来源，并按指令顺序登记实例。不在 Control.apply 内执行节点，也不创建子 Run；子图和叶子节点都等 scheduler 安排实际调用。

最后，无论指令为空、被抑制还是生效，Control 都关闭本波，释放结果消费缓冲与读取基线。只保留 Run／节点／调用等必要投影。不存在空批次缺失关闭标记的问题，也不需要 WaveSettled 重新提交已经应用的 State。

因此 wave 有三个不同边界：结果逐个成为事实、StateDelta 使整批 State 生效或被拒绝、Control 使路由生效并允许选择下一波。StateDelta 与 Control 之间可观察到新 State 和旧路由，这是合法前缀；本设计不承诺二者一起原子提交。

例如 State.count 初始为 0，本波固定顺序为 [A, B]。A 返回 count += 1 和 Transition(C)，B 返回 count += 2，无指令：

| 日志前缀新增事实 | 该前缀的投影 |
| --- | --- |
| A 的 NodeCompleted | A 的输出和原始 Delta／Directive 已保存；count=0，C 尚未 rearm |
| B 的 NodeCompleted | 结果收齐，阶段 Collected；count 仍为 0 |
| StateDelta([A#1, B#1]) | apply 按 A、B 顺序归并，count=3；阶段 StateApplied，C 仍未 rearm |
| Control([A#1]) | apply 解释 A 的 Transition，C 变为 Pending，本波关闭 |

在第二行中断，resume 复用两个结果并追加 StateDelta、Control；在第三行中断，只追加 Control。若 A、B 的增量违反 SingleWriter，第三行投影为 StateRejected，count 保持 0；第四行仍关闭波次但不执行 Transition，随后记录 RunFailed。

## 7. 异常收尾与不可用记录路径

driver／协议错误发生后，停止新派发，回收所有已派发任务，并先记录可信的节点结果；然后追加 RunFault。不能先封闭波次，再接收未排序的迟到结果。

RunFault.wave 指向当前活动 wave 时，Collecting／Collected 的收集阶段封闭为 Collected：未开始成员保持 Pending，不增加 attempt；已开始但无可信结果的成员投影为 Failed，并记录 Abandoned 归属。它表达驱动失败下的未知结果处置，不补造 NodeFailed。此后不再接受该波新开始或结果事件。

随后照常追加 StateDelta，归并可取得的成功 Delta，再追加 Control 抑制路由并关闭本波，最后 RunFailed(None)。如果第一次开始之前 driver 就失败，RunFault.wave=None，不伪造空 wave。

如果故障发生时已经是 StateApplied／StateRejected，RunFault 保留该阶段及 State，接下来只处理 Control 和 RunFailed，不能退回 Collected 或再次归并。无活动 wave 时只能使用 wave=None；有活动 wave 时必须写明该 wave。

State 所有权在 StateDelta 提交之前检查：任务已回收，本波基线多余的 State 引用已释放，且提交入口期间不再向新任务分发引用。仍无法独占时，先记录 RunFault(StateOwnership)。对应 StateDelta.apply 直接进入 StateRejected，不调用 reducer；成功输出保留。重放即便没有引用泄露，也遵守该已记录故障。已有 driver 故障后仍可追加此独立故障，不改写旧记录。

本波已经 Control 关闭，driver 才报告失败时，记录 RunFault(None)，随后 RunFailed，不回滚或重新结算已经关闭的波次。

框架记录编码／解码、历史读取或 append 故障属于记录／恢复错误：停止依赖它的调用树推进，直接返回 crate::Error，不伪造业务 NodeFailed／RunFault／RunFailed。共享存储中的独立根 Run 不共享此故障闸门。

append 可能已保存事件但确认丢失。此时停止旧执行，不盲目重试或猜测序号；后续从实际日志恢复。每个 Run 单写者，不增加租约或跨进程抢占。append 成功到 apply 完成之间没有 await、通知或外部调用，已有成功事实不能因并发故障闸门而跳过应用。

## 8. 递归调用协议

### 8.1 稳定调用身份与父日志先行

一个子调用由以下元组唯一识别：

```text
(parent_run_id, parent NodeAttempt, call_key)
```

call_key 是节点代码提供的稳定、非空字符串，例如 fetch、worker/42、try/2。直接 Graph 作为节点时由框架使用保留 key @graph；普通节点通过 NodeContext::call 提供自己的 key。同一次物理进入内同 key 只能调用一次，并行调用使用不同 key；恢复重新进入相同 attempt 时可以再次遇到同 key。

首次调用顺序：

```text
检查调用 key 和深度；使用普通 JSON GraphInput
→ 在父 Run 追加 CallLinked（call_key、child_run_id、实际 GraphInput）→ apply
→ 在子 Run 追加 RunStarted → apply
→ 子初始化及执行，仍使用同一套记录／投影／调度规则
→ 子终态提交
→ 将子结果交回父节点
→ 父节点自己的 NodeCompleted / NodeFailed
```

CallLinked 声明具体子调用及身份，不保证子执行已经开始。它必须先落到父日志，避免子完成却没有可接回的父调用关联。父提交锁只覆盖父事件提交，不能持锁等待子 Run。

子 RunStarted 的 parent_run_id、caller、input、depth 与父调用事实对应。子输入直接使用首次 CallLinked 的记录；depth=父 depth+1，继承父记录的 max_depth／max_waves，每个子 Run 独立消耗自己的 wave 配额。拒绝深度超限发生在 CallLinked 前，不伪造更深层 Run。

### 8.2 相同 key 的恢复语义

父 attempt 尚无结果时，resume 用原 NodeStarted.input 和本波基线重新进入节点体，逻辑 attempt 不变，节点仍为 Running。不存在 scheduler 直接 rearm、清空旧记录或增加一次逻辑调用的操作。物理重新进入是执行设施的恢复，可能重复未记录的普通副作用。

再次调用同 key 时，NodeContext::call 查询父调用投影：

| 子历史 | 行为 |
| --- | --- |
| 没有该 key | 创建新 CallLinked；属于继续执行产生的新调用 |
| 有 CallLinked，子日志为空 | 用已分配的 child_run_id 和记录输入打开子 Run |
| 子只有 RunStarted | 在同一身份下继续初始化，不再写 RunStarted |
| 子 Run 未终结 | 重放子投影，递归继续其未完成阶段 |
| 子 RunCompleted | 解码／复用已有输出，不重新执行子图 |
| 子 RunFailed | 返回对应的稳定调用错误，不把失败子 Run 自动重试成新 Run |

已有 key 的输入以首次记录为准，当前重新计算的 input 参数不覆盖历史，也不做通用业务值相等比较。调用方要表达新输入或显式重试，必须使用新 key；例如 try/1 失败后 try/2 是新 child_run_id，同一嵌套深度。同 key 不能换成另一个 Graph；恢复要求相同 Graph 定义和兼容应用版本。

框架内所有 Graph 节点都经同一个 NodeContext::call 入口。移除可绕过调用记录的公共 RunContext::child 身份派生入口；with_resources 仍只替换资源，不生成调用。普通节点的显式子图调用迁移到 call，不新增子图专属节点类型或按深度分支。泛型包装器可用 NodeContext::with_call_key 为下一次 Graph-as-Node 调用选择稳定 key；例如 Retry<N> 使用 try/1、try/2，既适用于普通叶节点也适用于 Graph，无需向下转型或另写递归调度。

### 8.3 父子结果的边界

子 StateDelta／Control 只修改子 Run。默认 Graph 适配把子输出作为父节点 value，父 Delta 为默认值、无 Directive；自定义节点可处理子错误、加工输出或产生自己的 Delta／Control。子完成不自动等于父完成。

如果父 NodeCompleted 已记录，直接复用完整父 Outcome，不重新进入父节点或遍历其子调用。如果父结果尚未记录，则恢复父代码中的调用流程；命中已完成子调用会返回旧结果，但调用前后的普通业务代码仍可能再执行。不承诺恢复任意 Rust async 栈或自动去重这部分副作用。

子调用必须服从父任务的生命周期，不脱离到后台。父节点主动停止消费子调用并处理该情况时，子日志可以留下合法前缀；不伪造子终态。父结果已记录后，不再因为某个旧子前缀未终结就自动重新启动它。

### 8.4 JSON 输入与递归恢复的具体影响

普通显式子调用仍接收 GraphInput；每个入口保存 JSON 值。Graph-as-Node 从自己的 Input 中取唯一 JSON 值，使用普通 Serde 转成 GraphInput，然后走同一个 call 入口。GraphInput 可以由普通节点作为 Output 返回，也可以通过 Deliver／Transition payload 传递；无需登记 GraphInput 或递归访问全局类型表。

CallLinked 与子 RunStarted 都直接保存 GraphInput 的 Serde 结构。再次遇到原 call key 时使用 CallLinked 中的输入，不用当前重新计算的值覆盖历史；校验父子输入比较记录的数据结构，不比较序列化后的空白或对象成员排列，数组顺序仍有语义。

只读 replay 把 NodeStarted.input 和 NodeCompleted.value 恢复为 JSON，不运行节点的业务 Deserialize。恢复未完成父节点时，父代码可在入口重新解析原 JSON；命中已完成子调用后，已知子 Graph 的 O 通过标准 Serde 恢复并返回，不执行子节点或 initializer。未完成子 Run 仍按已有阶段继续；尚未开始的子调用仍使用原 ID 和记录输入打开。

父 NodeCompleted 已记录时，复用其 JSON 输出、原始 Delta 和 Directive，不重新进入父代码，不遍历／重新执行旧子调用。父子 State 隔离、key 稳定性、深度限制、每 Run 波次预算、失败处理与未记录副作用可能重复的边界均不改变。

## 9. 从任意前缀继续执行

公共 resume 入口只接收根 run_id、Graph、History 和重新绑定的资源。调用方确保旧执行及其子任务已停止；子 Run 由父调用协议递归接续，不允许同时独立 resume 子树。

```text
读取并 replay 根历史
→ 已终态：拒绝 resume
→ 尚未初始化：用记录输入继续初始化
→ 活动 wave：仅驱动未开始或结果未知的成员
→ Collected：追加 StateDelta
→ StateApplied / StateRejected：只追加 Control
→ 没有活动 wave：依据投影选择新工作或记录终态
```

已记录结果的成员不重跑，包括 NodeFailed。未开始成员正常写 NodeStarted；结果未知成员重新进入原逻辑 attempt，不写第二条 NodeStarted。明确失败的重试不由 resume 自动进行，由父调用或业务图的新调用／新控制事实表达。

初始化也可能发生副作用：RunStarted 后缺少 RunInitialized，只能再次执行初始化；已有 RunInitialized 必须使用记录 State。已有启动失败 RunFailed 则是终态，不能再初始化。

NodeCompleted 后缺少 StateDelta 时，恢复全部产出并完成归并；StateDelta 后缺少 Control 时，绝不再次归并。这直接覆盖 prodagent 本地验证出的“完成结果已记录但增量丢失”窗口。CallLinked 与递归续接覆盖“子已完成、父结果未记录却重新创建子 Run”的窗口。

resume 使用历史的深度及 wave 限制，不因新 SchedulerConfig 重置预算；并发名额可由当前宿主配置。恢复保持 run_id 和 seq，新的物理执行时间不改写旧事件时间。

## 10. 稳定失败与终态

NodeFailed.apply 立即保存节点归属及 FailureKind。merge／control 错误由同一个 apply 确定产生；RunFault 和终态阶段失败来自对应事件。稳定失败视图的完整类型见附录。

失败列表按 wave 顺序，以及节点成员顺序 → Merge → Control → RunFault 的固定分组展示；不以并发返回顺序改变最终错误顺序。原始 source 单独保留为进程内诊断，不写入业务日志或遥测；重放没有 source 也不能改变业务结论。

RunCompleted 只在没有活动 wave、没有失败、所有必要节点终结且 Graph 返回节点仍有当前有效输出时接受，output 引用对应 NodeAttempt。它将最终输出和 Completed 一起投影；缺少输出通过 RunFailed(MissingOutput) 表达。

RunFailed 不隐式消费 pending Delta／Control。活动 wave 必须先经正常或故障收尾关闭；初始化前的 Input／Initialization 失败例外，因为尚无 wave 和 State。reason=None 只关闭已有失败；Some 增加新的终态阶段原因。Failed Run 的已提交 State、成功节点输出仍保留。

## 11. 解码、接口与兼容性

[公开接口附录](event-log-api.md) 定义全部根导出、构造／读取入口、State 和 NodeContext 的变化、History／replay／resume、错误分类及调用示例，属于本文的一部分。

采用 Serde／serde_json，整个 Event 的结构与业务字段都可直接序列化和反序列化。serde_json::Value 是跨节点值模型；没有 ValueTypes、稳定类型 key、TypeId 持久标记、自定义业务 Codec trait 或 postcard 层。读取、展示、筛选及转发日志不需要 Graph 或业务类型清单。

节点输入的转换由节点代码负责：`serde_json::from_value(input.entry()?.clone())`。Input 保留值的来源、实例归属与顺序，取消按 Rust 类型筛选、Any downcast 和返回借用业务 &T 的接口。不同业务类型的同形 JSON 不再被框架区分；必要的区分由节点来源或业务 tagged enum 表达。

NodeInstance::Output／Outcome<S, O> 保留，节点适配器将业务输出转为 JSON 后才记录。Deliver／Transition payload 直接为 JSON，Control.apply 只解释路由，不验证目标业务 schema；目标节点在输入处发现错误后产生普通 NodeFailed(Input)。S、S::Delta、Reducer::Delta 仍使用强类型 Serde 和原有 reducer，不引入 Patch、Clone 或 Delta: Sync。

为控制改动范围，保留 Graph<S, O, R>、Run<S, O>：最终 O 增加 DeserializeOwned，由 RunCompleted 的准备入口从返回节点 JSON 恢复，在 append 前完成一次解码；apply 安装该已准备返回投影。中间节点输出始终是 JSON，不尝试重建任意 Rust 类型。原始业务 Arc<O> 的跨节点／跨父子身份保证取消，Arc<JsonValue> 可以在进程内共享。

相同 JSON 是业务等价的依据。特别保留“没有输出”与“有 null 输出”、Transition 无 payload 与 null payload、Delta 不更新与显式清空的区别；序列化时省略无值字段，反序列化时按字段是否存在恢复外层 Option，不能把 null 当作缺省。

同一 Graph／业务类型／reducer 版本是恢复前提。当前协议为 format=2；旧 format=1 的二进制载荷不自动迁移或混写。不能因为 JSON 能解析就声称业务 schema 兼容，也不能检测所有代码语义变化。损坏载荷、非法身份、结果引用、阶段或调用关联在入口明确失败。节点尚未执行时不提前检查其业务输入 schema；记录的 S／Delta／最终 O 不可解码则停止恢复，不通过执行节点补洞。

## 12. JSONL 存储与运行身份

沿用已实现的 cognacta-eventlog::JsonlEventLog。一个 run_id 对应目录中的一个 `<run_id>.jsonl` 文件，父子 Run 分开存放，通过 CallLinked／RunStarted 关联；不把所有递归调用挤进父文件。每行是完整 Event 的标准 JSON，行尾换行构成完整记录边界；输入、输出、增量和 payload 直接嵌套为 JSON 结构，不是字节数组或转义后的 JSON 字符串。

后端仅实现 EventLog：检查路径安全和逐 Run 连续序号，追加完整行并 sync_data 后确认成功；读取按文件原序返回，不解析 Graph、Outcome 或调度语义。异步入口通过阻塞任务执行文件 I/O，同一后端的操作在任务结束前保持串行。目录由 open 创建；重开已有目录读取原文件，不清空历史。

追加失败或确认不明时遵守同样的停止／读取协议。不完整尾行或损坏行明确报错，不静默丢弃、截断或把损坏历史当成功；本版不做磁盘损坏修复、多进程竞争写入或文件轮转。调用方确保同一目录只有一个活跃写入后端，旧执行及其 I/O 已结束后再交接所有权。

core 新增 new_run_id() -> String，根调用示例和全部框架生成的子 ID 使用 UUID v7。其时间前缀方便按生成时间整理文件；调用关联和事件先后仍由 parent／caller／seq 决定，不把跨机器时钟当成严格因果顺序。显式业务 run_id 入口保留，JSONL 后端要求非空 ASCII 字母、数字、下划线或连字符，避免路径穿越。

接口、错误映射和持久化调用示例见附录第 13 节。JSONL 是业务事实存储，不增加 tracing 日志、span 或监控指标；已有执行观测保持原边界。

## 13. 验收与迁移

必须按每个成功事件前缀比较实时投影与 replay：身份、预算、State、节点状态／attempt／输入输出、wave 成员及阶段、调用关联、实例／路由、稳定失败和终态均一致。任务句柄、原始 source 和遥测不参与业务等价。

重点验收：

1. 默认日志与显式后端均走 append → apply，所有实时业务 mutation 收敛到共享入口。
2. 首条开始携带完整名单，替代 Scheduler 改变准入／完成顺序仍按原成员顺序归并。
3. 提前结果可读取，排队兄弟仍读旧 wave 基线；K=1 与 K>1 结果一致。
4. 空 Delta／空 Control 仍推进阶段，任意两次 append 之间恢复不漏算、不重复算。
5. 节点失败仍执行其他排队成员；Merge／finish／Control 错误的稳定结果与实时一致。
6. driver 部分派发、未开始即失败、State 所有权泄露、波次关闭后失败均有事实依据。
7. CallLinked 前后、子 RunStarted／RunInitialized 前后、子终态与父结果之间分别中断；每个既有子调用保持同一 child_run_id。
8. 多个同类型子调用、并行稳定 key、显式重试新 key、自递归／互递归、不同资源类型走同一机制。
9. Failed 子结果可被父处理；父结果已记录后不再执行父代码或旧子调用。
10. Input／GraphInput／输出／payload 的 JSON 往返与节点边界解码；没有类型注册，业务输出仍可非 Clone，Delta 仍可仅 Send；缺省／null 的语义分别保留。
11. 错误历史被拒绝，replay 不驱动节点／initializer／外部服务；同一 reducer 与控制规则实际被共用。
12. 每个 append 位置注入失败，以及“保存成功但确认丢失”，旧执行停止后从实际日志恢复。
13. JSONL 每 Run 独立文件、重开读取／继续追加、非法文件名与损坏行拒绝、UUID v7 身份，以及跨后端的相同恢复行为。

JSON 载荷、共享投影、波次阶段、递归恢复与 JSONL 文件后端均已实施；具体测试证据见 [实现核对报告](event-log-validation.md)。

实施范围与验收记录见 [use-json-event-values 任务清单](../../openspec/changes/use-json-event-values/tasks.md)：Input 及 payload 使用 JSON，EventData 直接使用 Serde 对象，最终 O 静态解码，null／字段缺省分别保留。

[基础模块旧设计](../../openspec/changes/add-run-event-log/design.md)、[自动记录旧设计](../../openspec/changes/record-run-execution-events/design.md) 与 [format=1 实施清单](../../openspec/changes/unify-event-log-recovery/tasks.md) 仅作历史依据。AGENTS.md／CONTEXT.md 不变；不新增遥测，业务 JSON 不转写 tracing。
