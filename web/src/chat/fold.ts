import type {
  ChatError,
  ChatEvent,
  ChatMetadata,
  ChatUsage,
  OutputContent,
  ThreadId,
} from "./dto.ts";

export type ToolState = "running" | "done" | "error";

export type PartView = { id?: number; complete?: boolean } & (
  | { kind: "text"; text: string }
  | { kind: "reasoning"; text: string; state: "running" | "done" }
  | {
      kind: "tool";
      callId: string;
      name: string;
      inputText: string;
      output?: unknown;
      state: ToolState;
      errorText?: string;
    }
);

export type MessageState = "streaming" | "done" | "failed" | "stopped";

export type StepPart = Extract<PartView, { kind: "reasoning" | "tool" }>;

export type AssistantSegment =
  | { kind: "steps"; parts: StepPart[] }
  | { kind: "text"; text: string };

/** 连续的 reasoning/tool 合为折叠段；只有可见正文会切断分组。 */
export function segmentAssistantParts(parts: PartView[]): AssistantSegment[] {
  const segments: AssistantSegment[] = [];
  for (const part of parts) {
    if (part.kind === "text") {
      if (part.text.trim()) segments.push({ kind: "text", text: part.text });
      continue;
    }
    const last = segments.at(-1);
    if (last?.kind === "steps") {
      last.parts.push(part);
    } else {
      segments.push({ kind: "steps", parts: [part] });
    }
  }
  return segments;
}

export interface ChatMessageView {
  id: string;
  role: "user" | "assistant";
  parts: PartView[];
  state: MessageState;
  /** 用户消息携带的附件（仅展示用途）。 */
  attachments?: { name: string; mediaType: string }[];
}

export type ThreadStatus = "idle" | "submitted" | "streaming" | "stopping" | "failed";

export interface ThreadViewState {
  threadId: ThreadId;
  status: ThreadStatus;
  messages: ChatMessageView[];
  metadata?: ChatMetadata;
  usage?: ChatUsage;
  error?: ChatError;
}

export function createThreadState(threadId: ThreadId): ThreadViewState {
  return { threadId, status: "idle", messages: [] };
}

function nextMessageId(state: ThreadViewState): string {
  return `m-${state.messages.length + 1}`;
}

export function appendUserMessage(
  state: ThreadViewState,
  text: string,
  attachments?: { name: string; mediaType: string }[],
): ThreadViewState {
  const message: ChatMessageView = {
    id: nextMessageId(state),
    role: "user",
    parts: [{ kind: "text", text }],
    state: "done",
    ...(attachments?.length ? { attachments } : {}),
  };
  return {
    ...state,
    status: "submitted",
    error: undefined,
    messages: [...state.messages, message],
  };
}

function withInFlightAssistant(
  state: ThreadViewState,
  mutate: (message: ChatMessageView) => ChatMessageView,
  createIfMissing = false,
  messageId?: string,
): ThreadViewState {
  const messages = [...state.messages];
  let index =
    messageId === undefined
      ? messages.length - 1
      : messages.findIndex((message) => message.id === messageId);
  let message = messages[index];
  if (!message || message.role !== "assistant") {
    if (!createIfMissing) return state;
    message = {
      id: messageId ?? nextMessageId(state),
      role: "assistant",
      parts: [],
      state: "streaming",
    };
    messages.push(message);
    index = messages.length - 1;
  }
  messages[index] = mutate(message);
  return { ...state, messages };
}

function mutatePart(
  message: ChatMessageView,
  partId: number,
  mutate: (part: PartView, index: number) => PartView,
): ChatMessageView {
  const parts = [...message.parts];
  const index = parts.findIndex((part) => part.id === partId);
  if (index < 0) return message;
  parts[index] = mutate(parts[index], index);
  return { ...message, parts };
}

function completedPart(content: OutputContent, previous?: PartView): PartView {
  const identity = previous?.id === undefined ? {} : { id: previous.id };
  if (content.type === "tool-call") {
    return {
      ...identity,
      kind: "tool",
      ...content.call,
      state: content.call.errorText ? "error" : "done",
      complete: true,
    };
  }
  if (content.type === "reasoning") {
    return { ...identity, kind: "reasoning", text: content.text, state: "done", complete: true };
  }
  return { ...identity, kind: "text", text: content.text, complete: true };
}

function reconcileCompletedParts(parts: PartView[], contents: OutputContent[]): PartView[] {
  const remaining = [...parts];
  return contents.map((content) => {
    let index = remaining.findIndex((part) => content.type === "tool-call"
      ? part.kind === "tool" && part.complete && part.callId === content.call.callId
      : part.kind === content.type);
    if (index < 0 && content.type === "tool-call") {
      index = remaining.findIndex((part) => part.kind === "tool" && !part.complete);
    }
    const previous = index < 0 ? undefined : remaining.splice(index, 1)[0];
    return completedPart(content, previous);
  });
}

export function foldChatEvent(
  state: ThreadViewState,
  event: ChatEvent,
  messageId?: string,
): ThreadViewState {
  const message = messageId === undefined
    ? state.messages.at(-1)
    : state.messages.find((entry) => entry.id === messageId);
  const reject = () => foldChatEvent(state, {
    type: "failed",
    error: { kind: "invalid-response", message: "回复事件顺序或部分标识不合法。" },
  }, messageId);
  if (event.type === "started" && state.status === "streaming") return reject();
  if (event.type !== "started" && message?.role === "assistant" && message.state !== "streaming") {
    return state;
  }
  if ("partId" in event) {
    const part = message?.parts.find((entry) => entry.id === event.partId);
    if (
      state.status !== "streaming" ||
      !Number.isInteger(event.partId) || event.partId < 0 || event.partId > 0xffffffff ||
      (event.type === "part-started" ? part !== undefined : !part || part.complete)
    ) return reject();
    if (event.type === "part-completed" && part &&
      event.content.type !== (part.kind === "tool" ? "tool-call" : part.kind)) return reject();
  }
  switch (event.type) {
    case "started":
      return withInFlightAssistant(
        { ...state, status: "streaming", metadata: event.metadata, usage: undefined },
        (message) => ({ ...message, parts: [], state: "streaming" }),
        true,
        messageId,
      );

    case "part-started":
      return withInFlightAssistant(
        state,
        (message) => {
          const part: PartView =
            event.kind === "tool-call"
              ? {
                  kind: "tool",
                  callId: String(event.partId),
                  name: event.name ?? "",
                  inputText: "",
                  state: "running",
                }
              : event.kind === "reasoning"
                ? { kind: "reasoning", text: "", state: "running" }
                : { kind: "text", text: "" };
          const parts = [...message.parts, { ...part, id: event.partId }];
          return { ...message, parts };
        },
        false,
        messageId,
      );

    case "delta":
      return withInFlightAssistant(
        state,
        (message) =>
          mutatePart(message, event.partId, (part) => {
            if (part.kind === "tool") {
              return { ...part, inputText: part.inputText + event.text };
            }
            return { ...part, text: part.text + event.text };
          }),
        false,
        messageId,
      );

    case "part-completed":
      return withInFlightAssistant(
        state,
        (message) =>
          mutatePart(message, event.partId, (part) => completedPart(event.content, part)),
        false,
        messageId,
      );

    case "usage":
      return { ...state, usage: event.usage };

    case "completed":
      return withInFlightAssistant(
        {
          ...state,
          status: "idle",
          usage: event.response.usage,
          metadata: event.response.metadata,
        },
        (message) => ({
          ...message,
          state: "done",
          parts: reconcileCompletedParts(message.parts, event.response.assistant.parts),
        }),
        false,
        messageId,
      );

    case "failed":
      return withInFlightAssistant(
        { ...state, status: "failed", error: event.error },
        (message) =>
          message.state === "streaming"
            ? { ...message, state: "failed" }
            : message,
        false,
        messageId,
      );
  }
}

/** 用户显式停止：保留已输出内容，标记进行中的回复为 stopped。 */
export function markStopped(
  state: ThreadViewState,
  messageId?: string,
): ThreadViewState {
  return withInFlightAssistant(
    { ...state, status: "idle" },
    (message) =>
      message.state === "streaming"
        ? { ...message, state: "stopped" }
        : message,
    false,
    messageId,
  );
}
