import type { AiChatMessage } from "@/components/arc/blocks/ai-chat/chat-data";
import type { Message, MessageContext } from "./types";

export function contextToAttachments(context: MessageContext[] | undefined) {
  return context?.map((item) => ({
    id: item.id,
    name: item.name,
    content: item.content,
    url: item.url,
    size: 0,
    type:
      item.kind === "knowledge"
        ? "application/x-cognacta-knowledge"
        : undefined,
  }));
}

export function toChatMessages(
  messages: Message[],
  modelId: string,
): AiChatMessage[] {
  return messages.map((message) => ({
    id: String(message.id),
    role: message.role,
    content: message.content,
    model: message.role === "assistant" ? (message.model ?? modelId) : undefined,
    attachments:
      message.role === "user"
        ? contextToAttachments(message.context)
        : undefined,
    reasoning: message.reasoning,
    thoughtFor: message.thoughtFor,
    tools: message.tools,
    sources: message.sources,
    status: message.status ?? "done",
    error: message.error,
  }));
}

export function toStoredMessages(
  messages: AiChatMessage[],
  fallbackModel: string,
): Message[] {
  return messages.map((message, index) => ({
    id: index + 1,
    role: message.role,
    content: message.content,
    context:
      message.role === "user" && message.attachments?.length
        ? message.attachments.map((item) => ({
            id: item.id,
            name: item.name,
            content: item.content,
            url: item.url,
            kind: item.type === "application/x-cognacta-knowledge"
              ? "knowledge"
              : "file",
          }))
        : undefined,
    status:
      message.role === "assistant"
        ? message.status === "stopped"
          ? "stopped"
          : message.status === "error"
            ? "error"
            : "done"
        : undefined,
    error: message.role === "assistant" ? message.error : undefined,
    model:
      message.role === "assistant"
        ? (message.model ?? fallbackModel)
        : undefined,
    reasoning: message.role === "assistant" ? message.reasoning : undefined,
    thoughtFor: message.role === "assistant" ? message.thoughtFor : undefined,
    tools: message.role === "assistant" ? message.tools : undefined,
    sources: message.role === "assistant" ? message.sources : undefined,
  }));
}

