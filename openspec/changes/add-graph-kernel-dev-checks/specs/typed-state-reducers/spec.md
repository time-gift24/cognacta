## ADDED Requirements

### Requirement: Derive produces typed updates and reachable metadata

State derive SHALL 为具名字段struct生成同可见性的Delta、Field及State实现，保留所需泛型约束。每字段 SHALL 恰有一个reducer属性；Delta字段 SHALL 为Option<Reducer::Delta>，Default SHALL 逐字段None而不要求内层Delta Default。公开State的关联类型和必要字段 SHALL 对调用方可达。

#### Scenario: An optional value is explicitly cleared

- **WHEN** title:Option<String>使用Override
- **THEN** Delta.title类型为Option<Option<String>>；None不写，Some(None)清空，Some(Some(text))覆盖

#### Scenario: A delta is Send but not Sync

- **WHEN** 自定义reducer的Delta满足Send而不满足Sync/Clone
- **THEN** 合法State和节点可编译并通过task移交Delta，框架不附加无用途约束

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

每批每个有更新字段 SHALL 构造一次reducer，默认Default或指定init；全部reduce成功后 SHALL finish一次。Sort SHALL 在内部finish成功后稳定排序一次。无更新字段 SHALL 不构造reducer、不调用finish；空批或全部None SHALL 直接成功。

#### Scenario: Multiple updates share one reducer lifecycle

- **WHEN** 同一列表字段收到三份Delta并使用Sort<Append,F>
- **THEN** init一次、reduce三次、finish及排序各一次，相等元素保持原先顺序

### Requirement: Batch merge is atomic across fields

merge_batch SHALL 先预检写入，再以字段暂存值执行全部reduce/finish，全部成功后统一替换原字段。任何Result错误 SHALL 保持本批前全部State字段不变；原子性 SHALL 不承诺回滚自定义外部副作用、内部可变性或panic。归并失败 SHALL 保留成功NodeRun Output，不触发节点重试。

#### Scenario: A later field rejects an update

- **WHEN** items字段已经暂存追加，count随后因255+1返回Overflow
- **THEN** items与count均保留原值，不能留下部分追加；成功节点Output仍在Run中

#### Scenario: The last finish fails

- **WHEN** 所有reduce及前面字段finish成功，最后一个字段finish返回错误
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
