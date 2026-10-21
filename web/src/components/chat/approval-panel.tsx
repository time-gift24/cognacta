"use client"

import * as React from "react"
import {
  Cancel01Icon,
  ShieldCheckIcon,
} from "@hugeicons-pro/core-stroke-rounded"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/motion/button"
import type { ThreadDraft } from "@/chat/thread-store"
import type {
  ApprovalRequest,
  DesktopRuntime,
  DesktopTask,
} from "@/desktop/runtime"

/** The caller keys this component by run and approval so each new call opens once. */
export function ApprovalPanel({
  runtime,
  task,
  approval,
  onStop,
  error: taskError,
  draft,
  onDraftChange,
}: {
  runtime: DesktopRuntime
  task: DesktopTask
  approval: ApprovalRequest
  onStop: () => void
  error?: string
  draft?: ThreadDraft["approval"]
  onDraftChange: (draft: NonNullable<ThreadDraft["approval"]>) => void
}) {
  const draftId = `${task.runId}:${approval.id}`
  const savedDraft = draft?.id === draftId ? draft : undefined
  const expanded = !savedDraft?.collapsed
  const reason = savedDraft?.reason ?? ""
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string>()
  const submitting = React.useRef(false)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const reopenRef = React.useRef<HTMLButtonElement>(null)
  const titleId = React.useId()
  const panelId = React.useId()
  const stopping = task.phase === "stopping"
  const busy = pending || task.phase === "submitting" || stopping
  const feedback = error ?? taskError ?? task.error

  React.useLayoutEffect(() => {
    const panel = panelRef.current
    const anchor = panel?.parentElement
    if (!panel || !anchor) return
    const measure = () => {
      panel.style.maxHeight = `${Math.max(96, Math.min(480, anchor.getBoundingClientRect().top - 28))}px`
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(anchor)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [])

  function collapse() {
    onDraftChange({ id: draftId, reason, collapsed: true })
    requestAnimationFrame(() => reopenRef.current?.focus())
  }

  async function decide(decision: "approve" | "reject") {
    if (submitting.current || busy || task.phase !== "awaiting-approval") return
    submitting.current = true
    setPending(true)
    setError(undefined)
    try {
      await runtime.decide({
        runId: task.runId,
        approvalId: approval.id,
        decision,
        ...(decision === "reject" && reason.trim()
          ? { reason: reason.trim() }
          : {}),
      })
    } catch (cause) {
      const current = runtime.getState().task
      if (
        current?.runId === task.runId &&
        current.approval?.id === approval.id
      ) {
        setError(
          cause instanceof Error ? cause.message : "决定未提交，请重试。"
        )
      }
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <div
      ref={panelRef}
      data-slot="approval-anchor"
      className="absolute inset-x-0 bottom-[calc(100%+12px)] z-40 flex flex-col"
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) {
          event.stopPropagation()
          collapse()
        }
      }}
    >
      {expanded ? (
        <section
          id={panelId}
          role="region"
          aria-label="待审批操作"
          aria-describedby={titleId}
          data-slot="approval-panel"
          className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-[0_2px_8px_rgb(0_0_0/0.16)] dark:shadow-[0_2px_8px_rgb(0_0_0/0.5)]"
        >
          <p role="status" className="sr-only">
            {stopping
              ? "正在停止任务"
              : busy
                ? "正在提交决定"
                : `等待批准：${approval.title}`}
          </p>
          <div className="flex shrink-0 items-start gap-2.5 px-4 pt-4 pb-3 sm:px-5">
            <HugeiconsIcon
              icon={ShieldCheckIcon}
              className="mt-0.5 size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <h2
              id={titleId}
              className="min-w-0 flex-1 pt-0.5 text-sm font-medium break-words"
            >
              {approval.title}
            </h2>
            <Button
              variant="ghost"
              size="icon-sm"
              className="-mt-1 -mr-1 text-muted-foreground"
              aria-label="收起审批"
              onClick={collapse}
            >
              <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
            </Button>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 text-sm sm:px-5">
            <p className="leading-6 break-words">{approval.description}</p>
            {approval.targetUrl && (
              <div className="mt-3 space-y-1">
                <p className="text-xs text-muted-foreground">目标网页</p>
                <p className="font-mono text-xs leading-5 break-all">
                  {approval.targetUrl}
                </p>
              </div>
            )}
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              批准后才会执行。拒绝此操作后，Agent 会调整方案。
            </p>
            <details className="mt-3 text-xs">
              <summary className="w-fit cursor-pointer rounded py-1 text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                查看参数与脚本
              </summary>
              <p className="mt-2 font-mono break-all">{approval.toolName}</p>
              <pre className="mt-2 max-h-44 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-5 break-all whitespace-pre-wrap">
                {approval.parameters}
              </pre>
              {approval.code && (
                <pre className="mt-2 max-h-44 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-5 break-all whitespace-pre-wrap">
                  {approval.code}
                </pre>
              )}
            </details>
            <label className="mt-3 block">
              <span className="text-xs text-muted-foreground">
                拒绝理由（可选）
              </span>
              <textarea
                aria-label="拒绝理由（可选）"
                rows={1}
                value={reason}
                onChange={(event) =>
                  onDraftChange({
                    id: draftId,
                    reason: event.target.value,
                    collapsed: false,
                  })
                }
                className="mt-1.5 block max-h-28 min-h-9 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-5 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                placeholder="告诉 Agent 需要怎样调整"
              />
            </label>
            {feedback && (
              <p
                role="alert"
                className="mt-3 text-sm leading-5 text-destructive"
              >
                {feedback}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-5">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={stopping}
              onClick={onStop}
            >
              {stopping ? "正在停止…" : "停止任务"}
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void decide("reject")}
              >
                拒绝此操作
              </Button>
              <Button disabled={busy} onClick={() => void decide("approve")}>
                {busy && !stopping ? "正在提交…" : "允许此操作"}
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-popover p-2 text-sm shadow-[0_2px_8px_rgb(0_0_0/0.12)]">
          <Button
            ref={reopenRef}
            variant="ghost"
            size="sm"
            aria-expanded={false}
            aria-controls={panelId}
            onClick={() =>
              onDraftChange({ id: draftId, reason, collapsed: false })
            }
          >
            <HugeiconsIcon icon={ShieldCheckIcon} aria-hidden="true" />
            {stopping
              ? "正在停止…"
              : busy
                ? "正在提交决定…"
                : feedback
                  ? "提交失败 · 查看审批"
                  : "等待批准"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={stopping}
            onClick={onStop}
          >
            {stopping ? "正在停止…" : "停止任务"}
          </Button>
        </div>
      )}
    </div>
  )
}
