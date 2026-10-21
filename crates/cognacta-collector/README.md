# cognacta-collector

进程内日志、链路和指标运行库。业务使用 `tracing` 和 `opentelemetry` Metrics API；后端、后台 writer 和退出收尾由本库管理，无需部署独立 Collector 服务。

```rust
use cognacta_collector::{Collector, Error};
use std::time::Duration;

fn main() -> Result<(), Error> {
    let collector = Collector::init_from_env("example")?;
    let calls = opentelemetry::global::meter("example")
        .u64_counter("example.calls").build();
    for turn in 1..=2 {
        tracing::info!(target: "cognacta_example", turn, "operation");
        calls.add(1, &[]);
    }
    collector.shutdown(Duration::from_secs(3))
}
```

根公开接口仅为 `Collector` 和 `Error`。服务名必须非空白且无控制字符；重复初始化报 `AlreadyInitialized`，不替换宿主 Subscriber。错误 Display 是安全摘要，source 保留原始来源，不能直接写入遥测。示例用 `?` 展示本库返回契约；真实 CLI 会保留原业务退出码，把观测错误仅用于诊断。

初始化须早于 Model 和复用指标句柄的构造，关闭须晚于业务任务及流／span 释放。未初始化时不创建观测线程、不联网、不输出、不缓存历史；宿主自己安装的 Subscriber/provider 仍由宿主管理。初始化前创建的空指标句柄不会热启用。

## 运行和配置

从 workspace 根运行，未设置端点时只有后台本地 stderr。默认项目日志为 info，其他目标为 warn，原始 SDK／HTTP 客户端诊断被过滤，安全导出诊断走独立本地 writer。

```sh
SQLX_OFFLINE=true cargo run -p cognacta-cli --locked
RUST_LOG=cognacta_core=info SQLX_OFFLINE=true cargo run -p cognacta-cli --features cognacta-test --locked -- chat --config providers.toml --provider gateway --model model-id
```

需要远程导出时配置已存在且支持 OTLP/HTTP Protobuf 的服务地址；服务可以是平台本身，也可以是以后选择部署的网关。以下是地址形式示例，需替换为实际可用服务；凭据仅放环境变量或未跟踪的环境文件，不提交到仓库。

```sh
export OTEL_EXPORTER_OTLP_ENDPOINT=https://telemetry.example.com
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
# 如需认证，在私有环境中设置 OTEL_EXPORTER_OTLP_HEADERS=authorization=Bearer%20...
SQLX_OFFLINE=true cargo run -p cognacta-cli --features cognacta-test --locked -- chat --config providers.toml --provider gateway --model model-id
```

| 配置 | 规则 |
| --- | --- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | 基地址，分别附加 `/v1/logs`、`/v1/traces`、`/v1/metrics`；保留已有路径前缀 |
| `OTEL_EXPORTER_OTLP_{LOGS,TRACES,METRICS}_ENDPOINT` | 信号专用完整地址，优先于通用地址；无通用地址时只启用显式配置的信号 |
| 对应 `*_PROTOCOL` | 仅支持 `http/protobuf` |
| 对应 `*_HEADERS` | 逗号分隔的 `key=value`，值支持百分号编码；不允许覆盖 Host、Content-Type、Content-Length、Transfer-Encoding |
| 对应 `*_TIMEOUT` | 正整数毫秒，默认每次请求 5000ms；信号专用值优先 |
| `OTEL_SDK_DISABLED=true` | 禁用三信号远程部分，保留后台本地日志 |
| `RUST_LOG` | 本地／远程日志过滤；非法值诊断后回退默认过滤；不控制指标或链路采样 |
| `OTEL_TRACES_SAMPLER` | `always_on`、`always_off`、`traceidratio` 及其 `parentbased_` 形式；默认 `parentbased_always_on` |
| `OTEL_TRACES_SAMPLER_ARG` | ratio 采样器的必填参数，有限数值且范围为 0 到 1 |
| `OTEL_RESOURCE_ATTRIBUTES` | `key=value` 资源属性；显式服务名、本次进程生成的实例 ID 和构建版本优先 |

没有显式端点时不连接默认 localhost。远程地址、协议、头、超时或采样配置非法，或者 exporter 构造失败时，明确诊断并禁用本次远程输出；不会阻止业务。遥测认证与模型认证隔离，不跟随 HTTP 重定向。

## 资源和关闭

记录接口同步处理字段、格式化、聚合或入队；网络和 stderr I/O 由后台线程执行。有本地计算和同步开销，不代表零成本。日志及 span 队列各 2048 项，导出批次最多 512 项，每秒尝试发送；指标每 30 秒导出，累计属性组合容量每 instrument 为 2000，超出聚合到 SDK overflow 序列。stderr 队列为 2048 项，满时丢弃。

OTLP 请求体上限 4MiB，响应读取上限 64KiB；本版每批尝试一次，不重试丢失批次。导出故障（包括 HTTP 200 中的部分拒收或服务端警告）只给安全本地摘要，不输出服务端原始错误文本；三信号共享每分钟至多一次的诊断限额，不回灌到远程日志。本库不保证送达，不用于可靠审计或账单。

`shutdown(Duration::from_secs(3))` 是所有输出共享的总上限，提前完成即返回，并尝试发送周期尚未到达的数据。超时返回 `ShutdownTimeout`，允许丢失；后台资源的最终所有权不回到调用线程，随后 Drop 不再次等待。忘记显式关闭仅为非阻塞 best effort，不保证尾部送达。

本地 writer 用内部排空标记确认队列已经消费，再释放 `WorkerGuard`，规避 tracing-appender 0.2.5 在满队列关闭时直接打印 stdout 的行为。排空标记在共享关闭时限内重试，避免标记被满队列丢弃后误报超时；确认通道有界且不阻塞 writer。无法排空时保留该进程生命周期的 writer，允许进程退出；不尝试强制终止卡在系统 I/O 的线程。

## Generation 观测

统一观测从 Model 调用 future 首次执行到返回流被消费至 Completed、错误、异常 EOF 或本地取消。直接调用底层 Protocol 不重复进行 Model 计数。创建但从未执行的 future 不计数，Completed 后 drop 不增加取消。

| 指标 | 含义 |
| --- | --- |
| `cognacta.generation.started` | 开始次数 |
| `cognacta.generation.finished` | 按 success／error／cancelled 分组的唯一终态；失败带受控 error.kind |
| `cognacta.generation.in_flight` | 开始加一、终态减一 |
| `cognacta.generation.duration` | 到终态的秒数，包含消费等待 |
| `cognacta.generation.time_to_first_text` | 首次交付非空文本的秒数；没有文本时无样本 |
| `cognacta.generation.tokens` | 终态结算上游最新已知累计输入／输出 token |
| `cognacta.generation.usage_reports` | 已知用量字段的报告次数，区分真零与未知 |

共享维度是 provider、model、protocol、operation。token 按方向区分；累计 Usage 不重复相加，未知不补零。取消只表示本地停止消费，不保证上游停止生成或计费。后端按服务实例和累计时序重置语义处理快照，不能把各次累计导出直接相加。

开始／完成／取消记录 info，失败记录 warn；Generation span 关联实际 HTTP 请求到响应头的子 span。日志过滤及 trace 采样不影响指标。请求 ID 仅用于日志和链路，并限制长度、编码控制字符。凭据、提示词、回复、原始报文和完整错误来源链不进入任何遥测。

## 验证

无网络 UT 与显式本地网络集成目标分开运行，fixture 不需要实际监控服务。

```sh
SQLX_OFFLINE=true cargo test --workspace --lib --bins --all-features --locked
SQLX_OFFLINE=true cargo test -p cognacta-collector --doc --locked
SQLX_OFFLINE=true cargo test -p cognacta-collector --test runtime --locked
SQLX_OFFLINE=true cargo test -p cognacta-provider --test streaming --all-features --locked
SQLX_OFFLINE=true cargo test -p cognacta-cli --test chat --test telemetry --all-features --locked
SQLX_OFFLINE=true cargo test -p cognacta-cli --test telemetry --locked
```

集成目标覆盖 protobuf 三信号解码、父子 span、日志关联、用量、容量上限、脱敏、过滤／采样、配置降级、宿主冲突、短命进程发送、全局空操作，以及监控与 stderr 同时堵塞下的业务推进和关闭预算。CLI 用例比较成功、请求失败、流中失败在本地、远程正常、不可达、非法配置、阻塞接收端下的 stdout 与退出码。
