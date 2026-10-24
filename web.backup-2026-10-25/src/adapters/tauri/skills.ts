import {
  MAX_SKILL_FILE_BYTES,
  SkillLibraryError,
  type ManagedSkill,
  type SkillEntry,
  type SkillLibrary,
  type SkillLibraryErrorCode,
} from "@/skills/library"
import { array, boolean, number, object, string } from "./protocol"

type Request = (method: string, params?: Record<string, unknown>) => Promise<unknown>

function readEntry(value: unknown): SkillEntry {
  const raw = object(value)
  if (raw.kind !== "file" && raw.kind !== "folder") throw new Error("Invalid Skill entry")
  return {
    path: string(raw.path),
    kind: raw.kind,
    size: number(raw.size),
    mimeType: string(raw.mimeType),
    modifiedAt: raw.modifiedAt === null ? null : string(raw.modifiedAt),
  }
}
function readSkill(value: unknown): ManagedSkill {
  const raw = object(value)
  if (raw.origin !== "local" && raw.origin !== "official") throw new Error("Invalid Skill origin")
  return {
    id: string(raw.id),
    name: string(raw.name),
    description: string(raw.description),
    origin: raw.origin,
    readOnly: boolean(raw.readOnly),
    ...(raw.version === undefined ? {} : { version: string(raw.version) }),
    ...(raw.contentId === undefined ? {} : { contentId: string(raw.contentId) }),
    modifiedAt: raw.modifiedAt === null ? null : string(raw.modifiedAt),
    entries: array(raw.entries, readEntry),
  }
}
function libraryError(error: unknown): SkillLibraryError {
  if (error instanceof SkillLibraryError) return error
  const original = error instanceof Error && error.cause ? error.cause : error
  const raw = original && typeof original === "object" ? original as Record<string, unknown> : {}
  const codes: Record<string, SkillLibraryErrorCode> = {
    "invalid-request": "path-invalid",
    "file-unavailable": "not-found",
    "conflict": "conflict",
    "read-only": "read-only",
  }
  return new SkillLibraryError(codes[String(raw.kind)] ?? "storage", error instanceof Error ? error.message : typeof raw.message === "string" ? raw.message : "Skill 文件操作失败，请重试。", { cause: error })
}

export async function createTauriSkillLibrary(request: Request): Promise<SkillLibrary> {
  const info = object(await request("skill_library_info"))
  const storage = { kind: "desktop" as const, root: string(info.root) }
  const call = async (method: string, params: Record<string, unknown> = {}) => {
    try { return await request(method, params) }
    catch (error) { throw libraryError(error) }
  }
  const change = async (method: string, params: Record<string, unknown>) => readSkill(await call(method, params))
  return {
    storage,
    list: async () => array(await call("skill_library_list"), readSkill),
    get: id => change("skill_library_get", { id }),
    create: input => change("skill_library_create", input),
    copyToLocal: (id, name) => change("skill_library_copy", { id, name }),
    readFile: async (id, path) => {
      const result = object(await call("skill_library_read", { id, path }))
      const binary = atob(string(result.data))
      return new Blob([Uint8Array.from(binary, character => character.charCodeAt(0))], { type: string(result.mimeType) })
    },
    writeFile: async (id, path, content, options) => {
      if (content.size > MAX_SKILL_FILE_BYTES) throw new SkillLibraryError("storage", "单个文件不能超过 20 MiB。")
      const bytes = new Uint8Array(await content.arrayBuffer())
      const chunks: string[] = []
      for (let offset = 0; offset < bytes.length; offset += 0x8000) chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)))
      return change("skill_library_write", { id, path, data: btoa(chunks.join("")), replace: options?.replace === true })
    },
    createDirectory: (id, path) => change("skill_library_mkdir", { id, path }),
    rename: (id, path, newPath) => change("skill_library_rename", { id, path, to: newPath }),
    remove: (id, path) => change("skill_library_remove", { id, path }),
    deleteSkill: async id => { await call("skill_library_delete", { id }) },
  }
}
