# typed-state-reducers Specification

## Purpose

定义强类型 State、Delta、字段元数据及 reducer 的编译期与运行时契约，保证按固定顺序归并、整批原子回写和 SingleWriter 冲突检测，并保持调用方类型、泛型与错误来源。

## Requirements

### Requirement: State and raw updates can be reconstructed

State、State::Delta 及 Reducer::Delta SHALL 实现 Serialize 与 DeserializeOwned，以重建 RunInitialized 和 NodeCompleted 中的原始增量。derive SHALL 通过 reducer 的关联类型契约生成 Delta 的 Serde 实现，不推测泛型参数约束；State／Delta／Output SHALL 不被要求 Clone，Delta SHALL 不被要求 Sync。

#### Scenario: Recorded non-Sync updates are applied after recovery

- **WHEN** Cell<u32> 作为 reducer Delta 已进入 NodeCompleted，但 StateDelta 尚未记录
- **THEN** 恢复 SHALL 解码并移动该 Delta，在同一 apply 中归并一次，不重复执行已完成节点。

### Requirement: Derive produces typed updates and reachable metadata

State derive SHALL 为具名字段struct生成同可见性的Delta、Field及State实现，保留所需泛型约束。每字段 SHALL 恰有一个reducer属性；Delta字段 SHALL 为Option<Reducer::Delta>，Default SHALL 逐字段None而不要求内层Delta Default。公开State的关联类型和必要字段 SHALL 对调用方可达。

#### Scenario: An optional value is explicitly cleared

- **WHEN** title:Option<String>使用Override
- **THEN** Delta.title类型为Option<Option<String>>；None不写，Some(None)清空，Some(Some(text))覆盖

#### Scenario: A delta is Send but not Sync

- **WHEN** 自定义reducer的Delta满足Send而不满足Sync/Clone
- **THEN** 合法State和节点可编译并通过task移交Delta，框架不附加无用途约束

#### Scenario: Legal names and recursive types preserve their meaning

- **WHEN** State 使用 r#type、_1 字段或 Option<Box<Self>>，调用域同时定义 Option、Vec、Box 等名称，或泛型参数命名为 Vec
- **THEN** derive 正常生成可用更新类型，Self 仍指原 State（包括其泛型约束），宏使用的标准类型不被调用域名称遮蔽；嵌套 item 的 Self 保留局部含义

### Requirement: Reducer diagnostics fail compilation at the source

derive SHALL 对缺失/重复reducer、非法字段类型、比较器不匹配、非法struct形状、字段身份重名及实际trait约束不足产生编译诊断。proc-macro SHALL 保存内部错误与span并生成compile_error，不以panic代替用户代码诊断；这些检查 SHALL 使用独立编译通过/失败样例验证。

#### Scenario: Add is assigned to a String

- **WHEN** String字段标记reducer(Add)
- **THEN** 编译失败并定位相关字段或属性，不延后到CLI运行才发现

#### Scenario: A non-cloneable override field is valid

- **WHEN** 字段满足State所需Send/Sync而不实现Clone，使用Override
- **THEN** 合法derive通过，不要求整个State或该字段Clone

### Requirement: Built-in reducers follow stable ordered semantics

Override SHALL 为SingleWriter直接替换；Append SHALL 按ready顺序追加；Merge SHALL 同key后写覆盖；Add SHALL 对各整型逐步checked_add。MultiWriter SHALL 不表示顺序无关；这些公开可失败方法 SHALL 返回core::Error并保留Merge分类。

#### Scenario: Completion order does not order appends

- **WHEN** ready顺序B/C而C先完成，各提交一份Append
- **THEN** 最终顺序B/C，不使用完成顺序或HashMap遍历决定结果

#### Scenario: Intermediate overflow is rejected

- **WHEN** 整数按规定Delta顺序在中间步骤溢出，即使数学上的最终和可表示
- **THEN** 返回Overflow，不能通过重排或扩大类型绕过已定义顺序

### Requirement: Reducers initialize and finish once per updated field

每批每个有更新字段 SHALL 构造一次reducer，默认Default或指定init；归并 SHALL 先按 Delta ready 顺序、再按字段声明顺序执行 reduce；所有字段的全部 reduce 成功后，按字段声明顺序对每个有更新字段 finish 一次。Sort SHALL 在内部finish成功后稳定排序一次。无更新字段 SHALL 不构造reducer、不调用finish；空批或全部None SHALL 直接成功。

#### Scenario: Multiple updates share one reducer lifecycle

- **WHEN** 同一列表字段收到三份Delta并使用Sort<Append,F>
- **THEN** init一次、reduce三次、finish及排序各一次，相等元素保持原先顺序

#### Scenario: Reduction errors precede every finish

- **WHEN** first/last 均为 Add<u8> 且初值 255，按顺序收到增量 (0,1)、(1,0)
- **THEN** 第一份 Delta 的 last 返回 Overflow，尚未调用任何字段的 finish，所有原字段保持 255

### Requirement: Batch merge is atomic across fields

merge_batch SHALL 先预检写入，再以字段暂存值执行全部reduce/finish，全部成功后统一替换原字段。任何Result错误 SHALL 保持本批前全部State字段不变；原子性 SHALL 不承诺回滚自定义外部副作用、内部可变性或panic。归并失败 SHALL 保留成功NodeRun Output，不触发节点重试。内置 Overflow 保留其分类并补充字段；其他自定义错误按 Reduce/Finish 包装并保留 source。

#### Scenario: A later field rejects an update

- **WHEN** items字段已经暂存追加，count随后因255+1返回Overflow
- **THEN** items与count均保留原值，不能留下部分追加；成功节点Output仍在Run中

#### Scenario: The last finish fails

- **WHEN** 所有reduce及前面字段finish成功，最后一个字段finish返回非 Overflow 的自定义错误
- **THEN** 所有原State字段均未替换，错误保留字段、Finish阶段及真实source

### Requirement: SingleWriter is checked on every actual batch

merge_batch SHALL 在构造reducer前按字段声明顺序统计所有成功Delta的Some，包括Some(None)及Some(空值)。同字段超过一份 SHALL 拒绝整批并列出全部冲突字段。节点失败 SHALL 不跳过其成功兄弟的冲突检查；不同wave分别写入 SHALL 合法。

#### Scenario: A failing sibling accompanies conflicting writers

- **WHEN** 一个节点失败，两个成功实例都提交title更新
- **THEN** errors保留Node错误和SingleWriterConflicts，所有State字段不变，成功Output保留

#### Scenario: Two consecutive waves replace the same field

- **WHEN** A与后继B分别在两个wave写Override字段
- **THEN** 两批各只有一次写入，均可提交，最终值为B值

### Requirement: Static declarations complement runtime checks

Node.writes SHALL 声明可能写入的强类型字段。Graph SHALL 对可确定的同时entry及纯静态diamond并行层拒绝SingleWriter潜在冲突，允许确定串行写入；动态条件/实例等无法证明的关系 SHALL 留到运行时。写入声明 SHALL 不授权可变State、不替代实际Delta预检。

#### Scenario: A static diamond conflicts before execution

- **WHEN** 无条件静态diamond的B/C均声明写入同一Override字段
- **THEN** Graph::build返回ConcurrentSingleWriter，任何节点均未执行

#### Scenario: Dynamic instances conflict only at runtime

- **WHEN** 合法template被Deliver为两个实例，二者实际都返回同一Override字段的Some
- **THEN** 构图可成功，运行在barrier返回SingleWriterConflicts，不能静默接受冲突

#### Scenario: Explicit entries remain in the first wave despite incoming edges

- **WHEN** entries 为 a、b，边为 a→b 与 a→c，只有 b/c 声明写入同一 SingleWriter 字段
- **THEN** b 属于首 wave，c 属于后续 wave，构图接受串行写入；若 a/b 同时声明写入该字段，则构图拒绝冲突，不因 a→b 将 b 推迟分层

### Requirement: JSON Delta fields preserve update presence

State derive 生成的 Delta SHALL 使用标准 Serde 对象，外层 Option 的 None 通过省略字段表示。反序列化时，缺省字段 SHALL 为 None；出现的字段 SHALL 解析为 Some(Reducer::Delta)，包括该 Delta 类型允许的 null。仅添加 skip_serializing_if SHALL 不视为满足此契约。业务 State 与 reducer 的原子归并、顺序和 Send／Clone 约束 SHALL 保持不变。

#### Scenario: No update survives JSON roundtrip

- **WHEN** title: Option<String> 使用 Override，Delta.title=None
- **THEN** SHALL 序列化为不含 title 的对象，恢复为 None，应用后保留旧 title。

#### Scenario: An explicit clear survives JSON roundtrip

- **WHEN** Delta.title=Some(None)
- **THEN** SHALL 序列化为含 `"title": null` 的对象，恢复为 Some(None)，应用后清空旧 title。

#### Scenario: Only Send deltas remain supported

- **WHEN** 可 Serde 的 Cell<u32> 为实际 reducer Delta，输出类型没有 Clone
- **THEN** JSON 记录与恢复 SHALL 不添加 Delta: Sync 或业务类型 Clone 约束，原子 merge_batch 契约保持不变。
