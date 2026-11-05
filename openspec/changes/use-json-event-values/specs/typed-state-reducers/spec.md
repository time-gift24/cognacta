## ADDED Requirements

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
