import { HugeiconsIcon } from "@hugeicons/react"
import { Globe02Icon } from "@hugeicons-pro/core-stroke-rounded"
import type { BrowserSnapshot, DesktopTask } from "@/desktop/runtime"
import { Button } from "@/components/motion/button"
import { Input } from "@/components/motion/input"

const taskLabels: Record<DesktopTask["phase"], string> = {
  preparing: "准备中",
  running: "执行中",
  "awaiting-approval": "等待批准",
  submitting: "正在提交",
  stopping: "正在停止",
}

export function BrowserTaskStatus({
  task,
  onReturnToApproval,
}: {
  task: DesktopTask | null
  onReturnToApproval?: () => void
}) {
  if (!task) return null
  return (
    <div
      role="status"
      className="mx-3 mb-3 rounded-xl bg-muted/70 px-3 py-2.5 text-xs"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 font-medium">{taskLabels[task.phase]}</span>
        <span
          className="min-w-0 truncate text-muted-foreground"
          title={task.title}
        >
          {task.title}
        </span>
      </div>
      {task.approval?.targetUrl ? (
        <p className="mt-1.5 break-all text-muted-foreground">
          <span className="mr-1.5">待执行目标</span>
          {task.approval.targetUrl}
        </p>
      ) : null}
      <p className="mt-1.5 text-muted-foreground">Agent 正在使用当前浏览器页面。</p>
      {task.phase === "awaiting-approval" && onReturnToApproval ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onReturnToApproval}
          className="mt-2 h-7 px-2 text-xs min-[1100px]:hidden"
        >
          返回审批
        </Button>
      ) : null}
    </div>
  )
}

export function BrowserView({
  browser,
  simulated,
  canRetry,
  onRetry,
  onShowChrome,
}: {
  browser: BrowserSnapshot
  simulated: boolean
  canRetry: boolean
  onRetry: () => void
  onShowChrome?: () => void
}) {
  return (
    <section
      aria-label="浏览器页面"
      aria-busy={browser.status === "loading"}
      className="flex h-full min-h-0 flex-col border-t border-border bg-card"
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2 border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
        <HugeiconsIcon icon={Globe02Icon} size={14} aria-hidden="true" />
        <span className="shrink-0">{simulated ? "模拟浏览器" : "Chrome"}</span>
        {browser.title ? (
          <span className="min-w-0 truncate" title={browser.title}>
            {browser.title}
          </span>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-5 py-7">
        {!simulated && browser.status !== "error" ? (
          <div className="mx-auto flex h-full max-w-64 flex-col items-center justify-center gap-3 pb-10 text-center">
            <h2 className="text-base font-medium">
              {browser.status === "loading"
                ? "正在加载页面…"
                : browser.status === "empty"
                  ? "浏览器已就绪"
                  : "页面已在 Chrome 中打开"}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Agent 在独立的 Chrome 窗口中操作，你也可以直接操作该窗口。
            </p>
            {onShowChrome ? (
              <Button variant="outline" size="sm" onClick={onShowChrome}>
                显示 Chrome
              </Button>
            ) : null}
          </div>
        ) : browser.status === "empty" ? (
          <div className="mx-auto flex h-full max-w-64 flex-col justify-center pb-10 text-center">
            <h2 className="text-base font-medium">浏览器已就绪</h2>
          </div>
        ) : browser.status === "loading" ? (
          <div role="status" className="space-y-5">
            <p className="text-sm text-muted-foreground">正在加载页面…</p>
            <div
              aria-hidden="true"
              className="space-y-3 motion-safe:animate-pulse"
            >
              <div className="h-6 w-3/4 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-5/6 rounded bg-muted" />
              <div className="mt-8 h-10 w-full rounded-lg bg-muted" />
            </div>
          </div>
        ) : browser.status === "error" ? (
          <div className="space-y-3">
            <div role="alert" className="space-y-2">
              <h2 className="text-base font-medium">页面未能打开</h2>
              <p className="text-sm leading-relaxed break-words text-muted-foreground">
                {browser.error ?? "页面未能加载，请重试。"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!canRetry}
              onClick={onRetry}
            >
              重新加载页面
            </Button>
          </div>
        ) : browser.preview ? (
          <article className="mx-auto max-w-prose space-y-5 break-words">
            <h1 className="text-xl font-semibold tracking-tight text-balance">
              {browser.preview.heading}
            </h1>
            <p className="text-sm leading-7 whitespace-pre-line text-muted-foreground">
              {browser.preview.text}
            </p>
            {browser.preview.field ? (
              <Input
                label={browser.preview.field.label}
                readOnly
                value={browser.preview.field.value}
                className="pt-2 font-normal"
                classNames={{ field: "bg-background" }}
              />
            ) : null}
          </article>
        ) : (
          <p className="text-sm text-muted-foreground">页面内容暂不可用。</p>
        )}
      </div>
    </section>
  )
}
