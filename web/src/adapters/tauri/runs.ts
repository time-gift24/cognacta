import type {
  RunRecord,
  RunSnapshot,
  RunSource,
  SessionContext,
} from "@/runs/source"
import { array, choice, object, readChatEvent, string } from "./protocol"

export function readRun(value: unknown): RunRecord {
  const raw = object(value)
  const completed =
    raw.result === undefined
      ? undefined
      : readChatEvent({ type: "completed", response: raw.result })
  const error = raw.error === undefined ? undefined : object(raw.error)
  return {
    runId: string(raw.runId),
    threadId: string(raw.threadId),
    title: string(raw.title),
    status: choice(raw.status, [
      "preparing",
      "running",
      "completed",
      "failed",
      "cancelled",
      "timed-out",
      "interrupted",
    ] as const),
    startedAt: string(raw.startedAt),
    ...(raw.endedAt === undefined ? {} : { endedAt: string(raw.endedAt) }),
    ...(raw.agentId === undefined ? {} : { agentId: string(raw.agentId) }),
    ...(error
      ? { error: { kind: string(error.kind), message: string(error.message) } }
      : {}),
    ...(completed?.type === "completed" ? { result: completed.response } : {}),
    ...(raw.snapshot == null ? {} : { snapshot: object(raw.snapshot) }),
    ...(raw.events === undefined
      ? {}
      : { events: array(raw.events, readChatEvent) }),
    ...(raw.inputMessages === undefined
      ? {}
      : {
          inputMessages: array(raw.inputMessages, (value) => {
            const message = object(value)
            return {
              role: choice(message.role, ["user"] as const),
              text: string(message.text),
              ...(message.attachments === undefined
                ? {}
                : {
                    attachments: array(message.attachments, (value) => {
                      const file = object(value)
                      return {
                        name: string(file.name),
                        mediaType: string(file.mediaType),
                        ...(file.id === undefined
                          ? {}
                          : { id: string(file.id) }),
                      }
                    }),
                  }),
            }
          }),
        }),
  }
}

export function createRunSource(
  request: (
    method: string,
    params?: Record<string, unknown>
  ) => Promise<unknown>
) {
  const contexts = new Map<string, SessionContext>()
  const runs: RunSource = {
    bindSession(threadId, context) {
      const existing = contexts.get(threadId)
      if (existing && JSON.stringify(existing) !== JSON.stringify(context))
        throw new Error("已有会话不能更换 Agent 装配，请新建会话。")
      contexts.set(threadId, { ...context })
    },
    list: async () => array(await request("runs_list"), readRun),
    get: async (runId) => readRun(await request("run_get", { runId })),
    snapshot: async (threadId) => {
      const value = await request("session_snapshot", { threadId })
      return value === null ? null : (object(value) as RunSnapshot)
    },
  }
  return {
    runs,
    contextFor: (threadId: string) => contexts.get(threadId) ?? {},
  }
}
