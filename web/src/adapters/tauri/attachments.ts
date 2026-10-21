import type { ChatRequest } from "@/chat/dto"

const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_TOTAL_BYTES = 24 * 1024 * 1024
const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
])
const TEXT_TYPES = new Set([
  "application/json",
  "application/xml",
  "application/javascript",
])

export function safeHttpUrl(value: string, normalize = false): string {
  let url: URL
  try {
    const trimmed = value.trim()
    url = new URL(
      normalize && !/^[a-z][a-z\d+.-]*:/i.test(trimmed)
        ? `https://${trimmed}`
        : trimmed
    )
  } catch {
    throw new Error("请输入完整的 HTTP 或 HTTPS 网址。")
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("网址必须使用 HTTP 或 HTTPS，且不能包含凭据。")
  return url.href
}

export async function serializeRequest(request: ChatRequest) {
  let total = 0
  const messages = []
  for (const message of request.messages) {
    const attachments = []
    for (const attachment of message.attachments ?? []) {
      const mediaType = attachment.mediaType.split(";")[0].trim().toLowerCase()
      if (
        !IMAGE_TYPES.has(mediaType) &&
        !mediaType.startsWith("text/") &&
        !TEXT_TYPES.has(mediaType)
      )
        throw new Error(`暂不支持附件类型：${mediaType || "未知类型"}。`)
      let bytes: Uint8Array | undefined
      if (attachment.file) {
        if (attachment.file.size > MAX_FILE_BYTES)
          throw new Error("每个附件不能超过 8 MiB。")
        bytes = new Uint8Array(await attachment.file.arrayBuffer())
      } else if (attachment.url?.startsWith("data:")) {
        const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(attachment.url)
        if (
          !match ||
          match[1].toLowerCase() !== mediaType ||
          match[3].length > MAX_FILE_BYTES * 4
        )
          throw new Error("附件数据无效或过大。")
        try {
          bytes = match[2]
            ? Uint8Array.from(atob(match[3]), (char) => char.charCodeAt(0))
            : new TextEncoder().encode(decodeURIComponent(match[3]))
        } catch {
          throw new Error("附件数据无效。")
        }
      } else if (attachment.url) {
        if (!IMAGE_TYPES.has(mediaType))
          throw new Error("远程附件目前只支持图像，请直接选择文本文件。")
        attachments.push({
          name: attachment.name,
          mediaType,
          url: safeHttpUrl(attachment.url),
        })
        continue
      } else throw new Error("附件文件已不可用，请重新选择。")
      total += bytes.byteLength
      if (bytes.byteLength > MAX_FILE_BYTES || total > MAX_TOTAL_BYTES)
        throw new Error("每个附件最多 8 MiB，一次发送最多 24 MiB。")
      let binary = ""
      for (let offset = 0; offset < bytes.length; offset += 8192)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
      attachments.push({ name: attachment.name, mediaType, data: btoa(binary) })
    }
    messages.push({
      role: message.role,
      text: message.text,
      ...(attachments.length ? { attachments } : {}),
    })
  }
  return { ...request, messages }
}
