import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react"
import { Markdown } from "@/components/chat/markdown"
import { Button } from "@/components/motion/button"
import { cn } from "@/lib/utils"

export type MarkdownEditorMode = "source" | "preview" | "split"

export function MarkdownEditor({
  value,
  onChange,
  ariaLabel,
  title,
  disabled = false,
  maxLength,
  placeholder,
  preview,
  className,
  autoFocus = false,
  markdown = true,
  onModeChange,
  previewScrollRef,
}: {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  title?: ReactNode
  disabled?: boolean
  maxLength?: number
  placeholder?: string
  preview?: ReactNode
  className?: string
  autoFocus?: boolean
  markdown?: boolean
  onModeChange?: (mode: MarkdownEditorMode) => void
  previewScrollRef?: Ref<HTMLDivElement>
}) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<MarkdownEditorMode>("source")
  const [canSplit, setCanSplit] = useState(false)
  const effectiveMode =
    !markdown || (mode === "split" && !canSplit) ? "source" : mode

  useEffect(() => {
    if (!root.current) return
    const observer = new ResizeObserver(([entry]) =>
      setCanSplit(entry.contentRect.width >= 680)
    )
    observer.observe(root.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    onModeChange?.(effectiveMode)
  }, [effectiveMode, onModeChange])

  return (
    <div
      ref={root}
      data-slot="markdown-editor"
      data-mode={effectiveMode}
      className={cn(
        "@container/editor flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background",
        className
      )}
    >
      <div
        data-slot="markdown-editor-toolbar"
        className="flex min-h-10 shrink-0 items-center justify-between gap-3 border-b border-border py-1 pr-20 pl-2"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 pl-1">
          <span className="truncate text-[13px] font-medium">
            {title ?? (markdown ? "Markdown" : "源码")}
          </span>
          <span className="hidden shrink-0 text-[11px] text-muted-foreground tabular-nums @min-[360px]/editor:inline">
            {value.length.toLocaleString("zh-CN")}
            {maxLength === undefined
              ? " 字符"
              : ` / ${maxLength.toLocaleString("zh-CN")} 字符`}
          </span>
        </div>
        <div
          role="group"
          aria-label="编辑视图"
          className="flex shrink-0 gap-0.5"
        >
          {(
            [
              "source",
              ...(markdown ? ["preview", ...(canSplit ? ["split"] : [])] : []),
            ] as MarkdownEditorMode[]
          ).map((view) => (
            <Button
              key={view}
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={effectiveMode === view}
              onClick={() => setMode(view)}
              className={cn(
                "rounded-md px-2.5 text-xs text-muted-foreground",
                effectiveMode === view && "bg-muted text-foreground"
              )}
            >
              {view === "source"
                ? "源码"
                : view === "preview"
                  ? "预览"
                  : "分栏"}
            </Button>
          ))}
        </div>
      </div>
      <div
        className={cn(
          "grid min-h-0 flex-1",
          effectiveMode === "split" && "grid-cols-2"
        )}
      >
        {effectiveMode !== "preview" ? (
          <>
            <label className="sr-only" htmlFor={id}>
              {ariaLabel}
            </label>
            <textarea
              id={id}
              aria-label={ariaLabel}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              disabled={disabled}
              maxLength={maxLength}
              autoFocus={autoFocus}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              wrap={markdown ? "soft" : "off"}
              className="block h-full min-h-0 w-full resize-none overflow-auto overscroll-contain bg-transparent px-5 py-4 font-mono text-[13px] leading-6 text-foreground caret-primary outline-none selection:bg-accent selection:text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset disabled:opacity-60"
              style={{ tabSize: 2 }}
              placeholder={placeholder}
            />
          </>
        ) : null}
        {effectiveMode !== "source" ? (
          <div
            ref={previewScrollRef}
            tabIndex={0}
            aria-label={`${ariaLabel}预览`}
            className={cn(
              "min-h-0 min-w-0 overflow-auto overscroll-contain px-5 py-4 outline-none selection:bg-accent selection:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
              effectiveMode === "split" && "border-l border-border"
            )}
          >
            {preview ??
              (value.trim() ? (
                <Markdown className="mx-auto max-w-[72ch] text-[13px] leading-7">
                  {value}
                </Markdown>
              ) : (
                <p className="py-10 text-center text-xs text-muted-foreground">
                  暂无预览内容。
                </p>
              ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
