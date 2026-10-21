## ADDED Requirements

### Requirement: Dynamic asynchronous streaming boundary

Model SHALL 绑定 Provider、实际模型名和 `Arc<dyn Protocol>`，通过 stream 返回统一 EventStream。Protocol 与 RequestAuth 的异步声明及实现 SHALL 使用 async_trait，保持 Send + Sync；流 SHALL 拥有响应和解析状态。core SHALL 不暴露 HTTP 实现类型。

#### Scenario: Stream through a runtime-selected model
- **WHEN** 应用从配置组装结果中选出 Model 并调用 stream
- **THEN** 无需匹配具体协议类型即可消费统一事件，响应内容随接收进度产出
- **AND** 返回的流不借用临时请求或 Model

### Requirement: Chat Completions text request

首版接入 SHALL 向保留 base_url 路径前缀的 chat/completions 端点发送单次流式 POST，携带实际模型名及按序完整文本历史。仅支持文本流子集，明确指定但尚不支持的输入或选项 SHALL 返回 Unsupported，不静默丢弃；统一接口保留 generate，当前协议调用该方法 SHALL 返回 Unsupported 且不发请求。非流式接入、工具、图像、推理和原生回放不属于本次交付验收。

#### Scenario: Preserve endpoint prefix and history
- **WHEN** base_url 为 https://example.test/proxy/v1 或其带末尾斜线形式，模型名为 model-a，请求含前一轮 user/assistant 与新 user
- **THEN** 发送到 /proxy/v1/chat/completions，model 为 model-a、stream 为 true，messages 顺序和内容完整

### Requirement: Incremental framing and successful termination

协议 SHALL 使用现成 SSE decoder 处理字节分块，并将文本转换为 Started、内容事件及唯一 Completed。不同 HTTP chunk 边界 SHALL 不改变文本内容。仅当收到 `[DONE]` 且存在合法的单个 completion 结束状态时 SHALL 成功收尾；完成响应包含完整 assistant、FinishReason、已知 usage 和 metadata。未知 usage SHALL 为 None，Usage 事件 SHALL 为替换式累计快照。成功终止后 SHALL 立即结束统一流，不等待 HTTP body 的物理 EOF，不再读取或处理尾随字节。

#### Scenario: Deliver Unicode text before response completion
- **WHEN** 本地服务把中文 UTF-8 字节和 SSE 事件拆到多个 chunk，先发送文本事件并暂不发送终止事件
- **THEN** 调用方在终止事件发送前收到正确文本增量，无乱码、丢字或重复
- **AND** 后续有效结束事件和 [DONE] 到达后仅收到一个 Completed，其完整文本与增量内容一致

#### Scenario: Finish without waiting for the HTTP connection to close
- **WHEN** 服务发送有效结束状态和 [DONE] 后仍保持 HTTP body 打开
- **THEN** 调用方收到 Completed 后下一次读取即结束，不等待服务关闭连接

#### Scenario: Complete an output-limited text response
- **WHEN** 服务报告合法的长度上限停止原因并发送 [DONE]
- **THEN** 返回成功的 Completed，FinishReason 为 OutputLimit，保留完整已生成文本

#### Scenario: Record only reported usage
- **WHEN** 流报告累计 usage 或没有报告 usage
- **THEN** 已报告计数被保留且不重复累加，未报告字段保持 None

### Requirement: Failure is not completion

初始失败 SHALL 从 stream().await 返回，流内失败 SHALL 返回一次 Err 后结束，不再产出 Completed。缺少 [DONE] 的响应 EOF SHALL 为 Truncated；损坏 JSON、非法完成状态或无法解释的响应 SHALL 为 InvalidResponse。单次生成 SHALL 不自动重试、重连或跟随重定向。

#### Scenario: Response ends without terminal marker
- **WHEN** 服务发送部分文本后关闭响应而未发送 [DONE]
- **THEN** 返回 Truncated，保留可用部分诊断，不发出 Completed，不重发请求

#### Scenario: Invalid payload or incomplete completion state
- **WHEN** data 中出现损坏 JSON，或者 [DONE] 到达时缺少必要结束状态
- **THEN** 返回 InvalidResponse 并结束流，不把已显示文本当作完整结果

#### Scenario: HTTP error and redirect are not replayed
- **WHEN** 服务返回非成功 HTTP 状态或重定向
- **THEN** 返回可诊断错误，不自动跟随或再次发送生成请求

### Requirement: Classified errors built with thiserror

每个参与 crate SHALL 使用 thiserror 定义并导出自己的统一 Error，提供 Display、Debug 和标准 Error；core Error SHALL 保留 ErrorKind、可用请求诊断、partial 和 source。协议边界 SHALL 将接入错误转换为 core 分类并保留来源；CLI SHALL 使用安全错误描述，不输出原始凭据。

cognacta_provider::Error SHALL 明确定义 ConfigRead、ConfigParse、InvalidConfig、UnsupportedProtocol、Environment、InvalidHeader、Authentication、Transport、Http、InvalidResponse、Truncated 和 Domain 分类，字段与 source 遵循 design 中的完整定义。配置、组装、RequestAuth 与 HttpAccess 的可失败 API SHALL 返回本 crate Error；实现 core Protocol 的方法及流中错误 SHALL 返回 core Error，不以类型别名替代 provider 自己的 Error，不提供无上下文的双向自动转换。

#### Scenario: Preserve error classification and source
- **WHEN** HTTP 鉴权失败、限流、服务不可用、网络失败、超时或 JSON 解码失败经过协议边界
- **THEN** 调用方能读取相应分类，并在存在底层错误时通过标准 source 链访问来源
- **AND** 错误不会被简化成无法分类的裸字符串

#### Scenario: Match provider errors outside the crate

- **WHEN** 外部调用方收到配置读取、解析或未知协议错误
- **THEN** 能从 cognacta_provider 根导入 Error 并匹配具体变体，在有底层错误时读取标准 source
- **AND** 错误类型是 cognacta_provider::Error，而非 core Error 的别名

#### Scenario: Convert custom authentication failure at Protocol boundary

- **WHEN** 外部 RequestAuth 返回带来源的 Error::Authentication，随后经 Protocol 调用出口返回
- **THEN** Model 调用方收到 core ErrorKind::Authentication，source 链保留 provider Error 和原始鉴权错误，且没有发送 HTTP 请求
