import * as React from "react"
import { useAppDependencies } from "@/app/dependencies"

export function useCopyToClipboard() {
  const { host } = useAppDependencies()
  const [status, setStatus] = React.useState<
    "idle" | "pending" | "copied" | "error"
  >("idle")
  const pending = React.useRef(false)
  const mounted = React.useRef(false)
  const timeout = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )

  React.useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      clearTimeout(timeout.current)
    }
  }, [])

  const copy = async (value: string) => {
    if (pending.current) return
    pending.current = true
    clearTimeout(timeout.current)
    setStatus("pending")
    try {
      await host.copyText(value)
      if (mounted.current) {
        setStatus("copied")
        // 与 index.css 的 chat-check-decay 时长一致。
        timeout.current = setTimeout(() => setStatus("idle"), 2500)
      }
    } catch {
      if (mounted.current) setStatus("error")
    } finally {
      pending.current = false
    }
  }

  return { status, copy }
}
