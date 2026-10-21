import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ReloadIcon,
} from "@hugeicons-pro/core-stroke-rounded"
import { Button } from "@/components/motion/button"
import { Input } from "@/components/motion/input"
import type { BrowserSnapshot, DesktopRuntime } from "@/desktop/runtime"
import { BrowserView } from "./browser-view"
import { useBrowserViewport } from "./use-browser-viewport"

const emptyOperationsBrowser: BrowserSnapshot = {
  url: "",
  title: "",
  status: "empty",
  canGoBack: false,
  canGoForward: false,
}

export function OperationsBrowserView({
  browser = emptyOperationsBrowser,
  desktop,
  simulated,
  visible,
}: {
  browser?: BrowserSnapshot
  desktop: DesktopRuntime
  simulated: boolean
  visible: boolean
}) {
  const [draft, setDraft] = useState<{ url: string; value: string } | null>(
    null
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const loading = pending || browser.status === "loading"
  const { ref: viewportRef, error: viewportError } = useBrowserViewport(
    visible &&
      !simulated &&
      !error &&
      (browser.status === "ready" || browser.status === "loading"),
    simulated ? undefined : desktop.setBrowserViewport
  )

  useEffect(() => {
    if (!desktop.readOperationsBrowser) return
    let disposed = false
    void desktop.readOperationsBrowser().catch((cause) => {
      if (!disposed)
        setError(
          cause instanceof Error ? cause.message : "运维浏览器暂不可用。"
        )
    })
    return () => {
      disposed = true
    }
  }, [desktop])

  async function run(action: (() => Promise<void>) | undefined) {
    if (loading) return
    setError("")
    if (!action) {
      setError("运维浏览器暂不可用。")
      return
    }
    setPending(true)
    try {
      await action()
      setDraft(null)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "运维浏览器操作失败，请重试。"
      )
    } finally {
      setPending(false)
    }
  }

  const address = draft?.url === browser.url ? draft.value : browser.url
  const failure = error || viewportError || browser.error
  return (
    <section
      aria-label="运维浏览器"
      aria-busy={loading}
      className="flex h-full min-h-0 flex-col"
    >
      <form
        className="flex h-12 shrink-0 items-center gap-1 px-3"
        onSubmit={(event) => {
          event.preventDefault()
          const url = address.trim()
          if (url)
            void run(
              desktop.operationsNavigate
                ? () => desktop.operationsNavigate!(url)
                : undefined
            )
        }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="运维浏览器后退"
          disabled={loading || !browser.canGoBack}
          onClick={() => void run(desktop.operationsBack)}
          className="size-9 rounded-full"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="运维浏览器前进"
          disabled={loading || !browser.canGoForward}
          onClick={() => void run(desktop.operationsForward)}
          className="size-9 rounded-full"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="重新加载运维页面"
          disabled={loading || !browser.url}
          onClick={() => void run(desktop.operationsReload)}
          className="size-9 rounded-full"
        >
          <HugeiconsIcon icon={ReloadIcon} size={16} aria-hidden="true" />
        </Button>
        <Input
          aria-label="运维浏览器地址栏"
          placeholder="输入网址"
          value={address}
          disabled={loading}
          onChange={(value) => setDraft({ url: browser.url, value })}
          className="min-w-0 flex-1"
          classNames={{
            field:
              "h-9 border-transparent bg-muted/70 focus-within:border-ring focus-within:bg-background",
            input: "text-xs",
          }}
        />
      </form>
      {failure ? (
        <p role="alert" className="px-4 py-2 text-sm text-destructive">
          {failure}
        </p>
      ) : null}
      {simulated ? (
        <div className="min-h-0 flex-1">
          <BrowserView
            browser={browser}
            simulated
            canRetry={!loading && Boolean(browser.url)}
            onRetry={() => void run(desktop.operationsReload)}
          />
        </div>
      ) : (
        <div
          ref={viewportRef}
          className="min-h-0 flex-1 border-t border-border bg-card"
        >
          {browser.status === "empty" ? (
            <p className="px-5 py-7 text-sm text-muted-foreground">
              运维浏览器已就绪
            </p>
          ) : null}
        </div>
      )}
    </section>
  )
}
