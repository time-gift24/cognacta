# EventLog 使用普通 JSON 业务值

## Why

当前 Event 外层已经是 JSON，但 Input、Outcome、Delta 与子调用输入内部仍是 postcard 字节，并依赖 ValueTypes 手工绑定业务类型。调用方为了恢复日志必须维护一份额外类型清单，日志读取、展示和后续处理也无法直接操作业务字段。让跨节点值统一为 JSON，并在节点输入处使用标准 Serde，可以删除这层配置和动态类型恢复机制。

## What Changes

- 删除 ValueTypes、手工 register、with_value_types 和相关错误；History／replay 不再接收类型表。
- Input 与控制 payload 使用 Arc<serde_json::Value>，保留来源和顺序；节点通过 serde_json::from_value 转换业务类型。**BREAKING**：移除 Input 按 Rust 类型筛选与 downcast。
- 保留 NodeInstance::Output 和 Outcome<S, O>；输出在节点适配器出口转为 JSON。保留 Graph<S, O, R>／Run<S, O>，最终 O 增加 DeserializeOwned，由静态泛型完成返回值恢复。**BREAKING**：不再保证原业务 Arc<O> 在数据流中的身份。
- EventData 直接携带可 Serde 的 Input、GraphInput、RecordedOutcome 和 JSON State／Delta，去掉 postcard 及专用 wire 层，format 升为 2。
- 为可选输出、payload 和生成的 Delta 保留字段缺省与 null 的区别。沿用 append → apply、StateDelta／Control 边界、稳定子调用身份、每 Run 一个 JSONL 文件和 UUID v7。

本次仅产出提案和设计，不实现代码、不迁移旧日志；不重做调度器、递归机制、reducer 或存储接口，不新增遥测与 Schema registry。

## Capabilities

### New Capabilities

- `json-event-values`：统一 JSON 数据、标准 Serde 事件、节点业务转换入口与无注册表恢复。

### Modified Capabilities

- `graph-kernel-execution`：Input 来源查询、输出 JSON 传递、最终返回类型解码、Graph-as-Node 的 JSON GraphInput 入口。
- `typed-state-reducers`：生成 Delta 的 JSON 缺省／null 往返契约，维持强类型原子归并。
- `event-log-recovery`：直接 JSON 载荷及移除恢复类型表，保留原有调用与阶段协议。

## Impact

后续实施涉及 cognacta-core 的 input／history／context／graph／run 接口、derive 的 Delta Serde 字段、graph_input! 值约定、CLI 示例与测试；cognacta-eventlog 继续实现相同 EventLog trait。core 将 serde_json 调整为 workspace 运行时依赖，移除 postcard／erased-serde；本轮 Cargo 文件不变。

主设计已更新为目标协议：[事件协议](../../../docs/design/event-log.md)、[接口及错误契约](../../../docs/design/event-log-api.md)。既有实现与测试报告仍明确标为 format=1，不宣称本 change 已实现。
