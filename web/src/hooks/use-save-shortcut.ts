import { useEffect, useLayoutEffect, useRef } from "react"

/**
 * 在活动文档中把 Cmd/Ctrl+S 交给 onSave。
 *
 * 监听器只在 active／enabled 变化时重新注册，回调始终读取最新闭包。
 * 非活动文档、未进入编辑状态以及模态框内的输入不会拦截浏览器快捷键。
 */
export function useSaveShortcut({
  active = true,
  enabled = true,
  onSave,
}: {
  active?: boolean
  enabled?: boolean
  onSave: () => void
}) {
  const latest = useRef(onSave)
  useLayoutEffect(() => {
    latest.current = onSave
  })
  useEffect(() => {
    if (!active || !enabled) return
    const shortcut = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "s"
      )
        return
      if (
        event.target instanceof Element &&
        event.target.closest('[aria-modal="true"]')
      )
        return
      event.preventDefault()
      latest.current()
    }
    window.addEventListener("keydown", shortcut)
    return () => window.removeEventListener("keydown", shortcut)
  }, [active, enabled])
}
