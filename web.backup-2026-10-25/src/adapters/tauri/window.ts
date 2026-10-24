import { getCurrentWindow } from "@tauri-apps/api/window"
import type { DesktopWindow } from "@/platform/window"

type WindowOperations = Pick<
  ReturnType<typeof getCurrentWindow>,
  "minimize" | "toggleMaximize" | "close"
>

/**
 * Binds the current window without IPC; unavailable SDK handles fail safely.
 * @example const window = createTauriWindow(); await window.minimize()
 */
export function createTauriWindow(
  providedWindow?: WindowOperations,
  platform?: DesktopWindow["platform"]
): DesktopWindow {
  let target: WindowOperations
  try {
    target = providedWindow ?? getCurrentWindow()
  } catch {
    throw new Error("无法连接桌面窗口。")
  }
  const userAgent = navigator.userAgent
  const perform = async (method: keyof WindowOperations) => {
    try {
      await target[method]()
    } catch {
      throw new Error("窗口操作未能完成，请重试。")
    }
  }
  return {
    platform:
      platform ??
      (/Mac/i.test(userAgent)
        ? "macos"
        : /Windows/i.test(userAgent)
          ? "windows"
          : "linux"),
    minimize: () => perform("minimize"),
    toggleMaximize: () => perform("toggleMaximize"),
    close: () => perform("close"),
  }
}
