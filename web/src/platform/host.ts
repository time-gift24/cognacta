/** Host operations reject with a caller-safe Error; cancellation returns false. */
export interface HostCapabilities {
  copyText(text: string): Promise<void>
  openExternal(url: string): Promise<void>
  confirm(message: string): Promise<boolean>
}
