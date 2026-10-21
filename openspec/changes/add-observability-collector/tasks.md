# Tasks

以下任务仅在对应实现、测试和文档验证通过后勾选；提案完成不等于实现完成。

## 1. Collector 公开契约与配置

- [x] 1.1 创建 `cognacta-collector` workspace member，统一声明兼容的 tracing／OTel 依赖与 features，core 只引入埋点 API；通过 `cargo tree` 检查依赖方向、重复版本及无 gRPC 依赖，并通过离线 workspace check 和 `cargo deny check --disable-fetch`。
- [x] 1.2 实现设计中的根导出 `Collector`、`Error`、`init_from_env` 和 `shutdown` 契约及安全错误边界；通过只使用根公开 API 的编译示例，以及错误分类、source 保留和安全 Display 的 UT 验证，不暴露内部 SDK 类型。
- [x] 1.3 实现纯配置解析和校验，包括显式端点启用、信号覆盖、HTTP Protobuf、认证隔离、服务资源、采样、过滤及本地降级；用无网络 UT 验证默认不联网、配置优先级、无效配置分类和秘密标记不进入诊断。

## 2. 后台输出与进程生命周期

- [x] 2.1 实现单 Registry、多 Layer、有界 lossy 后台 stderr 与三信号 OTLP 输出，固定有限队列／批次／超时和指标属性容量；以隔离进程及本地 OTLP fixture 验证三种消息的语义、日志关联 ID、资源属性和本地输出，验证仅本地模式不发送网络请求。
- [x] 2.2 实现显式一次初始化和冲突处理，不覆盖已有 Subscriber；用隔离进程验证未初始化无输出／无导出资源、重复初始化返回分类错误且已有输出继续工作，并验证指标句柄在初始化后创建。
- [x] 2.3 隔离 SDK/exporter 自身诊断，实施有限重试及安全限频本地提示；用阻塞接收端和不读取的 stderr 管道证明队列满时业务继续推进，无同步输出兜底、无限缓存或递归远程日志。
- [x] 2.4 实现统一 deadline 的关闭及非阻塞 Drop，核查所选 SDK 和 WorkerGuard 的实际析构行为；用进程测试验证短任务尾部三信号发送、提前完成提前返回、零预算，以及网络和 writer 同时阻塞时三秒总预算不被逐路等待或后续析构叠加。
- [x] 2.5 补充 Collector 的 rustdoc 和最小运行说明，写清空操作、本地模式、OTLP 环境变量、允许丢弃与关闭责任；运行公开 API 示例及对应本地接收测试，核对说明不要求部署独立 Collector。

## 3. Generation 日志、链路与指标

- [x] 3.1 在现有 Model 边界加入私有观测状态和流包装，覆盖首次 poll、初始请求、Completed、错误、EOF 与 Drop；使用已有 Protocol fake 验证一个开始对应唯一终态、in-flight 归零，未 poll 不计数，Completed 后 drop 不重复取消，原事件与错误保持不变。
- [x] 3.2 实现设计中的七项指标和安全维度，包括整个消费期耗时、首次非空文本耗时、最新已知 Usage 及报告计数；通过内存指标输出验证无文本无首段样本、5→10→最终 10 只结算 10、partial／取消用量、未知与真零，以及属性容量溢出有界。
- [x] 3.3 加入 Generation 开始及终态日志、跨请求与每次 stream poll 的 span 上下文；用测试输出验证关联一致、完成原因与失败分类分离、参数 Debug 被排除，warn 过滤及关闭 trace 采样时指标仍完整。
- [x] 3.4 在相关 API 文档说明流生命周期、取消、首段文本和用量口径，保持现有公共签名及 core Error；运行 core UT，并以既有调用示例确认调用方无需接收 Collector 或修改错误处理。

## 4. Provider 与 CLI 接入

- [x] 4.1 在 provider 现有 HTTP 请求到响应头边界加入子 span 和安全元数据，不重复统计 Generation；通过现有 streaming 集成目标及导出断言验证父子关联、请求 ID、原始错误传播和每次生成只发送原有模型请求。
- [x] 4.2 CLI 在构造业务对象前初始化，在业务结束并释放流／span 后按三秒总预算关闭；观测错误仅作后台安全诊断并保留原业务结果。通过子进程回归默认模式和 cognacta-test 模式，验证正常、配置失败、远程不可达及关闭超时的 stdout、退出码和历史提交条件。
- [x] 4.3 增加 CLI + 本地模型 + 本地 OTLP 的端到端集成用例，检查完整成功、初始失败、流中失败、取消与输出背压；比较未初始化、本地、正常远程和故障远程下业务行为，并在本地日志、远程日志、span、指标中检查输入与输出秘密标记均未泄漏。
- [x] 4.4 更新实际运行说明，给出本地日志、三信号端点配置、关闭和测试命令；用本地 fixture 执行示例，确认凭据通过环境提供、模型与遥测认证隔离，并核对实现符合已更新的 `AGENTS.md`。

## 5. 跨 workspace 验收

- [x] 5.1 运行 `cargo fmt --all -- --check`、`SQLX_OFFLINE=true cargo check --workspace --all-targets --all-features --locked`、`SQLX_OFFLINE=true cargo clippy --workspace --all-targets --all-features --locked -- -D warnings` 和 `SQLX_OFFLINE=true cargo test --workspace --lib --bins --all-features --locked`，全部通过且 UT 不依赖外部服务。
- [x] 5.2 单独运行 provider 的 streaming、CLI 的 chat 及本次新增的显式观测集成目标，记录实际命令与结果；全部通过并覆盖两份规格中的场景，不将有网络的集成用例混入 lib/bin UT，也不要求部署外部监控平台。
- [x] 5.3 运行 `cargo deny check --disable-fetch` 和 `openspec validate add-observability-collector --strict`；复核根导出、依赖方向和配置／指标说明与最终代码一致，无未解释的契约差异。

## Verification results

2026-10-16 实施验证完成；所有 Cargo 检查和测试均设置 `SQLX_OFFLINE=true`，实际命令如下。

| 命令 | 结果 |
| --- | --- |
| `cargo fmt --all -- --check` | 通过 |
| `cargo check --workspace --all-targets --all-features --locked` | 通过 |
| `cargo clippy --workspace --all-targets --all-features --locked -- -D warnings` | 通过 |
| `cargo test --workspace --lib --bins --all-features --locked` | 31 项 UT 通过，无外部服务 |
| `cargo test -p cognacta-provider --test streaming --all-features --locked` | 11 项通过 |
| `cargo test -p cognacta-cli --test chat --test telemetry --all-features --locked` | chat 3 项、telemetry 3 项通过 |
| `cargo test -p cognacta-cli --test telemetry --locked` | 默认 feature 模式 1 项通过 |
| `cargo test -p cognacta-collector --test runtime --locked` | 6 项通过，含隔离子进程入口 |
| `cargo test -p cognacta-collector --doc --locked` | 公开调用示例编译通过 |
| `cargo deny check --disable-fetch` | advisories、bans、licenses、sources 均通过；多版本提示仍按现有策略为 warning |
| `openspec validate add-observability-collector --strict` | 通过 |

实现和运行说明见 `crates/cognacta-collector/README.md`。运行时依赖树确认 core 仅增加 tracing／OTel API，不引入 Collector 或 SDK；SDK 仅作为 core 测试依赖。本次没有 tonic/gRPC 传输依赖，未启用 OTel 原始 internal-logs。

本地集成 fixture 验证实际 OTLP protobuf 数据、HTTP 子 span、日志关联、准确结算和容量限制，以及未初始化、配置失败、不可达、慢接收端和满 stderr 队列。CLI 输出关闭引发的取消也已验证；业务 stdout、退出码、历史提交和认证隔离保持原契约。
