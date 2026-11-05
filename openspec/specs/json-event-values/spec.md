# JSON 业务值

## Requirements

### Requirement: Events expose business data through ordinary Serde

系统 SHALL 以 serde_json::Value 或普通 Serde 对象表达 Event 的业务载荷；整个 Event SHALL 可直接 Serialize／Deserialize。系统 SHALL 移除 ValueTypes、手工类型登记、持久化 Rust 类型名和 postcard 业务字节层。History 与 replay SHALL 不需要业务类型表。JSON 修订 SHALL 使用 format=2，不自动转换或混写旧格式。

#### Scenario: Read an event without a graph or registry

- **WHEN** 调用方通过 serde_json 反序列化一条 NodeCompleted
- **THEN** SHALL 能直接读取 outcome.value、state_delta 和 directive 的 JSON 结构，不提供 Graph、TypeId 或业务反序列化函数表。

### Requirement: Nodes select their business input types

Input SHALL 仅按来源、数量和顺序暴露 JSON；节点 SHALL 在输入边界用标准 Serde 转换为自己的业务类型。框架 SHALL 不按尝试解码是否成功来筛选值，不缓存任意业务 T。目标 payload 的业务 schema 错误 SHALL 属于目标节点输入失败，不能撤销原 Control。

#### Scenario: Similar JSON objects have different business meanings

- **WHEN** 两个来源都提供结构相同的 JSON，但消费者分别将其解释为 Invoice 和 Receipt
- **THEN** SHALL 根据指定来源读取并转换，不需要不同稳定类型 key，也不声称记录中保留了两个 Rust 类型身份。

#### Scenario: A delivered payload fails the receiver schema

- **WHEN** 合法 Deliver 已记录，目标节点无法把 payload 解析为 Job
- **THEN** SHALL 记录目标 NodeFailed(Input)，保留已发生的派发事实，按普通失败 wave 收尾。

### Requirement: Missing values and JSON null remain distinct

RecordedOutcome.value 与 Transition.payload SHALL 在 None 时省略字段，字段存在且为 null 时恢复为 Some(JSON null)。系统 SHALL 不以默认 Option 反序列化把显式 null 当作缺省。

#### Scenario: Unit output is not a missing output

- **WHEN** 节点返回 Some(Arc::new(()))，日志经 JSON 往返
- **THEN** SHALL 保留存在的 null 输出；返回节点可正常完成，只有 value 字段缺省才表示无输出。

#### Scenario: Null payload is one actual input

- **WHEN** Transition.payload 为 Some(JSON null)
- **THEN** SHALL 覆盖普通输入并向目标交付一个 null 值；payload=None 则沿用无 payload 的普通输入规则。

### Requirement: Live projection uses the recorded JSON representation

实时和 replay SHALL 共用事实准备入口，从 EventData 的 JSON 按已知 S／S::Delta／最终 O 解码并校验一次。实时 SHALL 准备成功后 append，再同步 apply；apply SHALL 不重新解析业务类型。中间节点输出 SHALL 保持 JSON，只有已知最终 O 的返回投影需要静态解码。

#### Scenario: Recorded state is the projection source

- **WHEN** initializer 或节点成功返回，准备写入 RunInitialized 或 NodeCompleted
- **THEN** apply SHALL 使用记录 JSON 所恢复的 S／Delta，不使用另一份未经记录表示转换的内存对象。

#### Scenario: Final return cannot be decoded

- **WHEN** 已记录的返回节点 JSON 不符合 Graph 最终 O 的 Deserialize 契约
- **THEN** SHALL 返回 EventLogError::Decode，停止推进，不先追加 RunCompleted 再改变内存终态。
