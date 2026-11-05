# Run 事件日志基础模块

## Why

当前 Run 只保存执行后的内存投影，缺少能够独立读取、关联父子运行及用于后续重建的业务事实。先建立已讨论清楚的事件类型、追加读取边界及内存实现，使后续执行接入有明确契约。

## What Changes

- 在 cognacta-core 增加 Event、EventData、NodeAttempt、FailureKind、EventLog、InMemoryEventLog 及统一错误接入，从 crate 根公开导出。
- Event 使用 `(run_id, seq)` 标识；序号由逻辑 Run 的调用侧维护，日志不分配序号。只保存真实时间 ts。
- 定义 Run、节点、跳过与 wave 提交事实；不增加 wave 开始事件。`WaveSettled { wave }` 只有提交标记，不带 State 或失败列表。
- 使用标准 Serde 支持事件封套往返；业务内容暂保存为已编码字节，不自定义 Codec，不指定业务 Delta 的编码格式。
- 提供按 Run、游标及全部历史读取的内存实现，并验证公开 API、读取快照、跨 Run 隔离和错误来源。
- 设计文档同时记录后续节点写入时机及从初始 State 重放 Delta 的恢复协议；本次实施只交付存储基础，不改 Scheduler／Execution，不宣称已经接入自动写入或 resume。

## Capabilities

### New Capabilities

- `run-event-log`：Run 事件数据模型、调用方编号、异步追加读取边界、内存存储及标准 Serde 封套。

### Modified Capabilities

无。现有图执行和 State 归并契约保持不变；运行时写入与恢复接入需在完成设计中列出的接缝后另行实施。

## Impact

- cognacta-core：新增私有 event_log 模块及根导出；Error 增加 EventLog 分类；NodeId／NodeKey 增加封套所需标准 Serde 实现。
- CLI graph-check：为新增 Error 变体补充穷尽匹配的分类名称，不改变执行路径。
- 根和 core 的 Cargo.toml／Cargo.lock：serde 通过 workspace 依赖引入；serde_json 仅用作事件封套测试的开发依赖，不作为业务编码格式决定。
- 增加最小内存存储 UT 和仅使用根公开 API 的调用验证；不引入数据库、额外 crate、遥测、类型注册器或业务 codec 门面。
- 现有 docs/design/event-log.md 同步最新 wave 决定，保留完整设计背景。构造宏的现有未提交改动不属于本 change。
