# Serializable State delta

## MODIFIED Requirements

### Requirement: Derive produces typed updates and reachable metadata

State derive SHALL 为具名字段struct生成同可见性的Delta、Field及State实现，保留所需泛型约束。每字段 SHALL 恰有一个reducer属性；Delta字段 SHALL 为Option<Reducer::Delta>，Default SHALL 逐字段None而不要求内层Delta Default。公开State的关联类型和必要字段 SHALL 对调用方可达。State、State::Delta 及 Reducer::Delta SHALL 具有标准 Serialize 约束；derive SHALL 为生成 Delta 自动实现 Serialize，按实际字段关联类型约束，不误加无用途的泛型参数约束。业务 State 的 Serialize 由调用方提供。

#### Scenario: An optional value is explicitly cleared

- **WHEN** title:Option<String>使用Override
- **THEN** Delta.title类型为Option<Option<String>>；None不写，Some(None)清空，Some(Some(text))覆盖

#### Scenario: A delta is Send but not Sync

- **WHEN** 自定义reducer的Delta满足Send而不满足Sync/Clone
- **THEN** 合法State和节点可编译并通过task移交Delta，框架不附加无用途约束

#### Scenario: Legal names and recursive types preserve their meaning

- **WHEN** State 使用 r#type、_1 字段或 Option<Box<Self>>，调用域同时定义 Option、Vec、Box 等名称，或泛型参数命名为 Vec
- **THEN** derive 正常生成可用更新类型，Self 仍指原 State（包括其泛型约束），宏使用的标准类型不被调用域名称遮蔽；嵌套 item 的 Self 保留局部含义

#### Scenario: Delta serialization preserves optional updates

- **WHEN** 同一可选字段分别收到 None、Some(None) 和 Some(Some(value))
- **THEN** 生成 Delta 的标准 Serialize 能表达三者的差别，选定记录格式验证往返不合并语义
