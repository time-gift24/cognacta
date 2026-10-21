## Context

当前 `cognacta-core` 只有基础函数，`cognacta-cli` 只打印版本。`docs/design/llm-provider-interface.md` 已约定 Provider / Model / Protocol、`dyn Trait + async_trait`、reqwest 和鉴权注入，但尚无实现。本 change 按最新要求修正错误及配置契约，并规划一个可交互验证的流式文本切片。

本轮只更新 OpenSpec 产物，并按用户明确授权在 `AGENTS.md` 增加 crate 对外接口设计准则，不写 Rust 实现。后续实现以本 change 的规格为验收边界，既有文档中的工具、图像、推理、原生回放与非流式验收不自动并入本 change；已有设计目标也不因此被删除。`CONTEXT.md` 和既有设计文档保持不变。

## Goals / Non-Goals

**Goals:**

- 使用 TOML 和专用配置类型，校验后构造 Provider、鉴权与运行时 Model 绑定。
- 用 `thiserror` 实现各 crate 的错误，保留分类和底层来源。
- 通过 reqwest 与纯 SSE decoder 接入 `openai.chat-completions` 的流式文本输出。
- 在现有 clap CLI 中用 `cognacta-test` feature 开启简单交互命令，支持多轮文本上下文。
- 用本地 HTTP 服务与 CLI 子进程验证真实组装、增量输出、历史和错误，不依赖外部密钥。

**Non-Goals:**

- 本轮不编写 Rust 实现；后续实施也不扩展 Responses、Anthropic、Gemini、Bedrock 或 Ollama 协议。
- 不实现或验收工具调用、工具执行、图像、推理、原生回放、非流式生成；不为未来能力补占位运行逻辑。
- 不做 TUI、多行编辑、命令补全、会话持久化、运行中切换模型、配置热更新、自动重试或自动重连。
- 不增加数据库、通用插件注册表、传输框架、独立测试二进制或新的应用服务。

## Decisions

### 1. 复用两个现有 crate，新增一个实际接入 crate

| 位置 | 职责 |
| --- | --- |
| `cognacta-core` | Provider、Model、统一请求/响应/流事件、Protocol 边界及领域 Error |
| `cognacta-provider` | 专用配置 DTO、TOML 解析、TryFrom 适配、HttpAccess、RequestAuth、Chat Completions 与 SSE 解码 |
| `cognacta-cli` | clap 参数、依赖组装调用、逐行输入、增量输出和退出码 |

core 不依赖 reqwest、toml 或 clap，也不为了配置格式派生 Deserialize。仅有一个实际协议时，将 HTTP 和协议实现放在同一个接入 crate；出现真实复用再拆分，避免提前新增多个空 crate。继续使用 `Arc<dyn Protocol>` 与 `#[async_trait]`，不用泛型 Model 或选择枚举替代用户已确定的运行时分派。

### 2. TOML 使用显式名称和专用 Config 类型

使用 TOML 数组表保存 Provider 和模型，名称直接属于对应配置对象，避免 TryFrom 输入丢失原来表键中的名称。不同时兼容 JSON 或另一种 TOML 表布局。

以下仅为配置类型契约，非实现代码：

```rust
#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProvidersConfig {
    pub providers: Vec<ProviderConfig>,
}

#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProviderConfig {
    pub name: String,
    pub base_url: String,
    #[serde(default)]
    pub headers: std::collections::BTreeMap<String, String>,
    pub auth: AuthConfig,
    pub models: Vec<ModelConfig>,
}

#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelConfig {
    pub name: String,
    pub protocol: String,
}

#[derive(Debug, serde::Deserialize)]
#[serde(tag = "type", rename_all = "snake_case", deny_unknown_fields)]
pub enum AuthConfig {
    None,
    HeaderEnv {
        name: String,
        #[serde(default)]
        prefix: String,
        env: String,
    },
}
```

配置 DTO 字段公开，允许调用方读取或编程构造未验证输入，包括取得 `&ProviderConfig` 调用 TryFrom。公开 DTO 不代表验证通过：`build_models` 每次校验输入；有效运行对象 Provider、Model、HttpAccess 的字段仍私有，不能绕过其构造校验。不打印整个配置的 Debug，headers 也可能包含敏感信息。

```toml
[[providers]]
name = "company-gateway"
base_url = "https://llm.example.test/v1/"
headers = { x-tenant-id = "team-a" }
auth = { type = "header_env", name = "authorization", prefix = "Bearer ", env = "LLM_API_KEY" }

[[providers.models]]
name = "model-a"
protocol = "openai.chat-completions"

[[providers.models]]
name = "model-b"
protocol = "openai.chat-completions"

[[providers]]
name = "local-gateway"
base_url = "http://127.0.0.1:8080/v1/"
auth = { type = "none" }

[[providers.models]]
name = "model-a"
protocol = "openai.chat-completions"
```

`ProvidersConfig::load(path)` 负责读取和 TOML 反序列化，返回接入 crate 的 `Result<ProvidersConfig, Error>`。拒绝语法错误、重复 TOML 键、未知字段和缺失必填项。组装阶段额外拒绝空 providers/models、空白名称、重复 Provider 名称及同 Provider 内重复模型名；允许不同 Provider 使用相同模型名。不静默覆盖数组中的同名条目。

### 3. Provider 通过 TryFrom 适配配置，保留领域校验入口

定义转换契约 `TryFrom<&ProviderConfig> for cognacta_core::Provider`，关联 `Error` 为 `cognacta_provider::Error`；实现在拥有 ProviderConfig 的接入 crate 中，core 不反向依赖配置 crate。转换调用 core 中已有设计的校验构造入口 `Provider::new(name, base_url)`，不直接开放字段或绕过不变量。

借用输入可以让后续组装继续读取 headers/auth/models，无需把这些接入配置塞进领域 Provider。TryFrom 只创建名称和地址元数据，不读取环境变量、不发网络请求，也不声称已经校验整个模型目录。URL 必须是无内嵌凭据、查询和 fragment 的绝对 HTTP(S) 接入地址；拼接 `chat/completions` 时保留配置路径前缀，`/v1` 和 `/v1/` 都指向 `/v1/chat/completions`。

`build_models(config, client)` 在接入 crate 接收 `ProvidersConfig` 和可复用 reqwest Client，校验整个配置并返回按 `(provider_name, model_name)` 索引的 Model 集合。全部成功才返回集合；未知协议、非法头、缺失或空的凭据环境变量均在任何模型请求前失败。协议名只接受 `openai.chat-completions`，不把未知值回退成它。

组装顺序为 Provider::try_from → 头与鉴权 → 共享 HttpAccess → Arc<dyn Protocol> → Model。所有模型共用调用方提供的连接池，同一 Provider 共享其接入配置；请求期间不重新读取配置或环境变量。

### 3.1 cognacta-provider 的完整公开入口

crate 根的导出契约如下。模块本身私有，调用方从 `cognacta_provider` 根导入；core 的 Provider、Model、Protocol 和消息类型仍从 `cognacta_core` 导入，不复制领域类型。

```rust
pub use config::{AuthConfig, ModelConfig, ProviderConfig, ProvidersConfig};
pub use error::Error;
pub use auth::{HeaderAuth, RequestAuth};
pub use http::HttpAccess;
pub use openai::OpenAiChatCompletions;
pub use runtime::build_models;
```

下列代码只列 Rust 风格签名；方法末尾分号表示本文不提供函数体，不是可直接编译的 impl。

```rust
impl ProvidersConfig {
    pub fn load(path: impl AsRef<std::path::Path>) -> Result<Self, Error>;
    pub fn from_toml(text: &str) -> Result<Self, Error>;
}

impl TryFrom<&ProviderConfig> for cognacta_core::Provider {
    type Error = Error;
    fn try_from(config: &ProviderConfig) -> Result<Self, Self::Error>;
}

pub fn build_models(
    config: ProvidersConfig,
    client: reqwest::Client,
) -> Result<
    std::collections::HashMap<(String, String), cognacta_core::Model>,
    Error,
>;

#[async_trait::async_trait]
pub trait RequestAuth: Send + Sync {
    fn replay_scope(&self) -> &str;

    async fn apply(&self, request: &mut reqwest::Request) -> Result<(), Error>;
}

impl HeaderAuth {
    pub fn new(
        name: reqwest::header::HeaderName,
        value: reqwest::header::HeaderValue,
    ) -> Self;
}

impl HttpAccess {
    pub fn new(
        client: reqwest::Client,
        headers: reqwest::header::HeaderMap,
        auth: Option<std::sync::Arc<dyn RequestAuth>>,
    ) -> Result<Self, Error>;

    pub async fn send(
        &self,
        request: reqwest::Request,
    ) -> Result<reqwest::Response, Error>;

    pub fn replay_scope(&self) -> &str;
}

impl OpenAiChatCompletions {
    pub fn new(http: std::sync::Arc<HttpAccess>) -> Self;
}
```

`OpenAiChatCompletions` 实现 core 的 Protocol，而不是再定义另一套生成 trait。它的 generate/stream 方法遵守 core trait 的 `cognacta_core::Error` 返回契约，不返回接入层 Error。SSE decoder、原生 JSON 类型及错误转换函数保持私有，不作为公共扩展接口。

| 入口 | 校验、副作用与失败边界 |
| --- | --- |
| ProvidersConfig::load | 读取文件后调用 from_toml；文件错误为 ConfigRead，TOML 错误为 ConfigParse；不读取凭据、不联网 |
| ProvidersConfig::from_toml | 解析格式与必填字段；不把成功解析等同于运行配置有效；模型目录、凭据与头校验由 build_models 执行 |
| Provider::try_from | 委托 core 构造校验名称与地址；失败包装为 Domain；不读取 auth/models 的运行资源 |
| build_models | 消费配置，校验整个集合并一次性返回模型映射；失败返回本 crate Error，无生成请求或部分目录 |
| HeaderAuth::new | 输入已经是验证后的头类型，标记敏感值；不做 I/O，因此返回 Self |
| HttpAccess::new | 校验公共头与协议要求的冲突，组合 client 和可选鉴权；多参数构造用 bon 提供同一校验入口的 builder，字段不公开 |
| RequestAuth::apply | 可以异步访问最终请求并修改鉴权头；外部实现通过 Error::Authentication 表达自身失败 |
| HttpAccess::send | 合并头、鉴权，随后只读校验最终 Content-Type/Accept 必要条件再 execute；冲突返回 InvalidConfig 且不发送，不修改已签名内容；网络/鉴权失败返回本 crate Error，非 2xx 响应仍交给具体协议解释 |
| OpenAiChatCompletions::new | 绑定已构造的 HttpAccess，不发送请求，不重复领域校验，因此返回 Self |

`replay_scope` 沿用总体接口中不含原始凭据的只读来源标记；HeaderAuth 按已加载的凭据来源建立标记，HttpAccess 合并公共头配置。这里明确公开签名，不增加本次原生回放功能或相关验收。

已构建的 reqwest Client 不能由 HttpAccess 重新设置策略。`build_models` / `HttpAccess::new` 的 client 参数要求调用方已关闭自动重试和重定向；CLI 负责实际按此要求构造，接入层不声称能检查任意传入 Client 的内部策略。手动组装沿用这一前提。

仅使用公开 API 的配置调用示范（错误由 CLI 自己的 Error 接收和转换）：

```rust
use cognacta_provider::{ProvidersConfig, build_models};

let config = ProvidersConfig::load("providers.toml")?;
let client = reqwest::Client::builder()
    .redirect(reqwest::redirect::Policy::none())
    .retry(reqwest::retry::never())
    .build()?;
let models = build_models(config, client)?;
let key = (selected_provider_name, selected_model_name);
let model = models.get(&key)
    .ok_or_else(|| CliError::UnknownModel {
        provider: key.0.clone(),
        model: key.1.clone(),
    })?;
let events = model.stream(request).await?;
```

需要自定义鉴权时，用公开构造直接组装；不增加工厂 trait，也不要求先伪造 TOML。此例中的 config、client、headers、model_name 和 request 已由调用方取得，custom_auth 是调用方实现并构造的鉴权对象：

```rust
use std::sync::Arc;
use cognacta_core::{Model, Protocol, Provider};
use cognacta_provider::{HttpAccess, OpenAiChatCompletions, RequestAuth};

let provider_config = config.providers.first().ok_or_else(|| {
    cognacta_provider::Error::InvalidConfig {
        field: "providers".into(),
        message: "至少需要一个 Provider".into(),
    }
})?;
let provider = Arc::new(Provider::try_from(provider_config)?);
let auth: Arc<dyn RequestAuth> = custom_auth;
let http = Arc::new(HttpAccess::builder()
    .client(client)
    .headers(headers)
    .auth(auth)
    .build()?);
let protocol: Arc<dyn Protocol> = Arc::new(OpenAiChatCompletions::new(http));
let model = Model::new(provider, model_name, protocol)?;
let events = model.stream(request).await?;
```

示范依赖的 HttpAccess builder 由 bon 从上述 new 构造入口生成：client 必填，headers 默认空，auth 默认 None；设置 auth 时接收 `Arc<dyn RequestAuth>`，build 返回 `Result<HttpAccess, Error>`，校验与 new 相同。上述代码展示调用关系，不在本轮提供方法实现。

### 4. thiserror 保留原有错误形状与来源

core 的错误继续表达分类和调用上下文，显式使用派生宏和 source。以下为修正后的类型契约；相关内容类型同步支持 Debug：

```rust
#[derive(Debug, thiserror::Error)]
#[error("{message}")]
pub struct Error {
    kind: ErrorKind,
    message: String,
    request_id: Option<String>,
    retry_after: Option<std::time::Duration>,
    partial: Option<PartialGeneration>,
    #[source]
    source: Option<Box<dyn std::error::Error + Send + Sync>>,
}
```

保留既有 ErrorKind 分类；字段通过受控构造和只读访问提供。接入层分别保留 TOML、配置校验、环境变量、头校验、HTTP 与解码错误；CLI 保留参数、文件/终端 I/O、接入和生成错误。每个 crate 用 `thiserror` 定义自己的统一对外 Error，在协议 trait 边界转换为 core Error，保留原始 source，不用裸字符串或 anyhow 替代分类错误。需要加入 kind、partial 等上下文的转换显式编写，不滥用 `#[from]`。[thiserror 官方文档](https://docs.rs/thiserror/latest/thiserror/)说明结构体错误和 source 派生均受支持。

错误显示只包含安全诊断，不输出凭据、完整配置或原始请求头。未授权/无权限映射 Authentication，限流映射 RateLimited，服务不可用映射 Unavailable，连接/读取和超时分别映射 Transport/Timeout，语义/JSON 解析错误映射 InvalidResponse，缺少原生终止标志映射 Truncated。HTTP 层不能先丢掉错误响应体再解释错误。

### 4.1 cognacta_provider::Error 的具体定义

以下 Error 由 `cognacta_provider` 根公开导出，与上文 `cognacta_core::Error` 是不同类型。枚举本身提供可匹配的分类，不再增加一套重复 ErrorKind；外部鉴权实现可以构造 Authentication 并保留自己的源错误。

```rust
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("无法读取配置文件 {path}", path = .path.display())]
    ConfigRead {
        path: std::path::PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("TOML 配置解析失败")]
    ConfigParse(#[source] toml::de::Error),

    #[error("配置项 {field} 无效: {message}")]
    InvalidConfig {
        field: String,
        message: String,
    },

    #[error("不支持协议 {protocol}")]
    UnsupportedProtocol { protocol: String },

    #[error("无法读取凭据环境变量 {name}")]
    Environment {
        name: String,
        #[source]
        source: std::env::VarError,
    },

    #[error("请求头 {name} 无效")]
    InvalidHeader {
        name: String,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    #[error("鉴权失败: {message}")]
    Authentication {
        message: String,
        #[source]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },

    #[error("HTTP 传输失败")]
    Transport(#[source] reqwest::Error),

    #[error("上游 HTTP {status}: {message}")]
    Http {
        status: u16,
        message: String,
        request_id: Option<String>,
        retry_after: Option<std::time::Duration>,
    },

    #[error("响应无效: {message}")]
    InvalidResponse {
        message: String,
        #[source]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },

    #[error("流式响应缺少终止标志")]
    Truncated,

    #[error("领域对象校验失败: {0}")]
    Domain(#[source] cognacta_core::Error),
}
```

Error 的 message 只能放经过处理的安全摘要；InvalidHeader 不携带原始头值，Environment 的 Display 不展开变量内容。源错误按真实类型保留，CLI 不直接打印任意 Debug、原始响应体或完整 source 链；配置解析的安全位置诊断可从解析错误取得，不回显包含敏感头的原始 TOML。

| 失败入口 | 对外返回的错误 |
| --- | --- |
| load / from_toml / build_models / Provider::try_from | `cognacta_provider::Error`，配置和组装错误直接交给调用方，不先转成生成错误 |
| HttpAccess::new / builder.build / send、RequestAuth::apply | `cognacta_provider::Error` |
| OpenAiChatCompletions 实现的 Protocol::generate / stream | `cognacta_core::Error`，遵守外部 trait 契约 |
| Model::generate / stream 及 EventStream 中的 Err | `cognacta_core::Error` |
| CLI 命令执行 | `cognacta_cli` 自己汇总的 Error，区分 Provider 接入错误、core 调用错误及终端 I/O |

协议边界按下表显式转换，并附加当前调用的 request_id、retry_after、partial；存在接入错误时将原 Error 放进 core 的 source。配置失败不会正常走到该边界；表中的配置映射只用于保证内部转换完整。不存在无上下文的公开双向 From 转换。

| provider Error | core ErrorKind / 处理方式 |
| --- | --- |
| ConfigRead / ConfigParse / InvalidConfig / InvalidHeader | InvalidRequest |
| UnsupportedProtocol | Unsupported |
| Environment / Authentication | Authentication |
| Transport | 按 reqwest 错误的超时标记区分 Timeout 与 Transport |
| Http | 401/403 → Authentication；429 → RateLimited；5xx → Unavailable；其余 4xx → InvalidRequest；其他非成功状态 → InvalidResponse |
| InvalidResponse | InvalidResponse |
| Truncated | Truncated |
| Domain | 保留原 core 分类和来源，不包装成自身循环引用 |

HTTP 状态本身不是底层 Rust error，因此 Http 保存状态和响应诊断；JSON / SSE 解析失败通过 InvalidResponse 的 source 保留解析错误。partial 属于生成过程，由协议在转换为 core Error 时附加，不在 provider Error 再复制一套业务状态。

### 5. 首个协议只交付流式文本能力

继续使用既有 `Model.stream → Protocol.stream → EventStream` 接口与 `Started / PartStarted / Delta / PartCompleted / Usage / Completed` 语义。Protocol 和 RequestAuth 的异步 trait 与实现均使用 `#[async_trait]`，保持 Send + Sync；Model 的固有方法为原生 async。返回的流拥有响应和解析状态。

当前接入仅编码文本 messages、应用 instructions 和已支持的文本生成选项，发送单个 completion 的 `stream = true` 请求。不发送工具定义，不进入工具循环。既有接口中尚未支持的输入/选项明确返回 Unsupported；统一接口保留 `generate` 方法，当前协议固定返回 Unsupported 且不发请求，不用流聚合伪装成已交付的非流式接入。工具、推理和回放保留为后续设计目标，不为此次 CLI 新增相应模块或验收任务。

reqwest 负责单次 POST，CLI 在构造 Client 时关闭自动重试和重定向，其他调用方遵守同样的 Client 前置条件；共享 HttpAccess 按“协议默认头 → 自定义头 → RequestAuth.apply → execute”发送，鉴权失败阻止发送。初版支持 none 和 header_env；apply 可以修改最终请求头，协议不绑定具体密钥形式。默认 Content-Type/Accept 必须保持适合 JSON 请求与 SSE 响应，冲突配置明确拒绝。

沿用既有分帧调研的 `sse-core` 纯 decoder 方案，实施时核对版本、最小 features 与许可证；不引入带自动重连的完整 EventSource 客户端。字节边界、UTF-8 和 SSE 边界由 decoder 处理，协议实现解释 data JSON 与 `[DONE]`。适配器须真正边收边产出事件，不等整个 body 完成；至少有一条集成测试证明第一个文本 delta 在发送终止事件前已交付。

只接受单个 choice 的文本输出。空的 role/content 片段不制造文本；未知但无语义影响的附加 JSON 字段可忽略，未支持的非文本输出不能伪装成空文本成功。收到合法 finish_reason 后继续处理已报告的 usage，只有 `[DONE]` 到达且响应状态完整才产出唯一 Completed，随后立即结束统一流，不等待 HTTP body 的物理 EOF，也不处理尾随字节。未收到 `[DONE]` 就 EOF 为 Truncated；已收到 `[DONE]` 却缺失必要的 completion 状态为 InvalidResponse。纯文本长度上限或内容过滤仍可按 FinishReason 正常结束。usage 有则记录，未知为 None，不强制要求兼容网关实现额外的 usage 扩展。[Chat Completions 官方参考](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)作为请求和流式响应映射依据。

### 6. CLI 使用默认关闭的 Cargo feature

`cognacta-test` 是 `cognacta-cli` 的 Cargo feature，不是命令行布尔参数、`cfg(test)` 或新 binary 名称。默认关闭，只条件编译 chat 子命令和接入所需可选依赖；整个现有 CLI 仍能执行版本和帮助命令。clap 使用 derive 定义 Parser / Subcommand / Args，feature 开启后提供：

```sh
cargo run -p cognacta-cli --features cognacta-test -- \
  chat --config providers.toml --provider company-gateway --model model-a
```

三个参数均显式必填；不猜默认文件、默认 Provider 或默认模型。当前 binary 名称保留 cognacta-cli。未指定子命令保留现有版本输出；`--help` / `--version` 由 clap 处理；feature 关闭时帮助中没有 chat，调用 chat 按未知命令失败。参考 [clap derive 教程](https://docs.rs/clap/latest/clap/_derive/_tutorial/index.html)与 [Cargo feature 文档](https://doc.rust-lang.org/cargo/reference/features.html)。

### 7. 逐行交互，成功后原子提交一轮历史

启动时加载、校验全部配置并选定 Model；会话内保持该绑定。终端显示简单提示，逐行读取输入；只删除行末换行，纯空白行跳过，不调用模型。输入 EOF 或独占一行的 `/exit` 正常退出。

每轮将成功历史加当前 user 消息作为临时请求，收到 Text delta 即写入 stdout 并 flush。成功流结束后，从 Completed 获取完整 assistant，才把本轮 user 和 assistant 一起追加到内存历史。第二轮请求应恰好包含首轮 user、完整 assistant 和新 user。不要用屏幕文本或 delta 拼接替代最终 assistant。

初版采用失败即退出：配置、鉴权、网络、HTTP、解码、截断或终端 I/O 失败，写安全错误到 stderr 并非零退出；已经显示的部分文本可以保留，但该轮不提交历史、不继续对话、不自动重发。输入 EOF 是正常退出，响应 EOF 是否成功由协议终止契约判断。Ctrl+C 保持常规进程终止语义，不增加“取消后继续会话”的状态机，也不承诺远端停止计算。

终端输入与单次异步生成顺序执行，不做后台预读。读用户输入时没有活跃生成流，允许在异步请求之外使用简单阻塞逐行输入；无需引入 readline 或 TUI 依赖。CLI 的会话逻辑使用现有 Protocol fake 做最小 UT，不增加测试专用 trait。

### 8. 验收集中在公开行为

- 无网络 UT：配置解析/重复名称、TryFrom 校验、clap 参数与 feature 可见性、fake Protocol 下的完整/失败历史提交。
- 接入集成测试：TOML → build_models → Model.stream → 本地 HTTP 服务，断言路径前缀、真实模型名、自定义头/鉴权、跨字节 Unicode 与多 SSE 事件、完成标志和失败分类。
- CLI 子进程测试：通过 stdin/stdout 驱动两轮对话；本地服务器先发首段后等待测试端确认收到输出，再发尾段，避免通过固定 sleep 猜测是否流式。设置有界超时防止回归测试挂起。
- 覆盖 feature 关闭和开启；本地 HTTP 测试单独放在接入和 CLI 的集成测试目标，不混入无网络的 `--lib --bins` UT。
- 测试凭据为临时假值，fixture 明确标注为人工构造；不宣称真实服务验证，不测试工具调用。CLI 子进程通过自己的环境注入凭据；并发 UT 不修改进程全局环境，必要时使用模块内的私有凭据查找函数参数。

## Risks / Trade-offs

- [兼容网关不完全遵循协议] → 未支持协议或响应形态明确失败，仅承诺本规格定义的 Chat Completions 文本流子集。
- [TOML 从键式示范改成数组表] → name 在对象中只声明一次，补充重名校验；既有 JSON 从未作为已实现配置发布，无需双格式迁移。
- [只测全 features 会漏掉默认构建问题] → 分别验收默认 CLI 与启用 cognacta-test 的 CLI。
- [历史设计范围大于本次交付] → tasks 与 specs 只安排文本流必需部分；非流式、工具、图像、推理、回放不作为本次完成条件。
- [控制台看到了部分文字容易被误认为成功] → 失败显式报错并退出，只有 Completed 后的完整轮次进入历史。

## Migration Plan

当前没有已发布配置或 LLM 调用数据，无数据迁移。实施时先建立公共类型和配置校验，再接通单个协议，最后启用 CLI 与集成验收；所有依赖版本统一写入 workspace 并检查 deny 约束。交付时新增一个不含密钥的 TOML 示例。需要撤回 CLI 时使用不启用 cognacta-test 的构建，不影响默认版本/帮助入口。

## Open Questions

无阻塞问题。用户已确认首版只接 OpenAI Chat Completions 兼容协议；其余协议和工具能力在后续 change 中单独提出。
