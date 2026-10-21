import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/motion/button"
import type {
  RunRecord,
  RunSnapshot,
  RunSource,
  RunStatus,
} from "@/runs/source"

const statusLabels: Record<RunStatus, string> = {
  preparing: "准备中",
  running: "执行中",
  completed: "已完成",
  failed: "失败",
  cancelled: "已停止",
  "timed-out": "已超时",
  interrupted: "已中断",
}
const message = (cause: unknown) =>
  cause instanceof Error ? cause.message : "读取执行记录失败，请重试。"
const date = (value: string) =>
  Number.isNaN(Date.parse(value))
    ? value
    : new Date(value).toLocaleString("zh-CN")

export function RunHistory({
  source,
  onContinue,
}: {
  source: RunSource
  onContinue: (run: RunRecord, records: readonly RunRecord[]) => Promise<void>
}) {
  const [attempt, setAttempt] = useState(0)
  const [records, setRecords] = useState<readonly RunRecord[]>([])
  const [selected, setSelected] = useState<{
    run: RunRecord
    snapshot: RunSnapshot | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const selection = useRef({ version: 0 })
  useEffect(() => {
    let live = true
    const lifecycle = selection.current
    void source.list().then(
      (items) => {
        if (live) {
          setRecords(
            [...items].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
          )
          setLoading(false)
        }
      },
      (cause) => {
        if (live) {
          setError(message(cause))
          setLoading(false)
        }
      }
    )
    return () => {
      live = false
      lifecycle.version++
    }
  }, [source, attempt])
  async function inspect(record: RunRecord) {
    const token = ++selection.current.version
    setError("")
    setBusy(true)
    try {
      const run = await source.get(record.runId)
      const snapshot = run.snapshot ?? (await source.snapshot(run.threadId))
      if (token === selection.current.version) setSelected({ run, snapshot })
    } catch (cause) {
      if (token === selection.current.version) setError(message(cause))
    } finally {
      if (token === selection.current.version) setBusy(false)
    }
  }
  async function restore() {
    if (!selected || busy) return
    const token = selection.current.version
    setBusy(true)
    setError("")
    try {
      const sameThread = records.filter(
        (run) => run.threadId === selected.run.threadId
      )
      const history = await Promise.all(
        sameThread.map((run) => source.get(run.runId))
      )
      if (token === selection.current.version)
        await onContinue(
          { ...selected.run, snapshot: selected.snapshot ?? undefined },
          history
        )
    } catch (cause) {
      if (token === selection.current.version) setError(message(cause))
    } finally {
      if (token === selection.current.version) setBusy(false)
    }
  }
  return (
    <section
      className="h-full overflow-auto px-5 py-6 sm:px-8"
      aria-label="执行记录"
    >
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || loading}
            onClick={() => {
              setError("")
              setLoading(true)
              setAttempt((value) => value + 1)
            }}
          >
            刷新
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p role="status">正在读取执行记录…</p>
        ) : !records.length ? (
          <p className="text-sm text-muted-foreground">
            暂无执行记录。
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {records.map((run) => (
              <li key={run.runId}>
                <Button variant="plain" pressScale={1} whileHover={undefined}
                  className="flex w-full items-start justify-between gap-4 rounded-lg px-3 py-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => void inspect(run)}
                  aria-pressed={selected?.run.runId === run.runId}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {run.title || "未命名执行"}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {date(run.startedAt)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {statusLabels[run.status]}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        )}
        {busy ? (
          <p role="status" className="text-sm text-muted-foreground">
            正在读取…
          </p>
        ) : null}
        {selected ? (
          <article
            className="space-y-4 border-t border-border pt-5"
            aria-label="执行详情"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-medium">
                {selected.run.title || "执行详情"}
              </h2>
              <Button
                size="sm"
                disabled={
                  busy ||
                  selected.run.status === "preparing" ||
                  selected.run.status === "running"
                }
                onClick={() => void restore()}
              >
                继续会话
              </Button>
            </div>
            <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                <dt className="inline">状态：</dt>
                <dd className="inline">{statusLabels[selected.run.status]}</dd>
              </div>
              <div>
                <dt className="inline">开始：</dt>
                <dd className="inline">{date(selected.run.startedAt)}</dd>
              </div>
              {selected.run.endedAt ? (
                <div>
                  <dt className="inline">结束：</dt>
                  <dd className="inline">{date(selected.run.endedAt)}</dd>
                </div>
              ) : null}
            </dl>
            {selected.run.error ? (
              <p role="alert" className="text-sm text-destructive">
                {selected.run.error.message}
              </p>
            ) : null}
            {selected.run.result ? (
              <div className="text-sm leading-7 whitespace-pre-wrap">
                {selected.run.result.assistant.parts
                  .filter((part) => part.type === "text")
                  .map((part) => part.text)
                  .join("\n")}
              </div>
            ) : null}
            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                运行快照
              </summary>
              <p className="my-3 text-xs text-muted-foreground">
                此会话固定使用创建时的 Agent、Skill、工具、MCP
                与模型条件；修改配置后请开始新会话。
              </p>
              {selected.snapshot ? (
                <pre
                  className="max-h-96 overflow-auto text-xs leading-6 break-all whitespace-pre-wrap"
                  tabIndex={0}
                >
                  {JSON.stringify(selected.snapshot, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">
                  准备阶段未完成，尚未生成运行快照。
                </p>
              )}
            </details>
          </article>
        ) : null}
      </div>
    </section>
  )
}
