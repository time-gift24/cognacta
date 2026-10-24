export type Theme = "dark" | "light" | "system"
export type Palette = "official" | "claude"

/** null 表示删除或无效值；清空时同时通知两项。 */
export type ThemePreferenceChange = {
  theme?: Theme | null
  palette?: Palette | null
}

/**
 * adapter 保证同一项写入按调用顺序生效；失败通过 Promise 拒绝交给前端策略处理，
 * UI 不展示底层错误。subscribe 同步返回取消函数，通知不触发写回。
 */
export interface ThemePreferences {
  readTheme(): Promise<Theme | null>
  readPalette(): Promise<Palette | null>
  writeTheme(theme: Theme): Promise<void>
  writePalette(palette: Palette): Promise<void>
  subscribe(listener: (change: ThemePreferenceChange) => void): () => void
}

export type InitialThemePreferences = { theme: Theme; palette: Palette }

export function isTheme(value: string | null): value is Theme {
  return value === "dark" || value === "light" || value === "system"
}

export function isPalette(value: string | null): value is Palette {
  return value === "official" || value === "claude"
}

/** 两项独立回退，首次挂载前读取，避免先渲染默认配色。 */
export async function loadInitialThemePreferences(
  preferences: ThemePreferences,
  defaultTheme: Theme = "system"
): Promise<InitialThemePreferences> {
  const [theme, palette] = await Promise.allSettled([
    Promise.resolve().then(() => preferences.readTheme()),
    Promise.resolve().then(() => preferences.readPalette()),
  ])
  return {
    theme:
      theme.status === "fulfilled"
        ? (theme.value ?? defaultTheme)
        : defaultTheme,
    palette:
      palette.status === "fulfilled"
        ? (palette.value ?? "official")
        : "official",
  }
}
