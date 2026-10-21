# 统一 LLM 调用接口规范

状态：设计阶段。本文整理已经确定的调用语义、接口和验收要求；本次只更新本文，不写实现、不安装依赖。

## Problem Statement

系统需要通过运行时配置选择 Provider、模型和 API 协议，并对上层提供统一的对话生成语义。上层应能处理流式输出、工具调用、推理和图像输入，而不必理解各家的 HTTP 请求、鉴权和事件格式。

Provider 和模型的名称已经足以完成配置查找。额外生成实体 ID、将协议类型传播到业务泛型参数、逐个入口维护协议枚举分支，都会增加当前调用方式的复杂度。

## Solution

Provider 表达一个具名接入地址；Model 绑定 Provider、实际模型名称和一个动态协议对象。应用加载配置时解析协议和鉴权方式，构造并复用这些对象；调用时按 Provider 名称和模型名称查找普通 Model。

Protocol 与 RequestAuth 使用 async_trait 支持异步动态分派。协议统一请求和结果；HTTP 接入层在发送前合并自定义头并执行鉴权。调用方通过 generate 获取完整响应，通过 stream 获取最终以 Completed 收尾的统一事件流。

## User Stories

1. 作为配置维护者，我希望用唯一的 Provider 名称选择接入地址，以便无需维护额外生成的 ID。
2. 作为配置维护者，我希望直接使用上游模型名称，以便配置选择与实际请求目标一致。
3. 作为配置维护者，我希望同一地址的不同账户可以配置成不同 Provider，以便隔离各自的鉴权。
4. 作为配置维护者，我希望给每个模型明确选择协议，以便同一 Provider 下可以使用不同 API 协议。
5. 作为应用开发者，我希望持有统一的 Model 类型，以便运行时切换模型而无需传播泛型参数。
6. 作为应用开发者，我希望通过 generate 获得完整结果，以便处理不需要实时展示的调用。
7. 作为界面开发者，我希望通过 stream 接收增量并获得最终响应，以便展示进度和保存完整历史。
8. 作为应用开发者，我希望应用指令与完整对话历史分别传入，以便每次请求的上下文明确。
9. 作为应用开发者，我希望显式参数被支持或明确拒绝，以便避免静默忽略和偷偷换模型。
10. 作为应用开发者，我希望输入文本和图像，以便支持多模态对话。
11. 作为应用开发者，我希望读取可展示的推理并保留必要原生信息，以便后续调用能正确回放。
12. 作为工具执行模块开发者，我希望获得完整的工具名称、调用 ID 和参数，以便校验后执行工具。
13. 作为工具执行模块开发者，我希望回填成功或失败的工具结果，以便模型能够继续处理。
14. 作为应用开发者，我希望一个模型调用只代表一次 Generation，以便自行控制工具循环。
15. 作为接入维护者，我希望配置额外请求头，以便支持租户和网关要求。
16. 作为接入维护者，我希望通过鉴权对象注入 Bearer 或 API key，以便凭据逻辑与模型协议分开。
17. 作为接入维护者，我希望鉴权入口能够异步访问完整请求，以便支持刷新 token 和请求签名。
18. 作为接入维护者，我希望缺少凭据或鉴权失败时停止发送，以便不会误发请求。
19. 作为应用开发者，我希望区分模型停止原因、网络失败和协议错误，以便决定如何处理结果。
20. 作为应用开发者，我希望未完成的输出可以用于展示和诊断，以便失败时仍有进度信息。
21. 作为应用开发者，我希望中途断流被识别为错误，以便不会把部分内容误存为完整历史。
22. 作为应用开发者，我希望丢弃 future 或流可以结束本地等待，以便响应取消操作。
23. 作为运维人员，我希望记录实际 Provider、协议、模型和服务端请求信息，以便定位调用。
24. 作为用量统计开发者，我希望区分未报告的 token 数与零，以便不重复累计或制造统计值。
25. 作为测试维护者，我希望用本地模拟 HTTP 服务验收配置到流式调用的完整行为，以便不依赖真实密钥和付费接口。

## Implementation Decisions

### 名称与模型绑定

- Provider 的 name 是配置内全局唯一的接入名称，例如 company-gateway；base_url 是包含路径前缀的接入地址。相同地址可以因账户不同而配置成不同名称。
- Model 的 name 是原样交给所选上游协议的模型名称，不是额外生成的 ID，也不是任意展示昵称。同一个模型名称可以存在于不同 Provider。
- 当前查找键为 Provider 名称与模型名称的二元组；每个 Provider 下同名模型只配置一次，并绑定一个具体协议。配置键直接使用这些名称，不再重复声明实体 ID 或模型别名。
- 名称不能为空；配置重复键或重复模型绑定必须报错，不能用后出现的值静默覆盖。模型名和协议名保持原始大小写。
- 改 Provider 名称会改变配置引用和日志中的名称；改 Model 名称会改变上游调用目标。当前没有独立于名称的持久实体身份需求。
- 仅凭相同名称不能证明原生历史可回放；回放还必须校验实际接入范围、模型、协议与格式版本。
- 工具调用 ID、服务端 request_id 和 response_id 继续保留，它们承担跨消息关联和服务端诊断职责，与本地 Provider、Model 的命名不同。

### 动态协议与职责边界

- Model 持有 Provider 的共享引用和动态 Protocol 对象。协议类型不进入 Model 的泛型参数，也不维护运行时模型包装枚举。
- Protocol 是 core 的外部服务边界；公开入口为 generate 和 stream，均接受 Provider、模型名称以及统一请求。
- Protocol 的协议名称通过普通只读方法获取，例如 openai.responses；返回稳定的配置标识，不使用关联常量。
- Protocol、RequestAuth 及其异步实现使用 async_trait，保留 Send 与 Sync 要求，不使用非 Send 模式。宏负责异步方法的 future 装箱，事件流另统一为持有自身状态的动态流。
- Model 的固有调用方法仍使用原生 async，转发到已绑定协议。业务对象、请求、响应和事件使用统一领域类型。
- core 不依赖 reqwest 或暴露 HTTP 类型。协议编解码、分帧、HTTP client、自定义头和鉴权保留在接入层；应用组装层依赖具体协议实现。
- 配置中的协议选择只在组装时匹配具体实现。增加已有协议下的地址或模型只需改配置；增加新协议仍需代码与重新编译。
- 同一 Provider 的模型共享接入元数据、HTTP client、自定义头与鉴权对象，调用期间复用，不为每次请求重建。

### 鉴权注入与发送顺序

- RequestAuth 接收可变的完整 reqwest 请求并返回异步结果，允许修改请求头，也能读取签名需要的方法、URL 和 body。
- HTTP 接入对象持有 client、额外 HeaderMap 和可选的共享鉴权对象。无鉴权时可省略该对象，不要求单独实现空鉴权类型。
- 首批配置形态为无鉴权，以及从环境变量读取凭据后写入指定头；后者由头名称、前缀和环境变量名称组成，可表达 Bearer 和 API key。
- 环境变量缺失、非法头名称或非法头值在组装时返回错误。敏感头标记为敏感值；不输出凭据或将其写入元数据。
- 鉴权对象提供只读的 replay_scope 来源标记，供协议创建和校验原生回放。静态头鉴权按实际加载的头名称与凭据建立不含原始凭据的内部来源指纹；不将环境变量名称当作账户身份，不记录指纹到日志。更换静态凭据会使旧回放范围失效，不能证明兼容时保守拒绝。
- 动态鉴权的来源标记应绑定确认过的账户、租户及必要权限；同一个鉴权对象不得在不改变来源范围的情况下切换账户。仅刷新同一账户的短期 token 可以保留该范围，无法确认时重新组装。Protocol 将这一来源与 Provider 名称、实际地址、模型及协议组合校验。
- 发送顺序固定为：协议生成最终 URL、body 和默认头，合并 Provider 自定义头，执行鉴权，发送请求。参与签名的头需在签名前完整确定。
- 鉴权可以覆盖自己负责的认证头；普通头覆盖不得破坏协议要求的内容类型等必要条件。鉴权失败不发送，签名后不再修改参与签名的内容。
- 需要 body 签名时提供最终可读取的请求字节。流式响应不意味着请求 body 必须使用流式上传。
- HTTP 层保留非成功状态的响应体，由具体协议解释服务端错误。生成请求不自动重试或自动跟随重定向，流中断后不自动重连重发。

### 调用语义与错误

- 一次 Generation 是一次模型请求。工具执行和下一次请求由上层控制，协议不自动执行工具或运行工具循环。
- generate 与 stream 使用相同的请求、历史、响应和错误契约；独立调用不保证产生相同文本。不能用完整响应切片冒充实时流。
- 统一内容支持文本、推理、图像输入、工具调用与工具结果；未知参数或不支持的能力明确报错。
- 正常流以唯一 Completed 返回最终响应后结束；只依据 EOF 不能判定成功。错误只返回一次，之后结束流，不能再返回 Completed。
- Completed 中的完整 assistant 才是历史回填单位；delta 和错误中的 partial 用于展示或诊断。
- 模型停止原因与调用错误分别表达；usage 仅保留服务端报告的值，累计快照替换旧值，未知与零分开。
- 各 crate 使用统一对外 Error；接入错误在协议边界转换为 core 的分类并保留源错误。具体接口和内容约束见后文。

## Testing Decisions

用户已确认主要验收边界为“配置选择 → Model.stream → 本地模拟 HTTP 服务”。通过真实配置组装和公开调用验证服务端收到的请求及调用方得到的事件，不断言内部函数调用次数、私有结构或宏展开细节。

1. 验证两个 Provider、同一 Provider 下不同协议模型的名称查找、地址前缀、上游模型名和认证归属；不存在的名称、未知协议、空名和重复配置明确失败。
2. 验证自定义头合并、Bearer/API key 注入，以及鉴权对最终方法、URL 和 body 的访问。用可注入的测试鉴权对象验证失败时本地服务未收到请求。
3. 验证非法头和缺失环境变量不会进入发送步骤；测试使用临时专用配置和测试凭据，不需要真实服务密钥。
4. 用明确标注来源的本地夹具拆分字节、UTF-8、事件边界和工具参数，验证统一 part 顺序、交错工具调用、Usage 累计快照和唯一 Completed。
5. 验证非成功 HTTP 响应、服务端错误事件、损坏分帧和缺少终止事件得到正确错误分类；缺少原生终止信号时不产生成功响应，不自动重发。
6. 验证工具参数未完成时只保留 partial，不能执行工具或回填历史；完整工具结果按调用 ID 匹配。
7. 验证取消后不继续本地读取或重发；不把该检查解释为服务端计算一定已停止。
8. 验证带签名或隐藏信息的完整 assistant 能按正确来源回放；更换地址、账户、模型或协议以及仅保留同名配置时，不绕过来源校验。
9. 在相同公开边界补充非流式生成、显式选项拒绝、图像输入和工具结果图像的契约用例。

core 中与网络无关的调用逻辑可通过同一个 Protocol trait 注入小型 fake 做单元测试，不增加额外测试专用抽象。现有代码只有基础函数单元测试，尚无可复用的 LLM 测试套件；本地 HTTP 验收测试后续单独组织为接入集成测试，避免混入无外部连接的单元测试目标。

本次只记录测试决策，不创建或运行上述测试。文档变更检查契约一致性、配置示例、空白和文件结尾。

## Out of Scope

- 本次不写 Rust 实现、不新增 crate、不修改依赖清单、不调用真实模型。
- embedding、语音、视频、自动工具循环和服务端会话管理。
- 额外生成的 Provider/Model ID、独立展示名、模型别名和数据库实体生命周期。
- 同一 Provider 下同名模型同时绑定多个协议；当前每个模型只有一个协议绑定。
- 动态插件加载、通用中间件链、自动重试/重连和自动跨协议历史迁移。
- 本次不实现 OAuth 刷新、AWS 签名算法或具体 SSE/NDJSON/EventStream 解码器；仅保留所需注入边界。

## Further Notes

名称可以承担当前配置查找身份，但不能承担所有回放兼容性判断。若以后出现独立改展示名、稳定数据库引用或同一上游模型多协议并存的实际需求，再增加相应字段或扩展绑定键；当前不预置这些结构。

术语仍采用 Provider、Model、Protocol、Generation、Message、AssistantMessage、NativeReplay、FinishReason 和 Completed。本规范将 Provider 和 Model 的标识字段明确命名为 name；不改动其他规范或领域术语文件。

[async-trait 文档](https://docs.rs/async-trait/latest/async_trait/)说明宏在 trait 和实现两端使用，并将异步方法转换为可动态分派的装箱 future。本方案采用这一能力；HTTP、分帧和统一生成事件仍是不同职责。

## 接口契约

以下为已讨论方案的接口定义和调用示范，不是可直接运行的实现。保留具体类型形状，便于后续实现对照；构造校验、getter、错误转换及协议编解码在实现阶段完成。

### Provider、Model 与 Protocol

```rust
use async_trait::async_trait;
use futures_core::Stream;
use std::{pin::Pin, sync::Arc};

pub struct Provider {
    name: String,
    base_url: String,
}

pub struct Model {
    provider: Arc<Provider>,
    name: String,
    protocol: Arc<dyn Protocol>,
}

pub type EventStream = Pin<Box<
    dyn Stream<Item = Result<GenerationEvent, Error>> + Send + 'static,
>>;

#[async_trait]
pub trait Protocol: Send + Sync {
    fn name(&self) -> &'static str;

    async fn generate(
        &self,
        provider: &Provider,
        model_name: &str,
        request: GenerationRequest,
    ) -> Result<GenerationResponse, Error>;

    async fn stream(
        &self,
        provider: &Provider,
        model_name: &str,
        request: GenerationRequest,
    ) -> Result<EventStream, Error>;
}
```

所有实现 Protocol 的异步 impl 同样使用 #[async_trait]；生成的 future 保持 Send。Model 的 generate 和 stream 是固有 async 方法，分别转发到 protocol.generate 和 protocol.stream，不要求调用方知道具体协议类型。

调用 future 可以借用 Model；返回的 EventStream 必须拥有响应和解析状态，不借用 Model 或临时请求。流的装箱不意味着每个事件都单独装箱。Protocol.name 返回稳定的 API 协议名；SSE、NDJSON、EventStream 是实现内部的分帧方式。

### HTTP 接入与鉴权接口

以下类型属于 reqwest 接入层；这里的 Error 是该接入 crate 的统一错误，转换为 core 错误时保留类别和来源。

```rust
use reqwest::{
    header::{HeaderMap, HeaderName, HeaderValue},
    Client, Request, Response,
};

#[async_trait]
pub trait RequestAuth: Send + Sync {
    fn replay_scope(&self) -> &str;

    async fn apply(&self, request: &mut Request) -> Result<(), Error>;
}

pub struct HeaderAuth {
    name: HeaderName,
    value: HeaderValue,
    replay_scope: String,
}

pub struct HttpAccess {
    client: Client,
    headers: HeaderMap,
    auth: Option<Arc<dyn RequestAuth>>,
}
```

| 接口 | 契约 |
| --- | --- |
| HeaderAuth::new(name, value) | 接受已验证的头名称和值，标记敏感值并建立内部回放来源指纹 |
| RequestAuth::replay_scope() | 返回该鉴权对象的只读来源标记，不含原始凭据 |
| RequestAuth::apply(request).await | 对最终请求应用认证信息；失败阻止发送；允许异步刷新凭据 |
| HttpAccess::new(client, headers, auth) | 组合一个 Provider 的 HTTP 接入配置 |
| HttpAccess::replay_scope() | 返回组合鉴权来源和自定义头配置的内部来源指纹；没有鉴权时仍包含自定义头配置，不暴露原始头值 |
| HttpAccess::send(request).await | 合并头、执行鉴权、调用 client.execute，返回 Result<Response, Error> |

HeaderAuth 的 apply 在目标头上替换认证值。具体协议构造时注入 Arc<HttpAccess>，通过共享 send 入口发送普通和流式请求，并读取 replay_scope，结合 Provider 名称和实际地址构建 ReplayOrigin.provider_scope；不能只把 Provider 名称复制为 scope。自定义头可能改变租户或路由，修改后也须重新校验来源。core 的 Provider 不持有 HttpAccess 或 reqwest 类型。

### 请求和消息

```rust
pub struct GenerationRequest {
    instructions: Option<String>,
    messages: Vec<Message>,
    tools: Vec<ToolDefinition>,
    tool_choice: ToolChoice,
    options: GenerationOptions,
}

pub enum Message {
    User(Vec<InputPart>),
    Assistant(AssistantMessage),
    ToolResult(ToolResult),
}

pub enum InputPart {
    Text(String),
    Image(ImageInput),
}

pub enum ImageInput {
    Url(String),
    Bytes { media_type: String, data: Vec<u8> },
}

pub struct GenerationOptions {
    max_output_tokens: Option<u32>,
    temperature: Option<f32>,
    reasoning: Option<Reasoning>,
}

pub enum Reasoning {
    Off,
    Effort(ReasoningEffort),
    BudgetTokens(u32),
}

pub enum ReasoningEffort { Low, Medium, High }

pub struct ToolDefinition {
    name: String,
    description: String,
    parameters: serde_json::Value,
}

pub enum ToolChoice {
    Auto,
    None,
    Required,
    Named(String),
}

pub struct ToolResult {
    call_id: String,
    outcome: ToolOutcome,
    content: Vec<ToolResultPart>,
}

pub enum ToolOutcome { Success, Error }

pub enum ToolResultPart {
    Text(String),
    Json(serde_json::Value),
    Image(ImageInput),
}
```

请求只包含生成内容和选项，目标模型与协议已经由 `Model` 绑定。`instructions` 是本次调用的应用指令，与历史消息分开。`messages` 按时间顺序提供完整上下文；接口不依赖服务端会话 ID 来隐式补全历史。

未设置的 option 使用该模型的默认行为。显式设置的参数必须被支持，不能静默忽略、裁剪或换模型。输出 token 预算不等于可见字符长度；推理 effort 是模型内的相对档位，不保证跨模型具有相同计算量。数字必须有效，token 预算大于零；temperature 范围按模型校验。

工具 parameters 是描述参数对象的 JSON Schema。工具名称在请求内唯一；Named 必须引用已声明工具，Required 必须有可用工具；没有工具时只能用 Auto 或 None。图像不包含文件路径；读取文件由调用方完成，URL/bytes 的支持情况由协议实现结合目标模型校验。工具结果含图像也是独立的支持条件，不能由用户消息支持图像推断。

### 完整响应和可回填历史

```rust
pub struct GenerationResponse {
    assistant: AssistantMessage,
    finish: Finish,
    usage: Usage,
    metadata: GenerationMetadata,
}

pub struct AssistantMessage {
    parts: Vec<OutputPart>,
    replay: Option<NativeReplay>,
}

pub enum OutputPart {
    Text(String),
    Reasoning { text: Option<String> },
    ToolCall(ToolCall),
    Opaque { kind: String },
}

pub struct ToolCall {
    id: String,
    name: String,
    arguments: serde_json::Value,
}

pub struct NativeReplay {
    origin: ReplayOrigin,
    payload: Vec<u8>,
}

pub struct ReplayOrigin {
    provider_scope: String,
    model_name: String,
    protocol_name: String,
    format: String,
}

pub struct Finish {
    reason: FinishReason,
    provider_reason: Option<String>,
}

pub enum FinishReason {
    Stop,
    ToolCalls,
    OutputLimit,
    ContentFiltered,
    Other,
}

pub struct Usage {
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
    total_tokens: Option<u64>,
    reasoning_tokens: Option<u64>,
    cache_read_tokens: Option<u64>,
    cache_write_tokens: Option<u64>,
}

pub struct GenerationMetadata {
    provider_name: String,
    protocol_name: String,
    requested_model: String,
    resolved_model: Option<String>,
    request_id: Option<String>,
    response_id: Option<String>,
}
```

parts 按最终内容顺序排列，可以同时包含文本、推理和多个工具调用。Reasoning 只表达接口实际公开的推理内容；`text: None` 表示没有可展示文本。Opaque 表达没有统一展示形态、但必须保留的内容。

`AssistantMessage` 是不可变的完整历史单位。原生签名、隐藏推理及相关原生块由协议实现放入 replay，与 parts 原子保存。调用方回填完整 assistant，不能从显示文本或 delta 重建它。重新编辑内容必须构造新 assistant，不沿用旧 replay。

仅在存在不能从规范内容重建的回放信息时附带 replay。其 payload 由对应协议实现创建和解释，origin 区分接入 scope、模型、协议及回放格式版本。接入 scope 必须区分实际地址、鉴权账户及必要的权限范围，不能只比较 Provider 名称；不保存原始密钥。无法确认来源兼容时保守返回 ReplayMismatch。持久化时保存完整 assistant 和 replay。来源不匹配或上下文绑定校验失败，返回 `ReplayMismatch`；同一地址、同一模型切换协议也必须检查。含不可重建的 reasoning/opaque 却缺 replay，返回 `Unsupported`。不会自动删除签名或降级为普通文本。普通文本 assistant 和规范工具调用可以不带 replay，按其规范内容跨 provider/协议校验和编码。

FinishReason 描述模型为何停止，Completed 描述调用是否正常收尾。OutputLimit、ContentFiltered 可以是完整响应；Other 保留原生原因。usage 只记录 provider 报告的值，未知为 None；明示零才是 Some(0)。细分 token 数量可能是总量的子集，不能再加到总量上。

metadata 的 provider_name、protocol_name 和 requested_model 来自模型绑定，Started 时就已确定；resolved_model、request_id、response_id 按实际响应填写。

### 流式事件

```rust
pub type PartId = u32;

pub enum PartKind { Text, Reasoning, ToolCall, Opaque }

pub enum PartDelta {
    Text(String),
    Reasoning(String),
    ToolArguments(String),
}

pub enum GenerationEvent {
    Started(GenerationMetadata),
    PartStarted { part: PartId, kind: PartKind },
    Delta { part: PartId, delta: PartDelta },
    PartCompleted { part: PartId, content: OutputPart },
    Usage(Usage),
    Completed(GenerationResponse),
}
```

正常顺序是 `Started → 内容事件 / Usage → Completed → EOF`。不同 part 可以交错；每个 part 恰好 Start 一次、Complete 一次，delta 只能出现在其间。PartId 是本次调用内的内容序号，从零开始，最终 `assistant.parts[part]` 对应同一个 part；不透出 provider 原始 index。工具 call ID 是历史关联身份，与 PartId 分开。

delta 是追加片段。工具参数途中不保证是合法 JSON；完整 name/id 最迟在 PartCompleted 时提供。协议实现聚合所有工具片段，成功结果中的 arguments 必须是完整 JSON 对象。调用方只在整个 Generation 成功后执行工具，执行前按 schema 再校验参数。

Usage 事件是当前全部已知计数的累计快照，替换上一份，不相加。最终结果的 usage 和 metadata 为准，Started 中的字段可以尚未报告。增量展示只用于进度，完整 assistant 以 Completed 为准。

错误只产出一次 Err，随后 EOF，不再产出 Completed。未收到原生协议要求的终止信号就 EOF，返回 Truncated。终止时工具参数仍残缺，返回 InvalidResponse 并保留 partial，不能制造可执行 ToolCall；即使原生停止原因是输出上限也适用。纯文本触及输出上限且正常收尾则返回成功的 OutputLimit。

### 错误和取消

```rust
pub struct Error {
    kind: ErrorKind,
    message: String,
    request_id: Option<String>,
    retry_after: Option<std::time::Duration>,
    partial: Option<PartialGeneration>,
    source: Option<Box<dyn std::error::Error + Send + Sync>>,
}

pub enum ErrorKind {
    InvalidRequest,
    Unsupported,
    Authentication,
    RateLimited,
    Unavailable,
    Transport,
    Timeout,
    InvalidResponse,
    Truncated,
    ReplayMismatch,
}

pub struct PartialGeneration {
    parts: Vec<PartialPart>,
    usage: Usage,
}

pub enum PartialPart {
    Text { part: PartId, text: String },
    Reasoning { part: PartId, text: String },
    ToolCall {
        part: PartId,
        id: Option<String>,
        name: Option<String>,
        arguments_text: String,
    },
}
```

错误保留分类、可用诊断和源错误，不转换成一个裸字符串。partial 只能展示或诊断，不能直接回填历史或执行工具。首次返回流之前的失败由 `stream().await` 返回，之后的失败由事件流返回；错误分类一致。

取消采用 drop 未完成的 future 或事件流：停止本地等待/读取，不再保证完成事件，不自动重发生成请求。调用方记录“已取消”；drop 后不再要求协议实现返回取消事件，也不保证服务端已撤销计算。

### 构造和只读访问约定

结构体字段均私有，有不变量的对象通过校验构造。请求、消息、响应及其内容支持 Clone，错误不要求 Clone。Provider、Model 通过共享引用复用。

| 接口 | 契约 |
| --- | --- |
| Provider::new(name, base_url) | 校验非空接入名称、绝对 HTTP(S) 地址和路径前缀，返回 Result<Provider, Error> |
| provider.name() / provider.base_url() | 只读访问配置名称和地址 |
| Model::new(provider, name, protocol) | 接受 Arc<Provider>、实际模型名和 Arc<dyn Protocol>，返回 Result<Model, Error>；不发网络请求 |
| model.name() / model.provider() / model.protocol() | 只读访问模型绑定 |
| model.generate(request).await | 返回 Result<GenerationResponse, Error> |
| model.stream(request).await | 返回 Result<EventStream, Error> |
| GenerationRequest::new(messages) | 校验基本输入；默认无 instructions/tools/options，tool_choice 为 Auto |
| with_instructions(text) | 设置应用指令，返回请求 |
| with_options(options) | 校验基本数字约束，返回 Result 请求 |
| with_tools(tools, choice) | 校验名称、schema 和 choice，返回 Result 请求 |
| with_message(message) | 按顺序追加消息，返回 Result 请求 |
| AssistantMessage::text(text) | 构造无 replay 的普通文本历史 |
| assistant.text_content() / assistant.tool_calls() | 读取可见文本和完整工具调用 |
| response.assistant() / response.finish() / response.usage() / response.metadata() | 只读访问最终数据 |
| finish.reason() / call.id() / call.name() / call.arguments() | 读取停止原因和工具调用，禁止原地改写参数 |
| ToolDefinition::new(name, description, parameters) | 校验名称与参数对象 schema |
| ToolResult::new(call_id, outcome, content) | 创建具有关联 ID 的工具结果 |
| GenerationOptions::default() / with_reasoning(reasoning) | 默认选项全为 None，设置明确的推理要求 |

配置组装阶段对名称与模型绑定做集合范围的唯一性校验，单个构造函数不能独自判断全局是否重名。

请求的跨消息关系由调用入口校验：call ID 在给定历史内唯一，结果必须引用先前尚未解决的 call；每个 call 恰好一个结果，失败也通过 Error outcome 回填。同一个 assistant 发出的全部工具调用均返回结果后才能开始下一次生成。原生协议缺 call ID 时，由协议实现生成稳定统一 ID 并保留必要映射，不补造缺失结果或修复历史。

## 运行时配置与调用示范

### 配置中的名称和鉴权

Provider 使用配置键作为 name，模型也直接使用配置键作为上游 name。以下域名和模型名均为示意。

```json
{
  "providers": {
    "company-gateway": {
      "base_url": "https://llm.example.test/v1/",
      "headers": {
        "x-tenant-id": "team-a"
      },
      "auth": {
        "type": "header_env",
        "name": "authorization",
        "prefix": "Bearer ",
        "env": "LLM_API_KEY"
      },
      "models": {
        "model-a": { "protocol": "openai.chat-completions" },
        "model-b": { "protocol": "openai.responses" }
      }
    },
    "partner-gateway": {
      "base_url": "https://partner.example.test/v1/",
      "headers": {},
      "auth": {
        "type": "header_env",
        "name": "x-api-key",
        "prefix": "",
        "env": "PARTNER_API_KEY"
      },
      "models": {
        "model-a": { "protocol": "openai.chat-completions" }
      }
    }
  }
}
```

选择 (company-gateway, model-a) 与 (partner-gateway, model-a) 会得到不同接入下的模型，发给上游的模型名都为 model-a。没有独立的 id、alias 或 display_name。无鉴权使用 auth.type 为 none 的配置；未知协议或鉴权类型在解析/组装时拒绝。

### 配置加载和组装契约

应用的 build_models 接口接收已解析配置和可复用 reqwest client，返回按 (provider_name, model_name) 索引的 Model 集合；这是待实现的组装入口，不是新的领域 trait。Config 的解析必须在收集为映射之前检测并拒绝重复键，不能先覆盖旧值再指望组装阶段发现重复。

1. 解析阶段拒绝重复配置键；组装阶段检查非空名称、重复绑定、地址、协议和鉴权配置。协议从已编译的实现中选择，不猜测。
2. 每个 Provider 创建一次共享元数据对象，保留配置的 base URL 路径前缀。
3. 将额外请求头解析成 HeaderMap。解析鉴权头及其环境变量；缺失或非法值返回错误，敏感值不进入日志。
4. 将该 Provider 的 client、自定义头与可选 Arc<dyn RequestAuth> 组合成一个共享 HttpAccess。
5. 对每个实际模型名称，根据配置构造 Arc<dyn Protocol>，注入该 Provider 的 HttpAccess；例如 OpenAiChatCompletions 或 OpenAiResponses。
6. 构造 Model，绑定 Provider、模型名称和协议对象，放入结果集合。组装阶段不发模型请求。
7. 调用时从集合取出 Model，并复用已加载对象；配置改变时重新组装对应绑定，避免原地混用不同接入身份。

一次流式调用经过如下边界：

```text
配置中的 Provider 名称 + 模型名称
→ Model.stream
→ dyn Protocol.stream：验证请求、生成最终 HTTP 请求
→ HttpAccess.send：自定义头 → dyn RequestAuth.apply → reqwest
→ 协议解释 HTTP 响应、分帧并解码
→ EventStream：Started → 内容 / Usage → Completed → EOF
```

### 从运行时选择到流式消费

以下调用示范沿用待实现的 Config、build_models 和校验构造约定。Error::invalid_request 与 Error::truncated 表示对应分类的错误构造；各 crate 的来源转换仍须保留原始错误。

```rust
use futures_util::StreamExt;
use std::io::Write;

// Config 的 Deserialize 契约拒绝重复键；client 已禁用自动重试和重定向。
let config: Config = serde_json::from_str(config_json)?;
let models = build_models(config, client)?;

// 这两个值来自运行时配置或用户选择。
let key = (selected_provider_name, selected_model_name);
let model = models.get(&key)
    .ok_or_else(|| Error::invalid_request("配置中不存在指定模型"))?;

let request = GenerationRequest::new(vec![
    Message::User(vec![InputPart::Text("用一句话介绍 Rust".into())]),
])?;

let mut events = model.stream(request).await?;
let mut completed = None;

while let Some(event) = events.next().await {
    match event? {
        GenerationEvent::Delta { delta: PartDelta::Text(text), .. } => {
            print!("{text}");
            std::io::stdout().flush()?;
        }
        GenerationEvent::Completed(response) => {
            completed = Some(response);
        }
        _ => {}
    }
}

let response = completed
    .ok_or_else(|| Error::truncated("事件流缺少 Completed"))?;
history.push(Message::Assistant(response.assistant().clone()));
```

错误立即向上传播；没有 Completed 的 EOF 不能保存成成功回复。具体协议必须自行将原生终止缺失映射成 Truncated，调用方的检查是最后一道契约保护。

### 工具调用后的下一次生成

模型调用和工具执行分开。以下示例假设 request 已声明工具，tool_executor 属于上层应用并返回包含 call ID 的 ToolResult。

```rust
let first = model.generate(request.clone()).await?;
let answer = if first.finish().reason() == FinishReason::ToolCalls {
    let mut next = request.with_message(
        Message::Assistant(first.assistant().clone()),
    )?;
    for call in first.assistant().tool_calls() {
        let result = tool_executor.execute(call).await;
        next = next.with_message(Message::ToolResult(result))?;
    }
    model.generate(next).await?
} else {
    first
};
```

工具参数在增量阶段可能只是残缺 JSON，必须等完整 Generation 成功后再校验执行。示例只演示一轮，不隐含自动循环；图像输入和推理选项仍由统一请求表达，不改变动态协议或鉴权的组装方式。
