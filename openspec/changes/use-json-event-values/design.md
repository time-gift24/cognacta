# JSON 业务值：移除手工类型注册

## Context

既有共享 apply、完整 NodeCompleted、分阶段 StateDelta／Control 和 CallLinked 恢复协议保留。本 change 只替换数据表示与受影响的调用接口。Serde 为已知类型提供 Serialize／Deserialize；跨节点传递的数据先统一为 JsonValue，业务类型由消费它的节点选择，因此无需从类型名查找反序列化函数。

状态：**format=2 已实施并验证**。完整签名与错误见 [API 附录](../../../docs/design/event-log-api.md)，以下是本次改动的决策及验收重点。

## Goals / Non-Goals

目标：删除 ValueTypes 与手工登记；日志的输入／输出／Delta／payload 可直接作为 JSON 处理；实时与重放继续使用同一事实表示；递归调用保持同一 ID 与结果复用。

范围不包括：改变波次或控制规则、移除强类型 State、设计业务 schema 迁移、兼容旧 postcard 日志、增加新的调度层、快照、数据库、遥测或通用类型注册机制。保留 Graph／Run 的 O 参数，避免把本次调整扩大为所有节点接口的重写。

## Decisions

### 1. 统一跨节点值，保留节点内部类型

`SharedValue = Arc<serde_json::Value>`，删除 Value trait、ValueTypes 和持久化类型标记。Input 以 `Vec<InputEntry { origin, value }>` 表达真实顺序；entry／one 只按来源检查单值，many 返回来源下全部 JSON，不按是否能解码成某个 T 过滤。

节点自己在输入处 `serde_json::from_value::<Job>(input.entry()?.clone())`，失败映射为 `InputError::Decode`。NodeInstance::Output 和 Outcome<S, O> 保留；Node 适配器对成功输出用 to_value，然后才提交 NodeCompleted。NodeRun 保存 JSON，所有边与 payload 传递 JSON。

| 对象 | 目标表示与影响 |
| --- | --- |
| Input | JSON 值 + Origin + 顺序；取消 TypeId、SourceRef 及泛型筛选读取 |
| Node Output | 节点仍返回业务 O；适配器序列化一次，记录／下游只有 JSON |
| Graph 最终 O | 增加 DeserializeOwned；从返回节点记录 JSON 派生 Arc<O>，不需要注册 |
| Deliver／Transition payload | 明确为 JSON；目标业务 schema 在目标节点入口验证 |
| State／Delta | 保持 S／S::Delta；日志是 JSON，由静态泛型解码，不改成 Patch |
| GraphInput | 普通 Serde 数据，可以作为节点输出或 payload 嵌套，不增加递归编码器 |

现成 Arc<JsonValue> 可以共享；不保证业务 Arc<O> 指针穿过节点／递归边界保持相同。节点使用拥有所有权的业务 T 时会承担 JSON 复制／反序列化成本；不为保留旧零复制承诺而重建动态类型缓存。

### 2. Event 自身就是可用的 Serde 数据

format=2 的字段替换：

| 事件字段 | 从 | 到 |
| --- | --- | --- |
| RunStarted.input、ChildCall.input | Vec<u8> | Arc<GraphInput> |
| NodeStarted.input | Vec<u8> | Arc<Input> |
| RunInitialized.state | Vec<u8> | JsonValue |
| NodeCompleted.outcome | Vec<u8> | RecordedOutcome |

RecordedOutcome 公开导出，包含 `value: Option<SharedValue>`、`state_delta: JsonValue`、`directive: Option<Directive>`。其余事件名称、载荷身份／结果引用与顺序不变。EventData 使用标准 Serde type 标签和 snake_case 名称。例如 NodeCompleted 的 data 可直接读作：

```json
{
  "type": "node_completed",
  "wave": 1,
  "node": {"key": {"Static": "accept"}, "attempt": 1},
  "outcome": {
    "value": {"accepted": 7},
    "state_delta": {"count": 7},
    "directive": null
  }
}
```

JSONL 后端逐行 Serialize／Deserialize Event，不需要业务类型表。展示、字段过滤、转发和导出可以直接操作这些结构；投影时才需要 Graph 对应的 S／Delta／最终 O。

### 3. 实时也从记录表示建立投影

统一准备入口接收 JSON EventData，校验结构／引用并将必要的 S／Delta 转为强类型；准备成功后才 append，再同步 apply。RunCompleted 在同一准备入口从已引用输出解析最终 O。replay 使用同一准备流程。不得实时使用原始 Rust State／Delta，而恢复使用可能不同的 JSON 解码结果。

这不是重复业务输入预检：准备入口不尝试解码中间节点的业务输出或尚未执行节点的输入。节点输入业务 schema 仍由节点自己检查一次。S／Delta／最终 O 的 JSON 表示必须符合它们声明的 Serde 契约。

### 4. Serde 明确保留字段存在性

直接 derive `Option<Option<T>>` 会把“不更新”和“写入 None”混同为 null。生成的 Delta 采取对象字段语义：缺省字段是不更新；字段存在则是一笔写入，包括 null。`{"title": null}` 因而恢复为 `Some(None)`，`{}` 恢复为 `None`。

RecordedOutcome.value 和 Transition.payload 同样需要区分缺省与 null：没有输出与输出 ()／JSON null 不同；没有 payload 与传递一个 null 值不同。用 Serde 的字段 default、skip_serializing_if 和“存在即 Some”的字段反序列化规则完成；不新建通用编码框架。

业务自身其他需要区分的状态使用其明确的 Serde 表示。JSON 之外的数值与键类型不自动退回二进制。

### 5. 递归与恢复只更换数据表示

Graph-as-Node 从所有来源取得恰好一个 JSON 值，再 Deserialize 为 GraphInput；不能按“恰好能转成 GraphInput”的类型过滤忽略其他值。随后走原 NodeContext::call，显式调用仍直接传 GraphInput。

CallLinked 先固定 `(parent attempt, key)`、child ID 和 JSON 输入，子 RunStarted 使用该输入。再次调用相同 key 优先使用已记录输入；父子记录输入按数据结构核对，不比较 JSON 文本空白或对象键顺序。

- 父 NodeCompleted 已记录：复用父 JSON Outcome，不执行父节点和子调用。
- 父未完成、子已完成：重新进入父节点，命中原 key 后从子记录恢复已知 O，不执行子图。
- 子未完成：从原子流恢复阶段并继续；未知 attempt 使用原 JSON Input。
- 已有 CallLinked 而子日志为空：使用原 child ID 和原输入启动子 Run。

State／实例／深度／每 Run 预算隔离和已记录失败语义不变。任意层 Graph 都走相同路径；稳定 key 不恢复 async 栈，也不承诺未记录外部副作用 exactly-once。

## Public interface and errors

[API 附录](../../../docs/design/event-log-api.md) 明确列出根导出、完整调用签名、构造／校验入口及纯公开 API 示例，本 change 的关键变化是：

```rust
pub use serde_json::Value as JsonValue;
pub type SharedValue = Arc<JsonValue>;

// Input::entry / one / many 变为 JSON 查询，返回值见附录。
pub fn replay<S, O, R>(
    graph: &Graph<S, O, R>, events: &[Arc<Event>],
) -> Result<ReplayedRun<S, O>, Error>
where S: State, O: DeserializeOwned + Send + Sync + 'static, R: Send + Sync + 'static;

impl History {
    pub fn new<L: EventLog + 'static>(log: Arc<L>) -> Self;
}
```

删除 with_value_types 和注册表相关 HistoryError；新增 `InputError::Decode { source: serde_json::Error }`。所有 core 自有可失败入口仍返回 core::Error，thiserror 来源链按边界保留；Serde trait 本身遵守 Serde 错误契约。错误归属：

- 节点输入 schema 不匹配：Error::Input，记录 NodeFailed(Input)，按普通失败波次处理。
- initializer 解析输入失败：沿用 CallError::Initialization。
- 适配器输出或 State／Delta 编码失败，记录的 S／Delta／最终 O 解码失败：EventLogError::Encode／Decode，停止记录推进，不能伪造业务终态。
- Event JSON／文件损坏：后端按原 EventLogError::Read 保留 source；非法协议／阶段／引用仍用 HistoryError。

JsonlEventLog 的 open／directory、EventLog trait 及 cognacta-eventlog::Error 不变。没有新增 tracing、span 或指标；事实数据不可流入遥测。

## Migration and validation

数据对象与 Serde 表示、节点输入、payload、Graph 最终 O 约束和 graph_input! 示例均已迁移，注册与 binary codec 已移除。当前协议为 format=2，旧流不混写、不自动转换；正式 specs 已同步本 change 的差异，旧完成任务保留历史记录。

验收覆盖 Event JSON 独立往返、缺省／null、来源与多值数量、不同来源同形 JSON、业务输入解码错误、静态最终 O、每个事件前缀／追加失败和 JSONL 重开后的递归续接。已执行的命令与结果见 [实现核对报告](../../../docs/design/event-log-validation.md)；任务进度见 tasks.md。
