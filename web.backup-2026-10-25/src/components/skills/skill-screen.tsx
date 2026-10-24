import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useAppDependencies } from "@/app/dependencies"
import { useToast } from "@/components/ui/toast"
import { useSaveShortcut } from "@/hooks/use-save-shortcut"
import type { Skill } from "@/skills/source"
import { fileKey } from "@/skills/drafts"
import { SkillDocument } from "./skill-document"

export function SkillScreen({
  skills,
  skillId,
  active,
}: {
  skills: readonly Skill[]
  skillId: string
  active: boolean
}) {
  const { skillDrafts, host } = useAppDependencies()
  const [saved, setSaved] = useState<Record<string, string>>({})
  const [contents, setContents] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState<{
    cache: typeof skillDrafts
    skills: readonly Skill[]
  } | null>(null)
  const loading = loaded?.cache !== skillDrafts || loaded?.skills !== skills
  const toast = useToast()
  const showError = (message: string) =>
    toast.notify({
      key: "skill-screen-error",
      title: message,
      tone: "error",
    })
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const operation = useRef(false)
  const mounted = useRef(false)
  const [paths, setPaths] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState(false)
  const skill = skills.find((entry) => entry.id === skillId) ?? skills[0]
  const path = (skill && paths[skill.id]) ?? "SKILL.md"
  const file = skill?.files.find((entry) => entry.path === path)
  const key = fileKey(skill?.id ?? "", path)
  const selectedKey = useRef(key)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    let live = true
    void Promise.resolve()
      .then(() => skillDrafts.load(skills))
      .then(
        (drafts) => {
          if (!live) return
          // A refreshed catalog must not replace edits already held by this screen.
          setSaved((current) => ({ ...drafts, ...current }))
          setContents((current) => ({ ...drafts, ...current }))
          setLoaded({ cache: skillDrafts, skills })
        },
        () => {
          if (!live) return
          toast.notify({
            key: "skill-screen-error",
            title:
              "无法读取本地草稿。请检查存储权限；新编辑的内容会暂留在页面中。",
            tone: "error",
          })
          setLoaded({ cache: skillDrafts, skills })
        }
      )
    return () => {
      live = false
    }
  }, [skillDrafts, skills, toast])
  const source = contents[key] ?? file?.content ?? ""
  const currentSource = useRef(source)
  useLayoutEffect(() => {
    selectedKey.current = key
    currentSource.current = source
  }, [key, source])
  const original = file?.content ?? ""
  const dirty = source !== (saved[key] ?? original)
  const unsaved = skills.some((item) =>
    item.files.some((entry) => {
      const id = fileKey(item.id, entry.path)
      return (contents[id] ?? entry.content) !== (saved[id] ?? entry.content)
    })
  )
  async function save() {
    if (!skill || !file || !editing || loading || operation.current) return
    if (!dirty) {
      setEditing(false)
      return
    }
    operation.current = true
    setBusy(true)
    try {
      await skillDrafts.save(skill.id, path, source)
      if (!mounted.current) return
      setSaved((current) => ({ ...current, [key]: source }))
      if (selectedKey.current === key) {
        toast.dismissKey("skill-screen-error")
        if (currentSource.current === source) {
          setMessage("草稿已保存")
          setEditing(false)
        }
      }
    } catch {
      if (mounted.current && selectedKey.current === key)
        showError(
          "草稿保存失败，编辑内容仍在页面中。请检查存储权限或可用空间，再重试保存。"
        )
    } finally {
      operation.current = false
      if (mounted.current) setBusy(false)
    }
  }

  useEffect(() => {
    if (!unsaved) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [unsaved])

  useSaveShortcut({
    active,
    enabled: editing,
    onSave: () => void save(),
  })

  function selectFile(nextPath: string) {
    if (!skill) return
    setPaths((current) => ({ ...current, [skill.id]: nextPath }))
    setEditing(false)
    setMessage("")
  }

  async function restore() {
    if (!skill || loading || operation.current) return
    operation.current = true
    setBusy(true)
    try {
      if (
        !(await host.confirm(
          `将 ${path} 恢复为原始内容？此文件的编辑和本地草稿会被移除。`
        ))
      )
        return
      if (!mounted.current) return
      await skillDrafts.remove(skill.id, path)
      if (!mounted.current) return
      setContents((current) =>
        (current[key] ?? original) === source
          ? { ...current, [key]: original }
          : current
      )
      setSaved((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
      if (selectedKey.current === key) {
        toast.dismissKey("skill-screen-error")
        setMessage("已恢复原始内容")
      }
    } catch {
      if (mounted.current && selectedKey.current === key)
        showError("未能移除本地草稿，内容保持原样。请检查存储权限后重试。")
    } finally {
      operation.current = false
      if (mounted.current) setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <SkillDocument
          key={skill?.id}
          files={(skill?.files ?? []).map((entry) => {
            const id = fileKey(skill!.id, entry.path)
            return {
              path: entry.path,
              modified:
                (contents[id] ?? entry.content) !==
                (saved[id] ?? entry.content),
            }
          })}
          path={path}
          source={source}
          active={active}
          message={message}
          loading={loading}
          busy={busy}
          dirty={dirty}
          editing={editing}
          onEdit={() => {
            setEditing(true)
            setMessage("")
          }}
          onSave={() => void save()}
          onUndo={() => {
            setContents((current) => ({
              ...current,
              [key]: saved[key] ?? original,
            }))
            setEditing(false)
            toast.dismissKey("skill-screen-error")
            setMessage("")
          }}
          onRestore={
            saved[key] !== undefined || source !== original
              ? () => void restore()
              : undefined
          }
          onChange={(value) => {
            setContents((current) => ({ ...current, [key]: value }))
            setMessage("")
          }}
          onSelectFile={selectFile}
          onError={showError}
        />
      </div>
    </div>
  )
}
