import type { ChatRequest } from "@/chat/dto"
import {
  attachmentIssue,
  IMAGE_MEDIA_TYPES,
  MAX_ATTACHMENT_BYTES,
  MAX_TOTAL_ATTACHMENT_BYTES,
  normalizedMediaType,
  safeHttpUrl,
  validateAttachments,
} from "@/chat/attachments.ts"

export { safeHttpUrl }

function readDataUrl(url: string) {
  return /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(url)
}

export async function serializeRequest(request: ChatRequest) {
  const issue = validateAttachments(
    request.messages.flatMap((message) => message.attachments ?? [])
  )
  if (issue) throw new Error(issue)
  let total = 0
  const messages = []
  for (const message of request.messages) {
    const attachments = []
    for (const attachment of message.attachments ?? []) {
      const mediaType = normalizedMediaType(attachment.mediaType)
      const preflight = attachmentIssue(attachment)
      if (preflight) throw new Error(preflight)
      let bytes: Uint8Array | undefined
      if (attachment.file) {
        if (attachment.file.size > MAX_ATTACHMENT_BYTES)
          throw new Error("每个附件不能超过 8 MiB。")
        bytes = new Uint8Array(await attachment.file.arrayBuffer())
      } else if (attachment.url?.startsWith("data:")) {
        const match = readDataUrl(attachment.url)
        if (
          !match ||
          normalizedMediaType(match[1]) !== mediaType ||
          match[3].length > MAX_ATTACHMENT_BYTES * 4
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
        if (!IMAGE_MEDIA_TYPES.has(mediaType))
          throw new Error("远程附件目前只支持图像，请直接选择文本文件。")
        attachments.push({
          name: attachment.name,
          mediaType,
          url: safeHttpUrl(attachment.url),
        })
        continue
      } else throw new Error("附件文件已不可用，请重新选择。")
      total += bytes.byteLength
      if (
        bytes.byteLength > MAX_ATTACHMENT_BYTES ||
        total > MAX_TOTAL_ATTACHMENT_BYTES
      )
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
