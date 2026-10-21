// Layout adapted from @beui-pro/settings-profile · beui.collectui.pro
import { useEffect, useId, useRef, useState, type RefObject } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { useAppDependencies } from "@/app/dependencies"
import type { DesktopRuntime, DesktopSettings } from "@/desktop/runtime"
import { paletteOptions, themeOptions } from "@/components/theme-picker"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/motion/button"
import { Input } from "@/components/motion/input"
import { useToast } from "@/components/ui/toast"
import { useBackendData } from "@/components/workbench/use-backend-data"
import type { SettingsSection } from "./settings-navigation"
import { ProviderSettings } from "./provider-settings"
import "./client-settings.css"

export function ClientSettingsScreen({
  scrollRef,
  onSectionChange,
}: {
  scrollRef: RefObject<HTMLDivElement | null>
  onSectionChange: (section: SettingsSection) => void
}) {
  const { desktop } = useAppDependencies()
  const { theme, setTheme, palette, setPalette } = useTheme()
  useEffect(() => onSectionChange("theme"), [onSectionChange])
  const [attempt, setAttempt] = useState(0)
  const settings = useBackendData(
    attempt,
    async () => {
      if (!desktop.readSettings) throw new Error("unsupported")
      return desktop.readSettings()
    },
    desktop
  )
  return (
    <div
      ref={scrollRef}
      data-slot="client-settings"
      className="settings-content h-full overflow-y-auto overscroll-contain"
      onScroll={(event) => {
        const container = event.currentTarget
        const line = container.getBoundingClientRect().top + 64
        let active: SettingsSection = "theme"
        for (const section of container.querySelectorAll<HTMLElement>(
          "[data-settings-section]"
        )) {
          if (section.getBoundingClientRect().top <= line)
            active = section.dataset.settingsSection as SettingsSection
        }
        if (
          container.scrollHeight > container.clientHeight &&
          container.scrollTop + container.clientHeight >=
            container.scrollHeight - 2
        )
          active = "tasks"
        onSectionChange(active)
      }}
    >
      <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
        <section
          id="client-settings-theme"
          data-settings-section="theme"
          tabIndex={-1}
          aria-labelledby="settings-theme-heading"
          className="settings-section pb-10"
        >
          <h2 id="settings-theme-heading" className="text-lg font-medium">
            主题
          </h2>
          <fieldset className="mt-5 grid min-w-0 grid-cols-3 gap-3">
            <legend className="sr-only">主题</legend>
            {themeOptions.map((option) => (
              <label
                key={option.value}
                className="settings-choice min-w-0 cursor-pointer"
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="settings-theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={() => setTheme(option.value)}
                />
                <span
                  className="settings-theme-preview"
                  data-theme-preview={option.value}
                  aria-hidden="true"
                >
                  <span className="settings-preview-window">
                    <span className="settings-preview-sidebar">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="settings-preview-main">
                      <i />
                      <i />
                      <i />
                      <b />
                    </span>
                  </span>
                </span>
                <span className="mt-3 flex min-h-6 items-center justify-center gap-1.5 text-xs sm:text-sm">
                  <HugeiconsIcon
                    icon={option.icon}
                    size={15}
                    aria-hidden="true"
                  />
                  {option.label}
                </span>
              </label>
            ))}
          </fieldset>
        </section>
        <section
          id="client-settings-palette"
          data-settings-section="palette"
          tabIndex={-1}
          aria-labelledby="settings-palette-heading"
          className="settings-section border-t border-border py-10"
        >
          <h2 id="settings-palette-heading" className="text-lg font-medium">
            配色
          </h2>
          <fieldset className="mt-5 grid min-w-0 grid-cols-2 gap-3">
            <legend className="sr-only">配色</legend>
            {paletteOptions.map((option) => (
              <label
                key={option.value}
                className="settings-choice min-w-0 cursor-pointer"
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="settings-palette"
                  value={option.value}
                  checked={palette === option.value}
                  onChange={() => setPalette(option.value)}
                />
                <span className="settings-palette-option flex min-h-20 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border px-4 py-3 text-sm">
                  <span className="flex -space-x-1.5" aria-hidden="true">
                    {option.colors.map((color) => (
                      <span
                        key={color}
                        className="size-5 rounded-full ring-2 ring-background"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                  {option.label}
                </span>
              </label>
            ))}
          </fieldset>
        </section>
        <ProviderSettings />
        <section
          id="client-settings-tasks"
          data-settings-section="tasks"
          tabIndex={-1}
          aria-labelledby="settings-tasks-heading"
          className="settings-section border-t border-border pt-10"
        >
          <h2 id="settings-tasks-heading" className="mb-6 text-lg font-medium">
            Agent 运行
          </h2>
          {!desktop.readSettings || !desktop.saveSettings ? (
            <p className="mt-6 text-sm text-muted-foreground">
              当前接入暂不支持客户端设置。
            </p>
          ) : settings.status === "loading" ? (
            <p role="status" className="text-sm text-muted-foreground">
              正在读取客户端设置…
            </p>
          ) : settings.status === "error" ? (
            <div className="space-y-3">
              <p role="alert" className="text-sm text-destructive">
                客户端设置读取失败，请重试。
              </p>
              <Button
                variant="outline"
                onClick={() => setAttempt((value) => value + 1)}
              >
                重试
              </Button>
            </div>
          ) : (
            <SettingsForm desktop={desktop} initialSettings={settings.data} />
          )}
        </section>
      </div>
    </div>
  )
}

function SettingsForm({
  desktop,
  initialSettings,
}: {
  desktop: DesktopRuntime
  initialSettings: DesktopSettings
}) {
  const id = useId()
  const toast = useToast()
  const [saved, setSaved] = useState(initialSettings.maxConcurrentRuns)
  const [draft, setDraft] = useState(String(saved))
  const [saving, setSaving] = useState(false)
  const operation = useRef(false)
  const mounted = useRef(false)
  const clearNotices = () => {
    toast.dismissKey("client-settings-error")
    toast.dismissKey("client-settings-notice")
  }
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const value = Number(draft)
  const valid =
    draft.trim() !== "" &&
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= 64
  const changed = draft !== String(saved)
  const invalid = changed && !valid
  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        if (!valid || !changed || operation.current || !desktop.saveSettings)
          return
        operation.current = true
        setSaving(true)
        clearNotices()
        void desktop
          .saveSettings({ maxConcurrentRuns: value })
          .then(
            (settings) => {
              if (!mounted.current) return
              setSaved(settings.maxConcurrentRuns)
              setDraft(String(settings.maxConcurrentRuns))
              toast.notify({
                key: "client-settings-notice",
                title: "设置已保存。",
                tone: "success",
              })
            },
            (cause: unknown) => {
              if (mounted.current)
                toast.notify({
                  key: "client-settings-error",
                  title:
                    cause instanceof Error
                      ? cause.message
                      : "客户端设置保存失败，原设置仍生效，请重试。",
                  tone: "error",
                })
            }
          )
          .finally(() => {
            operation.current = false
            if (mounted.current) setSaving(false)
          })
      }}
    >
      <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_8rem] sm:gap-8">
        <div>
          <label htmlFor={id} className="block text-sm font-medium">
            同时运行的任务数
          </label>
          <p id={`${id}-help`} className="mt-1 text-sm text-muted-foreground">
            例如设为 4，可在 4 个会话中同时运行 Agent，包含浏览器任务。
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={1}
              max={64}
              step={1}
              value={draft}
              disabled={saving}
              error={invalid}
              aria-invalid={invalid}
              aria-describedby={`${id}-help ${id}-range${changed ? ` ${id}-effective` : ""}${invalid ? ` ${id}-invalid` : ""}`}
              className="w-full max-w-24"
              classNames={{ field: "h-10 bg-background", input: "text-sm tabular-nums" }}
              onChange={(value) => {
                setDraft(value)
                clearNotices()
              }}
            />
            <span className="text-sm text-muted-foreground" aria-hidden="true">
              个
            </span>
          </div>
          <p id={`${id}-range`} className="text-sm text-muted-foreground">
            1–64 个
          </p>
          {invalid ? (
            <p
              id={`${id}-invalid`}
              role="alert"
              className="text-sm text-destructive"
            >
              请输入 1 到 64 的整数。
            </p>
          ) : null}
          {changed ? (
            <p id={`${id}-effective`} className="text-sm text-muted-foreground">
              当前上限：{saved} 个
            </p>
          ) : null}
        </div>
      </div>
      {changed ? (
        <p className="text-sm text-muted-foreground">
          保存后用于新任务，不会中断正在运行的任务。
        </p>
      ) : null}
      {desktop.getState().simulated ? (
        <p className="text-sm text-muted-foreground">
          网页演示：此项设置刷新后恢复默认。
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
        <Button
          type="button"
          variant="ghost"
          disabled={!changed || saving}
          onClick={() => {
            setDraft(String(saved))
            clearNotices()
          }}
        >
          撤销
        </Button>
        <Button
          className="rounded-full"
          type="submit"
          disabled={!valid || !changed || saving}
        >
          {saving ? "正在保存…" : "保存设置"}
        </Button>
      </div>
    </form>
  )
}
