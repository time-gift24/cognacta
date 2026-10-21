## 1. 领域接口与错误

- [x] 1.1 在现有 core 中落地流式文本所需的 Provider、Model、请求、响应、事件和 Protocol；沿用 dyn Trait + async_trait、私有字段和校验构造，保留 generate 签名但不扩展非流式实现。
- [x] 1.2 用 thiserror 定义 core Error、ErrorKind 及来源/partial 访问，添加最小无网络 UT 验证构造校验、模型转发和错误来源保留。
- [x] 1.3 新增承担实际工作的 cognacta-provider crate，并在 workspace 统一声明所需依赖；核对 Rust 工具链、SSE decoder 最小 features 和 deny 约束，不创建额外空层。
- [x] 1.4 按 design 的完整定义实现并从 cognacta-provider 根导出自身 thiserror Error 和公开 API；明确配置/组装、RequestAuth/HttpAccess、core Protocol 三类出口的错误类型，保留来源并避免双向自动转换。

## 2. TOML 配置与模型组装

- [x] 2.1 实现公开字段的配置 DTO 与 ProvidersConfig::load/from_toml，解析时拒绝未知/重复键和缺失字段，组装时拒绝空列表和重复名称；补充配置 UT。
- [x] 2.2 在接入层实现 TryFrom<&ProviderConfig> for Provider，委托领域构造并保留来源；验证转换不读环境、不发请求及 URL 前缀语义。
- [x] 2.3 实现 none/header_env、公共头与可注入 RequestAuth 的 HttpAccess，提供公开校验构造及 bon builder；提前拒绝非法头、缺失/空凭据和协议头冲突，安全显示错误；由 CLI 的 Client 构造关闭自动重试和重定向，其他调用方遵守相同前置条件。
- [x] 2.4 实现 build_models(config, client)，只识别 openai.chat-completions、共享每个 Provider 的接入对象，并按名称二元组返回已全部校验的 Model 集合；未知协议或选择明确失败。

## 3. Chat Completions 文本流

- [x] 3.1 实现文本请求编码，保留 base_url 路径前缀、实际模型名和有序历史，应用已支持的文本选项；其余能力明确 Unsupported，generate 不发请求并返回 Unsupported。
- [x] 3.2 使用 reqwest 与现成 SSE decoder 逐步产出统一事件，正确处理 UTF-8 分块、文本聚合、finish 和可选 usage；有效 [DONE] 后 Completed 并立即结束流，不等待物理 EOF。
- [x] 3.3 使用接入层 thiserror Error 分类 HTTP/传输/超时/解码/截断失败，在 Protocol 边界转换并保留来源与 partial；任何失败只返回一次且不重发请求。

## 4. Feature 门控交互 CLI

- [x] 4.1 使用 clap 接管现有 CLI，添加默认关闭的 cognacta-test feature 与 chat 子命令；门控接入相关依赖，保留默认版本/帮助行为，要求 config/provider/model 参数。
- [x] 4.2 实现启动加载与固定模型选择、逐行输入、空行跳过、/exit 和输入 EOF 退出；输出文本 delta 后立即 flush，不增加 TUI 或会话持久化。
- [x] 4.3 实现完整成功后一次提交 user/assistant 历史，任何失败安全报错并非零退出、不提交部分轮次；CLI Error 使用 thiserror，通过小型 Protocol fake 验证历史行为。

## 5. 本地 HTTP 与 CLI 集成验收

- [x] 5.1 在接入 crate 的 tests/streaming.rs 验证 TOML → Model.stream → 本地 HTTP：两 Provider 的选择、模型名、URL 前缀、鉴权/公共头、UTF-8 与 SSE 分块、结束标志和已报告 usage；fixture 标注为人工构造。
- [x] 5.2 在同一集成目标验证 HTTP 错误/重定向、坏 JSON、缺失终止信号、有效 [DONE] 后保持 body 打开，以及鉴权失败不发送；断言分类、唯一终止和无自动重发，设置有界超时。
- [x] 5.3 在 CLI 的 tests/chat.rs 通过子进程和本地服务验证两轮历史、输入退出、错误退出和首段实时输出；用握手同步首段与尾段，不用固定 sleep 证明流式，不调用真实服务或测试工具调用。
- [x] 5.4 新增不含真实密钥的 providers.example.toml，并在示例注释中给出 feature 启动命令及单行对话/退出说明，不修改受保护规范文档。
- [x] 5.5 在既有集成目标以外部调用方身份仅导入 crate 根 API，验证配置调用和手动鉴权组装均可达、可匹配 provider Error；验证鉴权失败转换成 core Error 后仍保留完整来源链，不依赖私有模块。

## 6. 验证与收尾

- [x] 6.1 运行无网络 UT：SQLX_OFFLINE=true cargo test --workspace --lib --bins --all-features --locked；另以 --no-default-features 验证 cognacta-cli 的默认参数/帮助和 chat 不可用，确认默认依赖树不拉入 provider 接入。
- [x] 6.2 分别运行本地网络集成目标：SQLX_OFFLINE=true cargo test -p cognacta-provider --test streaming --locked，以及 SQLX_OFFLINE=true cargo test -p cognacta-cli --features cognacta-test --test chat --locked。
- [x] 6.3 按 AGENTS.md 运行 cargo fmt --all -- --check、离线 workspace check/clippy（all-targets/all-features/locked，clippy -D warnings）与 cargo deny check --disable-fetch；同时检查默认 CLI 构建，通过后记录实际验证结果，不将未执行的真实服务测试列为通过。

## 实施验证（2026-10-15）

- `cargo fmt --all -- --check`：通过。
- `SQLX_OFFLINE=true cargo check --workspace --all-targets --all-features --locked`：通过。
- `SQLX_OFFLINE=true cargo clippy --workspace --all-targets --all-features --locked -- -D warnings`：通过。
- `SQLX_OFFLINE=true cargo test --workspace --lib --bins --all-features --locked`：23 项通过，其中 6 项为已有 vendored 测试；无数据库或外部服务调用。
- `SQLX_OFFLINE=true cargo test -p cognacta-provider --test streaming --locked`：10 项本地 HTTP 集成测试通过。
- `SQLX_OFFLINE=true cargo test -p cognacta-cli --features cognacta-test --test chat --locked`：3 项子进程集成测试通过。修正 macOS 测试 socket 继承非阻塞模式后，连续 5 次定向复测通过。
- 默认 feature 的 CLI 单元测试与构建通过；无参数、帮助、版本可用，chat 返回退出码 2；默认 normal 依赖树不包含 cognacta-provider 或 reqwest。
- `cargo deny check --disable-fetch`：advisories、bans、licenses、sources 通过（现有允许的重复版本等警告仍保留）。reqwest 使用 native-tls，满足当前许可证白名单，未修改 deny.toml。
- 实际 CLI 经 providers.example.toml 连接 ChatAnywhere 的 gpt-4.1-nano，完成两轮流式对话，第二轮正确读取第一轮暗号，退出码 0、stderr 为空。两轮首个 stdout 文本延迟约 6.196 秒和 5.994 秒；第一轮分批输出。延迟仅代表此次端到端实测。
- 联调发现网关会在 finish 后追加无 usage 的空 choices 元数据事件，已修复并增加人工构造的回归 fixture；仍要求合法 finish 与 [DONE]，不将空 choices 当作完成信号。
- 真实密钥仅通过运行进程环境注入，没有写入配置、源码或测试。AGENTS.md、CONTEXT.md 和既有设计文档未修改；工具调用与非流式生成不在本次实现范围。
