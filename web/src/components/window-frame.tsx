import { createContext, useContext, useState, type ReactNode } from "react"
import type { DesktopWindow } from "@/platform/window"

const TitlebarTarget = createContext<HTMLElement | null>(null)

export function useTitlebarTarget() {
  return useContext(TitlebarTarget)
}

/** The same frame remains available during startup, resource loading and failure. */
export function WindowFrame({
  window: desktopWindow,
  children,
}: {
  window?: DesktopWindow
  children: ReactNode
}) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null)
  const [error, setError] = useState("")
  if (!desktopWindow) return children

  async function run(action: () => Promise<void>) {
    setError("")
    try {
      await action()
    } catch {
      setError("窗口操作未能完成，请重试。")
    }
  }

  return (
    <TitlebarTarget.Provider value={target}>
      <div className="flex h-dvh min-w-0 flex-col overflow-hidden">
        <div
          data-slot="desktop-titlebar"
          data-platform={desktopWindow.platform}
          data-tauri-drag-region="deep"
          className="desktop-titlebar relative z-60 flex min-h-12 shrink-0 border-b border-border bg-background select-none"
        >
          <div
            ref={setTarget}
            className="desktop-titlebar-content min-w-0 flex-1"
          />
          {desktopWindow.platform === "windows" ? (
            <div
              className="flex shrink-0 self-start"
              data-tauri-drag-region="false"
            >
              <button
                type="button"
                aria-label="最小化"
                className="window-control"
                onClick={() => void run(() => desktopWindow.minimize())}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  aria-hidden="true"
                >
                  <path d="M0 5.5h10" fill="none" stroke="currentColor" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="最大化或还原"
                className="window-control"
                onClick={() => void run(() => desktopWindow.toggleMaximize())}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  aria-hidden="true"
                >
                  <rect
                    x=".5"
                    y=".5"
                    width="9"
                    height="9"
                    fill="none"
                    stroke="currentColor"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label="关闭窗口"
                className="window-control window-control-close"
                onClick={() => void run(() => desktopWindow.close())}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  aria-hidden="true"
                >
                  <path
                    d="m.5.5 9 9m0-9-9 9"
                    fill="none"
                    stroke="currentColor"
                  />
                </svg>
              </button>
            </div>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="absolute top-full right-2 z-50 rounded-md border border-border bg-popover px-3 py-2 text-sm"
            >
              {error}
            </p>
          ) : null}
        </div>
        {/* Fixed panels use the content viewport below the native chrome. */}
        <div className="min-h-0 flex-1 [contain:layout]">{children}</div>
      </div>
    </TitlebarTarget.Provider>
  )
}
