import {
  appendUserMessage,
  createThreadState,
  foldChatEvent,
  markStopped,
} from "../chat/fold.ts"
import type { ThreadSnapshot } from "../chat/thread-store.ts"
import type { RunRecord } from "./source.ts"

/** Rebuild display only. The runtime keeps the actual model conversation separately. */
export function replayRuns(
  threadId: string,
  runs: readonly RunRecord[]
): ThreadSnapshot {
  let state = createThreadState(threadId)
  for (const run of [...runs].sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt)
  )) {
    if (run.threadId !== threadId) throw new Error("会话记录身份不匹配。")
    for (const input of run.inputMessages ?? [])
      state = appendUserMessage(state, input.text, input.attachments)
    const messageId = `m-${state.messages.length + 1}`
    const metadata = run.result?.metadata ?? {
      providerName: "",
      protocolName: "",
      requestedModel: "",
    }
    state = foldChatEvent(state, { type: "started", metadata }, messageId)
    // Successful responses are complete even when the bounded event buffer has rolled over.
    if (run.result) {
      state = foldChatEvent(
        state,
        { type: "completed", response: run.result },
        messageId
      )
      continue
    }
    const events = run.events ?? []
    const first = events.findIndex((event) => event.type === "started")
    if (first >= 0)
      for (const event of events.slice(first + 1))
        state =
          event.type === "failed" && event.error.kind === "aborted"
            ? markStopped(state, messageId)
            : foldChatEvent(state, event, messageId)
    if (run.status === "cancelled") state = markStopped(state, messageId)
    else if (state.status !== "failed")
      state = foldChatEvent(
        state,
        {
          type: "failed",
          error: {
            kind: run.status === "timed-out" ? "timeout" : "unknown",
            message:
              run.error?.message ??
              (run.status === "interrupted"
                ? "上次执行已中断，不会自动重新执行。"
                : "执行未完成；可查看记录或发送新的消息。"),
          },
        },
        messageId
      )
  }
  return { version: 1, state }
}
