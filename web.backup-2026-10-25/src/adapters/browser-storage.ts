import { fileKey, type SkillDraftCache } from "../skills/drafts.ts"
import {
  isPalette,
  isTheme,
  type ThemePreferences,
} from "../preferences/theme.ts"

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">
type StorageEvents = Pick<Window, "addEventListener" | "removeEventListener">

export function createBrowserStorage(
  backendId: string,
  {
    getStorage = () => window.localStorage,
    events = window,
  }: {
    getStorage?: () => BrowserStorage
    events?: StorageEvents
  } = {}
): { skillDrafts: SkillDraftCache; themePreferences: ThemePreferences } {
  if (!backendId.trim()) throw new Error("backendId must not be empty")
  const key = (storageKey: string) =>
    backendId === "demo"
      ? storageKey
      : `cognacta:backend:${encodeURIComponent(backendId)}:${storageKey}`
  const oldKey = (storageKey: string) =>
    backendId === "demo"
      ? storageKey
      : `omniops-bots:backend:${encodeURIComponent(backendId)}:${storageKey}`
  const read = (current: string, previous: string) => {
    const storage = getStorage()
    return storage.getItem(current) ??
      (current === previous ? null : storage.getItem(previous))
  }
  const write = (current: string, previous: string, value: string) => {
    const storage = getStorage()
    storage.setItem(current, value)
    if (previous !== current) storage.removeItem(previous)
  }
  const remove = (current: string, previous: string) => {
    const storage = getStorage()
    if (previous !== current) storage.removeItem(previous)
    storage.removeItem(current)
  }
  const draftKey = (skillId: string, path: string) =>
    key(`cognacta:skill-draft:v1:${fileKey(skillId, path)}`)
  const oldDraftKey = (skillId: string, path: string) =>
    oldKey(`omniops-bots:skill-draft:v1:${fileKey(skillId, path)}`)
  const themeKey = key("theme")
  const oldThemeKey = oldKey("theme")
  const paletteKey = key("cognacta-palette")
  const oldPaletteKey = oldKey("omniops-bots-palette")

  return {
    skillDrafts: {
      async load(skills) {
        const drafts: Record<string, string> = {}
        for (const skill of skills) {
          for (const file of skill.files) {
            const content = read(
              draftKey(skill.id, file.path),
              oldDraftKey(skill.id, file.path)
            )
            if (content !== null) drafts[fileKey(skill.id, file.path)] = content
          }
        }
        return drafts
      },
      async save(skillId, path, content) {
        write(draftKey(skillId, path), oldDraftKey(skillId, path), content)
      },
      async remove(skillId, path) {
        remove(draftKey(skillId, path), oldDraftKey(skillId, path))
      },
    },
    themePreferences: {
      async readTheme() {
        const value = read(themeKey, oldThemeKey)
        return isTheme(value) ? value : null
      },
      async readPalette() {
        const value = read(paletteKey, oldPaletteKey)
        return isPalette(value) ? value : null
      },
      async writeTheme(theme) {
        write(themeKey, oldThemeKey, theme)
      },
      async writePalette(palette) {
        write(paletteKey, oldPaletteKey, palette)
      },
      subscribe(listener) {
        let storage: BrowserStorage
        try {
          storage = getStorage()
        } catch {
          return () => {}
        }
        const changed = (event: StorageEvent) => {
          if (event.storageArea !== storage) return
          if (event.key === null) listener({ theme: null, palette: null })
          else if (event.key === themeKey || event.key === oldThemeKey)
            listener({ theme: isTheme(event.newValue) ? event.newValue : null })
          else if (event.key === paletteKey || event.key === oldPaletteKey)
            listener({
              palette: isPalette(event.newValue) ? event.newValue : null,
            })
        }
        events.addEventListener("storage", changed)
        return () => events.removeEventListener("storage", changed)
      },
    },
  }
}
