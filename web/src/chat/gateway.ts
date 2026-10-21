import type { ChatEvent, ChatRequest } from "./dto.ts";

export interface ChatGateway {
  /** Durable sessions append new turns; existing replies cannot be replaced in place. */
  readonly appendOnly?: boolean;
  /** 流以 completed / failed 之一收尾。 */
  stream(request: ChatRequest): AsyncIterable<ChatEvent>;
  /** 仅用户显式停止时调用；返回或 resolve 表示已停止，拒绝则仍占用任务位，可重试。 */
  abort(): void | Promise<void>;
}
