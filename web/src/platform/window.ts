/**
 * One desktop window, bound when the instance is created. Operations resolve
 * after the host accepts them or reject with a caller-safe Error. Await each
 * call when ordering matters; there are no subscriptions, cancellation or retries.
 */
export interface DesktopWindow {
  readonly platform: "macos" | "windows" | "linux"
  minimize(): Promise<void>
  toggleMaximize(): Promise<void>
  close(): Promise<void>
}
