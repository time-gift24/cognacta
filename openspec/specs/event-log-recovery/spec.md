# EventLog 与恢复

## Requirements

### Requirement: 事实是运行状态的唯一来源

系统 SHALL 为所有 Run 记录不可变事件，实时提交 SHALL 先成功 append，再使用与 replay 相同的 apply。scheduler SHALL 仅查询投影并驱动执行，不直接归并 State、修改路由、重激活节点或创建实例。未配置外部后端 SHALL 使用内存日志，不能另走无日志执行路径。

#### Scenario: 追加失败或确认丢失

- **WHEN** 编码或 append 失败，包括记录已保存而确认丢失
- **THEN** 当前调用树 SHALL 停止推进，不交付未提交变化、不补写业务终态；停止旧执行后 SHALL 从实际日志恢复，不盲目重试 append。

### Requirement: 节点结果和波次提交分别记录

NodeCompleted SHALL 即时保存完整 Outcome，包含输出、原始 Delta、Directive 及 payload。第一条 NodeStarted SHALL 保存完整有序 wave 成员及本节点实际 Input，后续开始事件 SHALL 仅保存各自输入与 attempt。不增加 WaveSelected 或 WaveSettled。排队兄弟 SHALL 使用波次开始时的 State、节点输出和路由基线。

#### Scenario: 提前结果与波次继续

- **WHEN** 成功节点结果已记录但 StateDelta 尚未记录
- **THEN** resume SHALL 复用原结果，以记录的成员顺序归并一次，再应用 Control；已记录 NodeFailed 的成员也不重新执行。

#### Scenario: 未知结果的逻辑调用

- **WHEN** NodeStarted 已记录但没有对应结果
- **THEN** 恢复 SHALL 用原 Input 重新进入相同逻辑 attempt，不直接 rearm，不增加 attempts，不重复 NodeStarted。

### Requirement: StateDelta apply 原子提交原始增量

StateDelta SHALL 引用当前 wave 全部成功 Outcome，按成员顺序消费其原始 Delta，并在共享 apply 中执行一次 merge_batch。业务归并错误 SHALL 成为稳定失败，State 保持原值；不另存最终字段 Patch。每波 SHALL 有一次 StateDelta，即使批次为空。

#### Scenario: 归并后的中断

- **WHEN** StateDelta 已记录而 Control 尚未记录
- **THEN** replay SHALL 恢复已归并或归并失败的阶段，resume SHALL 仅继续 Control，不重复归并。

#### Scenario: 节点失败但兄弟成功

- **WHEN** 同波一个节点失败，其他节点产生成功 Delta
- **THEN** SHALL 保留并归并成功 Delta，再关闭 Control；业务失败 SHALL 阻止整波路由生效。

### Requirement: Control apply 统一解释控制并关闭波次

Control SHALL 按成员顺序引用全部含 Directive 的成功 Outcome。apply SHALL 先校验本批目标类型、目标存在性和实例 key 唯一性；任一节点、归并、控制或运行故障 SHALL 抑制整批路由。合法 Transition 对同一目标以后写覆盖，包括 None payload 和 false immediate；Deliver SHALL 按记录顺序创建实例。空批次也 SHALL 记录 Control，应用后关闭 wave。

#### Scenario: 合法派发与非法跳转同批出现

- **WHEN** 一个节点 Deliver 合法模板，另一个节点 Transition 到不存在的目标
- **THEN** StateDelta 已提交部分 SHALL 保留，Control SHALL 产生稳定失败且不创建任何实例。

### Requirement: 执行设施故障也有投影事实

RunFault SHALL 记录 Driver、Protocol 或 StateOwnership 故障。尚在收集中的 wave SHALL 被封口，未知 Running 节点投影为 Abandoned，未开始成员仍未开始；已记录的成功结果 SHALL 按 StateDelta／Control 协议收尾。StateOwnership SHALL 在 StateDelta 前记录；已有状态提交不得因后续故障重新执行。

#### Scenario: 驱动器仅完成部分成员就失败

- **WHEN** 已有成功结果，另有结果未知和未开始成员
- **THEN** SHALL 按事实保留三者区别，只归并成功结果，抑制控制并记录 RunFailed。

### Requirement: 子调用身份可恢复

可复用 Graph SHALL 使用相同的 NodeInstance、投影与 Scheduler 协议，不按递归深度增加调度分支。子调用 SHALL 先由父 CallLinked 固定 `(NodeAttempt, key)`、child_run_id 和 JSON GraphInput，再启动独立子 Run。父子 State、实例和波次预算独立，CallLinked 不等于子调用已开始。

#### Scenario: 子完成而父结果未记录

- **WHEN** 父逻辑 attempt 恢复并再次调用相同 key
- **THEN** SHALL 返回已记录子结果，不新建子 Run；未完成子调用 SHALL 递归继续原 Run，空子历史 SHALL 使用原 child_run_id 启动。

#### Scenario: 可复用包装器显式重试

- **WHEN** 通用 Retry<N> 通过 with_call_key 分别以 try/1、try/2 调用 N
- **THEN** N 为 Graph 时 SHALL 形成不同的同深度子 Run，N 为叶节点时 SHALL 仍为普通节点调用；包装器不依赖具体 N 类型。相同 key 的已失败子调用 SHALL 返回稳定失败，不自动创建新 Run。

#### Scenario: Nested GraphInput uses ordinary Serde

- **WHEN** 相同 Graph 定义用于静态节点、Deliver 模板实例及递归调用，输入通过 JSON Output 或 payload 到达
- **THEN** SHALL 通过 Graph-as-Node 输入边界 Deserialize 为 GraphInput，沿用同一 CallLinked 协议，无递归类型注册器；父子输入按记录结构核对。

### Requirement: 只读重放与继续执行边界明确

replay SHALL 读取合法非空前缀，使用相同 Graph、业务类型和 reducer 版本重建稳定业务状态，不执行节点、initializer 或外部副作用，不追加事件。公开 resume SHALL 只接受未终结根 Run，资源由宿主重新绑定，历史决定输入、身份、深度与预算；宿主 SHALL 确保旧执行及其任务已经停止。未记录外部副作用可能重复，不承诺 exactly-once。

#### Scenario: 已初始化或已完成父节点

- **WHEN** 历史包含 RunInitialized 或父 NodeCompleted
- **THEN** SHALL 分别复用初始 State 或完整父 Outcome，不重新执行 initializer 或父节点及其子调用。

### Requirement: 每 Run 的持久事实文件

JsonlEventLog SHALL 每 run_id 使用一个 JSONL 文件，保持原事件与连续 seq；文件追加完成并 sync_data 后才确认成功。框架生成的运行身份 SHALL 使用 UUID v7。目录 SHALL 由单一活跃后端拥有，不自动修复损坏记录。

#### Scenario: 重新打开并继续

- **WHEN** 进程用相同 Graph／业务 schema／reducer 版本及无类型表的 History 重新打开日志目录并 resume 根 ID
- **THEN** SHALL 重放完整事件前缀，父子 Run 使用原身份和连续 seq 继续追加，不改写旧记录。

#### Scenario: 不完整尾行

- **WHEN** 文件末尾不是完整换行终止的事件
- **THEN** 读取及追加 SHALL 明确失败，不静默截断、覆盖或忽略旧字节。
