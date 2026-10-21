## ADDED Requirements

### Requirement: Reachable crate public API

cognacta-provider SHALL 在 crate 根导出 ProvidersConfig、ProviderConfig、ModelConfig、AuthConfig、Error、build_models、RequestAuth、HeaderAuth、HttpAccess 和 OpenAiChatCompletions。配置 DTO 字段 SHALL 公开以支持读取与编程构造；有效领域/接入对象 SHALL 保持校验构造。配置入口 SHALL 为 load(path) 与 from_toml(text)，组装入口 SHALL 为 build_models(ProvidersConfig, reqwest::Client)，返回 `Result<HashMap<(String, String), cognacta_core::Model>, cognacta_provider::Error>`。内部模块、报文类型与分帧实现 SHALL 不成为调用前提。

#### Scenario: Consume configuration through root exports

- **WHEN** 外部调用方仅从 cognacta_provider 根导入配置类型、build_models 和 Error
- **THEN** 可以加载/解析 TOML、取得 ProviderConfig 引用并转换 Provider，组装后选择 Model 调用 stream
- **AND** 不访问私有模块，也不绕过运行对象的校验

#### Scenario: Inject custom authentication through public constructors

- **WHEN** 外部调用方实现 RequestAuth，使用公开 HttpAccess 构造入口与 OpenAiChatCompletions::new 组装 Model
- **THEN** 其鉴权对象在最终请求发送前被调用，失败可通过公开的 Error::Authentication 返回
- **AND** 不要求修改内部协议实现或先构造 TOML；调用方提供的 Client 已关闭自动重试与重定向

### Requirement: Dedicated TOML configuration types

系统 SHALL 使用 `ProvidersConfig`、`ProviderConfig`、`ModelConfig` 和 `AuthConfig` 解析 TOML，不使用泛指的 Config。providers 和 models SHALL 使用数组表，ProviderConfig 与 ModelConfig 各自包含 name。系统 SHALL 拒绝无效 TOML、重复键、未知字段及缺失必填项。

#### Scenario: Load named providers and models
- **WHEN** 加载包含两个 Provider、每个 Provider 各自包含具名模型和协议的合法 TOML
- **THEN** 得到专用配置对象，保留每个名称、地址、头配置、鉴权配置及模型协议
- **AND** 不读取 JSON 配置，也不发起模型请求

#### Scenario: Reject malformed configuration
- **WHEN** 配置存在重复 TOML 键、未知字段、无效语法或缺失 name/base_url/auth/models/protocol 等必填字段之一
- **THEN** 返回可诊断的配置错误且不发网络请求

### Requirement: Validated Provider conversion

接入层 SHALL 提供 `TryFrom<&ProviderConfig> for Provider`，使用接入 crate 的 Error 并委托领域构造校验。转换 SHALL 只构造具名接入元数据，不读取凭据或发送请求；core SHALL 不依赖 TOML、clap 或 reqwest 类型。

#### Scenario: Convert a valid ProviderConfig
- **WHEN** 用包含非空名称、合法 HTTP(S) base_url 及模型配置的 ProviderConfig 调用 Provider::try_from
- **THEN** 返回名称与地址对应的 Provider
- **AND** 调用方仍可使用原配置完成鉴权与模型组装

#### Scenario: Reject invalid Provider metadata
- **WHEN** 名称为空白，或者 base_url 为相对地址、非 HTTP(S)、含 URL 用户凭据、查询或 fragment
- **THEN** 转换返回校验错误，保留领域错误来源，不生成可用 Provider

### Requirement: Unique runtime model bindings

组装 SHALL 校验完整配置后按 `(provider_name, model_name)` 建立 Model 集合。Provider 名称全局唯一，模型名在所属 Provider 内唯一，名称不得为空白，providers/models 不得为空。模型名 SHALL 原样作为上游模型名，仅 `openai.chat-completions` 为首版支持的协议；未知协议 SHALL 明确失败，不静默覆盖或回退。

#### Scenario: Select same model name from different providers
- **WHEN** 两个 Provider 各自声明 model-a，运行时选择其中一个名称与 model-a
- **THEN** 取得该 Provider 的模型绑定，使用其地址和鉴权，上游模型名仍是 model-a

#### Scenario: Reject duplicate or unsupported bindings
- **WHEN** 出现重复 Provider 名、同 Provider 内重复模型名、空列表、空白名称或未知协议
- **THEN** 整体组装失败，不返回部分可用目录，不发模型请求

### Requirement: Injectable headers and authentication

接入层 SHALL 支持显式 none 和 header_env 鉴权。header_env SHALL 读取指定环境变量并将 prefix 与凭据拼接为指定头值；缺失、空凭据或非法头配置 SHALL 在发送前失败。模型 SHALL 复用 Provider 的 HttpAccess，并依次应用协议默认头、自定义头和 `dyn RequestAuth.apply`；鉴权失败 SHALL 阻止发送，apply 后 SHALL 只读验证最终 Content-Type/Accept 的必要条件，冲突则返回 InvalidConfig 且不发送，不修改已签名内容。凭据 SHALL 不出现在 CLI 诊断或配置日志中。

#### Scenario: Send configured authentication and tenant header
- **WHEN** TOML 配置 Authorization Bearer 或 x-api-key 鉴权及租户头，环境变量有有效值
- **THEN** 本地测试服务收到对应头和准确的凭据前缀
- **AND** CLI 不输出该凭据

#### Scenario: Use unauthenticated provider
- **WHEN** auth.type 为 none
- **THEN** 组装不要求任何凭据环境变量，仍应用自定义头

#### Scenario: Reject invalid authentication before sending
- **WHEN** 环境变量缺失或为空、头名称/值非法、必要协议头冲突，或注入的鉴权对象返回错误
- **THEN** 调用返回错误且本地测试服务没有收到生成请求
