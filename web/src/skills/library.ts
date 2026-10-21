import { fileKey, type SkillDraftCache } from "./drafts.ts"
import type { SkillSource } from "./source.ts"
import { readSkillMetadata } from "./content.ts"

export const MAX_SKILL_FILE_BYTES = 20 * 1024 * 1024
export const MAX_SKILL_PACKAGE_BYTES = 100 * 1024 * 1024
export const MAX_SKILL_ENTRIES = 1000

export type SkillEntry = {
  path: string
  kind: "file" | "folder"
  size: number
  mimeType: string
  modifiedAt: string | null
}

export type ManagedSkill = {
  id: string
  name: string
  description: string
  origin: "local" | "official"
  version?: string
  contentId?: string
  readOnly: boolean
  modifiedAt: string | null
  entries: readonly SkillEntry[]
}

export type SkillLibraryErrorCode =
  "path-invalid" | "conflict" | "read-only" | "not-found" | "storage"

export class SkillLibraryError extends Error {
  readonly code: SkillLibraryErrorCode

  constructor(
    code: SkillLibraryErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = "SkillLibraryError"
    this.code = code
  }
}

/** One identity-scoped library. Mutations resolve only after durable storage.
 * Paths are relative to a Skill package; mutation destinations require an existing parent.
 * Official releases are always read-only.
 * Validation failures leave the package unchanged; callers retain unsaved input on error.
 * Reload before retrying a storage error whose completion could not be confirmed.
 * Operations on one instance are serialized. No subscriptions or background work.
 */
export interface SkillLibrary {
  readonly storage: {
    readonly kind: "browser" | "desktop"
    readonly root: string
  }
  list(): Promise<readonly ManagedSkill[]>
  get(id: string): Promise<ManagedSkill>
  create(input: {
    name: string
    description?: string
    content?: string
    /** Extra draft entries; SKILL.md comes from content. The whole package commits once. */
    entries?: readonly (
      | { path: string; kind: "file"; content: string }
      | { path: string; kind: "folder" }
    )[]
  }): Promise<ManagedSkill>
  copyToLocal(id: string, name?: string): Promise<ManagedSkill>
  readFile(id: string, path: string): Promise<Blob>
  writeFile(
    id: string,
    path: string,
    content: Blob,
    options?: { replace?: boolean }
  ): Promise<ManagedSkill>
  createDirectory(id: string, path: string): Promise<ManagedSkill>
  rename(id: string, path: string, newPath: string): Promise<ManagedSkill>
  remove(id: string, path: string): Promise<ManagedSkill>
  deleteSkill(id: string): Promise<void>
}

export type StoredSkillEntry = SkillEntry & { content?: Blob }
export type StoredSkill = Omit<ManagedSkill, "entries" | "readOnly"> & {
  entries: StoredSkillEntry[]
  deleted?: true
}

/** Adapter-owned storage. save/remove must atomically commit a complete package. */
export interface SkillLibraryPersistence {
  load(): Promise<readonly StoredSkill[]>
  save(skill: StoredSkill): Promise<void>
  remove(id: string): Promise<void>
}

const hasControlCharacters = (value: string) =>
  [...value].some(
    (character) =>
      character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
  )

export function validateSkillPath(path: string): string {
  if (
    !path ||
    path !== path.normalize("NFC") ||
    path.length > 1024 ||
    hasControlCharacters(path) ||
    /[\\:<>"|?*]/.test(path)
  ) {
    throw new SkillLibraryError(
      "path-invalid",
      "请输入 Skill 包内的有效相对路径。"
    )
  }
  const parts = path.split("/")
  if (
    parts.length > 32 ||
    parts.some(
      (part) =>
        !part ||
        part === "." ||
        part === ".." ||
        part.startsWith(".pending-") ||
        /[. ]$/.test(part) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)
    )
  ) {
    throw new SkillLibraryError(
      "path-invalid",
      "路径不能越出 Skill 包，也不能包含系统保留名称。"
    )
  }
  return path
}

const folded = (path: string) => path.toLowerCase()
const conflict = () =>
  new SkillLibraryError(
    "conflict",
    "同名文件或目录已存在，请明确替换或使用其他名称。"
  )
const notFound = () =>
  new SkillLibraryError("not-found", "Skill 或文件已不存在，请刷新后重试。")

export function skillFileMimeType(path: string): string {
  const extension = path.split(".").at(-1)?.toLowerCase()
  return (
    (
      {
        md: "text/markdown",
        txt: "text/plain",
        json: "application/json",
        js: "text/javascript",
        ts: "text/typescript",
        py: "text/x-python",
        sh: "text/x-shellscript",
        yaml: "text/yaml",
        yml: "text/yaml",
        csv: "text/csv",
        html: "text/html",
        css: "text/css",
        svg: "image/svg+xml",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
        gif: "image/gif",
        pdf: "application/pdf",
      } as Record<string, string>
    )[extension ?? ""] ?? "application/octet-stream"
  )
}

function summary(skill: StoredSkill): ManagedSkill {
  return {
    ...skill,
    readOnly: skill.origin === "official",
    entries: skill.entries.map(({ content: _content, ...entry }) => ({
      ...entry,
    })),
  }
}

function addParents(
  entries: StoredSkillEntry[],
  path: string,
  now: string | null
) {
  const segments = path.split("/")
  for (let index = 1; index < segments.length; index++) {
    const parent = segments.slice(0, index).join("/")
    const found = entries.find((entry) => folded(entry.path) === folded(parent))
    if (found && (found.kind !== "folder" || found.path !== parent))
      throw conflict()
    if (!found)
      entries.push({
        path: parent,
        kind: "folder",
        size: 0,
        mimeType: "",
        modifiedAt: now,
      })
  }
}

function requireParent(entries: readonly StoredSkillEntry[], path: string) {
  const parent = path.split("/").slice(0, -1).join("/")
  if (!parent) return
  const found = entries.find((entry) => folded(entry.path) === folded(parent))
  if (!found) throw notFound()
  if (found.kind !== "folder" || found.path !== parent) throw conflict()
}

function validateStoredSkill(skill: StoredSkill) {
  if (
    !skill.id ||
    !skill.name.trim() ||
    !Array.isArray(skill.entries) ||
    !["local", "official"].includes(skill.origin)
  )
    throw new SkillLibraryError(
      "storage",
      "Skill 保存内容无效，原数据未被修改。"
    )
  const paths = new Set<string>()
  for (const entry of skill.entries) {
    validateSkillPath(entry.path)
    if (
      paths.has(folded(entry.path)) ||
      !["file", "folder"].includes(entry.kind)
    )
      throw conflict()
    if (entry.kind === "file" && !(entry.content instanceof Blob))
      throw new SkillLibraryError(
        "storage",
        "文件内容读取失败，原文件未被修改。"
      )
    paths.add(folded(entry.path))
  }
  for (const entry of [...skill.entries])
    addParents(skill.entries, entry.path, skill.modifiedAt)
  const files = skill.entries.filter((entry) => entry.kind === "file")
  if (
    skill.entries.length > MAX_SKILL_ENTRIES ||
    files.some((entry) => entry.content!.size > MAX_SKILL_FILE_BYTES) ||
    files.reduce((size, entry) => size + entry.content!.size, 0) >
      MAX_SKILL_PACKAGE_BYTES
  )
    throw new SkillLibraryError(
      "storage",
      "Skill 最多 1000 项，单文件 20 MiB、总计 100 MiB。"
    )
}

function nameValue(name: string) {
  const value = name.trim()
  if (!value || value.length > 100 || hasControlCharacters(value))
    throw new SkillLibraryError(
      "path-invalid",
      "Skill 名称须为 1–100 个可见字符。"
    )
  return value
}

/** Shared package editing semantics; original SkillSource and legacy drafts stay untouched. */
export function createSkillLibrary({
  source,
  legacyDrafts,
  persistence,
  storage,
  createId = () => crypto.randomUUID(),
  now = () => new Date().toISOString(),
}: {
  source: SkillSource
  legacyDrafts: SkillDraftCache
  persistence: SkillLibraryPersistence
  storage: SkillLibrary["storage"]
  createId?: () => string
  now?: () => string
}): SkillLibrary {
  let tail: Promise<unknown> = Promise.resolve()
  const ordered = <T>(work: () => Promise<T>): Promise<T> => {
    const next = tail.then(work).catch((error) => {
      if (error instanceof SkillLibraryError) throw error
      throw new SkillLibraryError(
        "storage",
        "Skill 保存或读取失败。请保留当前内容后重试。",
        { cause: error }
      )
    })
    tail = next.catch(() => {})
    return next
  }
  const load = async () => {
    const [originals, stored] = await Promise.all([
      source.list(),
      persistence.load(),
    ])
    const drafts = await legacyDrafts.load(originals)
    const packages = new Map<string, StoredSkill>()
    for (const original of originals) {
      const origin = original.origin ?? "local"
      const entries: StoredSkillEntry[] = original.files.map((file) => {
        const content = new Blob(
          [
            origin === "local"
              ? (drafts[fileKey(original.id, file.path)] ?? file.content)
              : file.content,
          ],
          { type: skillFileMimeType(file.path) }
        )
        return {
          path: file.path,
          kind: "file",
          size: content.size,
          mimeType: content.type,
          modifiedAt: null,
          content,
        }
      })
      const item = {
        id: original.id,
        name: original.name,
        description: original.description,
        origin,
        version: original.version,
        modifiedAt: null,
        entries,
      }
      validateStoredSkill(item)
      packages.set(item.id, item)
    }
    for (const item of stored) {
      const copy = {
        ...item,
        entries: item.entries.map((entry) => ({ ...entry })),
      }
      validateStoredSkill(copy)
      // A local draft must never override an official release supplied by the source.
      if (packages.get(copy.id)?.origin !== "official") {
        if (copy.deleted) packages.delete(copy.id)
        else packages.set(copy.id, copy)
      }
    }
    return packages
  }
  const find = (packages: Map<string, StoredSkill>, id: string) => {
    const found = packages.get(id)
    if (!found) throw notFound()
    return found
  }
  const editable = (skill: StoredSkill) => {
    if (skill.origin === "official")
      throw new SkillLibraryError(
        "read-only",
        "官方已发布 Skill 只读。请先复制为本地 Skill。"
      )
  }
  const change = (
    id: string,
    update: (skill: StoredSkill, timestamp: string) => void | Promise<void>
  ) =>
    ordered(async () => {
      const skill = find(await load(), id)
      editable(skill)
      const timestamp = now()
      await update(skill, timestamp)
      skill.modifiedAt = timestamp
      validateStoredSkill(skill)
      await persistence.save(skill)
      return summary(skill)
    })
  return {
    storage,
    list: () => ordered(async () => [...(await load()).values()].map(summary)),
    get: (id) => ordered(async () => summary(find(await load(), id))),
    create: (input) =>
      ordered(async () => {
        const name = nameValue(input.name)
        const timestamp = now()
        const description = input.description?.trim() ?? ""
        if (description.length > 4096)
          throw new SkillLibraryError(
            "path-invalid",
            "Skill 描述最多 4096 字符。"
          )
        if (
          (input.content !== undefined && typeof input.content !== "string") ||
          (input.entries !== undefined && !Array.isArray(input.entries))
        )
          throw new SkillLibraryError(
            "path-invalid",
            "Skill 初始文件内容无效。"
          )
        const content = new Blob(
          [
            input.content ??
              `---\nname: ${JSON.stringify(name)}\ndescription: ${JSON.stringify(description)}\n---\n\n# ${name}\n\n${description}\n`,
          ],
          { type: "text/markdown" }
        )
        const skill: StoredSkill = {
          id: createId(),
          name,
          description: input.description?.trim() ?? "",
          origin: "local",
          modifiedAt: timestamp,
          entries: [
            {
              path: "SKILL.md",
              kind: "file",
              size: content.size,
              mimeType: content.type,
              modifiedAt: timestamp,
              content,
            },
          ],
        }
        for (const entry of input.entries ?? []) {
          if (
            !entry ||
            typeof entry.path !== "string" ||
            (entry.kind !== "file" && entry.kind !== "folder") ||
            (entry.kind === "file" && typeof entry.content !== "string") ||
            (entry.kind === "folder" && "content" in entry)
          )
            throw new SkillLibraryError(
              "path-invalid",
              "Skill 初始文件内容无效。"
            )
          const content =
            entry.kind === "file"
              ? new Blob([entry.content], {
                  type: skillFileMimeType(entry.path),
                })
              : undefined
          skill.entries.push({
            path: entry.path,
            kind: entry.kind,
            size: content?.size ?? 0,
            mimeType: content?.type ?? "",
            modifiedAt: timestamp,
            ...(content ? { content } : {}),
          })
        }
        if ((await load()).has(skill.id)) throw conflict()
        validateStoredSkill(skill)
        await persistence.save(skill)
        return summary(skill)
      }),
    copyToLocal: (id, name) =>
      ordered(async () => {
        const packages = await load()
        const original = find(packages, id)
        const timestamp = now()
        const skill: StoredSkill = {
          ...original,
          id: createId(),
          name: nameValue(name ?? `${original.name} 副本`),
          origin: "local",
          version: undefined,
          modifiedAt: timestamp,
          entries: original.entries.map((entry) => ({
            ...entry,
            modifiedAt: timestamp,
          })),
        }
        if (packages.has(skill.id)) throw conflict()
        await persistence.save(skill)
        return summary(skill)
      }),
    readFile: (id, path) =>
      ordered(async () => {
        validateSkillPath(path)
        const entry = find(await load(), id).entries.find(
          (entry) => entry.path === path
        )
        if (entry?.kind !== "file" || !entry.content) throw notFound()
        return entry.content
      }),
    writeFile: (id, path, content, options = {}) =>
      change(id, async (skill, timestamp) => {
        validateSkillPath(path)
        if (!(content instanceof Blob))
          throw new SkillLibraryError(
            "storage",
            "文件内容不可用，请重新选择文件。"
          )
        if (content.size > MAX_SKILL_FILE_BYTES)
          throw new SkillLibraryError(
            "storage",
            "单个文件不能超过 20 MiB，请选择较小的文件。"
          )
        const existing = skill.entries.find(
          (entry) => folded(entry.path) === folded(path)
        )
        if (
          existing &&
          (existing.kind !== "file" ||
            existing.path !== path ||
            !options.replace)
        )
          throw conflict()
        requireParent(skill.entries, path)
        if (path === "SKILL.md") {
          const source = await content.text()
          if (/^---(?:\r?\n|$)/u.test(source)) {
            try {
              Object.assign(skill, readSkillMetadata(source))
            } catch (cause) {
              throw new SkillLibraryError(
                "path-invalid",
                cause instanceof Error ? cause.message : "Skill 元信息无效。",
                { cause }
              )
            }
          }
        }
        const entry: StoredSkillEntry = {
          path,
          kind: "file",
          size: content.size,
          mimeType: content.type || skillFileMimeType(path),
          modifiedAt: timestamp,
          content,
        }
        skill.entries = skill.entries
          .filter((item) => item.path !== path)
          .concat(entry)
      }),
    createDirectory: (id, path) =>
      change(id, (skill, timestamp) => {
        validateSkillPath(path)
        if (skill.entries.some((entry) => folded(entry.path) === folded(path)))
          throw conflict()
        requireParent(skill.entries, path)
        skill.entries.push({
          path,
          kind: "folder",
          size: 0,
          mimeType: "",
          modifiedAt: timestamp,
        })
      }),
    rename: (id, path, newPath) =>
      change(id, (skill, timestamp) => {
        validateSkillPath(path)
        validateSkillPath(newPath)
        if (!skill.entries.some((entry) => entry.path === path))
          throw notFound()
        if (path === newPath) return
        if (folded(path) === folded(newPath)) throw conflict()
        if (folded(newPath).startsWith(`${folded(path)}/`))
          throw new SkillLibraryError(
            "path-invalid",
            "不能把目录移动到其自身内部。"
          )
        const moving = skill.entries.filter(
          (entry) => entry.path === path || entry.path.startsWith(`${path}/`)
        )
        const remaining = skill.entries.filter(
          (entry) => !moving.includes(entry)
        )
        const renamed = moving.map((entry) => ({
          ...entry,
          path: `${newPath}${entry.path.slice(path.length)}`,
          modifiedAt: timestamp,
        }))
        if (
          renamed.some((entry) =>
            remaining.some((other) => folded(other.path) === folded(entry.path))
          )
        )
          throw conflict()
        requireParent(skill.entries, newPath)
        skill.entries = [
          ...remaining.filter(
            (entry) => !renamed.some((item) => item.path === entry.path)
          ),
          ...renamed,
        ]
      }),
    remove: (id, path) =>
      change(id, (skill) => {
        validateSkillPath(path)
        if (!skill.entries.some((entry) => entry.path === path))
          throw notFound()
        skill.entries = skill.entries.filter(
          (entry) => entry.path !== path && !entry.path.startsWith(`${path}/`)
        )
      }),
    deleteSkill: (id) =>
      ordered(async () => {
        const skill = find(await load(), id)
        editable(skill)
        // Hiding a source package never deletes its original contents or legacy drafts.
        if ((await source.list()).some((original) => original.id === id))
          await persistence.save({
            ...skill,
            entries: [],
            deleted: true,
            modifiedAt: now(),
          })
        else await persistence.remove(id)
      }),
  }
}
