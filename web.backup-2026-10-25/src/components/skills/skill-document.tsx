import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  BookOpen01Icon,
  Delete02Icon,
  Edit02Icon,
  FileAddIcon,
  FileTextIcon,
  Files01Icon,
  FolderAddIcon,
  SourceCodeIcon,
} from "@hugeicons-pro/core-stroke-rounded"
import { DocumentActions } from "@/components/markdown/document-actions"
import {
  MarkdownDocument,
  type DocumentScrollRequest,
} from "@/components/markdown/markdown-document"
import { DocsMobileNav } from "@/components/premium/docs-pages/docs-mobile-nav"
import { Button } from "@/components/motion/button"
import { Input } from "@/components/motion/input"
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/motion/animated-modal"
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
  AnimatedDropdownSeparator,
  AnimatedDropdownTrigger,
} from "@/components/premium/animated-dropdown"
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block"
import { useHighlightedCode } from "@/hooks/use-highlighted-code"
import { cn } from "@/lib/utils"
import { resolveSkillLink } from "@/skills/content"
import {
  BranchedMenu,
  type BranchedMenuChild,
  type BranchedMenuItem,
} from "./branched-menu"

function SourceView({ source, path }: { source: string; path: string }) {
  const lines = useHighlightedCode(source, path.split(".").at(-1) ?? "text")
  return (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>{path}</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={source} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent lineNumbers>
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  )
}

function fileIcon(path: string): IconSvgElement {
  const name = path.split("/").at(-1) ?? path
  if (name === "SKILL.md") return BookOpen01Icon
  if (path.toLowerCase().endsWith(".md")) return FileTextIcon
  return SourceCodeIcon
}

function UnsavedBadge() {
  return (
    <>
      <span className="sr-only">未保存</span>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
    </>
  )
}

function SkillFileNav({
  items,
  folders,
  active,
  busy,
  onPick,
  onCreateFile,
  onCreateDirectory,
  onRenameEntry,
  onDeleteEntry,
}: {
  items: BranchedMenuItem[]
  folders: ReadonlySet<string>
  active: string
  busy: boolean
  onPick: (value: string) => void
  onCreateFile?: (folder: string) => void
  onCreateDirectory?: (folder: string) => void
  onRenameEntry?: (path: string, newPath: string) => Promise<void>
  onDeleteEntry?: (path: string) => Promise<void>
}) {
  const [menu, setMenu] = useState<{
    x: number
    y: number
    folder: string
    path: string
  } | null>(null)
  const [rename, setRename] = useState<{
    path: string
    name: string
    error: string
  } | null>(null)
  const [deleting, setDeleting] = useState<{
    path: string
    folder: boolean
    error: string
  } | null>(null)
  const [pending, setPending] = useState(false)
  const mutating = useRef(false)
  const renameInput = useRef<HTMLInputElement>(null)
  const cancelDelete = useRef<HTMLButtonElement>(null)
  const wrapper = useRef<HTMLDivElement>(null)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null
  )
  const focusTarget = useRef<HTMLElement | null>(null)
  const creatingFile = useRef(false)
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressOrigin = useRef<{ x: number; y: number } | null>(null)
  const held = useRef(false)
  const editable = Boolean(
    onCreateFile || onCreateDirectory || onRenameEntry || onDeleteEntry
  )
  const renamingPath = rename?.path
  useEffect(() => {
    const input = renameInput.current
    if (!renamingPath || !input) return
    input.focus()
    const extension = folders.has(renamingPath)
      ? -1
      : input.value.lastIndexOf(".")
    input.setSelectionRange(0, extension > 0 ? extension : input.value.length)
  }, [renamingPath, folders])
  const cancelLongPress = useCallback(() => {
    if (longPress.current !== null) clearTimeout(longPress.current)
    longPress.current = null
  }, [])
  useEffect(() => cancelLongPress, [cancelLongPress])

  const openMenu = (target: HTMLElement, x: number, y: number) => {
    if (!editable || busy || mutating.current || !wrapper.current) return
    const row = target.closest<HTMLElement>("[data-menu-value]")
    const value = row?.dataset.menuValue ?? ""
    const folder = folders.has(value)
      ? value
      : value.slice(0, Math.max(0, value.lastIndexOf("/")))
    const bounds = wrapper.current.getBoundingClientRect()
    setPortalContainer(
      wrapper.current.closest<HTMLElement>(".chat-modal-panel")
    )
    focusTarget.current =
      target.closest("button") ??
      row?.querySelector("button") ??
      wrapper.current
    creatingFile.current = false
    setMenu({ x: x - bounds.left, y: y - bounds.top, folder, path: value })
  }

  const focusRow = (path: string) => {
    requestAnimationFrame(() => {
      const row = Array.from(
        wrapper.current?.querySelectorAll<HTMLElement>("[data-menu-value]") ??
          []
      ).find((row) => row.dataset.menuValue === path)
      ;(
        row?.querySelector<HTMLButtonElement>("button") ?? wrapper.current
      )?.focus()
    })
  }
  const startRename = (path: string) => {
    creatingFile.current = true
    setRename({ path, name: path.split("/").at(-1) ?? path, error: "" })
  }
  const startDelete = (path: string) => {
    creatingFile.current = true
    setDeleting({ path, folder: folders.has(path), error: "" })
  }
  async function submitRename() {
    if (!rename || !onRenameEntry || busy || mutating.current) return
    if (
      !rename.name.trim() ||
      /[/\\\0]/.test(rename.name) ||
      [".", ".."].includes(rename.name)
    ) {
      setRename({ ...rename, error: "请输入有效名称，不能包含路径分隔符。" })
      renameInput.current?.focus()
      return
    }
    const prefix = rename.path.slice(0, rename.path.lastIndexOf("/") + 1)
    const newPath = prefix + rename.name
    if (newPath === rename.path) {
      setRename(null)
      focusRow(rename.path)
      return
    }
    mutating.current = true
    setPending(true)
    setRename({ ...rename, error: "" })
    try {
      await onRenameEntry(rename.path, newPath)
      setRename(null)
      focusRow(newPath)
    } catch (cause) {
      setRename({
        ...rename,
        error: cause instanceof Error ? cause.message : "重命名失败，请重试。",
      })
      requestAnimationFrame(() => renameInput.current?.focus())
    } finally {
      mutating.current = false
      setPending(false)
    }
  }
  async function confirmDelete() {
    if (!deleting || !onDeleteEntry || busy || mutating.current) return
    mutating.current = true
    setPending(true)
    setDeleting({ ...deleting, error: "" })
    try {
      await onDeleteEntry(deleting.path)
      setDeleting(null)
    } catch (cause) {
      setDeleting({
        ...deleting,
        error: cause instanceof Error ? cause.message : "删除失败，请重试。",
      })
    } finally {
      mutating.current = false
      setPending(false)
    }
  }

  return (
    <>
      <AnimatedDropdown
        modal={false}
        open={menu !== null}
        onOpenChange={(open) => !open && setMenu(null)}
      >
        <div
          ref={wrapper}
          data-slot="skill-file-tree"
          className="relative min-h-full [-webkit-touch-callout:none] pointer-coarse:select-none"
          tabIndex={editable ? 0 : undefined}
          onContextMenu={(event) => {
            if (!editable) return
            if ((event.target as HTMLElement).closest("input")) return
            event.preventDefault()
            cancelLongPress()
            openMenu(event.target as HTMLElement, event.clientX, event.clientY)
          }}
          onKeyDown={(event) => {
            if (
              !editable ||
              !(
                event.key === "ContextMenu" ||
                (event.shiftKey && event.key === "F10")
              )
            )
              return
            event.preventDefault()
            const target = event.target as HTMLElement
            const bounds = target.getBoundingClientRect()
            openMenu(target, bounds.left + 8, bounds.bottom)
          }}
          onPointerDown={(event) => {
            held.current = false
            cancelLongPress()
            if (
              !editable ||
              busy ||
              event.pointerType === "mouse" ||
              (event.target as HTMLElement).closest(
                "input, [data-skill-action]"
              )
            )
              return
            pressOrigin.current = { x: event.clientX, y: event.clientY }
            const target = event.target as HTMLElement
            const { clientX, clientY } = event
            longPress.current = setTimeout(() => {
              held.current = true
              openMenu(target, clientX, clientY)
            }, 700)
          }}
          onPointerMove={(event) => {
            const start = pressOrigin.current
            if (
              start &&
              Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8
            )
              cancelLongPress()
          }}
          onPointerUp={cancelLongPress}
          onPointerCancel={cancelLongPress}
          onClickCapture={(event) => {
            if (!held.current) return
            event.preventDefault()
            event.stopPropagation()
            held.current = false
          }}
        >
          {editable ? (
            <AnimatedDropdownTrigger asChild>
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                className="pointer-events-none absolute size-px opacity-0"
                style={{ left: menu?.x ?? 0, top: menu?.y ?? 0 }}
              />
            </AnimatedDropdownTrigger>
          ) : null}
          <BranchedMenu
            ariaLabel="技能文件"
            items={items}
            active={active}
            defaultOpen="all"
            onSelect={onPick}
            color="var(--sidebar-foreground)"
            accentColor="var(--primary)"
            lineColor="var(--border-strong)"
            width={224}
            className="branched-menu--fill"
            renderActions={
              editable
                ? (value) => {
                    if (rename?.path === value) return null
                    const actions = [
                      {
                        label: "新建文件",
                        icon: FileAddIcon,
                        run: folders.has(value) ? onCreateFile : undefined,
                      },
                      {
                        label: "新建目录",
                        icon: FolderAddIcon,
                        run: folders.has(value) ? onCreateDirectory : undefined,
                      },
                      {
                        label: "重命名",
                        icon: Edit02Icon,
                        run: onRenameEntry && startRename,
                      },
                      {
                        label: "删除",
                        icon: Delete02Icon,
                        run: onDeleteEntry && startDelete,
                      },
                    ]
                    return (
                      <div className="branched-menu__actions">
                        {actions
                          .filter(({ run }) => run)
                          .map(({ label, icon, run }) => (
                            <Button
                              key={label}
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "size-6! shrink-0 p-0! text-muted-foreground hover:text-foreground",
                                label === "删除" && "hover:text-destructive"
                              )}
                              aria-label={`${label} ${value}`}
                              title={`${label} ${value}`}
                              data-skill-action=""
                              disabled={busy || pending}
                              onClick={(event) => {
                                event.stopPropagation()
                                focusTarget.current = event.currentTarget
                                run?.(value)
                              }}
                            >
                              <HugeiconsIcon
                                icon={icon}
                                size={14}
                                aria-hidden="true"
                              />
                            </Button>
                          ))}
                      </div>
                    )
                  }
                : undefined
            }
            renderEditor={(value) =>
              rename?.path === value ? (
                <form
                  className="skill-file-rename"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void submitRename()
                  }}
                >
                  <Input
                    ref={renameInput}
                    aria-label={`重命名 ${value}`}
                    value={rename.name}
                    onChange={(name) =>
                      setRename({ ...rename, name, error: "" })
                    }
                    disabled={pending}
                    error={Boolean(rename.error)}
                    classNames={{
                      field: "h-8! rounded-md!",
                      input: "px-2! text-xs!",
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Escape") return
                      event.preventDefault()
                      event.stopPropagation()
                      if (mutating.current) return
                      setRename(null)
                      focusRow(value)
                    }}
                  />
                </form>
              ) : null
            }
          />
          {rename?.error ? (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {rename.error}
            </p>
          ) : null}
        </div>
        {editable ? (
          <AnimatedDropdownContent
            className="min-w-36"
            sideOffset={2}
            portalContainer={portalContainer}
            collisionBoundary={portalContainer}
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              if (renameInput.current) {
                requestAnimationFrame(() => renameInput.current?.focus())
              } else if (!creatingFile.current) focusTarget.current?.focus()
            }}
          >
            {onCreateFile ? (
              <AnimatedDropdownItem
                disabled={busy}
                onSelect={() => {
                  creatingFile.current = true
                  onCreateFile(menu?.folder ?? "")
                }}
              >
                新建文件
              </AnimatedDropdownItem>
            ) : null}
            {onCreateDirectory ? (
              <AnimatedDropdownItem
                disabled={busy}
                onSelect={() => onCreateDirectory(menu?.folder ?? "")}
              >
                新建目录
              </AnimatedDropdownItem>
            ) : null}
            {menu?.path && (onRenameEntry || onDeleteEntry) ? (
              <>
                {onCreateFile || onCreateDirectory ? (
                  <AnimatedDropdownSeparator />
                ) : null}
                {onRenameEntry ? (
                  <AnimatedDropdownItem
                    disabled={busy || pending}
                    onSelect={() => startRename(menu.path)}
                  >
                    重命名
                  </AnimatedDropdownItem>
                ) : null}
                {onDeleteEntry ? (
                  <AnimatedDropdownItem
                    destructive
                    disabled={busy || pending}
                    onSelect={() => startDelete(menu.path)}
                  >
                    删除
                  </AnimatedDropdownItem>
                ) : null}
              </>
            ) : null}
          </AnimatedDropdownContent>
        ) : null}
      </AnimatedDropdown>
      <AnimatedModal
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !mutating.current) setDeleting(null)
        }}
        initialFocus={cancelDelete}
        onExitComplete={() => {
          if (focusTarget.current?.isConnected) focusTarget.current.focus()
          else wrapper.current?.focus()
        }}
        panelClassName="max-w-sm p-5"
      >
        <AnimatedModalTitle className="text-lg font-medium">
          {deleting?.folder ? "删除目录" : "删除文件"}
        </AnimatedModalTitle>
        <AnimatedModalDescription className="mt-2 text-sm break-all text-muted-foreground">
          {deleting?.folder
            ? `确定删除目录「${deleting.path}」及其所有文件和子目录？此操作无法撤销。`
            : `确定删除「${deleting?.path}」？此操作无法撤销。`}
        </AnimatedModalDescription>
        {deleting?.error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {deleting.error}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            ref={cancelDelete}
            variant="ghost"
            disabled={pending}
            onClick={() => setDeleting(null)}
          >
            取消
          </Button>
          <Button
            disabled={busy || pending}
            className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
            onClick={() => void confirmDelete()}
          >
            {pending ? "正在删除…" : "确认删除"}
          </Button>
        </div>
      </AnimatedModal>
    </>
  )
}

export type SkillDocumentProps = {
  files: readonly { path: string; modified?: boolean }[]
  entries?: readonly { path: string; kind?: "file" | "folder" }[]
  path: string
  source: string
  active: boolean
  actions?: ReactNode
  message?: string
  loading?: boolean
  busy?: boolean
  dirty?: boolean
  readOnly?: boolean
  editing: boolean
  saveLabel?: string
  preview?: ReactNode
  onEdit: () => void
  onSave: () => void
  onUndo: () => void
  onRestore?: () => void
  onChange: (value: string) => void
  onSelectFile: (path: string) => void
  onAddFile?: (path: string, content: Blob, replace?: boolean) => Promise<void>
  onAddDirectory?: (path: string) => Promise<void>
  onRenameEntry?: (path: string, newPath: string) => Promise<void>
  onDeleteEntry?: (path: string) => Promise<void>
  onError: (message: string) => void
}

export function SkillDocument({
  files,
  entries = files,
  path,
  source,
  active,
  actions,
  message,
  loading = false,
  busy = false,
  dirty = false,
  readOnly = false,
  editing,
  saveLabel = "保存草稿",
  preview: customPreview,
  onEdit,
  onSave,
  onUndo,
  onRestore,
  onChange,
  onSelectFile,
  onAddFile,
  onAddDirectory,
  onRenameEntry,
  onDeleteEntry,
  onError,
}: SkillDocumentProps) {
  const [navOpen, setNavOpen] = useState(false)
  const [scrollRequest, setScrollRequest] =
    useState<DocumentScrollRequest | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const addedFileFocus = useRef<string | null>(null)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const file = files.find((entry) => entry.path === path)
  const markdown = /\.mdx?$/i.test(path)

  function followLink(event: MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as Element).closest("a")
    if (!anchor) return
    let href = anchor.getAttribute("href")
    if (!href) return
    if (href.startsWith("https://skill.invalid/")) {
      const local = new URL(href)
      href = local.pathname + local.hash
    }
    const target = resolveSkillLink(path, href)
    if (!target) return
    event.preventDefault()
    event.stopPropagation()
    if (!files.some((entry) => entry.path === target.path)) {
      onError(`找不到文件 ${target.path}。请从文件导航选择已有文件。`)
      return
    }
    onError("")
    setScrollRequest(target)
    onSelectFile(target.path)
  }

  const { menuItems, folders, occupiedPaths } = useMemo(() => {
    const fileBadge = (entryPath: string) => {
      const modified = files.find((file) => file.path === entryPath)?.modified
      return {
        value: entryPath,
        label: entryPath.split("/").at(-1) ?? entryPath,
        icon: fileIcon(entryPath),
        badge: modified ? <UnsavedBadge /> : undefined,
      }
    }
    type TreeNode = {
      label: string
      path: string
      folder: boolean
      children: TreeNode[]
    }
    const tree: TreeNode[] = []
    const folders = new Set<string>()
    const occupiedPaths = new Set<string>()
    for (const entry of [...entries, ...files]) {
      const parts = entry.path.split("/")
      let level = tree
      parts.forEach((part, index) => {
        const path = parts.slice(0, index + 1).join("/")
        const folder =
          index < parts.length - 1 ||
          ("kind" in entry && entry.kind === "folder")
        occupiedPaths.add(path.toLowerCase())
        if (folder) folders.add(path)
        let node = level.find((item) => item.label === part)
        if (!node) {
          node = {
            label: part,
            path,
            folder,
            children: [],
          }
          level.push(node)
        }
        node.folder ||= folder
        level = node.children
      })
    }
    const collectChildren = (
      node: TreeNode,
      depth: number
    ): BranchedMenuChild[] => {
      return node.children.flatMap((child) =>
        child.folder
          ? [
              {
                value: child.path,
                label: child.label,
                selectable: false,
                depth,
              },
              ...collectChildren(child, depth + 1),
            ]
          : [{ ...fileBadge(child.path), depth }]
      )
    }
    const menuItems: BranchedMenuItem[] = tree.map((node) =>
      node.folder
        ? {
            value: node.path,
            label: node.label,
            selectable: false,
            children: collectChildren(node, 0),
          }
        : fileBadge(node.path)
    )
    return { menuItems, folders, occupiedPaths }
  }, [entries, files])

  const selectFromSidebar = (value: string) => {
    setScrollRequest({ path: value, hash: "" })
    onSelectFile(value)
  }
  const selectFromDrawer = (value: string) => {
    selectFromSidebar(value)
    setNavOpen(false)
  }

  const documentEditing = editing && !readOnly && !!file && !loading
  const documentPreview =
    !file ? (
      files.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无文件</p>
      ) : (
        <p role="alert">文件不存在，请从左侧导航选择文件。</p>
      )
    ) : loading ? (
      <p role="status">正在读取文件…</p>
    ) : customPreview !== undefined ? (
      customPreview
    ) : !markdown ? (
      <>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">
          {path.split("/").at(-1)}
        </h1>
        <SourceView source={source} path={path} />
      </>
    ) : undefined
  function unusedPath(folder: string, directory: boolean) {
    const prefix = folder ? `${folder}/` : ""
    const name = directory ? "未命名目录" : "未命名"
    const extension = directory ? "" : ".md"
    let value = `${prefix}${name}${extension}`
    for (let index = 2; occupiedPaths.has(value.toLowerCase()); index++)
      value = `${prefix}${name}-${index}${extension}`
    return value
  }
  async function createFile(folder: string) {
    if (busy || !onAddFile) return
    const filePath = unusedPath(folder, false)
    try {
      await onAddFile(filePath, new Blob([""]))
      if (mounted.current) {
        if (navOpen) addedFileFocus.current = filePath
        setNavOpen(false)
      }
    } catch {
      // The owner reports the error and retains the current document.
    }
  }
  async function createDirectory(folder: string) {
    if (busy || !onAddDirectory) return
    try {
      await onAddDirectory(unusedPath(folder, true))
    } catch {
      // The owner reports the error and retains the current document.
    }
  }
  const fileCreation = onAddFile
    ? (folder: string) => void createFile(folder)
    : undefined
  const directoryCreation = onAddDirectory
    ? (folder: string) => void createDirectory(folder)
    : undefined

  const documentActions = active ? (
    <DocumentActions
      editing={editing}
      busy={busy}
      disabled={loading || !file}
      dirty={dirty}
      readOnly={readOnly}
      saveLabel={saveLabel}
      onEdit={onEdit}
      onSave={onSave}
      onUndo={onUndo}
      onRestore={onRestore}
    >
      <Button
        variant="ghost"
        size="icon"
        className="skill-files-trigger size-7 text-muted-foreground/70 hover:text-foreground"
        aria-label="浏览技能文件"
        title="浏览技能文件"
        onClick={() => setNavOpen(true)}
      >
        <HugeiconsIcon icon={Files01Icon} size={16} aria-hidden="true" />
      </Button>
      {actions}
    </DocumentActions>
  ) : null

  return (
    <div className="skill-docs" data-slot="skill-screen" ref={rootRef}>
      <span role="status" className="sr-only">
        {message}
      </span>
      <MarkdownDocument
        source={source}
        path={path}
        editing={documentEditing}
        onChange={onChange}
        preview={documentPreview}
        empty={
          <p className="py-12 text-center text-sm text-muted-foreground">
            暂无正文
          </p>
        }
        editorProps={{
          ariaLabel: `编辑 ${path}`,
          autoFocus: true,
          markdown,
        }}
        link={{
          base: `https://skill.invalid/${path}`,
          onClick: followLink,
        }}
        scrollRequest={scrollRequest}
        actions={documentActions}
        sidebar={
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-4">
            <SkillFileNav
              items={menuItems}
              folders={folders}
              active={path}
              busy={busy}
              onPick={selectFromSidebar}
              onCreateFile={fileCreation}
              onCreateDirectory={directoryCreation}
              onRenameEntry={onRenameEntry}
              onDeleteEntry={onDeleteEntry}
            />
          </div>
        }
        contentLabel="文件内容"
        classNames={{
          sidebar: "skill-file-sidebar",
          scroll: "skill-docs-scroll",
        }}
      />
      <DocsMobileNav
        open={navOpen}
        onOpenChange={setNavOpen}
        onExitComplete={() => {
          const target = addedFileFocus.current
          addedFileFocus.current = null
          // Headless UI restores the previous focus when its closing trap unmounts.
          requestAnimationFrame(() => {
            const editor =
              rootRef.current?.querySelector<HTMLTextAreaElement>("textarea")
            if (
              active &&
              target &&
              editor?.getAttribute("aria-label") === `编辑 ${target}`
            )
              editor.focus()
          })
        }}
        title="技能文件"
        closeLabel="关闭文件导航"
        nav={
          <SkillFileNav
            items={menuItems}
            folders={folders}
            active={path}
            busy={busy}
            onPick={selectFromDrawer}
            onCreateFile={fileCreation}
            onCreateDirectory={directoryCreation}
            onRenameEntry={onRenameEntry}
            onDeleteEntry={onDeleteEntry}
          />
        }
      />
    </div>
  )
}
