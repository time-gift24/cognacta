## Problem Statement

开发者目前只能依靠业务输出和错误判断模型调用是否工作，缺少可以关联的日志、链路，以及调用、失败、取消、耗时和 token 用量数据。流式请求在返回流对象后仍持续工作，仅记录请求函数耗时会漏掉消费、取消与流中失败。

用户需要可接入集中监控的能力，同时保留本地 stderr。监控平台不可达或输出缓慢不能拖住业务；以后更换存储或内部平台，不应要求重写业务埋点，也不能在本版强制增加一个部署组件。后续功能设计还必须明确确认关键观测需求。

## Solution

引入进程内 Rust 库 `cognacta-collector`，集中管理可观测运行资源和后端接入。业务使用标准 tracing 日志／span 和 OpenTelemetry Metrics API，初版经 OTLP/HTTP Protobuf 导出日志、链路和指标，同时以后台 writer 输出本地 stderr。

入口初始化一次供整个进程使用，业务结束后在共享时间预算内收尾。未初始化时埋点为空操作；初始化但没有显式端点时仅输出本地日志。所有网络和 stderr I/O 均在后台进行，队列有界，满时允许丢弃。换兼容平台可改配置；不兼容平台的适配留在 Collector 内部或未来可选的独立网关。

## User Stories

1. As a library user, I want instrumentation to do nothing before initialization, so that importing a library does not start threads, contact services, or print telemetry.
2. As an application developer, I want one process-level initialization, so that individual business calls do not manage telemetry resources.
3. As an application developer, I want standard tracing and OTel Metrics APIs, so that business instrumentation is independent of the chosen monitoring backend.
4. As an operator, I want local stderr logs without an endpoint, so that local development needs no monitoring service.
5. As an operator, I want logs, traces, and metrics exported through OTLP/HTTP Protobuf, so that a compatible central platform can receive all three signals.
6. As an operator, I want local logs retained during remote export, so that local diagnosis remains available during an outage.
7. As a maintainer, I want backend changes confined to configuration or Collector internals, so that switching storage does not rewrite business code.
8. As an operator, I want deployment of a separate Collector service to remain optional, so that this version adds no mandatory infrastructure.
9. As an application user, I want both telemetry networking and stderr writing performed in the background, so that a slow output destination does not block my model response.
10. As an operator, I want bounded queues and permitted loss, so that prolonged monitoring outages do not cause unlimited memory growth.
11. As an application user, I want telemetry failures to preserve business results and exit codes, so that monitoring cannot turn a successful generation into a failure.
12. As an operator, I want invalid remote configuration to produce a safe local diagnostic and local-only operation, so that business execution continues without guessing a destination.
13. As an application developer, I want duplicate initialization to fail explicitly, so that existing host instrumentation is not replaced.
14. As an operator, I want one total shutdown budget covering every output, so that process exit cannot be delayed by repeated exporter or writer waits.
15. As an operator, I want short-lived commands to attempt a final export, so that data can arrive before the periodic export interval.
16. As a developer, I want generation starts, terminal outcomes, and active counts, so that I can distinguish workload, failures, local cancellation, and unfinished work.
17. As a developer, I want observation to follow the returned stream, so that receiving response headers is not mistaken for successful generation.
18. As a developer, I want each generation to settle exactly once, so that dropping a completed stream does not create a second cancelled outcome.
19. As a developer, I want initial-future and stream cancellation recorded separately from errors, so that intentional local abandonment does not inflate failure counts.
20. As a developer, I want total duration and time to the first delivered nonempty text measured explicitly, so that their meaning is not confused with header latency or pure model inference time.
21. As an operator, I want token usage based on the latest reported cumulative values, so that repeated usage snapshots do not inflate totals.
22. As an operator, I want unknown usage distinguished from an explicit zero, so that absent upstream reporting does not appear as zero consumption.
23. As a developer, I want logs and traces correlated with safe model metadata and available upstream request IDs, so that I can investigate a particular failure.
24. As an operator, I want metric dimensions and their capacity bounded, so that arbitrary identifiers cannot create unlimited time series.
25. As a user, I want credentials and generation content excluded from all telemetry, so that local or remote diagnosis does not disclose my prompts or responses.
26. As an operator, I want metrics independent of log filtering and trace sampling, so that reducing diagnostic detail does not change reliability statistics.
27. As a maintainer, I want tests at existing business boundaries and isolated process boundaries, so that observations are verified without depending on production infrastructure or parallel global-state mutation.
28. As a project owner, I want feature designs to confirm key logs, spans, metrics, and statistical definitions, so that observability requirements are decided before implementation.

## Implementation Decisions

- 使用进程内 Collector crate；不要求独立 OpenTelemetry Collector 服务，不预建插件框架、自定义指标门面或只有一个实现的 exporter trait。
- Collector 根仅公开生命周期对象和统一 thiserror Error。初始化接受服务名、读取环境并返回对象或本库错误；关闭消费对象、接受 Duration 总预算并返回成功或分类错误。完整签名、输入校验、来源保留和公开调用示例已在配套设计中确定。
- core 在 Model 的公共调用边界使用标准埋点 API，保留既有业务签名与 Error；不依赖 Collector、SDK、exporter 或存储。Provider 只增加真实 HTTP 子阶段观测，CLI 负责初始化和收尾。
- 一个全局 Registry 组合本地 fmt、OTel Trace 和 OTel LogRecord Layer。OTel SDK 负责指标聚合及批量输出，tracing-appender 负责有界后台 stderr；库和业务方法不安装全局配置。
- 初版只支持 OTLP/HTTP Protobuf；通用端点启用三信号，信号专用端点可覆盖。没有任何显式端点时禁止使用默认 localhost。遥测 HTTP 客户端和凭据与模型请求隔离。
- 非空且无控制字符的服务名由入口显式提供；为每个进程生成实例标识，避免混淆多实例和重启后的累计指标。非法基本配置返回本库错误；无效远程配置或 exporter 建立失败降级到本地，非法日志过滤回退约定默认值并诊断。
- 埋点调用同步完成字段处理、聚合或入队，不需要 await；网络和 stderr 写入异步于业务执行。队列、批次、属性组合和重试有界，允许丢弃。该承诺不意味着没有本地 CPU、分配或短暂同步开销。
- Collector 未初始化且宿主也未安装观测实现时，埋点无输出、无导出线程、无联网或补发缓存。指标句柄在初始化后创建复用；不承诺运行中替换全局 provider。
- Generation 首次实际执行时计数，观测状态转移到返回的流；成功、失败、取消恰有一个终态。收到 Completed 即正常结算，未终结的 future 或流被丢弃记本地取消，异常 EOF 在观测上记 truncated，不改写业务事件。
- 统计 started、按 outcome 分组的 finished、in-flight、总耗时、首段文本耗时、输入／输出 token 及 usage_reports。总耗时包含消费等待；首段文本只记录第一次交付非空文本，没有则缺失。
- Usage 是累计快照，终态按字段最新已知值结算一次；最终响应优先，错误 partial 可提供用量，取消仅使用已观察值。未知不补零、不按文本估算；明确报告零通过 usage_reports 与未知区分。
- 指标共享 provider、model、protocol、operation 等受控维度，每个 instrument 的属性组合容量限制为 2000，超过容量采用 SDK 溢出聚合或等价有限丢弃。请求 ID 和任意上游文本不作标签。
- 开始、完成、取消记 info，调用失败记 warn，配置失败记录安全分类；禁止逐 token 常规日志。日志和 trace 关联可用上下文与请求 ID，过滤和采样不削减指标。
- 以显式安全字段记录观测，不默认 Debug 请求、响应、配置或带 partial 的错误。凭据、提示词、回复、原始报文及错误来源链不进入本地或远程输出；错误 API 仍保留真实 source。
- CLI 默认关闭预算三秒，由所有 provider 和 writer 共享；提前完成提前返回，到期允许丢弃。随后析构不能再次阻塞调用线程，忘记关闭的 Drop 只能非阻塞 best effort。遥测错误不改变业务结果、退出码或模型重试行为。
- 项目规范要求设计时向用户确认关键日志、span、指标的用途、边界、级别、字段、单位和口径；已确认的决定直接复用，无需重复提问。

## Testing Decisions

- 主要验收沿用现有 CLI 子进程与手写本地模型服务，增加本地 OTLP 接收 fixture。以业务输出、事件、退出码和解码后的遥测内容为断言，不绑定私有实现布局，也不要求外部监控账号或部署。
- core 的终态、耗时边界和 Usage 规则使用现有 Protocol fake 与内存观测输出；Collector 的纯配置解析和错误分类使用无网络 UT，不新增通用 mock 框架。
- 全局 Subscriber／provider、环境配置、默认空操作和阻塞 stderr 使用隔离子进程；不在并行 UT 中修改全局环境或互相抢占 Subscriber。
- 通过握手控制模型和接收端，证明遥测未响应或 stderr 已满时业务仍推进。验证的是输出不阻塞的行为，不依赖精确毫秒性能阈值。
- 成功、请求阶段失败、流中失败、初始 future 取消、流取消、Completed 后 drop、异常 EOF、无文本、重复 Usage、部分用量、未知和真零均检查唯一结算及原业务契约。
- 验证三信号关联、认证隔离、属性容量、过滤／采样不影响指标、秘密标记不进入任何遥测、无端点不联网，以及配置失败可降级。
- 关闭测试覆盖短命进程尾部发送、提前完成、零预算、网络与 writer 同时阻塞及返回后的析构；验证共享总预算，允许合理调度误差。
- 实施时运行仓库格式、离线 check／clippy、无服务 UT、显式网络集成目标、依赖检查及 OpenSpec 校验；本轮文档变更只验证内容、格式和规格完整性。

## Out of Scope

- 本轮编写 Rust 实现、修改依赖或部署监控设施；本规格描述后续实施要求。
- 部署独立 Collector、ClickHouse 或内部平台，配置看板、告警阈值和存储保留策略。
- 保证遥测不丢失、磁盘缓冲、可靠审计、精确账单或按文本推算 token。
- 新模型协议、非流式协议实现、自动模型重试、改变业务取消交互、数据库或前端改造。
- 全局 provider 热切换、历史补发、强制终止阻塞系统线程，或保证崩溃／强制终止后的尾部遥测送达。

## Further Notes

- OpenSpec change：`add-observability-collector`；包含 proposal、design、两份能力规格和未勾选的实施任务。
- 配套设计是公开 API、错误、配置和指标名称的完整契约；两份能力规格分别约束运行时和 Generation 行为。
- 集成测试 fixture 是本地测试工具，不是需要用户部署的新组件。协议透明性和输出不阻塞是验收条件，遥测允许丢失已获确认。
- 用户已确认按此设计落实文档并更新 `AGENTS.md`；实现另由 apply 阶段承接。
