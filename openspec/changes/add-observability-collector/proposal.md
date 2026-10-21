# Proposal

## Why

现有 Model 调用只有业务输出与错误，无法连续观察 Generation 的失败、取消、延迟和 token 用量，也无法把同一次调用的日志与耗时关联起来。需要在不让监控故障和输出背压阻塞业务的前提下，建立可替换后端的可观测能力，并让后续功能设计明确确认观测需求。

## What Changes

- 新增进程内 `cognacta-collector` 库，封装可观测 SDK、后端组装及进程生命周期；本版使用 OTLP/HTTP Protobuf 导出日志、链路和指标。
- 日志与 span 使用 `tracing`，指标直接使用 OpenTelemetry Metrics API；单个 Subscriber 组合多个 Layer，保留后台写入的本地 stderr 日志。
- 明确未初始化时为空操作、运行期间后台批量导出、有界队列满时允许丢弃、导出故障不改变业务结果，以及退出时共享时间预算的收尾行为。
- 统一记录 Generation 的调用、成功、失败、取消、进行中数量、总耗时、首段文本耗时和上游报告的 token 用量；覆盖请求阶段和整个流消费阶段。
- 在 `AGENTS.md` 中规定库选型、职责边界，以及设计时先确认关键日志、span、指标、字段、统计口径和敏感信息处理的要求。
- 本轮只交付文档与规范；Rust 实现、依赖更新及运行验证由本 change 的实施任务承接。

## Capabilities

### New Capabilities

- `observability-runtime`: 进程内 Collector 的公开 API、初始化、空操作、日志与 OTLP 输出、故障隔离及关闭契约。
- `generation-observability`: Generation 生命周期的日志、链路、指标、统计口径、关联字段和数据保护。

### Modified Capabilities

无。当前没有已归档的能力规格；既有 Provider / Model / Protocol 的调用、流事件、错误及 CLI 输出契约保持兼容。

## Impact

- 后续实现涉及新库 `cognacta-collector`，以及 `cognacta-core`、`cognacta-provider`、`cognacta-cli` 的埋点和入口组装。
- core 仅增加标准埋点 API 依赖，不依赖 Collector、SDK 或 exporter；Collector 不依赖 core，不接管领域错误和 Provider 协议。
- 依赖选用 `tracing`、`tracing-subscriber`、`tracing-appender`、`opentelemetry`、`opentelemetry_sdk`、`tracing-opentelemetry`、`opentelemetry-appender-tracing`、`opentelemetry-otlp`，版本在 workspace 统一声明并由锁文件固定。
- 无数据库迁移、独立 Collector 进程、ClickHouse 接入、看板或告警部署。以后替换后端可调整 Collector crate 内部接入或配置，不修改业务埋点。
- 完整需求叙述见同目录 `brief.md`，精确 API、错误和统计契约见 `design.md`，验收行为见 `specs/`。
- 需求跟踪：[GitHub Issue #1](https://github.com/time-gift24/cognacta/issues/1)，标签 `ready-for-agent`。
