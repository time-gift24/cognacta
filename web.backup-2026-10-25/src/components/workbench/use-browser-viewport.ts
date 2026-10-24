import { useEffect, useRef, useState } from "react"
import type { BrowserViewport, DesktopRuntime } from "@/desktop/runtime"

/** Native web content must yield to application portals, which cannot cover a CEF surface. */
export function useBrowserViewport(
  visible: boolean,
  setViewport: DesktopRuntime["setBrowserViewport"]
) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string>()
  useEffect(() => {
    if (!setViewport) return
    let disposed = false
    let frame = 0
    let previous = ""
    const update = () => {
      frame = 0
      const element = ref.current
      let bounds: BrowserViewport | null = null
      const obstructed = [
        ...document.querySelectorAll<HTMLElement>(
          '[role="dialog"], [role="menu"], [role="listbox"], [data-morph-popover-portal]'
        ),
      ].some((overlay) => {
        const style = getComputedStyle(overlay)
        return (
          !overlay.closest('[inert], [hidden], [data-state="closed"]') &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          overlay.getClientRects().length > 0
        )
      })
      if (
        visible &&
        element &&
        !element.closest("[inert]") &&
        !obstructed &&
        document.visibilityState !== "hidden"
      ) {
        const rect = element.getBoundingClientRect()
        const x = Math.max(0, rect.x),
          y = Math.max(0, rect.y)
        const width = Math.min(innerWidth, rect.right) - x,
          height = Math.min(innerHeight, rect.bottom) - y
        if (width >= 1 && height >= 1) bounds = { x, y, width, height }
      }
      const key = JSON.stringify(bounds)
      if (key === previous) return
      previous = key
      void setViewport(bounds).then(
        () => {
          if (!disposed) setError(undefined)
        },
        (cause) => {
          if (!disposed)
            setError(
              cause instanceof Error
                ? cause.message
                : "浏览器画面暂时无法显示。"
            )
        }
      )
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const resize = new ResizeObserver(schedule)
    if (ref.current) resize.observe(ref.current)
    const mutations = new MutationObserver(schedule)
    mutations.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "hidden", "inert", "data-state"],
    })
    window.addEventListener("resize", schedule)
    window.addEventListener("scroll", schedule, true)
    document.addEventListener("visibilitychange", schedule)
    schedule()
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutations.disconnect()
      window.removeEventListener("resize", schedule)
      window.removeEventListener("scroll", schedule, true)
      document.removeEventListener("visibilitychange", schedule)
      void setViewport(null).catch(() => {})
    }
  }, [visible, setViewport])
  return { ref, error }
}
