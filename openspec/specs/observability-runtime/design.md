# Collector 独立运行时设计

本文补充 [运行时规格](spec.md)，仅覆盖当前独立 Collector 与 CLI 通用生命周期。库不依赖图内核或模型服务。

## 公开接口

crate 根只导出 `Collector` 与 `Error`；内部模块保持私有。Collector 为字段私有的生命周期对象，不提供可绕过初始化的字面量、Default 或 Clone，不暴露 SDK provider、worker、writer、exporter 或其配置类型。

```rust
use cognacta_collector::{Collector, Error};
```

以下是签名契约，省略函数体：

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

本库统一错误定义契约如下；省略实现细节：

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

## 配置与启用状态

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

每个已启用的进程有独立 service.instance.id；使用已有 UUID 依赖生成，配合 service.name、版本和指标起止时间，让后端区分进程重启和多个实例。指标采用累计时序，后端按实例和重置语义汇总，不能把每次导出的累计快照直接相加。

## 输出管线和非阻塞约束

一个 Registry 组合后台 stderr fmt Layer、OTel Trace Layer、OTel LogRecord Layer。多路输出依靠 Layer 组合，不反复注册多个全局 Subscriber。库代码只产生 event/span，不安装全局运行时。

业务侧记录为同步 API：字段处理、日志格式化、指标聚合及入队仍有本地计算、分配和短暂同步成本。网络发送和 stderr 写入全部由后台完成，不在业务热路径做 I/O、flush、重试、等待队列空间或为每条记录 spawn 一个任务。

日志/span 使用有界队列并允许丢弃；指标使用 SDK 的有界属性聚合和周期导出，不为每次 add 排队保存一条原始测量。配置有限队列、单批容量、属性组合容量和网络超时，避免隐藏的无限缓存。默认值沿用经审查的库配置并在实现中显式固定；不提供无需求的通用调优框架。

本地写入使用 tracing-appender 的 lossy 非阻塞模式。队列满时丢弃，不改成同步 stderr；可通过已有丢弃计数或限频摘要观察丢失，诊断本身也不能制造更多阻塞或递归告警。SDK/exporter 内部网络诊断不回灌远程管线；Collector 自身的安全诊断经本地后台 writer 输出。后台重试有限，故障期间允许数据过期或丢失，不拖慢业务。

## 进程关闭和析构边界

入口顺序：初始化 Collector → 创建业务对象和指标句柄 → 执行业务 → 停止任务并释放业务 span/流 → 收集原业务结果 → 限时 shutdown → 按原业务结果返回。

CLI 默认总预算三秒；公共 API 接受 Duration 以便测试和其他入口选择。关闭开始时取得一个单调 deadline，每次等待只使用剩余预算，包括本地 writer。不得把三秒分别交给三个 provider 再叠加 writer 的等待。

关闭实现须遵循 SDK `shutdown_with_timeout`、HTTP 客户端和 tracing-appender WorkerGuard 的真实行为。仅给外层套 timeout、随后在 Drop 中无限 join，或阻塞当前线程等待必须由该线程驱动的异步 exporter，都不满足契约。必要的资源清理交给专用后台关闭线程，入口只等待到总 deadline；预算到期后允许放弃投递并让进程结束，不在返回路径再次析构阻塞 guard。此处不承诺强制终止已经卡在系统写入中的线程。

忘记显式 shutdown 的 Drop 只做非阻塞 best effort，不保证送达；正常入口必须显式关闭。SIGKILL、进程崩溃、机器断电不保证尾部数据，未要求持久化；本版不扩展 CLI 的用户取消交互或信号处理功能。

## 未 enter span 的事件容量

显式 parent 事件在交给 Trace Layer 前，通过 tracing-opentelemetry 的 get_otel_context 激活 SDK span，使事件数量上限立即生效；不调用 enter/exit，不改变当前上下文。首事件前仍可设置 parent，span 在真实关闭时结束。

私有 Layer 使用 WeakDispatch，不形成引用环。锁定的 tracing-subscriber 版本中 Option<Layer> 不转发 on_register_dispatch，因此在实际 Dispatch 组装后显式设置该弱引用。回归使用相同 Option 组合验证采样、parent 关联和事件上限。

## 安全与验证

本地和远程均禁止记录凭据、原始配置/协议文本、用户内容或完整错误来源链；Error 的 source 供调用方诊断，不意味着可以将 Debug 或来源链写入日志。

配置、事件容量和 writer 逻辑通过源码 UT 验证；全局初始化、环境变量、OTLP 导出和 stderr 背压通过隔离进程及本地接收器验证。CLI 默认和 dev 构建均检查遥测故障不改变 stdout 与退出码。未初始化、采样关闭、共享关闭预算与 Drop 不二次阻塞均有独立验收。
