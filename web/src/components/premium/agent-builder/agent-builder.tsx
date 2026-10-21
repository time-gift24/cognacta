"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  BotIcon,
  Copy01Icon,
  Settings02Icon,
} from "@hugeicons-pro/core-stroke-rounded"
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import {
  MarkdownEditor,
  type MarkdownEditorMode,
} from "@/components/markdown/markdown-editor"
import {
  MarkdownOutline,
  MarkdownReading,
  useHeadingScroll,
} from "@/components/markdown/markdown-reading"
import {
  findDocsHeading,
  type DocsSection,
} from "@/components/premium/docs-pages/docs-data"
import { useScrollspy } from "@/components/premium/docs-pages/use-scrollspy"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/motion/button"
import { DocumentActions } from "@/components/markdown/document-actions"
import { useSaveShortcut } from "@/hooks/use-save-shortcut"
import { cn } from "@/lib/utils"
import "@/components/premium/docs-pages/docs-article.css"
import type {
  AgentConfiguration,
  AgentResource,
  McpServer,
} from "@/agents/source"
import { AgentConfigurationPanel } from "./agent-configuration"

export type AgentBuilderProps = {
  initialConfiguration: AgentConfiguration
  active?: boolean
  copyBusy?: boolean
  initialDraft?: AgentConfiguration
  /** Open a fresh Agent directly in edit mode. */
  initialEditing?: boolean
  onDraftChange?: (configuration: AgentConfiguration) => void
  mcpServers: readonly McpServer[]
  tools: readonly AgentResource[]
  skills: readonly AgentResource[]
  onDebug?: () => void
  onBack?: () => void
  toolbarTarget?: HTMLElement | null
  onSave: (configuration: AgentConfiguration) => void | Promise<void>
  className?: string
  readOnly?: boolean
  showApproval?: boolean
  debugLabel?: string
  resourceManager?: import("react").ReactNode
  onCopy?: () => void
}

export function AgentBuilder({
  initialConfiguration,
  active = true,
  copyBusy = false,
  initialDraft = initialConfiguration,
  initialEditing = false,
  onDraftChange,
  mcpServers,
  tools,
  skills,
  onDebug,
  onBack,
  toolbarTarget,
  onSave,
  className,
  readOnly = false,
  showApproval = true,
  debugLabel,
  resourceManager,
  onCopy,
}: AgentBuilderProps) {
  const [configuration, setConfiguration] = useState(initialDraft)
  const [saved, setSaved] = useState(initialConfiguration)
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editing, setEditing] = useState(
    !readOnly &&
      (initialEditing ||
        JSON.stringify(initialDraft) !== JSON.stringify(initialConfiguration))
  )
  const [mode, setMode] = useState<MarkdownEditorMode>("source")
  const [outline, setOutline] = useState<DocsSection[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const editorPreviewRef = useRef<HTMLDivElement>(null)
  const settingsId = useId()
  const lock = useRef(false)
  const dirty = JSON.stringify(configuration) !== JSON.stringify(saved)
  const currentConfiguration = useRef(configuration)
  const rootRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)
  const showError = (message: string) => {
    toast.notify({
      key: "agent-builder-error",
      title: message,
      tone: "error",
    })
  }
  const showNotice = (message: string) => {
    toast.dismissKey("agent-builder-error")
    toast.notify({
      key: "agent-builder-notice",
      title: message,
      tone: "success",
    })
  }
  useLayoutEffect(() => {
    currentConfiguration.current = configuration
  }, [configuration])
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (!initialEditing || !editing) return
    rootRef.current
      ?.querySelector<HTMLInputElement>("aside input")
      ?.focus({ preventScroll: true })
  }, [initialEditing, editing])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])
  useSaveShortcut({
    active,
    enabled: editing,
    onSave: () => {
      if (!saving) void save()
    },
  })

  const updateSections = useCallback(
    (sections: DocsSection[]) => setOutline(sections),
    []
  )
  const outlineSections = !editing || mode === "preview" ? outline : []
  const activeSection = useScrollspy(
    outlineSections.map((section) => section.id),
    editing ? editorPreviewRef : scrollRef
  )
  const resolveScroll = useCallback(
    () => editorPreviewRef.current ?? scrollRef.current,
    []
  )
  const { scrollToHeading } = useHeadingScroll(
    resolveScroll,
    editing ? mode : "reading"
  )
  const wide = editing && mode !== "preview"

  function change(next: AgentConfiguration) {
    setConfiguration(next)
    onDraftChange?.(next)
    toast.dismissKey("agent-builder-error")
    toast.dismissKey("agent-builder-notice")
  }

  async function save() {
    if (lock.current || readOnly) return
    if (!dirty && !initialEditing) {
      setEditing(false)
      return
    }
    if (!configuration.name.trim() || !configuration.instructions.trim()) {
      showError("请先填写名称和系统提示词，再保存。")
      if (!configuration.name.trim()) setSettingsOpen(true)
      else
        rootRef.current
          ?.querySelector<HTMLButtonElement>('[aria-label="编辑视图"] button')
          ?.click()
      requestAnimationFrame(() => {
        rootRef.current
          ?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
            !configuration.name.trim()
              ? "aside input"
              : 'textarea[aria-label="系统提示词"]'
          )
          ?.focus()
      })
      return
    }
    lock.current = true
    setSaving(true)
    toast.dismissKey("agent-builder-error")
    toast.dismissKey("agent-builder-notice")
    const snapshot = structuredClone(configuration)
    try {
      await onSave(snapshot)
      if (!mounted.current) return
      setSaved(snapshot)
      if (
        JSON.stringify(currentConfiguration.current) ===
        JSON.stringify(snapshot)
      ) {
        setEditing(false)
        showNotice("Agent 已保存")
      } else showNotice("已保存提交时的版本，新的修改尚未保存")
    } catch (cause) {
      if (mounted.current)
        showError(
          cause instanceof Error
            ? `保存失败：${cause.message}`
            : "保存失败，请重试。"
        )
    } finally {
      lock.current = false
      if (mounted.current) setSaving(false)
    }
  }

  const toolbar = (
    <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 py-1">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Breadcrumbs
          items={[
            { label: "Agent", onSelect: onBack },
            {
              label: (
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="grid size-6 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"
                  >
                    <HugeiconsIcon icon={BotIcon} size={14} />
                  </span>
                  <h1
                    className="truncate text-sm font-medium"
                    title={configuration.name.trim() || "未命名 Agent"}
                  >
                    {configuration.name.trim() || "未命名 Agent"}
                  </h1>
                </div>
              ),
            },
          ]}
        />
        <span
          className="hidden shrink-0 text-xs text-muted-foreground @min-[400px]/agent-header:inline"
          role="status"
        >
          {dirty ? "未保存" : ""}
        </span>
      </div>
    </div>
  )

  const preview = (
    <MarkdownReading
      source={configuration.instructions}
      onSections={updateSections}
      empty={
        <p className="py-12 text-center text-sm text-muted-foreground">
          暂无系统提示词。
        </p>
      }
    />
  )

  return (
    <div
      className={cn(
        "@container/agent flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-foreground",
        className
      )}
      ref={rootRef}
    >
      {active &&
        (toolbarTarget ? (
          createPortal(toolbar, toolbarTarget)
        ) : (
          <div className="@container/agent-header flex shrink-0 px-3">
            {toolbar}
          </div>
        ))}
      <div className="doc-action-surface m-2 flex min-h-0 flex-1 flex-col gap-2 sm:m-3">
        {active ? (
          <DocumentActions
            readOnly={readOnly}
            debugLabel={debugLabel}
            editing={editing}
            busy={saving}
            dirty={dirty}
            onEdit={() => {
              setEditing(true)
              setMode("source")
            }}
            onSave={() => void save()}
            onUndo={() => {
              change(saved)
              setEditing(false)
            }}
            onDebug={onDebug}
          >
            {onCopy ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground/70 hover:text-foreground"
                aria-label="复制为本地"
                title="复制为本地 Agent"
                disabled={copyBusy}
                aria-busy={copyBusy}
                onClick={onCopy}
              >
                <HugeiconsIcon icon={Copy01Icon} size={16} aria-hidden="true" />
              </Button>
            ) : null}
            <Button
              size="icon"
              variant="ghost"
              aria-label="Agent 配置"
              title="Agent 配置"
              aria-controls={settingsId}
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((open) => !open)}
              className="size-7 text-muted-foreground/70 hover:text-foreground @min-[480px]/agent:hidden"
            >
              <HugeiconsIcon
                icon={Settings02Icon}
                size={16}
                aria-hidden="true"
              />
            </Button>
          </DocumentActions>
        ) : null}
        <div
          data-slot="document-body"
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[color:var(--border-strong)] @min-[480px]/agent:flex-row"
        >
          <aside
            id={settingsId}
            aria-label="Agent 配置"
            className={cn(
              "max-h-[48%] min-h-0 shrink-0 overflow-y-auto border-b border-border bg-muted/30 px-4 py-4 @min-[480px]/agent:max-h-none @min-[480px]/agent:w-1/3 @min-[480px]/agent:min-w-64 @min-[480px]/agent:border-r @min-[480px]/agent:border-b-0 @min-[760px]/agent:max-w-[26rem] @min-[760px]/agent:px-6 @min-[760px]/agent:py-6",
              settingsOpen ? "block" : "hidden @min-[480px]/agent:block"
            )}
          >
            <AgentConfigurationPanel
              disabled={false}
              readOnly={readOnly || !editing}
              showApproval={showApproval}
              mcpServers={mcpServers}
              onChange={change}
              tools={tools}
              skills={skills}
              value={configuration}
            />
            {resourceManager}
          </aside>
          <div className="flex min-h-0 min-w-0 flex-1">
            <div
              ref={scrollRef}
              className={cn(
                "doc-reading-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain",
                editing && "overflow-hidden"
              )}
              tabIndex={0}
              aria-label="系统提示词"
            >
              <div
                className={cn("doc-reading-layout", wide && "doc-reading-wide")}
                style={
                  editing ? { height: "100%", maxWidth: "none" } : undefined
                }
              >
                <article
                  className={cn(
                    "doc-article min-w-0 pt-2!",
                    editing && "flex h-full min-h-0 flex-col p-3!"
                  )}
                >
                  {editing ? (
                    <MarkdownEditor
                      title="系统提示词"
                      ariaLabel="系统提示词"
                      className="min-h-0 min-w-0 flex-1"
                      value={configuration.instructions}
                      maxLength={12000}
                      placeholder="描述这个 Agent 的身份、职责、工作方式和边界。"
                      autoFocus
                      preview={preview}
                      previewScrollRef={editorPreviewRef}
                      onModeChange={setMode}
                      onChange={(instructions) =>
                        change({ ...configuration, instructions })
                      }
                    />
                  ) : (
                    preview
                  )}
                </article>
                {!wide && outlineSections.length > 0 ? (
                  <MarkdownOutline
                    sections={outlineSections}
                    active={activeSection ?? ""}
                    onSelect={(id) => {
                      const node = findDocsHeading(resolveScroll(), id)
                      if (node) scrollToHeading(node)
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
