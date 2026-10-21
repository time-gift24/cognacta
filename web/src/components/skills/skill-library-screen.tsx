import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  BookOpen,
  ChevronRight,
  Copy,
  FileText,
  FolderOpen,
  LockKeyhole,
  Search,
  Trash2,
} from "lucide-react"
import { useAppDependencies } from "@/app/dependencies"
import { Button } from "@/components/motion/button"
import { Input } from "@/components/motion/input"
import { useToast } from "@/components/ui/toast"
import { useSaveShortcut } from "@/hooks/use-save-shortcut"
import { HugeiconsIcon } from "@hugeicons/react"
import { Bug01Icon } from "@hugeicons-pro/core-stroke-rounded"
import { SkillDocument } from "./skill-document"
import { SkillScreen } from "./skill-screen"
import type { Skill } from "@/skills/source"
import { EMPTY_SKILL_CONTENT, readSkillMetadata } from "@/skills/content"
import {
  skillFileMimeType,
  validateSkillPath,
  type ManagedSkill,
  type SkillEntry,
  type SkillLibrary,
} from "@/skills/library"
import { cn } from "@/lib/utils"
import "./skill-library.css"

type Edit = { value: string; saved: string }
const DRAFT_ID = "\u0000new-skill"
const draftEntry = (
  path: string,
  kind: "file" | "folder" = "file"
): SkillEntry => ({
  path,
  kind,
  size: 0,
  mimeType: kind === "file" ? skillFileMimeType(path) : "",
  modifiedAt: null,
})
const EMPTY_ENTRY: SkillEntry = { ...draftEntry(""), mimeType: "text/plain" }
const editKey = (id: string, path: string) => `${id}\u0000${path}`
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "操作失败，请保留当前内容后重试。"
const filename = (path: string) => path.split("/").at(-1) ?? path
const textFile = (entry: SkillEntry) =>
  entry.mimeType.startsWith("text/") ||
  /\.(md|mdx|txt|json|ya?ml|toml|ts|tsx|js|jsx|py|sh|css|html|csv|xml|svg|ini|conf|log)$/i.test(
    entry.path
  )
function SkillSourceLabel({ skill }: { skill: ManagedSkill }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]",
        skill.origin === "official"
          ? "bg-primary/8 text-primary"
          : "bg-muted text-muted-foreground"
      )}
    >
      {skill.origin === "official" ? <LockKeyhole className="size-3" /> : null}
      {skill.origin === "official" ? "官方" : "本地"}
    </span>
  )
}

function FilePreview({
  readFile,
  skill,
  entry,
  edit,
  files,
  onEdit,
  onLoaded,
  busy,
  onSave,
  onOpenFile,
  active,
  actions,
  initialEditing = false,
  locked = false,
  onAddFile,
  onAddDirectory,
  onRenameEntry,
  onDeleteEntry,
  creating = false,
  onDiscard,
}: {
  readFile: SkillLibrary["readFile"]
  skill: ManagedSkill
  entry: SkillEntry
  edit: Edit | undefined
  files: readonly { path: string; modified: boolean }[]
  onEdit: (value: string) => void
  onLoaded: (value: string) => void
  busy: boolean
  onSave: (value: string) => Promise<void>
  onOpenFile: (path: string) => void
  active: boolean
  actions: ReactNode
  initialEditing?: boolean
  locked?: boolean
  onAddFile?: (path: string, content: Blob, replace?: boolean) => Promise<void>
  onAddDirectory?: (path: string) => Promise<void>
  onRenameEntry?: (path: string, newPath: string) => Promise<void>
  onDeleteEntry?: (path: string) => Promise<void>
  creating?: boolean
  onDiscard?: () => void
}) {
  const [readResult, setLoaded] = useState<{
    entry: SkillEntry
    text?: string
    url: string
  } | null>(null)
  const loaded = readResult?.entry === entry ? readResult : null
  const [error, setError] = useState("")
  const [readError, setReadError] = useState<{
    entry: SkillEntry
    message: string
  } | null>(null)
  const [readAttempt, setReadAttempt] = useState(0)
  const readFailure = readError?.entry === entry ? readError.message : ""
  const [editingPath, setEditingPath] = useState<string | null>(
    initialEditing ? entry.path : null
  )
  const editing = creating || editingPath === entry.path
  const isText = textFile(entry)
  const loadCallback = useRef(onLoaded)
  const currentSource = useRef("")
  const currentEntry = useRef(entry)
  const mounted = useRef(false)
  const currentActive = useRef(active)
  const source = edit?.value ?? loaded?.text ?? ""
  const ready = !entry.path || !!loaded || (isText && edit !== undefined)
  const retryRead = () => {
    setReadError(null)
    setReadAttempt((value) => value + 1)
  }
  useLayoutEffect(() => {
    loadCallback.current = onLoaded
    currentSource.current = source
    currentEntry.current = entry
    currentActive.current = active
  }, [onLoaded, source, entry, active])
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (!entry.path) return
    let live = true
    let url: string | undefined
    void readFile(skill.id, entry.path)
      .then(async (blob) => {
        const text = isText ? await blob.text() : undefined
        if (!live || currentEntry.current !== entry) return
        url = URL.createObjectURL(blob)
        setLoaded({ entry, text, url })
        setReadError(null)
        setError("")
        if (text !== undefined) loadCallback.current(text)
      })
      .catch((cause: unknown) => {
        if (live)
          setReadError({
            entry,
            message: errorMessage(cause),
          })
      })
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [readFile, skill.id, entry, isText, readAttempt])
  const dirty = !!edit && edit.value !== edit.saved
  async function save() {
    if (busy || !ready || !editing || skill.readOnly) return
    if (!dirty && !creating) {
      setEditingPath(null)
      return
    }
    try {
      await onSave(source)
      if (
        mounted.current &&
        currentEntry.current.path === entry.path &&
        currentSource.current === source
      )
        setEditingPath(null)
    } catch {
      // The library displays the error; keep the current editor available for retry.
    }
  }
  useSaveShortcut({
    active,
    enabled: editing,
    onSave: () => void save(),
  })
  return (
    <section
      className="skill-file-preview flex min-h-0 flex-1 flex-col"
      aria-label={`${entry.path} 文件内容`}
    >
      {error || (readFailure && ready) ? (
        <div
          role="alert"
          className="mx-5 my-3 flex flex-wrap items-center gap-3 text-sm text-destructive"
        >
          <p>{error || readFailure}</p>
          {readFailure && ready ? (
            <Button variant="outline" size="sm" onClick={retryRead}>
              重新读取文件
            </Button>
          ) : null}
        </div>
      ) : null}
      <SkillDocument
        files={files}
        entries={skill.entries}
        path={entry.path}
        source={source}
        active={active}
        actions={actions}
        loading={!ready && !readFailure}
        busy={busy}
        dirty={dirty}
        readOnly={
          locked || skill.readOnly || !isText || (!ready && !!readFailure)
        }
        editing={editing}
        saveLabel={creating ? "保存 Skill" : "保存文件"}
        onEdit={() => setEditingPath(entry.path)}
        onSave={() => void save()}
        onUndo={() => {
          if (onDiscard) {
            onDiscard()
            return
          }
          onEdit(edit?.saved ?? loaded?.text ?? "")
          setEditingPath(null)
          setError("")
        }}
        onChange={onEdit}
        onSelectFile={(path) => {
          setEditingPath(creating ? path : null)
          setError("")
          onOpenFile(path)
        }}
        onAddFile={
          onAddFile
            ? async (path, content, replace) => {
                await onAddFile(path, content, replace)
                if (
                  mounted.current &&
                  currentActive.current &&
                  currentEntry.current.path === entry.path
                ) {
                  setEditingPath(path)
                  onOpenFile(path)
                }
              }
            : undefined
        }
        onAddDirectory={onAddDirectory}
        onRenameEntry={
          onRenameEntry
            ? async (path, newPath) => {
                await onRenameEntry(path, newPath)
                if (mounted.current)
                  setEditingPath((current) =>
                    current &&
                    (current === path || current.startsWith(`${path}/`))
                      ? newPath + current.slice(path.length)
                      : current
                  )
              }
            : undefined
        }
        onDeleteEntry={
          onDeleteEntry
            ? async (path) => {
                await onDeleteEntry(path)
                if (mounted.current)
                  setEditingPath((current) =>
                    current &&
                    (current === path || current.startsWith(`${path}/`))
                      ? null
                      : current
                  )
              }
            : undefined
        }
        onError={setError}
        preview={
          readFailure && !ready ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-6 text-center">
              <p role="alert" className="text-sm text-destructive">
                {readFailure}
              </p>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={retryRead}
              >
                重新读取文件
              </Button>
            </div>
          ) : !isText ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-8">
              {!loaded ? (
                <p role="status">正在读取文件…</p>
              ) : entry.mimeType.startsWith("image/") ? (
                <img
                  src={loaded.url}
                  alt={filename(entry.path)}
                  width={800}
                  height={600}
                  className="max-h-[60vh] max-w-full object-contain"
                />
              ) : (
                <>
                  <FileText className="size-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    此文件暂不支持预览。
                  </p>
                </>
              )}
            </div>
          ) : undefined
        }
      />
    </section>
  )
}

export function SkillLibraryScreen({
  skillId,
  onOpenSkill,
  onCatalogChange,
  onExperiment,
  active = true,
  creating = false,
}: {
  skillId: string | null
  onOpenSkill: (id: string | null) => void
  onCatalogChange?: (skills: readonly ManagedSkill[]) => void
  onExperiment?: (skillId: string) => void
  active?: boolean
  creating?: boolean
}) {
  const { skillLibrary: library, skills: source } = useAppDependencies()
  const [catalog, setCatalog] = useState<readonly ManagedSkill[]>([])
  const [sourceSkills, setSourceSkills] = useState<readonly Skill[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const toast = useToast()
  const showError = useCallback(
    (message: string) => {
      toast.dismissKey("skill-library-notice")
      toast.notify({
        key: "skill-library-error",
        title: message,
        tone: "error",
      })
    },
    [toast]
  )
  const showNotice = useCallback(
    (message: string) => {
      toast.dismissKey("skill-library-error")
      toast.notify({
        key: "skill-library-notice",
        title: message,
        tone: "success",
      })
    },
    [toast]
  )
  const [busy, setBusy] = useState(false)
  const [entriesLocked, setEntriesLocked] = useState(false)
  const operation = useRef(false)
  const mounted = useRef(false)
  const scope = useRef(skillId)
  const currentActive = useRef(active)
  const currentCreating = useRef(creating)
  const callback = useRef(onCatalogChange)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "local" | "official">("all")
  const [draftEntries, setDraftEntries] = useState<readonly SkillEntry[]>(
    () => [draftEntry("SKILL.md")]
  )
  const searchInput = useRef<HTMLInputElement>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, string | null>>({})
  const [edits, setEdits] = useState<Record<string, Edit>>(() => ({
    [editKey(DRAFT_ID, "SKILL.md")]: {
      value: EMPTY_SKILL_CONTENT,
      saved: EMPTY_SKILL_CONTENT,
    },
  }))
  const currentEdits = useRef(edits)
  const currentSelected = useRef(selected)
  useLayoutEffect(() => {
    scope.current = skillId
    currentActive.current = active
    currentCreating.current = creating
    callback.current = onCatalogChange
    currentEdits.current = edits
    currentSelected.current = selected
  }, [skillId, active, creating, onCatalogChange, edits, selected])
  useEffect(() => {
    mounted.current = true
    let live = true
    const list = library
      ? library.list()
      : source.list().then((items) => {
          if (live) setSourceSkills(items)
          return items.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            origin: item.origin ?? "local",
            version: item.version,
            readOnly: true,
            modifiedAt: null,
            entries: item.files.map((file) => ({
              path: file.path,
              kind: "file" as const,
              size: new Blob([file.content]).size,
              mimeType: skillFileMimeType(file.path),
              modifiedAt: null,
            })),
          }))
        })
    void list
      .then((items) => {
        if (live) {
          setCatalog(items)
          setLoadFailed(false)
          setLoaded(true)
        }
      })
      .catch((cause: unknown) => {
        if (live) {
          showError(errorMessage(cause))
          setLoadFailed(true)
          setLoaded(true)
        }
      })
    return () => {
      live = false
      mounted.current = false
    }
  }, [library, source, loadAttempt, showError])
  const unsaved =
    Object.values(edits).some((edit) => edit.value !== edit.saved) ||
    draftEntries.length !== 1 ||
    draftEntries[0]?.path !== "SKILL.md" ||
    draftEntries[0]?.kind !== "file"
  useEffect(() => {
    if (!unsaved) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [unsaved])
  const skill: ManagedSkill | undefined = creating
    ? {
        id: DRAFT_ID,
        name: "新建 Skill",
        description: "",
        origin: "local",
        readOnly: false,
        modifiedAt: null,
        entries: draftEntries,
      }
    : catalog.find((item) => item.id === skillId)
  const readFile = useCallback<SkillLibrary["readFile"]>(
    async (id, path) => {
      if (id === DRAFT_ID) {
        const edit = currentEdits.current[editKey(id, path)]
        if (!edit) throw new Error("文件不存在，请从文件导航选择文件。")
        return new Blob([edit.saved], { type: skillFileMimeType(path) })
      }
      if (!library) throw new Error("当前接入的 Skill 仅供阅读。")
      return library.readFile(id, path)
    },
    [library]
  )
  const selectedPath =
    skill &&
    (skill.entries.find(
      (item) => item.kind === "file" && item.path === selected[skill.id]
    )?.path ??
      skill.entries.find((item) => item.path === "SKILL.md")?.path ??
      skill.entries.find((item) => item.kind === "file")?.path)
  const entry = skill?.entries.find(
    (item) => item.path === selectedPath && item.kind === "file"
  )
  const update = useCallback((next: ManagedSkill) => {
    if (!mounted.current) return
    setCatalog((current) => {
      const items = current.some((item) => item.id === next.id)
        ? current.map((item) => (item.id === next.id ? next : item))
        : [...current, next]
      return items
    })
  }, [])
  useEffect(() => {
    if (loaded && !loadFailed) callback.current?.(catalog)
  }, [catalog, loaded, loadFailed])
  async function run<T>(work: () => Promise<T>, success?: string): Promise<T> {
    if (operation.current) throw new Error("正在保存，请稍后再试。")
    operation.current = true
    setBusy(true)
    toast.dismissKey("skill-library-error")
    toast.dismissKey("skill-library-notice")
    const target = scope.current
    try {
      const result = await work()
      if (mounted.current && scope.current === target && success)
        showNotice(success)
      return result
    } catch (cause) {
      if (mounted.current && scope.current === target)
        showError(errorMessage(cause))
      throw cause
    } finally {
      operation.current = false
      if (mounted.current) setBusy(false)
    }
  }
  async function create() {
    if (operation.current || !library) return
    const snapshot = currentEdits.current
    try {
      const main = snapshot[editKey(DRAFT_ID, "SKILL.md")]
      if (
        !main ||
        !draftEntries.some(
          (entry) => entry.path === "SKILL.md" && entry.kind === "file"
        )
      )
        throw new Error("请先添加 SKILL.md 入口文件，再保存 Skill。")
      const content = main.value
      if (new Blob([content]).size > 256 * 1024)
        throw new Error("SKILL.md 不能超过 256 KiB，请精简内容后保存。")
      const metadata = readSkillMetadata(content)
      await run(async () => {
        const entries = draftEntries
          .filter((entry) => entry.path !== "SKILL.md")
          .map((entry) =>
            entry.kind === "folder"
              ? { path: entry.path, kind: "folder" as const }
              : {
                  path: entry.path,
                  kind: "file" as const,
                  content: snapshot[editKey(DRAFT_ID, entry.path)].value,
                }
          )
        const created = await library.create({ ...metadata, content, entries })
        update(created)
        if (mounted.current) {
          setEdits((current) => {
            const next = Object.fromEntries(
              Object.entries(current).filter(
                ([key]) => !key.startsWith(`${DRAFT_ID}\u0000`)
              )
            )
            for (const entry of draftEntries) {
              if (entry.kind !== "file") continue
              const key = editKey(DRAFT_ID, entry.path)
              next[editKey(created.id, entry.path)] = {
                value: current[key]?.value ?? snapshot[key].value,
                saved: snapshot[key].value,
              }
            }
            next[editKey(DRAFT_ID, "SKILL.md")] = {
              value: EMPTY_SKILL_CONTENT,
              saved: EMPTY_SKILL_CONTENT,
            }
            return next
          })
          setSelected((current) => ({
            ...current,
            [created.id]: currentSelected.current[DRAFT_ID] ?? "SKILL.md",
            [DRAFT_ID]: null,
          }))
          setDraftEntries([draftEntry("SKILL.md")])
          if (
            scope.current === null &&
            currentActive.current &&
            currentCreating.current
          )
            onOpenSkill(created.id)
        }
      })
    } catch (cause) {
      if (mounted.current && currentCreating.current && scope.current === null)
        showError(errorMessage(cause))
      throw cause
    }
  }
  async function copy(item: ManagedSkill) {
    if (!library) return
    const startingScope = scope.current
    try {
      await run(async () => {
        const copied = await library.copyToLocal(item.id)
        update(copied)
        if (
          mounted.current &&
          scope.current === startingScope &&
          currentActive.current
        )
          onOpenSkill(copied.id)
      }, "已复制为本地 Skill")
    } catch {
      /* Error is displayed by run. */
    }
  }
  async function deleteSkill(item: ManagedSkill) {
    if (!library) return
    try {
      await run(async () => {
        await library.deleteSkill(item.id)
        if (mounted.current) {
          setCatalog((current) =>
            current.filter((value) => value.id !== item.id)
          )
          setDeleting(null)
          setEdits((current) =>
            Object.fromEntries(
              Object.entries(current).filter(
                ([key]) => !key.startsWith(`${item.id}\u0000`)
              )
            )
          )
          setSelected((current) => ({ ...current, [item.id]: null }))
          if (scope.current === item.id && currentActive.current)
            onOpenSkill(null)
        }
      }, "Skill 已删除")
    } catch {
      /* Confirmation remains open for retry. */
    }
  }
  async function mutate(work: () => Promise<ManagedSkill>, success: string) {
    return run(async () => {
      const result = await work()
      update(result)
    }, success)
  }
  async function mutateEntries(
    work: () => Promise<ManagedSkill>,
    success: string
  ) {
    if (operation.current) throw new Error("正在保存，请稍后再试。")
    setEntriesLocked(true)
    try {
      await mutate(work, success)
    } finally {
      if (mounted.current) setEntriesLocked(false)
    }
  }
  async function changeEntry(
    action: "rename" | "remove",
    path: string,
    newPath = ""
  ) {
    if (!skill || !library || skill.readOnly)
      throw new Error("当前 Skill 仅供阅读。")
    if (operation.current) throw new Error("正在保存，请稍后再试。")
    const contains = (candidate: string) =>
      candidate === path || candidate.startsWith(`${path}/`)
    const renamedPath = (candidate: string) =>
      newPath + candidate.slice(path.length)
    const id = skill.id
    setEntriesLocked(true)
    try {
      await run(
        async () => {
          validateSkillPath(path)
          if (!skill.entries.some((entry) => entry.path === path))
            throw new Error("文件或目录已不存在。")
          if (
            action === "remove" &&
            !creating &&
            Object.entries(currentEdits.current).some(
              ([key, edit]) =>
                key.startsWith(`${id}\u0000`) &&
                contains(key.slice(id.length + 1)) &&
                edit.value !== edit.saved
            )
          )
            throw new Error("目标包含未保存编辑，请先保存或撤销后重试。")
          let next: ManagedSkill
          if (creating) {
            const remaining = skill.entries.filter(
              (entry) => !contains(entry.path)
            )
            if (action === "rename") {
              validateSkillPath(newPath)
              if (path === newPath) return
              if (newPath.toLowerCase().startsWith(`${path.toLowerCase()}/`))
                throw new Error("不能把目录移动到其自身内部。")
              if (path.toLowerCase() === newPath.toLowerCase())
                throw new Error("名称仅大小写不同，请使用其他名称。")
              const occupied = new Set(
                remaining.map((entry) => entry.path.toLowerCase())
              )
              const moved = skill.entries
                .filter((entry) => contains(entry.path))
                .map((entry) => ({
                  ...entry,
                  path: renamedPath(entry.path),
                  mimeType:
                    entry.kind === "file"
                      ? skillFileMimeType(renamedPath(entry.path))
                      : "",
                }))
              for (const entry of moved) validateSkillPath(entry.path)
              if (moved.some((entry) => occupied.has(entry.path.toLowerCase())))
                throw new Error("同名文件或目录已存在，请使用其他名称。")
              const parent = newPath.slice(
                0,
                Math.max(0, newPath.lastIndexOf("/"))
              )
              if (
                parent &&
                !remaining.some(
                  (entry) => entry.path === parent && entry.kind === "folder"
                )
              )
                throw new Error("上级目录不存在，请重新选择。")
              next = { ...skill, entries: [...remaining, ...moved] }
            } else next = { ...skill, entries: remaining }
          } else
            next =
              action === "rename"
                ? await library.rename(id, path, newPath)
                : await library.remove(id, path)
          if (!mounted.current) return
          if (creating) setDraftEntries(next.entries)
          else update(next)
          setEdits((current) =>
            Object.fromEntries(
              Object.entries(current).flatMap(([key, edit]) => {
                if (
                  !key.startsWith(`${id}\u0000`) ||
                  !contains(key.slice(id.length + 1))
                )
                  return [[key, edit]]
                return action === "rename"
                  ? [[editKey(id, renamedPath(key.slice(id.length + 1))), edit]]
                  : []
              })
            )
          )
          setSelected((current) => {
            const selected = current[id] ?? selectedPath
            if (!selected || !contains(selected)) return current
            return {
              ...current,
              [id]: action === "rename" ? renamedPath(selected) : null,
            }
          })
        },
        action === "rename" ? "已重命名" : "已删除"
      )
    } finally {
      if (mounted.current) setEntriesLocked(false)
    }
  }
  async function experiment() {
    if (!skill || skill.readOnly || !onExperiment || !library) return
    const main = skill.entries.find(
      (item) => item.kind === "file" && item.path === "SKILL.md"
    )
    if (!main) {
      showError("请先新建或上传 SKILL.md，再开始实验。")
      return
    }
    const mainEdit = currentEdits.current[editKey(skill.id, "SKILL.md")]
    if ((mainEdit ? new Blob([mainEdit.value]).size : main.size) > 256 * 1024) {
      showError(
        "SKILL.md 不能超过 256 KiB，请精简入口并将参考资料拆分为独立文件。"
      )
      setSelected((current) => ({ ...current, [skill.id]: "SKILL.md" }))
      return
    }
    const id = skill.id
    const snapshot = currentEdits.current
    try {
      await run(async () => {
        for (const [key, edit] of Object.entries(snapshot)) {
          if (!key.startsWith(`${id}\u0000`) || edit.value === edit.saved)
            continue
          const path = key.slice(id.length + 1)
          const next = await library.writeFile(
            id,
            path,
            new Blob([edit.value], { type: skillFileMimeType(path) }),
            { replace: true }
          )
          update(next)
          if (mounted.current)
            setEdits((current) => ({
              ...current,
              [key]: { ...current[key], saved: edit.value },
            }))
        }
      })
      if (mounted.current && scope.current === id && currentActive.current) {
        if (
          Object.entries(currentEdits.current).some(
            ([key, edit]) =>
              key.startsWith(`${id}\u0000`) &&
              edit.value !== (snapshot[key]?.value ?? edit.saved)
          )
        ) {
          showError("保存期间还有新的修改，请再次点击实验以使用最新内容。")
          return
        }
        onExperiment(id)
      }
    } catch {
      /* run preserves drafts and displays the failure. */
    }
  }
  const pathKey = skill && entry ? editKey(skill.id, entry.path) : ""
  const visible = catalog.filter(
    (item) =>
      (filter === "all" || item.origin === filter) &&
      `${item.name} ${item.description}`
        .toLowerCase()
        .includes(query.toLowerCase().trim())
  )
  const detailActions = skill ? (
    <>
      {onExperiment && !creating && !skill.readOnly ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground/70 hover:text-foreground"
          aria-label="在新会话中实验"
          title="在新会话中实验"
          disabled={busy || !library}
          onClick={() => void experiment()}
        >
          <HugeiconsIcon icon={Bug01Icon} size={16} aria-hidden="true" />
        </Button>
      ) : null}
      {skill.origin === "official" ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground/70 hover:text-foreground"
          aria-label="复制为本地 Skill"
          title="复制为本地 Skill"
          disabled={busy || !library}
          onClick={() => void copy(skill)}
        >
          <Copy />
        </Button>
      ) : null}
    </>
  ) : null
  return (
    <div
      className="skill-library relative flex h-full min-h-0 flex-col bg-background"
      data-testid="skill-library"
    >
      {!skillId && !creating ? <h1 className="sr-only">Skill</h1> : null}
      {!library ? (
        <p
          role="status"
          className="border-b border-border bg-muted px-5 py-3 text-sm text-muted-foreground"
        >
          当前接入的 Skill 仅供阅读。
        </p>
      ) : null}
      {!loaded ? (
        <div
          className="space-y-6 p-8"
          role="status"
          aria-label="正在读取 Skill"
        >
          <div className="h-9 w-1/3 rounded-full bg-muted" />
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-14 w-full rounded-lg bg-muted" />
          ))}
        </div>
      ) : loadFailed ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-sm text-muted-foreground">未能读取技能列表。</p>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => {
              setLoaded(false)
              setLoadFailed(false)
              toast.dismissKey("skill-library-error")
              setLoadAttempt((value) => value + 1)
            }}
          >
            重新读取 Skill
          </Button>
        </div>
      ) : !skillId && !creating ? (
        <div className="min-h-0 flex-1 overflow-auto px-5 py-6 md:px-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1" role="group" aria-label="Skill 来源">
              {(["all", "local", "official"] as const).map((value) => (
                <Button
                  key={value}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-full px-4 text-muted-foreground",
                    filter === value && "bg-muted text-accent-foreground"
                  )}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {value === "all"
                    ? "全部"
                    : value === "local"
                      ? "本地"
                      : "官方"}
                </Button>
              ))}
            </div>
            <Input
              ref={searchInput}
              type="search"
              name="skill-search"
              autoComplete="off"
              className="w-full sm:w-64"
              classNames={{
                field: "h-9 pointer-coarse:h-11",
                input: "min-w-0 text-[13px]",
              }}
              leftIcon={<Search aria-hidden="true" />}
              aria-label="搜索 Skill"
              placeholder="搜索 Skill…"
              value={query}
              onChange={setQuery}
            />
          </div>
          <div className="skill-catalog-heading grid grid-cols-[minmax(0,1fr)_7rem_minmax(0,8rem)_3rem] gap-3 border-b border-border px-3 pb-3 text-[11px] text-muted-foreground">
            <span>名称</span>
            <span>来源</span>
            <span>版本</span>
            <span />
          </div>
          {visible.map((item) => (
            <div key={item.id} className="border-b border-border last:border-0">
              <div className="skill-catalog-row grid grid-cols-[minmax(0,1fr)_7rem_minmax(0,8rem)_3rem] items-center gap-3 rounded-lg px-3 py-4 transition-colors hover:bg-muted/50">
                <Button
                  variant="plain"
                  whileHover={undefined}
                  whileTap={undefined}
                  className="flex min-w-0 items-center justify-start gap-3 rounded-md rounded-md! text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onOpenSkill(item.id)}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                    <BookOpen className="size-5" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {item.name}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </Button>
                <div className="skill-catalog-source">
                  <SkillSourceLabel skill={item} />
                </div>
                <span
                  className="skill-catalog-version min-w-0 truncate text-xs text-muted-foreground"
                  title={item.version || item.contentId}
                >
                  {item.version || item.contentId || "未标注版本"}
                </span>
                <div className="flex justify-end">
                  {item.origin === "official" ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={`复制 ${item.name}`}
                      aria-label={`复制 ${item.name}`}
                      disabled={busy || !library}
                      onClick={() => void copy(item)}
                    >
                      <Copy />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={`删除 ${item.name}`}
                      aria-label={`删除 ${item.name}`}
                      disabled={busy || !library}
                      onClick={() => setDeleting(item.id)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
              {deleting === item.id ? (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
                  <p className="text-xs">
                    删除「{item.name}」及其中全部文件？此操作不能撤销。
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleting(null)}
                    >
                      取消
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busy}
                      onClick={() => void deleteSkill(item)}
                    >
                      确认删除
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          {!visible.length ? (
            <div className="flex flex-col items-center py-16 text-center">
              <FolderOpen
                className="mb-4 size-9 text-muted-foreground"
                strokeWidth={1.5}
              />
              <h2 className="text-sm font-medium">
                {query || filter !== "all" ? "没有匹配的 Skill" : "暂无 Skill"}
              </h2>
            </div>
          ) : null}
        </div>
      ) : skill ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {library ? (
            <FilePreview
              key={skill.id}
              readFile={readFile}
              skill={skill}
              entry={entry ?? EMPTY_ENTRY}
              edit={edits[pathKey]}
              creating={creating}
              onDiscard={
                creating
                  ? () => {
                      setDraftEntries([draftEntry("SKILL.md")])
                      setSelected((current) => ({
                        ...current,
                        [DRAFT_ID]: null,
                      }))
                      setEdits((current) => ({
                        ...Object.fromEntries(
                          Object.entries(current).filter(
                            ([key]) => !key.startsWith(`${DRAFT_ID}\u0000`)
                          )
                        ),
                        [editKey(DRAFT_ID, "SKILL.md")]: {
                          value: EMPTY_SKILL_CONTENT,
                          saved: EMPTY_SKILL_CONTENT,
                        },
                      }))
                      toast.dismissKey("skill-library-error")
                      onOpenSkill(null)
                    }
                  : undefined
              }
              initialEditing={
                creating ||
                (!!edits[pathKey] &&
                  edits[pathKey].value !== edits[pathKey].saved)
              }
              busy={busy}
              locked={entriesLocked}
              active={active}
              actions={detailActions}
              onAddFile={
                skill.readOnly
                  ? undefined
                  : async (path, content, replace) => {
                      if (creating) {
                        await run(async () => {
                          const value = await content.text()
                          setDraftEntries((current) => [
                            ...current,
                            draftEntry(path),
                          ])
                          setEdits((current) => ({
                            ...current,
                            [editKey(DRAFT_ID, path)]: { value, saved: value },
                          }))
                        })
                        return
                      }
                      await mutateEntries(
                        () =>
                          library.writeFile(skill.id, path, content, {
                            replace,
                          }),
                        "文件已添加"
                      )
                    }
              }
              onAddDirectory={
                skill.readOnly
                  ? undefined
                  : async (path) => {
                      if (creating) {
                        await run(async () => {
                          setDraftEntries((current) => [
                            ...current,
                            draftEntry(path, "folder"),
                          ])
                        })
                        return
                      }
                      await mutateEntries(
                        () => library.createDirectory(skill.id, path),
                        "目录已创建"
                      )
                    }
              }
              onRenameEntry={
                skill.readOnly
                  ? undefined
                  : (path, newPath) => changeEntry("rename", path, newPath)
              }
              onDeleteEntry={
                skill.readOnly
                  ? undefined
                  : (path) => changeEntry("remove", path)
              }
              files={skill.entries
                .filter((item) => item.kind === "file")
                .map((item) => {
                  const edit = edits[editKey(skill.id, item.path)]
                  return {
                    path: item.path,
                    modified: !!edit && edit.value !== edit.saved,
                  }
                })}
              onOpenFile={(path) =>
                setSelected((current) => ({ ...current, [skill.id]: path }))
              }
              onLoaded={(value) =>
                setEdits((current) =>
                  current[pathKey]
                    ? current
                    : { ...current, [pathKey]: { value, saved: value } }
                )
              }
              onEdit={(value) =>
                setEdits((current) => ({
                  ...current,
                  [pathKey]: {
                    value,
                    saved: current[pathKey]?.saved ?? value,
                  },
                }))
              }
              onSave={async (value) => {
                if (creating) {
                  await create()
                  return
                }
                if (!entry) return
                await mutate(
                  () =>
                    library.writeFile(
                      skill.id,
                      entry.path,
                      new Blob([value], {
                        type: entry.mimeType || skillFileMimeType(entry.path),
                      }),
                      { replace: true }
                    ),
                  "文件已保存"
                )
                if (mounted.current)
                  setEdits((current) => ({
                    ...current,
                    [pathKey]: {
                      value: current[pathKey]?.value ?? value,
                      saved: value,
                    },
                  }))
              }}
            />
          ) : !library ? (
            <SkillScreen
              skills={sourceSkills}
              skillId={skill.id}
              active={active}
            />
          ) : (
            <p className="p-6 text-sm text-muted-foreground">
              这个 Skill 暂无可读内容。
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <FolderOpen className="size-9 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            这个 Skill 已不存在，请返回列表选择。
          </p>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenSkill(null)}
          >
            返回 Skill 列表
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  )
}
