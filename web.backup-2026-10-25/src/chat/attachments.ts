/** 附件边界：提交前预检与运行态序列化共用同一套可接受格式。 */

import type { ChatInputAttachment } from "./dto.ts"

export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024
export const MAX_TOTAL_ATTACHMENT_BYTES = 24 * 1024 * 1024

export const IMAGE_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
])
export const TEXT_MEDIA_TYPES = new Set([
  "application/json",
  "application/xml",
  "application/javascript",
])

export function normalizedMediaType(mediaType: string): string {
  return mediaType.split(";")[0].trim().toLowerCase()
}

export function supportedMediaType(mediaType: string): boolean {
  return (
    IMAGE_MEDIA_TYPES.has(mediaType) ||
    mediaType.startsWith("text/") ||
    TEXT_MEDIA_TYPES.has(mediaType)
  )
}

/** Accepts only complete HTTP(S) URLs without embedded credentials. */
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

type DataUrlMatch = RegExpExecArray & {
  1: string
  2: string | undefined
  3: string
}

function readDataUrl(url: string): DataUrlMatch | null {
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(url)
  return match as DataUrlMatch | null
}

/** Decoded payload length; invalid encoding is reported as unusable data. */
export function dataUrlByteLength(match: DataUrlMatch): number {
  if (match[2]) {
    const payload = match[3].replace(/=+$/, "")
    return Math.floor((payload.length * 3) / 4)
  }
  try {
    return new TextEncoder().encode(decodeURIComponent(match[3])).length
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

/**
 * Validate one attachment without reading it, so the answer is available
 * before a submission is accepted. Returns the user-facing reason or null.
 */
export function attachmentIssue(
  attachment: ChatInputAttachment
): string | null {
  const mediaType = normalizedMediaType(attachment.mediaType)
  if (!supportedMediaType(mediaType))
    return `暂不支持附件类型：${mediaType || "未知类型"}。`
  if (attachment.file) {
    if (attachment.file.size > MAX_ATTACHMENT_BYTES)
      return "每个附件不能超过 8 MiB。"
    return null
  }
  if (attachment.url?.startsWith("data:")) {
    const match = readDataUrl(attachment.url)
    if (
      !match ||
      normalizedMediaType(match[1]) !== mediaType ||
      match[3].length > MAX_ATTACHMENT_BYTES * 4
    )
      return "附件数据无效或过大。"
    const bytes = dataUrlByteLength(match)
    if (bytes > MAX_ATTACHMENT_BYTES)
      return "每个附件不能超过 8 MiB。"
    return null
  }
  if (attachment.url) {
    if (!IMAGE_MEDIA_TYPES.has(mediaType))
      return "远程附件目前只支持图像，请直接选择文本文件。"
    try {
      safeHttpUrl(attachment.url)
    } catch (cause) {
      return cause instanceof Error
        ? cause.message
        : "请输入完整的 HTTP 或 HTTPS 网址。"
    }
    return null
  }
  return "附件文件已不可用，请重新选择。"
}

/** Declared-size total; files are not read here. */
export function attachmentByteLength(attachment: ChatInputAttachment): number {
  if (attachment.file) return attachment.file.size
  if (attachment.url?.startsWith("data:")) {
    const match = readDataUrl(attachment.url)
    return match ? dataUrlByteLength(match) : 0
  }
  return 0
}

/**
 * Preflight every attachment before accepting a submission. The rules match
 * the desktop serializer, which still re-checks bytes after reading files.
 */
export function validateAttachments(
  attachments: readonly ChatInputAttachment[]
): string | null {
  let total = 0
  for (const attachment of attachments) {
    const issue = attachmentIssue(attachment)
    if (issue) return issue
    total += attachmentByteLength(attachment)
    if (total > MAX_TOTAL_ATTACHMENT_BYTES)
      return "每个附件最多 8 MiB，一次发送最多 24 MiB。"
  }
  return null
}
