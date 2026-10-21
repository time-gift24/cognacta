# Design

## Context

动机见 [proposal.md](proposal.md)。当前 core 的 `Model::generate` / `Model::stream` 委托给 `Protocol`；provider 负责 HTTP、鉴权及 Chat Completions 流解析；CLI 负责组装和增量显示。`stream().await` 返回后，HTTP body 与协议状态仍由返回的流持有，观察请求函数返回不能代表观察了整个 Generation。

项目尚未初始化 tracing 或 OTel。CLI 默认模式同步运行，chat 模式自行建立 current-thread Tokio runtime。已有测试在 Protocol 边界使用手写 fake，并在集成目标使用本地 TCP 服务与 CLI 子进程。术语沿用 `CONTEXT.md`：一次模型调用是 Generation，Completed 表示该次生成正常收尾，FinishReason 与网络或协议失败不同。

本轮只创建提案、需求、设计、任务并更新已获授权的 `AGENTS.md`；不提前编写 Rust 实现或修改依赖。用户已确认使用进程内 Collector crate、标准埋点 API、三信号 OTLP 导出、后台 stderr、允许丢弃和有界关闭。

## Goals / Non-Goals

**Goals:**

- 埋点与具体后端分离，换后端时只改配置或 Collector crate 的适配实现。
- 保留标准 tracing 和 OTel Metrics API；业务函数不接收 Collector 对象。
- 在现有 Model 公共边界统一统计，覆盖初始 future、返回的流和取消，保持业务结果透明。
- 未初始化为空操作；初始化后允许仅本地模式；监控输出没有业务线程上的网络或 stderr I/O 等待。
- 关闭使用整个 Collector 的总预算，覆盖三信号和本地 writer，而非各自重置预算。

**Non-Goals:**

- 独立 OpenTelemetry Collector 服务、ClickHouse 或其他存储实现、看板、告警、部署清单。
- 可靠审计、磁盘缓冲、保证送达、运行中替换全局 provider、后台重新启用失败的初始化。
- 自建日志宏、指标门面、插件注册表或只有一个实现的新 exporter trait。
- 记录提示词、回复正文、原始报文；token 成本估算；上游内部排队或推理可见性。
- 新模型协议、自动重试、非流式协议实现、前端改造、业务数据库迁移。

## Decisions

### 1. 职责和依赖

| crate | 公开能力及本次内部调整 | 依赖边界 |
| --- | --- | --- |
| `cognacta-collector` | 新增 Collector 生命周期 API 和统一 Error；私有配置、Layer、SDK、writer、exporter 组装 | 不依赖 core 或 provider；业务语义、Generation 状态和 token 规则不放入本库 |
| `cognacta-core` | 保持现有根导出、签名、构造校验及 core Error；在 Model 调用边界增加私有观测状态 | 只依赖 `tracing`、`opentelemetry` 的埋点 API，不依赖 Collector、SDK、exporter、HTTP 客户端或存储 |
| `cognacta-provider` | 既有 HTTP 子阶段 span 与安全协议元数据；原有统一 Error 和 Protocol 错误转换不变 | 只为埋点直接增加 tracing；不重复统计 Generation |
| `cognacta-cli` | 程序入口初始化、错误展示、停止业务后统一收尾；现有 stdout 和业务退出码保持 | 依赖 Collector；不自己组装 OTel 后端 |

此次新增库有实际职责：同时封装三信号后端、stderr writer 和进程生命周期；不是预建空 crate。跨入口可复用的 Generation 观测放在现有 Model 边界，协议与终端细节留在使用方。直接调用底层 Protocol 不构成新的统一 Model 观测入口；只保证经 Model 的统一统计，避免两层同时加计数。

标准 API 已经是后端替换边界，不再包一层自定义指标接口。若未来平台支持 OTLP/HTTP，改端点即可；若不支持，可以在 Collector crate 增加对应 exporter，或另行部署网关。独立采集进程不是这个 Rust crate 的运行前提。替换 OTel 编程 API 本身则属于另一个变更，不承诺完全无代码迁移。

### 2. 依赖选型

| 库 | 用途 |
| --- | --- |
| `tracing` | 业务结构化日志、span、异步上下文 |
| `tracing-subscriber` | 一个 Registry 组合本地日志、OTel 链路、OTel 日志 Layer，各自过滤 |
| `tracing-appender` | 有界、允许丢弃的后台 stderr writer；生命周期由 Collector 持有 |
| `opentelemetry` | 标准 Metrics API；core 仅启用所需 API features |
| `opentelemetry_sdk` | 指标聚合、采样、资源、批量处理、生命周期 |
| `tracing-opentelemetry` | tracing span 到 OTel Trace；不使用其日志事件指标编码代替 Metrics API |
| `opentelemetry-appender-tracing` | tracing event 到独立 OTel LogRecord，并关联可用 trace/span 上下文 |
| `opentelemetry-otlp` | 三信号 OTLP/HTTP Protobuf 导出 |
| `thiserror` | 本库统一 Error；不将所有错误压成字符串 |

2026-10-16 核对的候选组合为 tracing 0.1、subscriber 0.3、appender 0.2、OTel 0.33.x、tracing-opentelemetry 0.34.x。实施时仍需检查 registry 实际可用版本、feature 兼容、Rust 工具链和 deny 约束，不因文档写了候选版本而跳过依赖验证。共享版本放入 workspace，锁文件提交。

本版只启用 HTTP Protobuf 传输，不引入 gRPC/tonic。后台导出使用可在独立工作线程运行的 HTTP 客户端，避免要求调用方 Tokio runtime 常驻，或在 current-thread runtime 上阻塞等待自身任务。遥测 HTTP 客户端与模型服务的客户端、认证、超时和重试策略分别配置，不能把 Provider 凭据带到监控请求。

### 3. cognacta-collector 完整公开接口

crate 根只导出 `Collector` 与 `Error`；内部模块保持私有。Collector 为字段私有的生命周期对象，不提供可绕过初始化的字面量、Default 或 Clone，不暴露 SDK provider、worker、writer、exporter 或其配置类型。

```rust
pub use collector::Collector;
pub use error::Error;
```

以下是签名契约，分号表示不在设计阶段提供函数体：

```rust
impl Collector {
    pub fn init_from_env(service_name: &str) -> Result<Self, Error>;
    pub fn shutdown(self, timeout: std::time::Duration) -> Result<(), Error>;
}
```

| 入口 | 输入、校验及副作用 | 输出及错误 |
| --- | --- | --- |
| `init_from_env` | 服务名非空白、无控制字符；读取并校验环境配置；仅程序入口显式调用；先准备本地 writer 和必要 SDK 资源，最后安装全局配置；不等待远程接收端连通 | 成功返回拥有运行资源的 Collector；无端点返回本地模式；非法服务名返回 InvalidConfig；无法建立本地资源返回 Initialization；重复或与既有全局 Subscriber 冲突返回 AlreadyInitialized |
| `shutdown` | 消费 Collector；调用方已停止业务并结束相关 span；Duration 为全部资源共享的上限，零预算允许立即超时；不得直接在运行导出任务的单线程执行器内等待自己 | 成功返回 `()`；具体关闭失败返回 Shutdown；总预算耗尽返回 ShutdownTimeout；返回后任何 guard/Drop 不得再在调用线程无限等待 |

远程配置无效、SDK exporter 不能建立等可降级错误，内部同样使用本库 Error 保留来源；以安全摘要提示一次并禁用远程部分，仍返回持有本地 writer 的 Collector。非法 RUST_LOG 提示后采用默认过滤。这里显式区别“本地运行资源无法建立，整个初始化失败”与“远程接入失败，已成功进入本地模式”，不把失败默默视为正常远程启用。

安装全局状态前完成可失败的资源准备，避免半安装状态；安装冲突时只清理本次候选资源，不重置已有宿主配置。指标 provider 仅由入口调用该构造时安装。无法初始化的 CLI 继续原业务；启动诊断同样采用限量、非阻塞的 best-effort 输出，不能用同步 eprintln 作为慢 stderr 下的兜底。连诊断资源也无法创建时允许丢诊断，保留返回给直接调用方的 Error。

本库统一错误定义契约如下；这是类型设计，不是提前创建 Rust 源码：

```rust
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("可观测配置项 {field} 无效: {reason}")]
    InvalidConfig {
        field: &'static str,
        reason: &'static str,
        #[source]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    #[error("可观测系统已初始化或存在全局订阅配置")]
    AlreadyInitialized {
        #[source]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    #[error("无法初始化可观测组件 {component}")]
    Initialization {
        component: &'static str,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    #[error("无法关闭可观测组件 {component}")]
    Shutdown {
        component: &'static str,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    #[error("可观测系统关闭超过总时间预算 {timeout:?}")]
    ShutdownTimeout {
        timeout: std::time::Duration,
    },
}
```

`field`、`reason`、`component` 只能使用程序控制的静态值，不拼入秘密。配置解析、I/O、Subscriber 注册和 SDK 错误在本库边界按实际上下文包装，保留真实 source；无底层来源的校验不制造假错误。Display 不展开 source，遥测不记录 Error 的 Debug、整条 source 链或环境变量原值。内部若实现依赖 trait，保持其错误契约，再在本库出口转换；不做无上下文双向 From。

CLI 在自己的统一 Error 中增加带 source 的可观测包装分类，专用于诊断汇总；它不替换已得到的业务结果或退出码。Collector 错误不进入 core Error，不成为 Protocol 的模型失败。

仅用公开 API 的完整调用示范（演示两次业务记录共用一次初始化；真实 CLI 处理初始化和关闭错误后保留业务结果）：

```rust
use std::time::Duration;
use cognacta_collector::{Collector, Error};

fn main() -> Result<(), Error> {
    let collector = Collector::init_from_env("collector-example")?;
    let meter = opentelemetry::global::meter("collector-example");
    let calls = meter.u64_counter("example.calls").build();

    for turn in 1..=2 {
        tracing::info!(turn, "example operation");
        calls.add(1, &[]);
    }

    collector.shutdown(Duration::from_secs(3))
}
```

示范不依赖私有模块或额外构造类型；未配置端点时日志走本地、指标使用空实现。业务指标句柄必须在初始化之后创建并复用；OTel 已创建的空句柄不会因后续 provider 更换而自动启用，本版不实现热启动和历史补发。

### 4. 配置与启用状态

| 输入 | 本版规则 |
| --- | --- |
| `service_name` 参数 | 显式服务标识；作为 resource 的 service.name，优先于环境中的同名资源属性 |
| `RUST_LOG` | 控制本地和远程日志；默认项目 info、其他目标 warn；非法值警告并回退该默认值；不影响指标，也不直接充当全局 span 开关 |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | 明确设置时为三信号基地址；HTTP 按标准附加对应 `/v1/logs`、`/v1/traces`、`/v1/metrics` 路径 |
| `OTEL_EXPORTER_OTLP_{LOGS,TRACES,METRICS}_ENDPOINT` | 对应信号的完整端点，优先于通用端点；没有通用地址时只开启明确设置的信号 |
| 对应 `*_HEADERS`、`*_TIMEOUT`、`*_PROTOCOL` | 遵循信号专用值优先于通用值；协议仅接受 http/protobuf；认证头不进入日志；超时为有效的有限正数 |
| `OTEL_SDK_DISABLED` | true 时不建立 OTel 导出，仍保留本地日志；非法值按远程配置错误处理 |
| `OTEL_TRACES_SAMPLER`、`OTEL_TRACES_SAMPLER_ARG` | 通过 SDK 支持的配置控制链路采样，默认遵循上游决定、无父上下文时全采样；非法值明确诊断，不能影响指标计数 |
| `OTEL_RESOURCE_ATTRIBUTES` | 接受 SDK 支持的资源配置，但不可覆盖显式 service.name 和本次进程生成的 service.instance.id；不自动收集任意环境变量 |

无任何显式端点时不采用 SDK 的 localhost 默认地址。空地址、非法 HTTP(S) 地址、地址中的内嵌凭据、fragment、不支持的协议、非法头或超时均作为远程配置错误，统一降级本地模式，不猜测修正。认证通过 headers 配置，不通过 URL 携带。

每个已启用的进程有独立 service.instance.id；使用已有 UUID 依赖生成，配合 service.name、版本和指标起止时间，让后端区分进程重启和多个实例。指标采用累计时序，后端按实例和重置语义汇总，不能把每次导出的累计快照直接相加。这里区分遥测 MeterProvider 与业务术语 Provider。

### 5. 输出管线和非阻塞约束

一个 Registry 组合后台 stderr fmt Layer、OTel Trace Layer、OTel LogRecord Layer。多路输出依靠 Layer 组合，不反复注册多个全局 Subscriber。库代码只产生 event/span，不安装全局运行时。

业务侧记录为同步 API：字段处理、日志格式化、指标聚合及入队仍有本地计算、分配和短暂同步成本。网络发送和 stderr 写入全部由后台完成，不在业务热路径做 I/O、flush、重试、等待队列空间或为每条记录 spawn 一个任务。

日志/span 使用有界队列并允许丢弃；指标使用 SDK 的有界属性聚合和周期导出，不为每次 add 排队保存一条原始测量。配置有限队列、单批容量、属性组合容量和网络超时，避免隐藏的无限缓存。默认值沿用经审查的库配置并在实现中显式固定；不提供无需求的通用调优框架。

本地写入使用 tracing-appender 的 lossy 非阻塞模式。队列满时丢弃，不改成同步 stderr；可通过已有丢弃计数或限频摘要观察丢失，诊断本身也不能制造更多阻塞或递归告警。SDK/exporter 内部网络诊断只进本地管线，不回灌远程日志。后台重试有限，故障期间允许数据过期或丢失，不拖慢业务。

### 6. 进程关闭和析构边界

入口顺序：初始化 Collector → 创建业务对象和指标句柄 → 执行业务 → 停止任务并释放业务 span/流 → 收集原业务结果 → 限时 shutdown → 按原业务结果返回。

CLI 默认总预算三秒；公共 API 接受 Duration 以便测试和其他入口选择。关闭开始时取得一个单调 deadline，每次等待只使用剩余预算，包括本地 writer。不得把三秒分别交给三个 provider 再叠加 writer 的等待。

实施时核查 SDK `shutdown_with_timeout`、HTTP 客户端和 tracing-appender WorkerGuard 的真实行为。仅给外层套 timeout、随后在 Drop 中无限 join，或阻塞当前线程等待必须由该线程驱动的异步 exporter，都不满足契约。必要的资源清理交给专用后台关闭线程，入口只等待到总 deadline；预算到期后允许放弃投递并让进程结束，不在返回路径再次析构阻塞 guard。此处不承诺强制终止已经卡在系统写入中的线程。

忘记显式 shutdown 的 Drop 只做非阻塞 best effort，不保证送达；正常入口必须显式关闭。SIGKILL、进程崩溃、机器断电不保证尾部数据，未要求持久化；本版不扩展 CLI 的用户取消交互或信号处理功能。

### 7. Generation 状态与计时

core 的 Model 保持原公开签名，在首次 poll 时建立私有观测状态与 Generation span，增加 started 和 in-flight。方法创建但从未 poll 不计数。请求 future 中的状态在返回流时转移到流包装器，初始 future 被丢弃和流被丢弃都能终结同一条观测；字段不进入公共业务类型。

| 路径 | 观测终态 | 收尾时点 |
| --- | --- | --- |
| generate 返回 Ok | success | 返回结果时；不因此实现当前 Protocol 未支持的非流式能力 |
| stream 返回流 | 尚无终态 | 保持进行中，交由流生命周期继续观察 |
| 初始 Err / 流内 Err | error | 错误交给调用方前；保留原错误、source 和 partial |
| 交付 Completed | success | 消费者可见 Completed 时，即使此后立即 drop 也不再取消 |
| 已执行但尚未终结的 future / 流被 drop | cancelled | 本地释放时；不等同于上游已经停止或停止计费 |
| 未出现 Completed/Err 的流 EOF | error，分类 truncated | 只记录观测异常，不插入、吞掉或改写业务事件 |

终态只记录一次，同时降低 in-flight、记录持续时间并结算用量。非法终态后事件可做安全诊断，但不再重复结算，不改变原调用方的协议处理。

时间从首次执行开始，以单调时钟度量；总时间到观测终态，包含下游消费等待。首段文本时间仅在流交付第一个非空 Text Delta 时记录，不能用 HTTP 响应头、Started 或空字符串代替。未输出文本不补零，不把本指标称为精确首 token 推理时间。

异步请求使用正确的 instrument 上下文；流每次 poll 在同一 Generation span 内执行，退出 poll 即退出作用域，不能把 enter guard 跨 await 保留。provider 的实际 HTTP 请求到响应头阶段建立子 span，HTTP body 消费仍归属于 Generation，不假装能看到上游内部服务的 span。

### 8. 日志、指标和字段契约

业务事件为 `generation.started`、`generation.completed`、`generation.failed`、`generation.cancelled`；开始、完成、取消用 info，外部调用失败用 warn。配置错误在入口或配置出口记录一次安全分类；CLI 原有用户错误展示仍保留，不把显示同一错误当作又一次 Generation 失败。禁止为每个 token 写常规日志。

日志/span 安全字段包括 provider、model、protocol、operation、outcome、error.kind、elapsed_seconds、已知用量以及已取得的 upstream.request_id；链路开启且上下文可用时日志带 trace/span ID。上游标识是非可信输入，编码控制字符并限制字段长度。成功日志可记录 finish_reason；FinishReason::OutputLimit 不算失败。未采样链路不保证后端存在对应 trace，但不削减指标。

以下名称为项目指标契约，不冒充尚会演进的 GenAI 标准名称；后端可在采集侧做映射：

| 指标 | 类型 / 单位 | 记录规则与额外维度 |
| --- | --- | --- |
| `cognacta.generation.started` | u64 Counter / `{generation}` | 首次执行加一 |
| `cognacta.generation.finished` | u64 Counter / `{generation}` | 终态加一；outcome=success/error/cancelled；error.kind 只在 error 时有值 |
| `cognacta.generation.in_flight` | i64 UpDownCounter / `{generation}` | 开始 +1，终态 -1 |
| `cognacta.generation.duration` | f64 Histogram / `s` | 各终态一份；outcome 维度 |
| `cognacta.generation.time_to_first_text` | f64 Histogram / `s` | 首个非空文本一次，没有则缺失 |
| `cognacta.generation.tokens` | u64 Counter / `{token}` | 终态按最新已知值结算；token.type=input/output |
| `cognacta.generation.usage_reports` | u64 Counter / `{report}` | 每次结算已知 token 字段加一；token.type=input/output，用于区分缺报与真零 |

共享维度为 provider、model、protocol、operation=generate/stream，来自已校验的对象绑定。不把 resolved_model 等上游任意值增加为动态指标标签。SDK 每个 instrument 的属性组合容量显式限制为 2000，超出使用 SDK 溢出聚合；若实际选定版本不能满足，则实现等价有限丢弃行为并验收，不无限建序列。请求 ID、trace ID、响应 ID、完整 URL、用户输入和任意错误文本不进入标签。

started 表示开始次数；finished 按 outcome 分组即可得到成功、失败、取消，无须重复维护多个同义计数器。存在进行中请求时 started 与 finished 不必相等。后续看板的失败比例必须注明分母是全部开始次数，还是已结束且排除取消的次数，本版不部署或暗定告警阈值。

Usage 是累计快照。按字段保存最新已知值，不把 5→10→最终10 累加成25；完成响应的已报告值优先，错误 partial 可补充最新已知值，取消只用已经观察到的快照。每个终态每种 token 只结算一次；未知不补零，不估价，不按文本长度估算。真实报告零仍增加 usage_reports。

### 9. 敏感信息与错误边界

埋点采用显式字段白名单；对带请求/配置/响应/错误对象的 instrument 使用跳过参数的方式，只添加安全字段。API key、认证头、提示词、回复正文、原始 JSON/SSE、原始配置和错误 source 链不进入本地或远程遥测。尤其不能对带 PartialGeneration 的 core Error 使用 Debug 日志。

业务错误对象和 source 不因观测而丢失；只记录错误分类，诊断需要的来源仍由原 API 提供。遥测配置的安全错误 Display 与业务 Error 的安全摘要分开，不通过通用 Debug 自动串联任意来源。仅本地日志也必须遵守相同规则。

### 10. 测试边界

主要验收边界沿用现有 CLI 子进程 + 手写本地模型服务，增加本地 OTLP 接收 fixture。验证真实业务行为、输出和导出结果；fixture 是测试接收端，不是新产品服务，不需要部署 Collector 或外部账号。解析 OTLP 消息验证语义、标签、关联及脱敏，不只断言请求数。

- 无网络 UT 继续放 `#[cfg(test)]`：纯配置解析、终态统计与 Usage 归并使用已有 Protocol fake 和内存测试输出；不为 UT 新增通用 mock 框架。
- 必须安装全局 Subscriber/provider、检查未初始化行为、修改环境变量或模拟 stderr 管道堵塞的用例使用隔离子进程；环境传入子进程，不在并行 UT 中修改进程全局环境。
- 本地 HTTP/OTLP 网络验收放显式集成目标，不混入无数据库、无外部服务的 lib/bin UT。沿用 provider streaming 和 CLI chat 集成测试模式。
- 用通道/握手控制模型延迟与监控接收端阻塞，证明监控未响应时业务已经推进；不要依靠精确毫秒阈值验证性能。
- 用收集到的 started/finished/in-flight 及输出验证成功、请求阶段失败、流中错误、future/stream drop、Completed 后 drop、缺失 Completed、无文本、重复 usage、缺报与真零。
- 分别验证日志过滤和 trace 采样不影响指标、配置降级、认证隔离、三信号 OTLP、短进程尾部发送、网络和 stderr 同时阻塞下的共享关闭预算，以及 deadline 后没有二次 Drop 阻塞。
- 默认 CLI 与 cognacta-test 模式均回归；业务 stdout、退出码、历史提交和协议事件与启用前一致。

## Risks / Trade-offs

- [同步埋点有本地 CPU/内存/锁开销] → 承诺不等待输出 I/O 或队列容量，不承诺物理上的零开销；复用句柄，控制字段和标签容量。
- [遥测和本地日志可能丢失] → 这是已确认的可用性取舍；不把它作为审计或计费账本，正常退出尽力发送。
- [指标句柄在初始化前创建会保持空实现] → 入口先初始化再构造业务对象与复用句柄；不做热启用承诺。
- [流的生命周期长于请求 future] → 转移同一个观测状态，终态和 Drop 去重；专门验证取消及 Completed 后 drop。
- [SDK/WorkerGuard 的内部析构可能超过用户预算] → 实施前核查所选版本，关闭资源的最终所有权不能落在已超时的业务线程上；用阻塞接收端和 writer 实测。
- [过滤/采样抑制日志或 span] → 每路独立过滤，Metrics API 独立计数，不从日志派生可靠性统计。
- [OTel Rust Trace 仍为 Beta，版本会演进] → 采用兼容版本组与锁文件，SDK 变化局限于 Collector 内部，公共接口不暴露其类型。
- [换存储仍有适配和查询迁移] → 保持业务埋点稳定，但不承诺不兼容平台仅改地址就能接入；具体 exporter 或独立网关后续决定。

## Migration Plan

1. 本轮交付文档、更新规范并发布需求 Issue；实施任务保持未完成状态。
2. 实施时加入 Collector 和所需 workspace 依赖，先验证空操作、本地后台输出和关闭契约，再启用三信号导出。
3. 在 Model 加入统一观测，provider 补 HTTP 子阶段，最后在 CLI 接入启动/停止；不改既有模型协议和数据库。
4. 本地接收端完成验收后，可由操作者配置 OTLP 地址启用远程导出；没有地址时保持本地模式。
5. 回退远程接入可取消端点配置或设置 SDK disabled；完全不启用采集则入口不调用初始化。没有业务数据迁移或强制外部服务依赖。

## References

- [tracing 默认空订阅者](https://docs.rs/tracing/latest/tracing/dispatcher/)
- [Subscriber 与 Layer 组合、按 Layer 过滤](https://docs.rs/tracing-subscriber/latest/tracing_subscriber/layer/)
- [tracing-appender 有界后台 writer](https://docs.rs/tracing-appender/latest/tracing_appender/non_blocking/)
- [OTel 全局指标及句柄初始化时序](https://docs.rs/opentelemetry/latest/src/opentelemetry/global/metrics.rs.html)
- [OTLP 三信号、HTTP 传输及环境变量](https://docs.rs/opentelemetry-otlp/latest/opentelemetry_otlp/)
- [tracing-opentelemetry 版本依赖](https://docs.rs/crate/tracing-opentelemetry/0.34.0/source/Cargo.toml)
- [OTel 日志桥接](https://docs.rs/opentelemetry-appender-tracing/latest/opentelemetry_appender_tracing/)
- [OTel Rust 稳定性状态](https://opentelemetry.io/docs/languages/rust/)
- [无需独立 Collector 的部署](https://opentelemetry.io/docs/collector/deploy/other/no-collector/)
