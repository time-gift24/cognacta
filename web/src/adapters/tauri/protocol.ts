import type {
  ChatEvent,
  ChatMetadata,
  ChatUsage,
  OutputContent,
  ChatError,
  FinishReason,
} from "@/chat/dto"
import type { DesktopSnapshot, DesktopTask } from "@/desktop/runtime"

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("桌面服务返回了无效数据。")
  return value as Record<string, unknown>
}
export function string(value: unknown): string {
  if (typeof value !== "string") throw new Error("桌面服务返回了无效文本。")
  return value
}
export function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new Error("桌面服务返回了无效计数。")
  return value
}
export function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new Error("桌面服务返回了无效状态。")
  return value
}
export function array<T>(value: unknown, read: (entry: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new Error("桌面服务返回了无效列表。")
  return value.map(read)
}
export function choice<T extends string>(
  value: unknown,
  values: readonly T[]
): T {
  if (!values.includes(value as T)) throw new Error("桌面服务返回了未知状态。")
  return value as T
}
const optional = (value: unknown) =>
  value === undefined ? undefined : string(value)
export function readRpcError(value: unknown, fallback: string): ChatError {
  if (
    value &&
    typeof value === "object" &&
    "kind" in value &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    try {
      return {
        kind: choice<ChatError["kind"]>(value.kind, [
          "invalid-request",
          "unsupported",
          "authentication",
          "rate-limited",
          "unavailable",
          "transport",
          "timeout",
          "invalid-response",
          "truncated",
          "replay-mismatch",
          "aborted",
          "unknown",
        ]),
        message: value.message,
      }
    } catch {
      /* Unrecognized native errors use a safe explanation. */
    }
  }
  return { kind: "transport", message: fallback }
}
function metadata(value: unknown): ChatMetadata {
  const raw = object(value)
  return {
    providerName: string(raw.providerName),
    protocolName: string(raw.protocolName),
    requestedModel: string(raw.requestedModel),
    resolvedModel: optional(raw.resolvedModel),
    requestId: optional(raw.requestId),
    responseId: optional(raw.responseId),
  }
}
function usage(value: unknown): ChatUsage {
  const raw = object(value)
  const result: ChatUsage = {}
  for (const key of [
    "inputTokens",
    "outputTokens",
    "totalTokens",
    "reasoningTokens",
    "cacheReadTokens",
    "cacheWriteTokens",
  ] as const)
    if (raw[key] !== undefined) result[key] = number(raw[key])
  return result
}
function content(value: unknown): OutputContent {
  const raw = object(value)
  const type = choice(raw.type, ["text", "reasoning", "tool-call"] as const)
  if (type !== "tool-call") return { type, text: string(raw.text) }
  const call = object(raw.call)
  return {
    type,
    call: {
      callId: string(call.callId),
      name: string(call.name),
      inputText: string(call.inputText),
      output: call.output,
      errorText: optional(call.errorText),
    },
  }
}
export function readChatEvent(value: unknown): ChatEvent {
  const raw = object(value)
  switch (raw.type) {
    case "started":
      return { type: raw.type, metadata: metadata(raw.metadata) }
    case "part-started":
      return {
        type: raw.type,
        partId: number(raw.partId),
        kind: choice(raw.kind, ["text", "reasoning", "tool-call"] as const),
        name: optional(raw.name),
      }
    case "delta":
      return {
        type: raw.type,
        partId: number(raw.partId),
        text: string(raw.text),
      }
    case "part-completed":
      return {
        type: raw.type,
        partId: number(raw.partId),
        content: content(raw.content),
      }
    case "usage":
      return { type: raw.type, usage: usage(raw.usage) }
    case "completed": {
      const response = object(raw.response),
        assistant = object(response.assistant),
        finish = object(response.finish)
      return {
        type: raw.type,
        response: {
          assistant: { parts: array(assistant.parts, content) },
          finish: {
            reason: choice<FinishReason>(finish.reason, [
              "stop",
              "tool-calls",
              "output-limit",
              "content-filtered",
              "other",
            ]),
            providerReason: optional(finish.providerReason),
          },
          metadata: metadata(response.metadata),
          usage: usage(response.usage),
        },
      }
    }
    case "failed": {
      const error = object(raw.error)
      return {
        type: raw.type,
        error: {
          kind: choice<ChatError["kind"]>(error.kind, [
            "invalid-request",
            "unsupported",
            "authentication",
            "rate-limited",
            "unavailable",
            "transport",
            "timeout",
            "invalid-response",
            "truncated",
            "replay-mismatch",
            "aborted",
            "unknown",
          ]),
          message: string(error.message),
        },
      }
    }
    default:
      throw new Error("桌面服务返回了无效聊天事件。")
  }
}
function readTask(value: unknown): DesktopTask {
  const entry = object(value)
  const task: DesktopTask = {
    runId: string(entry.runId),
    threadId: string(entry.threadId),
    title: string(entry.title),
    phase: choice(entry.phase, [
      "preparing",
      "running",
      "awaiting-approval",
      "submitting",
      "stopping",
    ] as const),
    error: optional(entry.error),
  }
  if (entry.approval !== undefined) {
    const approval = object(entry.approval)
    task.approval = {
      id: string(approval.id),
      callId: string(approval.callId),
      title: string(approval.title),
      description: string(approval.description),
      targetUrl: optional(approval.targetUrl),
      toolName: string(approval.toolName),
      parameters: string(approval.parameters),
      code: optional(approval.code),
    }
  }
  return task
}
export function readBrowserSnapshot(
  value: unknown
): DesktopSnapshot["browser"] {
  const browser = object(value)
  return {
    url: string(browser.url),
    title: string(browser.title),
    status: choice(browser.status, [
      "empty",
      "loading",
      "ready",
      "error",
    ] as const),
    canGoBack: boolean(browser.canGoBack),
    canGoForward: boolean(browser.canGoForward),
    error: optional(browser.error),
  }
}

export function readDesktopSnapshot(value: unknown): DesktopSnapshot {
  const raw = object(value)
  if (raw.simulated !== false) throw new Error("桌面服务未连接真实浏览器。")
  const legacyTask = raw.task === null ? null : readTask(raw.task)
  const tasks =
    raw.tasks === undefined
      ? legacyTask
        ? [legacyTask]
        : []
      : array(raw.tasks, readTask)
  if (
    new Set(tasks.map((task) => task.runId)).size !== tasks.length ||
    new Set(tasks.map((task) => task.threadId)).size !== tasks.length
  )
    throw new Error("桌面服务返回了重复任务。")
  const browserThreadId =
    raw.browserThreadId === undefined
      ? (legacyTask?.threadId ?? null)
      : raw.browserThreadId === null
        ? null
        : string(raw.browserThreadId)
  return {
    simulated: false,
    ...(raw.closeBlocked === true ? { closeBlocked: true } : {}),
    tasks,
    browserThreadId,
    task: tasks.find((task) => task.threadId === browserThreadId) ?? null,
    browserRequest: number(raw.browserRequest),
    browser: readBrowserSnapshot(raw.browser),
    ...(raw.operationsBrowser === undefined
      ? {}
      : { operationsBrowser: readBrowserSnapshot(raw.operationsBrowser) }),
  }
}
