import { createElement, type ReactNode } from "react"
import {
  AppDependenciesProvider,
  createAppDependencies,
  type AppDependencies,
  type FrontendAdapters,
} from "../src/app/dependencies"
import { createDemoAdapters } from "../src/adapters/demo"
import { createDemoModelSource } from "../src/adapters/demo/resources"
import { ThemeProvider } from "../src/components/theme-provider"
import { ToastProvider } from "../src/components/ui/toast"
import { fileKey } from "../src/skills/drafts"
import type { Theme, Palette } from "../src/preferences/theme"

/** Each fixture gets its own stores and memory caches, including SSR fixtures. */
export function createTestDependencies(overrides: Partial<FrontendAdapters> = {}): AppDependencies {
  const drafts = new Map<string, string>()
  let theme: Theme | null = null
  let palette: Palette | null = null
  return createAppDependencies(createDemoAdapters({
    backendId: "test",
    models: createDemoModelSource(),
    preferences: {
      async readTheme() { return theme },
      async readPalette() { return palette },
      async writeTheme(value) { theme = value },
      async writePalette(value) { palette = value },
      subscribe() { return () => {} },
    },
    skillDrafts: {
      async load(skills) {
        const saved: Record<string, string> = {}
        for (const skill of skills) for (const file of skill.files) {
          const key = fileKey(skill.id, file.path)
          const value = drafts.get(key)
          if (value !== undefined) saved[key] = value
        }
        return saved
      },
      async save(skillId, path, content) { drafts.set(fileKey(skillId, path), content) },
      async remove(skillId, path) { drafts.delete(fileKey(skillId, path)) },
    },
    host: { async copyText() {}, async openExternal() {}, async confirm() { return true } },
    ...overrides,
  }))
}

export function withDependencies(children: ReactNode, dependencies: AppDependencies) {
  return createElement(AppDependenciesProvider, {
    value: dependencies,
    children: createElement(ToastProvider, null, children),
  })
}

export function withTestTheme(children: ReactNode, dependencies: AppDependencies) {
  return withDependencies(createElement(ThemeProvider, {
    preferences: dependencies.preferences,
    initialPreferences: { theme: "system", palette: "official" },
    children,
  }), dependencies)
}
