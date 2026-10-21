## Why

现有统一 LLM 接口仍是设计文档，尚不能通过配置接入模型并验证真实的流式对话路径。需要先交付一个小范围的文本对话入口，同时把错误、配置与对象构造方式落实为项目约定。

## What Changes

- 统一错误使用 `thiserror`，保留错误分类、诊断和源错误；每个 crate 公开自己的 `Error`。
- 明确 `cognacta-provider` 的 crate 根导出、配置加载与模型组装签名、手动鉴权注入路径及具体 Error 定义，调用方不依赖私有模块。
- 配置改用 TOML，明确 `ProvidersConfig`、`ProviderConfig`、`ModelConfig`、`AuthConfig`，不再使用泛指的 `Config`；通过 `Provider::try_from(&provider_config)` 校验构造领域对象。
- 延续 `Model`、`Arc<dyn Protocol>`、`async_trait` 和请求鉴权注入；首版仅接入用户已确认的 `openai.chat-completions`，支持多个接入地址和多个模型。
- 在现有 `cognacta-cli` 使用 clap 定义命令，以默认关闭的 Cargo feature `cognacta-test` 开启 `chat` 子命令，从 TOML 选择 Provider 和模型，逐行交互并实时显示文本增量。
- 只在本轮生成完整成功后提交 user/assistant 历史；配置、鉴权、HTTP、解码和断流失败明确报错，不自动重发。
- 自动验收覆盖“配置选择 → Model.stream → 本地模拟 HTTP 服务”和 CLI 两轮文本会话。本次不实现或测试工具调用、图像、推理、原生回放及非流式生成；保留它们作为后续接口目标。

## Capabilities

### New Capabilities

- `provider-configuration`: TOML 配置、专用配置类型、校验转换、动态模型绑定和鉴权组装。
- `provider-text-streaming`: 统一文本流接口、Chat Completions 接入、终止语义和 `thiserror` 错误边界。
- `provider-chat-cli`: `cognacta-test` feature 下的 clap 交互命令、历史提交和最小端到端验收。

### Modified Capabilities

无。当前 `openspec/specs/` 尚无已发布能力规格。

## Impact

- 后续实施涉及现有 `cognacta-core`、`cognacta-cli`，以及一个承担实际接入工作的 `cognacta-provider` crate；不预建独立配置、鉴权、传输或协议注册框架。
- 所需依赖统一从 workspace 声明：`thiserror`、`clap`、`serde`、`toml`、`async-trait`、`reqwest`、SSE decoder 与流工具；复用已有 Tokio。具体版本在实施时检查工具链和 `deny.toml`。
- core 保持领域类型与边界 trait；TOML、reqwest、鉴权和协议编解码留在接入层，clap 和终端交互留在 CLI。
- 本轮只更新此 OpenSpec change 的提案、设计、规格和任务，并按用户明确授权在 `AGENTS.md` 增加 crate 对外接口设计准则；不新增 Rust 实现或依赖，不修改 `CONTEXT.md` 及既有设计文档。本 change 明确取代旧文档中 JSON、泛指 Config、普通构造示范和本轮全能力验收的相应假设；其余设计继续作为背景。
