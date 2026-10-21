/** 前端 DTO 由网关适配后端契约；reasoning / tool-call 暂仅用于 mock。 */

export type ThreadId = string;
export type PartId = number;

export type PartKind = "text" | "reasoning" | "tool-call";

export interface ChatMetadata {
  providerName: string;
  protocolName: string;
  requestedModel: string;
  resolvedModel?: string;
  requestId?: string;
  responseId?: string;
}

/** provider 未上报的计数保持 undefined。 */
export interface ChatUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export type FinishReason =
  | "stop"
  | "tool-calls"
  | "output-limit"
  | "content-filtered"
  | "other";

export interface ToolCallContent {
  callId: string;
  name: string;
  /** 序列化后的参数 JSON 文本。 */
  inputText: string;
  /** 执行结果；失败时由 errorText 承载。 */
  output?: unknown;
  errorText?: string;
}

export type OutputContent =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool-call"; call: ToolCallContent };

export interface AssistantTurn {
  parts: OutputContent[];
}

export interface ChatResponse {
  assistant: AssistantTurn;
  finish: { reason: FinishReason; providerReason?: string };
  usage: ChatUsage;
  metadata: ChatMetadata;
}

/** `aborted` 为客户端本地中止，`unknown` 为未识别的后端错误。 */
export interface ChatError {
  kind:
    | "invalid-request"
    | "unsupported"
    | "authentication"
    | "rate-limited"
    | "unavailable"
    | "transport"
    | "timeout"
    | "invalid-response"
    | "truncated"
    | "replay-mismatch"
    | "aborted"
    | "unknown";
  message: string;
}

/** 流以 completed / failed 收尾后 EOF。 */
export type ChatEvent =
  | { type: "started"; metadata: ChatMetadata }
  | { type: "part-started"; partId: PartId; kind: PartKind; name?: string } // name 为工具名。
  | { type: "delta"; partId: PartId; text: string } // 工具部分承载参数 JSON 片段。
  | { type: "part-completed"; partId: PartId; content: OutputContent }
  | { type: "usage"; usage: ChatUsage }
  | { type: "completed"; response: ChatResponse }
  | { type: "failed"; error: ChatError };

/** 运行态输入引用由 adapter 读取；消息快照只保存附件名称和媒体类型。 */
export interface ChatInputAttachment {
  name: string;
  mediaType: string;
  id?: string;
  size?: number;
  file?: File;
  url?: string;
}

export interface ChatRequestMessage {
  role: "user";
  text: string;
  attachments?: ChatInputAttachment[];
}

export interface ChatRequest {
  messages: ChatRequestMessage[];
  /** Text context preceding the current user input, including historical retries. */
  history?: { role: "user" | "assistant"; text: string }[];
  instructions?: string;
  model?: string;
}
