"use client"

import {
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { motion, useReducedMotion } from "motion/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BotIcon,
  Cancel01Icon,
  FileTextIcon,
  FolderOpenIcon,
  GitMergeIcon,
  Globe02Icon,
  MoreVerticalIcon,
  PanelRightCloseIcon,
  PlusSignIcon,
  ReloadIcon,
  Search01Icon,
} from "@hugeicons-pro/core-stroke-rounded"
import { Button } from "@/components/motion/button"
import { ChatScreen } from "@/components/chat/chat-screen"
import {
  AnimatedDropdown as DropdownMenu,
  AnimatedDropdownContent as DropdownMenuContent,
  AnimatedDropdownItem as DropdownMenuItem,
  AnimatedDropdownTrigger as DropdownMenuTrigger,
} from "@/components/premium/animated-dropdown"
import { Input } from "@/components/motion/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs"
import { MorphicTooltip } from "@/components/premium/morphic-tooltip/morphic-tooltip"
import { SPRING_PANEL } from "@/lib/ease"
import { cn } from "@/lib/utils"
import type {
  RecommendedSite,
  WorkbenchBackend,
  WorkbenchScope,
} from "@/workbench/backend"
import { ChangesView } from "./changes-view"
import { FilesView, FileView } from "./files-view"
import { StartPage } from "./start-page"
import { useBackendData } from "./use-backend-data"
import { useAppDependencies } from "@/app/dependencies"
import type { ModelChoice } from "@/models/source"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { BrowserView, BrowserTaskStatus } from "./browser-view"
import { OperationsBrowserView } from "./operations-browser-view"

const MIN_WIDTH = 320
const DEFAULT_WIDTH = 400
const MAX_WIDTH = 640
const DEBUG_SUGGESTIONS = [
  "你能帮我做什么？",
  "查一下订单 1024 的最新状态",
  "这周的客户问题有什么共同点？",
] as const

function clampWidth(value: number): number {
  const viewportCap = Math.round(window.innerWidth * 0.6)
  return Math.min(Math.max(value, MIN_WIDTH), Math.min(MAX_WIDTH, viewportCap))
}

export type WorkbenchView =
  | { type: "start" }
  | { type: "browser" }
  | { type: "operations-browser" }
  | { type: "files" }
  | { type: "changes" }
  | { type: "file"; path: string }
  | { type: "agent-debug"; agentId: string; name: string }

export type WorkbenchTab = { id: string; view: WorkbenchView }
export type WorkbenchHandle = {
  openBrowser(): void
  openAgentDebug(agentId: string, name: string): void
}

function basename(path: string): string {
  const segment = path.split("/").filter(Boolean).pop()
  return segment ?? path
}

function viewTitle(view: WorkbenchView): string {
  switch (view.type) {
    case "start":
      return "新标签页"
    case "browser":
      return "Chrome"
    case "operations-browser":
      return "运维浏览器"
    case "files":
      return "文件"
    case "changes":
      return "变更"
    case "file":
      return basename(view.path)
    case "agent-debug":
      return `${view.name} 调试`
  }
}

function viewIcon(view: WorkbenchView): IconSvgElement {
  switch (view.type) {
    case "start":
    case "browser":
    case "operations-browser":
      return Globe02Icon
    case "files":
      return FolderOpenIcon
    case "changes":
      return GitMergeIcon
    case "file":
      return FileTextIcon
    case "agent-debug":
      return BotIcon
  }
}

function TabButton({
  namespace,
  tab,
  active,
  onClose,
}: {
  namespace: string
  tab: WorkbenchTab
  active: boolean
  onClose?: () => void
}) {
  return (
    <div className="group/tab relative min-w-0 shrink-0">
      <TabsTrigger
        value={tab.id}
        id={`${namespace}-tab-${tab.id}`}
        aria-controls={`${namespace}-panel-${tab.id}`}
        className={cn(
          "h-8 max-w-36 py-0 pl-3 text-xs focus-visible:ring-2 focus-visible:ring-ring",
          onClose ? "pr-7" : "pr-3"
        )}
        indicatorClassName="bg-accent"
        activeLabelClassName="text-accent-foreground"
        icon={<HugeiconsIcon icon={viewIcon(tab.view)} size={13} aria-hidden="true" />}
      >
        <span className="min-w-0 truncate">{viewTitle(tab.view)}</span>
      </TabsTrigger>
      {onClose ? (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`关闭标签页 ${viewTitle(tab.view)}`}
          onClick={onClose}
          className={cn(
            "absolute top-1/2 right-1 z-20 size-5 -translate-y-1/2 text-muted-foreground transition-opacity group-focus-within/tab:opacity-100 group-hover/tab:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none",
            active ? "opacity-100" : "opacity-0"
          )}
        >
          <HugeiconsIcon icon={Cancel01Icon} size={10} aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )
}

export function WorkbenchPanel({
  ref,
  id,
  open,
  onClose,
  onReturnToApproval,
  backend,
  scope,
  models,
}: {
  ref?: Ref<WorkbenchHandle>
  id?: string
  open: boolean
  onClose: () => void
  onReturnToApproval?: () => void
  backend: WorkbenchBackend
  scope: WorkbenchScope | null
  models: readonly ModelChoice[]
}) {
  const namespace = useId()
  const { desktop } = useAppDependencies()
  const desktopState = useSyncExternalStore(
    desktop.subscribe,
    desktop.getState,
    desktop.getState
  )
  const { browser, task } = desktopState
  const browserThreadId = desktopState.browserThreadId ?? null
  const { copy } = useCopyToClipboard()
  const [hostFailure, setHostFailure] = useState<{
    threadId: string | null
    message: string
  } | null>(null)
  const hostError =
    hostFailure?.threadId === browserThreadId ? hostFailure.message : ""
  const [navigatingPages, setNavigatingPages] = useState<
    ReadonlySet<string | null>
  >(() => new Set())
  const navigating = navigatingPages.has(browserThreadId)
  const reduce = useReducedMotion()
  const counter = useRef(1)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [dragging, setDragging] = useState(false)
  const dragState = useRef<{ pointerId: number; rightEdge: number } | null>(
    null
  )

  // 拖拽期间禁用文本选择，结束后恢复。
  useEffect(() => {
    if (!dragging) return
    const previous = document.body.style.userSelect
    document.body.style.userSelect = "none"
    return () => {
      document.body.style.userSelect = previous
    }
  }, [dragging])
  const [tabs, setTabs] = useState<readonly WorkbenchTab[]>([
    { id: "tab-1", view: { type: "start" } },
  ])
  const [activeId, setActiveId] = useState("tab-1")
  const pendingTabFocus = useRef<string | null>(null)
  useLayoutEffect(() => {
    if (!pendingTabFocus.current) return
    document.getElementById(`${namespace}-tab-${pendingTabFocus.current}`)?.focus()
    pendingTabFocus.current = null
  }, [activeId, tabs, namespace])
  const [addressDraft, setAddressDraft] = useState<{
    tabId: string
    threadId: string | null
    url: string
    value: string
  } | null>(null)
  const openBrowser = useCallback(() => {
    setTabs((current) =>
      current.some((tab) => tab.id === "browser")
        ? current
        : [...current, { id: "browser", view: { type: "browser" } }]
    )
    setActiveId((current) => current === "operations-browser" ? current : "browser")
    setAddressDraft(null)
    setHostFailure(null)
  }, [])
  const openOperationsBrowser = useCallback(() => {
    setTabs((current) => current.some((tab) => tab.id === "operations-browser")
      ? current
      : [...current, { id: "operations-browser", view: { type: "operations-browser" } }])
    setActiveId("operations-browser")
  }, [])
  useImperativeHandle(
    ref,
    () => ({
      openBrowser,
      openAgentDebug(agentId, name) {
        const id = `agent-debug:${agentId}`
        const view: WorkbenchView = { type: "agent-debug", agentId, name }
        setTabs((current) =>
          current.some((tab) => tab.id === id)
            ? current.map((tab) => (tab.id === id ? { ...tab, view } : tab))
            : [...current, { id, view }]
        )
        setActiveId(id)
        setAddressDraft(null)
      },
    }),
    [openBrowser]
  )
  // 推荐位在面板层级缓存一次，返回起始页不重新请求。
  const sites = useBackendData(
    "recommendations",
    () => backend.listRecommendations(),
    backend
  )
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0]
  const view = activeTab?.view ?? { type: "start" as const }
  const browserView = view.type === "start" || view.type === "browser"
  const currentUrl = view.type === "browser" ? browser.url : ""
  const draftUrl =
    !task &&
    addressDraft?.tabId === activeId &&
    addressDraft.threadId === browserThreadId &&
    addressDraft.url === currentUrl
      ? addressDraft.value
      : currentUrl
  const navigationDisabled =
    task !== null || navigating || browser.status === "loading"

  function selectTab(id: string) {
    setActiveId(id)
    setAddressDraft(null)
    setHostFailure(null)
  }

  function updateActiveView(next: WorkbenchView) {
    if (!activeTab) return
    setTabs((current) =>
      current.map((tab) =>
        tab.id === activeTab.id ? { ...tab, view: next } : tab
      )
    )
  }

  function addTab() {
    counter.current += 1
    const id = `tab-${counter.current}`
    setTabs((current) => [...current, { id, view: { type: "start" } }])
    setActiveId(id)
    setAddressDraft(null)
  }

  function closeTab(id: string) {
    setTabs((current) => {
      const index = current.findIndex((tab) => tab.id === id)
      const remaining = current.filter((tab) => tab.id !== id)
      const next = remaining.length
        ? remaining
        : [{ id: "tab-1", view: { type: "start" as const } }]
      pendingTabFocus.current = activeId
      if (id === activeId) {
        const neighbor = next[Math.min(index, next.length - 1)]
        if (neighbor) {
          setActiveId(neighbor.id)
          pendingTabFocus.current = neighbor.id
          setAddressDraft(null)
        }
      }
      return next
    })
  }

  function navigate(url: string) {
    const value = url.trim()
    if (!value || navigationDisabled) return
    openBrowser()
    setAddressDraft({
      tabId: "browser",
      threadId: browserThreadId,
      url: browser.url,
      value,
    })
    void runBrowserAction(async () => {
      await desktop.navigate(value)
      setAddressDraft((current) =>
        current?.threadId === browserThreadId && current.value === value
          ? null
          : current
      )
    })
  }

  async function runBrowserAction(action: () => Promise<void>) {
    if (navigationDisabled) return
    setHostFailure(null)
    setNavigatingPages((current) => new Set(current).add(browserThreadId))
    try {
      await action()
    } catch (error) {
      if ((desktop.getState().browserThreadId ?? null) === browserThreadId)
        setHostFailure({
          threadId: browserThreadId,
          message:
            error instanceof Error ? error.message : "页面操作失败，请重试。",
        })
    } finally {
      setNavigatingPages((current) => {
        const next = new Set(current)
        next.delete(browserThreadId)
        return next
      })
    }
  }

  async function showChrome() {
    setHostFailure(null)
    try {
      await desktop.selectBrowserThread?.(browserThreadId, { focus: true })
    } catch (error) {
      if ((desktop.getState().browserThreadId ?? null) === browserThreadId)
        setHostFailure({
          threadId: browserThreadId,
          message:
            error instanceof Error ? error.message : "无法显示 Chrome，请重试。",
        })
    }
  }

  function openSite(site: RecommendedSite) {
    navigate(site.url)
  }

  function handleResizeStart(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    const panel = event.currentTarget.parentElement
    if (!panel) return
    event.preventDefault()
    dragState.current = {
      pointerId: event.pointerId,
      rightEdge: panel.getBoundingClientRect().right,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  function handleResizeMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setWidth(clampWidth(drag.rightEdge - event.clientX))
  }

  function handleResizeEnd(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragState.current = null
    setDragging(false)
  }

  function handleResizeKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 64 : 16
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      setWidth((current) => clampWidth(current + step))
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      setWidth((current) => clampWidth(current - step))
    }
  }

  return (
    <motion.aside
      id={id}
      aria-label="工作台"
      tabIndex={-1}
      initial={false}
      animate={{ width: open ? width : 0 }}
      transition={reduce || dragging ? { duration: 0 } : SPRING_PANEL}
      className="h-full shrink-0 overflow-hidden outline-none max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-40 max-md:max-w-[calc(100vw-4rem)]"
    >
      <div
        inert={!open}
        style={{ width }}
        className="relative ml-auto flex h-full max-w-full flex-col border-l border-border bg-background"
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="调整工作台宽度"
          aria-valuenow={width}
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          tabIndex={0}
          title="拖拽调整宽度，双击恢复默认"
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
          onKeyDown={handleResizeKeyDown}
          className="group absolute inset-y-0 left-0 z-20 w-2 -translate-x-1/2 cursor-col-resize outline-none max-md:hidden"
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors duration-150 motion-reduce:transition-none",
              dragging
                ? "bg-primary/60"
                : "group-hover:bg-primary/50 group-focus-visible:bg-primary/50"
            )}
          />
        </div>
        <div className="flex h-12 shrink-0 items-center gap-1 px-3">
          <MorphicTooltip content="收起工作台" side="bottom" align="start">
            <Button
              variant="ghost"
              size="icon"
              aria-label="收起工作台"
              onClick={onClose}
              className="size-9 shrink-0 rounded-full"
            >
              <HugeiconsIcon
                icon={PanelRightCloseIcon}
                size={16}
                aria-hidden="true"
              />
            </Button>
          </MorphicTooltip>
          <Tabs value={activeId} onValueChange={selectTab} variant="segment" className="min-w-0 flex-1">
            <TabsList aria-label="工作台标签页" className="gap-0.5 bg-transparent p-0">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                namespace={namespace}
                tab={tab}
                active={tab.id === activeId}
                onClose={
                  tabs.length > 1 || tab.view.type === "browser"
                    ? () => closeTab(tab.id)
                    : undefined
                }
              />
            ))}
            </TabsList>
          </Tabs>
          <MorphicTooltip content="运维浏览器" side="bottom" align="end">
            <Button variant="ghost" size="icon" aria-label="打开运维浏览器" onClick={openOperationsBrowser} className="size-9 shrink-0 rounded-full">
              <HugeiconsIcon icon={Globe02Icon} size={16} aria-hidden="true" />
            </Button>
          </MorphicTooltip>
          <MorphicTooltip content="新建标签页" side="bottom" align="end">
            <Button
              variant="ghost"
              size="icon"
              aria-label="新建标签页"
              onClick={addTab}
              className="size-9 shrink-0 rounded-full"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={16} aria-hidden="true" />
            </Button>
          </MorphicTooltip>
        </div>

        {browserView ? (
          <div className="flex h-12 shrink-0 items-center gap-1 px-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="后退"
              disabled={
                view.type !== "browser" ||
                navigationDisabled ||
                !browser.canGoBack
              }
              onClick={() => void runBrowserAction(() => desktop.back())}
              className="size-9 rounded-full"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                size={16}
                aria-hidden="true"
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="前进"
              disabled={
                view.type !== "browser" ||
                navigationDisabled ||
                !browser.canGoForward
              }
              onClick={() => void runBrowserAction(() => desktop.forward())}
              className="size-9 rounded-full"
            >
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                aria-hidden="true"
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="重新加载"
              disabled={
                view.type !== "browser" || navigationDisabled || !browser.url
              }
              onClick={() => void runBrowserAction(() => desktop.reload())}
              className="size-9 rounded-full"
            >
              <HugeiconsIcon icon={ReloadIcon} size={16} aria-hidden="true" />
            </Button>
            <form
              className="min-w-0 flex-1"
              onSubmit={(event) => {
                event.preventDefault()
                navigate(draftUrl)
              }}
            >
              <Input
                leftIcon={
                  <HugeiconsIcon
                    icon={Search01Icon}
                    size={14}
                    aria-hidden="true"
                  />
                }
                value={draftUrl}
                onChange={(value) =>
                  setAddressDraft({
                    tabId: activeId,
                    threadId: browserThreadId,
                    url: currentUrl,
                    value,
                  })
                }
                disabled={navigationDisabled}
                placeholder="输入网址"
                aria-label="地址栏"
                classNames={{
                  field: "h-9 border-transparent bg-muted/70 focus-within:border-ring focus-within:bg-background",
                  input: "text-xs disabled:text-muted-foreground disabled:opacity-100",
                }}
              />
            </form>
            <DropdownMenu>
              <MorphicTooltip content="更多" side="bottom" align="end">
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="更多操作"
                    className="size-9 rounded-full"
                  >
                    <HugeiconsIcon
                      icon={MoreVerticalIcon}
                      size={16}
                      aria-hidden="true"
                    />
                  </Button>
                </DropdownMenuTrigger>
              </MorphicTooltip>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  disabled={view.type !== "browser" || !browser.url}
                  onSelect={() => {
                    if (view.type === "browser") void copy(browser.url)
                  }}
                >
                  复制链接
                </DropdownMenuItem>
                {!desktopState.simulated && desktop.selectBrowserThread ? (
                  <DropdownMenuItem onSelect={() => void showChrome()}>
                    显示 Chrome
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={addTab}>
                  新建标签页
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : view.type === "agent-debug" || view.type === "operations-browser" ? null : (
          <div className="flex h-12 shrink-0 items-center gap-1 px-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="返回新标签页"
              onClick={() => updateActiveView({ type: "start" })}
              className="size-9 rounded-full"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                size={16}
                aria-hidden="true"
              />
            </Button>
            <p className="min-w-0 flex-1 truncate px-1 text-sm font-medium">
              {view.type === "file" ? basename(view.path) : viewTitle(view)}
            </p>
          </div>
        )}

        {view.type === "browser" && hostError ? (
          <p role="alert" className="px-3 py-1 text-xs text-destructive">
            {hostError}
          </p>
        ) : null}
        {view.type === "browser" ? (
          <BrowserTaskStatus
            task={task}
            onReturnToApproval={onReturnToApproval}
          />
        ) : null}
        <div className="@container min-h-0 flex-1 overflow-hidden"
          role={view.type === "agent-debug" ? undefined : "tabpanel"}
          id={view.type === "agent-debug" ? undefined : `${namespace}-panel-${activeId}`}
          aria-labelledby={view.type === "agent-debug" ? undefined : `${namespace}-tab-${activeId}`}
        >
          {view.type === "start" ? (
            <StartPage
              sites={sites}
              onOpenChanges={() => updateActiveView({ type: "changes" })}
              onOpenFiles={() => updateActiveView({ type: "files" })}
              onNewTab={addTab}
              onOpenSite={openSite}
              onOpenOperationsBrowser={openOperationsBrowser}
            />
          ) : view.type === "operations-browser" ? (
            <OperationsBrowserView
              browser={desktopState.operationsBrowser}
              desktop={desktop}
              simulated={desktopState.simulated}
              visible={open}
            />
          ) : view.type === "browser" ? (
            <BrowserView
              browser={browser}
              simulated={desktopState.simulated}
              onShowChrome={
                desktop.selectBrowserThread ? () => void showChrome() : undefined
              }
              canRetry={!navigationDisabled && Boolean(browser.url)}
              onRetry={() => void runBrowserAction(() => desktop.reload())}
            />
          ) : view.type === "files" ? (
            <FilesView
              backend={backend}
              scope={scope}
              onOpenFile={(path) => updateActiveView({ type: "file", path })}
            />
          ) : view.type === "file" ? (
            <FileView backend={backend} scope={scope} path={view.path} />
          ) : view.type === "changes" ? (
            <ChangesView backend={backend} scope={scope} />
          ) : null}
          {tabs.map((tab) =>
            tab.view.type === "agent-debug" ? (
              <div
                key={tab.id}
                role="tabpanel"
                id={`${namespace}-panel-${tab.id}`}
                aria-labelledby={`${namespace}-tab-${tab.id}`}
                aria-label={viewTitle(tab.view)}
                className={tab.id === activeId ? "h-full min-h-0" : "hidden"}
              >
                <ChatScreen
                  models={models}
                  threadId={`agent-test:${tab.view.agentId}`}
                  suggestions={DEBUG_SUGGESTIONS}
                />
              </div>
            ) : null
          )}
        </div>
      </div>
    </motion.aside>
  )
}
