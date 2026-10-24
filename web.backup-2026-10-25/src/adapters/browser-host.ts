import type { HostCapabilities } from "@/platform/host"

export function createBrowserHost(): HostCapabilities {
  return {
    async copyText(text) {
      try {
        await navigator.clipboard.writeText(text)
      } catch (cause) {
        throw new Error("无法复制，请检查剪贴板权限后重试。", { cause })
      }
    },
    async openExternal(input) {
      let url: URL
      try {
        url = new URL(
          /^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`
        )
        if (url.protocol !== "https:" && url.protocol !== "http:")
          throw new Error("scheme")
      } catch {
        throw new Error("请输入有效的网页地址。")
      }
      window.open(url.href, "_blank", "noopener,noreferrer")
    },
    async confirm(message) {
      return window.confirm(message)
    },
  }
}
