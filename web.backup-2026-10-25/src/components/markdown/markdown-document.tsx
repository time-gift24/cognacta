"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react"
import {
  MarkdownEditor,
  type MarkdownEditorMode,
} from "./markdown-editor"
import {
  MarkdownOutline,
  MarkdownReading,
  useHeadingScroll,
} from "./markdown-reading"
import {
  findDocsHeading,
  type DocsSection,
} from "@/components/premium/docs-pages/docs-data"
import { useScrollspy } from "@/components/premium/docs-pages/use-scrollspy"
import { cn } from "@/lib/utils"
import "@/components/premium/docs-pages/docs-article.css"

export type DocumentScrollRequest = {
  path?: string
  hash: string
}

type MarkdownEditorProps = ComponentProps<typeof MarkdownEditor>

export type MarkdownDocumentEditorProps = Partial<
  Omit<
    MarkdownEditorProps,
    "value" | "onChange" | "preview" | "previewScrollRef" | "onModeChange"
  >
>

export type MarkdownDocumentProps = {
  source: string
  /** Stable document identity; resets mode/outline and keys the editor. */
  path?: string
  /** Controlled reading/editing state. Save and dirty semantics stay outside. */
  editing: boolean
  onChange: (value: string) => void

  /**
   * Custom read-mode content. When set, outline extraction is disabled;
   * the same node is passed to the editor's preview panel.
   */
  preview?: ReactNode
  /** Empty state for the default MarkdownReading. */
  empty?: ReactNode
  /** Default MarkdownEditor options; controlled props are owned by this module. */
  editorProps?: MarkdownDocumentEditorProps

  /** Link handling for the default MarkdownReading. */
  link?: {
    base?: string
    onClick?: (event: MouseEvent<HTMLDivElement>) => void
  }

  /**
   * Controlled scroll request. The module scrolls once after the matching
   * path/source is ready; a new object identity retriggers the request.
   */
  scrollRequest?: DocumentScrollRequest | null

  /** Action bar slot; callers render DocumentActions. */
  actions?: ReactNode
  /** Sidebar content; the module owns the aside shell. */
  sidebar?: ReactNode
  sidebarId?: string
  sidebarLabel?: string
  contentLabel?: string

  classNames?: {
    root?: string
    body?: string
    sidebar?: string
    scroll?: string
    article?: string
  }
}

export function MarkdownDocument({
  source,
  path,
  editing,
  onChange,
  preview,
  empty,
  editorProps,
  link,
  scrollRequest,
  actions,
  sidebar,
  sidebarId,
  sidebarLabel,
  contentLabel = "文档内容",
  classNames,
}: MarkdownDocumentProps) {
  const requestPath = path ?? ""
  const sessionKey = `${requestPath}:${editing ? "edit" : "read"}`
  const [modeState, setModeState] = useState<{
    session: string
    mode: MarkdownEditorMode
  }>({ session: sessionKey, mode: "source" })
  const [outline, setOutline] = useState<{
    key: string
    sections: DocsSection[]
  }>({ key: requestPath, sections: [] })
  const scrollRef = useRef<HTMLDivElement>(null)
  const editorPreviewRef = useRef<HTMLDivElement>(null)
  const lastScrollRequest = useRef<DocumentScrollRequest | null>(null)
  const mode = modeState.session === sessionKey ? modeState.mode : "source"
  const updateMode = useCallback(
    (next: MarkdownEditorMode) =>
      setModeState({ session: sessionKey, mode: next }),
    [sessionKey]
  )

  const updateSections = useCallback(
    (sections: DocsSection[]) =>
      setOutline({ key: requestPath, sections }),
    [requestPath]
  )
  const outlineSections =
    preview === undefined &&
    (!editing || mode === "preview") &&
    outline.key === requestPath
      ? outline.sections
      : []
  const activeSection = useScrollspy(
    outlineSections.map((section) => section.id),
    editing ? editorPreviewRef : scrollRef
  )
  const resolveScroll = useCallback(
    () => editorPreviewRef.current ?? scrollRef.current,
    []
  )
  const { scrollToY, scrollToHeading } = useHeadingScroll(
    resolveScroll,
    `${requestPath}:${editing ? mode : "reading"}`
  )

  useEffect(() => {
    const request = scrollRequest
    if (!request || request === lastScrollRequest.current) return
    if (request.path !== undefined && request.path !== path) return
    const frame = requestAnimationFrame(() => {
      lastScrollRequest.current = request
      if (request.hash) {
        const node = findDocsHeading(resolveScroll(), request.hash)
        if (node) scrollToHeading(node)
      } else {
        scrollToY(0)
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [
    scrollRequest,
    path,
    source,
    outline,
    resolveScroll,
    scrollToHeading,
    scrollToY,
  ])

  const reading = preview ?? (
    <MarkdownReading
      source={source}
      linkBase={link?.base}
      onSections={updateSections}
      onLink={link?.onClick}
      empty={empty}
    />
  )
  const wide = editing && mode !== "preview"

  return (
    <div
      className={cn(
        "doc-action-surface m-2 flex min-h-0 flex-1 flex-col gap-2 sm:m-3",
        classNames?.root
      )}
    >
      {actions}
      <div
        data-slot="document-body"
        className={cn(
          "flex min-h-0 flex-1 overflow-hidden rounded-xl border border-[color:var(--border-strong)]",
          classNames?.body
        )}
      >
        {sidebar ? (
          <aside
            id={sidebarId}
            aria-label={sidebarLabel}
            className={cn("min-h-0 shrink-0", classNames?.sidebar)}
          >
            {sidebar}
          </aside>
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1">
          <div
            ref={scrollRef}
            className={cn(
              "doc-reading-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain",
              editing && "overflow-hidden",
              classNames?.scroll
            )}
            tabIndex={0}
            aria-label={contentLabel}
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
                  editing && "flex h-full min-h-0 flex-col p-3!",
                  classNames?.article
                )}
              >
                {editing ? (
                  <MarkdownEditor
                    {...editorProps}
                    key={sessionKey}
                    value={source}
                    onChange={onChange}
                    ariaLabel={editorProps?.ariaLabel ?? contentLabel}
                    preview={reading}
                    previewScrollRef={editorPreviewRef}
                    onModeChange={updateMode}
                  />
                ) : (
                  reading
                )}
              </article>
              {!wide && outlineSections.length > 0 ? (
                <MarkdownOutline
                  key={path ?? "document"}
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
  )
}
