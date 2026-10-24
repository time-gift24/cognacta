import { parseDocument } from "yaml"

export const EMPTY_SKILL_CONTENT = '---\nname: ""\ndescription: ""\n---\n\n'

export function readSkillMetadata(source: string): {
  name: string
  description: string
} {
  const { metadata } = splitFrontmatter(source)
  if (metadata === null)
    throw new Error("请在 SKILL.md 顶部填写以 --- 包围的 name 和 description。")
  let value: unknown
  try {
    const document = parseDocument(metadata)
    if (document.errors.length) throw new Error("Invalid YAML")
    value = document.toJS({ maxAliasCount: 0 })
  } catch {
    throw new Error("SKILL.md 的 YAML 元信息格式无效，请检查后重试。")
  }
  const fields =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  const { name, description } = fields
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 100 ||
    /\p{Cc}/u.test(name)
  )
    throw new Error("frontmatter 的 name 须为 1–100 个可见字符。")
  if (
    typeof description !== "string" ||
    !description.trim() ||
    description.length > 4096 ||
    /\p{Cc}/u.test(description)
  )
    throw new Error("frontmatter 的 description 须为 1–4096 个可见字符。")
  return { name: name.trim(), description: description.trim() }
}

export function splitFrontmatter(source: string): {
  metadata: string | null
  body: string
} {
  const match = /^---\r?\n((?:[^\n]*\n)*?)---(?:\r?\n|$)/.exec(source)
  return match
    ? { metadata: match[1], body: source.slice(match[0].length) }
    : { metadata: null, body: source }
}

export function resolveSkillLink(
  currentPath: string,
  href: string
): { path: string; hash: string } | null {
  const link = href.trim()
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(link) || /\p{Cc}/u.test(link)) {
    return null
  }
  try {
    decodeURI(link)
    const root = new URL("https://skill.invalid/")
    const base = new URL(
      currentPath.split("/").map(encodeURIComponent).join("/"),
      root
    )
    const target = new URL(link, base)
    if (target.origin !== root.origin) return null
    return {
      path: decodeURIComponent(target.pathname.slice(1)),
      hash: decodeURIComponent(target.hash.slice(1)),
    }
  } catch {
    return null
  }
}

export function headingSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-") || "section"
  )
}
