# Cognacta LLM 领域术语

系统用统一术语描述对话和模型调用。

## Language

**Provider**：一个具有独立身份和固定接入地址的模型服务配置，可提供多个模型。
_Avoid_: 将 Provider 等同于厂商品牌或协议

**Model**：绑定到某个 Provider 的模型 ID 和具体调用协议；一次调用的目标由该绑定决定。

**Protocol**：模型调用采用的 API 协议，决定请求、响应及流式事件的具体格式，并映射到系统统一语义。
_Avoid_: 将 SSE、NDJSON 等流式分帧方式称为模型调用协议

**Generation**：一次模型调用；工具执行后的下一次模型调用属于新的 Generation。
_Avoid_: 将完整工具循环称为一次 Generation

**Message**：对话历史中的一次用户输入、assistant 输出或工具结果。

**AssistantMessage**：一次 Generation 产生的完整 assistant 历史单位，可包含文本、推理和工具调用。

**Part**：AssistantMessage 内有确定位置的一块内容。

**ToolCall**：模型要求调用方执行的一个具名工具调用，具有关联身份和参数。

**ToolResult**：对应一个 ToolCall 的执行结果，包括执行失败。

**NativeReplay**：与 assistant 内容绑定、下一次调用回放该内容时需要保留的原生信息。

**FinishReason**：模型停止本次输出的原因，区别于调用发生的网络或协议失败。

**Completed**：一次 Generation 已正常收尾并返回完整结果；不表示上层用户任务或工具循环已经结束。
