"use client"

import { createPortal } from "react-dom"
import { useTitlebarTarget } from "@/components/window-frame"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  BookOpen01Icon,
  Cancel01Icon,
  FileTextIcon,
  Folder01Icon,
  HistoryIcon,
  Home01Icon,
  Layers02Icon,
  ListViewIcon,
  PanelLeftIcon,
  PlusSignIcon,
  Search01Icon,
  Settings02Icon,
} from "@hugeicons-pro/core-stroke-rounded"
import { motion, useReducedMotion } from "motion/react"
import {
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import {
  AnimatedSidebar,
  AnimatedSidebarClose,
  AnimatedSidebarContent,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarProvider,
  useAnimatedSidebar,
} from "@/components/motion/animated-sidebar"
import { Button } from "@/components/motion/button"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { SharedLayoutBg } from "@/components/motion/shared-layout-bg"
import {
  MorphicCommandPalette,
  MorphicCommandPaletteContent,
} from "@/components/beui/premium/morphic-command-palette/morphic-command-palette"
import {
  MorphicTooltip,
  MorphicTooltipProvider,
} from "@/components/premium/morphic-tooltip/morphic-tooltip"
import { SPRING_PANEL } from "@/lib/ease"
import { cn } from "@/lib/utils"

export type SidebarRailItem = {
  id: string
  label: string
  icon?: IconSvgElement
}

export type SidebarRailAction = {
  label: string
  icon?: IconSvgElement
  disabled?: boolean
  onSelect: () => void
}

export type SidebarRailSection = {
  id: string
  label: string
  icon: IconSvgElement
  groups: readonly {
    label: string
    items: readonly SidebarRailItem[]
    /** Extra control rendered beside the group label, e.g. a search button. */
    action?: ReactNode
    /** List groups collapse from their heading; defaults to true. */
    collapsible?: boolean
  }[]
  /** A section can own its rows while still supplying searchable items. */
  renderContent?: (closeNavigation: () => void) => ReactNode
  /** Full-page tools provide their own local navigation. */
  collapseOnSelect?: boolean
  /** Sections with a management list open that list before an individual item. */
  selectFirstItem?: boolean
  /** The section's own list page, rendered below its primary action. */
  overviewLabel?: string
}

export const defaultSections: readonly SidebarRailSection[] = [
  {
    id: "workspace",
    label: "工作区",
    icon: Home01Icon,
    groups: [
      {
        label: "置顶",
        items: [
          { id: "brand-notes", label: "品牌笔记", icon: Folder01Icon },
          { id: "website-refresh", label: "官网改版", icon: Folder01Icon },
        ],
      },
      {
        label: "项目",
        items: [{ id: "fieldwork", label: "实地调研", icon: Folder01Icon }],
      },
      {
        label: "最近",
        items: [
          { id: "launch-direction", label: "发布方向" },
          { id: "research-notes", label: "调研笔记" },
          { id: "campaign-outline", label: "活动大纲" },
          { id: "a-few-good-ideas", label: "一些好点子" },
          { id: "onboarding-checklist", label: "入职清单" },
          { id: "friday-recap", label: "周五复盘" },
        ],
      },
    ],
  },
  {
    id: "library",
    label: "资料库",
    icon: Layers02Icon,
    groups: [
      {
        label: "合集",
        items: [
          { id: "references", label: "参考资料", icon: BookOpen01Icon },
          { id: "saved-pages", label: "收藏的页面", icon: FileTextIcon },
          { id: "assets", label: "素材", icon: Folder01Icon },
        ],
      },
    ],
  },
  {
    id: "activity",
    label: "动态",
    icon: HistoryIcon,
    groups: [
      {
        label: "更新",
        items: [
          { id: "this-week", label: "本周", icon: HistoryIcon },
          { id: "shared-with-you", label: "与我共享", icon: FileTextIcon },
          { id: "archive", label: "归档", icon: Folder01Icon },
        ],
      },
    ],
  },
  {
    id: "settings",
    label: "设置",
    icon: Settings02Icon,
    groups: [
      {
        label: "工作区",
        items: [
          { id: "preferences", label: "偏好设置", icon: Settings02Icon },
          { id: "members", label: "成员", icon: Home01Icon },
          { id: "connections", label: "连接", icon: Layers02Icon },
        ],
      },
    ],
  },
]

export type SidebarRailProps = {
  workspaceName?: string
  sections?: readonly SidebarRailSection[]
  /** The active section's primary action, keyed by section id. */
  actions?: Partial<Record<string, SidebarRailAction>>
  defaultExpanded?: boolean
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  defaultItemId?: string
  activeSectionId?: string
  activeItemId?: string
  onSectionSelect?: (section: SidebarRailSection) => void
  onParentSelect?: (section: SidebarRailSection) => void
  onItemSelect?: (item: SidebarRailItem, section: SidebarRailSection) => void
  account?: { name: string; initials: string }
  onAccountClick?: () => void
  /** Replaces the panel title; search and collapse controls stay built in. Pass null to hide it. */
  panelHeader?: ReactNode
  /** Replaces the account control at the bottom of the icon rail. Pass null to hide it. */
  railFooter?: ReactNode
  /** Extra controls above the account at the bottom of the icon rail. */
  railActions?: ReactNode
  /** Replaces the workspace breadcrumbs; the navigation toggle stays built in. Pass null to hide them. */
  workspaceHeader?: ReactNode
  /** Shared header spacing, including room for floating controls on every page. */
  workspaceHeaderClassName?: string
  /** Hides header/content interactions beneath a mobile end-panel overlay. */
  workspaceInert?: boolean
  /** Full-height column rendered after the header+content column, e.g. the workbench panel. */
  endPanel?: ReactNode
  /** Absolutely positioned overlay on the header+content column, e.g. a floating toggle over the header. Positioning classes are the caller's responsibility. */
  headerOverlay?: ReactNode
  /** Overrides the content wrapper padding; chat-like surfaces pass p-0 and own their padding. */
  contentClassName?: string
  children?: ReactNode
  className?: string
}

const iconButtonClass =
  "size-9 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:size-11"

const RAIL_WIDTH = 64
const SIDEBAR_MIN_WIDTH = 240
const SIDEBAR_DEFAULT_WIDTH = 280
const SIDEBAR_MAX_WIDTH = 420

function clampSidebarWidth(value: number): number {
  const viewportCap = Math.max(
    SIDEBAR_MIN_WIDTH,
    Math.min(SIDEBAR_MAX_WIDTH, window.innerWidth - RAIL_WIDTH - 420)
  )
  return Math.round(Math.min(Math.max(value, SIDEBAR_MIN_WIDTH), viewportCap))
}

function SidebarNavGroup({
  group,
  itemId,
  onSelect,
}: {
  group: SidebarRailSection["groups"][number]
  itemId: string
  onSelect: (item: SidebarRailItem) => void
}) {
  const contentId = useId()
  const [open, setOpen] = useState(true)
  const collapsible = group.collapsible !== false
  return (
    <AnimatedSidebarGroup className="gap-2 p-0">
      <div className="flex items-center gap-1 pr-1">
        {collapsible ? (
          <h3 className="m-0 flex min-w-0 flex-1 items-center">
            <Button
              type="button"
              variant="plain"
              whileHover={undefined}
              whileTap={undefined}
              aria-expanded={open}
              aria-controls={contentId}
              onClick={() => setOpen((value) => !value)}
              className="flex min-h-8 min-w-0 flex-1 items-center justify-start gap-1.5 rounded-full px-3 text-left text-xs font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 pointer-coarse:min-h-11"
            >
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={14}
                aria-hidden="true"
                className={cn(
                  "size-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none",
                  !open && "-rotate-90"
                )}
              />
              <span className="truncate">{group.label}</span>
            </Button>
          </h3>
        ) : (
          <AnimatedSidebarGroupLabel className="mb-0 flex min-w-0 flex-1 items-center px-3 text-xs font-medium text-muted-foreground">
            {group.label}
          </AnimatedSidebarGroupLabel>
        )}
        {group.action}
      </div>
      <AnimatedSidebarGroupContent id={contentId} hidden={!open}>
        <SharedLayoutBg
          as="ul"
          inset={0}
          pillClassName="rounded-full bg-muted/70"
          pillContainerClassName="inset-y-auto top-0 h-9"
          className="flex w-full min-w-0 list-none flex-col gap-0.5"
        >
          {group.items.map((item) => {
            const Icon = item.icon
            return (
              <AnimatedSidebarMenuItem key={item.id}>
                <AnimatedSidebarMenuButton
                  icon={
                    Icon ? (
                      <HugeiconsIcon
                        icon={Icon}
                        aria-hidden="true"
                        size={16}
                        strokeWidth={1.7}
                      />
                    ) : undefined
                  }
                  isActive={item.id === itemId}
                  onSelect={() => onSelect(item)}
                  className="rounded-full font-normal [&>span]:rounded-full"
                >
                  {item.label}
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
            )
          })}
        </SharedLayoutBg>
      </AnimatedSidebarGroupContent>
    </AnimatedSidebarGroup>
  )
}

export function SidebarRail({
  defaultExpanded = true,
  expanded: controlledExpanded,
  onExpandedChange,
  className,
  ...props
}: SidebarRailProps) {
  const titlebarTarget = useTitlebarTarget()
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const [focused, setFocused] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const expanded = controlledExpanded ?? internalExpanded

  useEffect(() => {
    function onResize() {
      if (window.innerWidth < 768) return
      setSidebarWidth((current) => clampSidebarWidth(current))
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  function setExpanded(next: boolean) {
    if (!next) toggleRef.current?.focus({ preventScroll: true })
    if (controlledExpanded === undefined) setInternalExpanded(next)
    onExpandedChange?.(next)
    setFocused(false)
  }

  return (
    <div className={cn(titlebarTarget ? "h-full w-full" : "h-dvh w-full", className)}>
      <MorphicTooltipProvider>
        <AnimatedSidebarProvider
          open={expanded || focused}
          onOpenChange={setExpanded}
          style={{
            "--sidebar-width": `${sidebarWidth}px`,
            "--sidebar-width-mobile": "19rem",
          }}
          className="relative h-full min-h-0 overflow-hidden bg-background"
        >
          <SidebarRailShell
            {...props}
            expanded={expanded}
            setExpanded={setExpanded}
            setFocused={setFocused}
            toggleRef={toggleRef}
            sidebarWidth={sidebarWidth}
            setSidebarWidth={setSidebarWidth}
          />
        </AnimatedSidebarProvider>
      </MorphicTooltipProvider>
    </div>
  )
}

function SidebarRailShell({
  workspaceName = "Cognacta",
  sections = defaultSections,
  actions,
  defaultItemId = "launch-direction",
  activeSectionId,
  activeItemId,
  onSectionSelect,
  onParentSelect,
  onItemSelect,
  account = { name: "陈晓", initials: "陈" },
  onAccountClick,
  panelHeader,
  railFooter,
  railActions,
  workspaceHeader,
  workspaceHeaderClassName,
  workspaceInert,
  endPanel,
  headerOverlay,
  contentClassName,
  children,
  expanded,
  setExpanded,
  setFocused,
  toggleRef,
  sidebarWidth,
  setSidebarWidth,
}: Omit<SidebarRailProps, "expanded" | "onExpandedChange"> & {
  expanded: boolean
  setExpanded: (next: boolean) => void
  setFocused: (next: boolean) => void
  toggleRef: RefObject<HTMLButtonElement | null>
  sidebarWidth: number
  setSidebarWidth: Dispatch<SetStateAction<number>>
}) {
  const titlebarTarget = useTitlebarTarget()
  const context = useAnimatedSidebar()
  const { triggerRef } = context
  const reduce = useReducedMotion()
  const [internalSectionId, setSectionId] = useState(sections[0]?.id)
  const [internalItemId, setItemId] = useState(defaultItemId)
  const sectionId = activeSectionId ?? internalSectionId
  const itemId = activeItemId ?? internalItemId
  const [searchOpen, setSearchOpen] = useState(false)
  const panelId = useId()
  const section =
    sections.find((entry) => entry.id === sectionId) ?? sections[0]
  const sectionAction = section ? actions?.[section.id] : undefined
  const selectedItem = section?.groups
    .flatMap((group) => group.items)
    .find((item) => item.id === itemId)
  const groups = section?.groups ?? []
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const dragState = useRef<{
    pointerId: number
    startX: number
    startWidth: number
  } | null>(null)
  const resizeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )

  useEffect(() => {
    if (!dragging) return
    const previous = document.body.style.userSelect
    document.body.style.userSelect = "none"
    return () => {
      document.body.style.userSelect = previous
    }
  }, [dragging])
  useEffect(() => () => clearTimeout(resizeTimer.current), [])

  function markResizing() {
    setResizing(true)
    clearTimeout(resizeTimer.current)
    resizeTimer.current = setTimeout(() => setResizing(false), 180)
  }

  function handleResizeStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: sidebarWidth,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    setResizing(true)
  }

  function handleResizeMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragState.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setSidebarWidth(
      clampSidebarWidth(drag.startWidth + event.clientX - drag.startX)
    )
  }

  function handleResizeEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragState.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragState.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    setDragging(false)
    setResizing(false)
  }

  function handleResizeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 64 : 16
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      markResizing()
      setSidebarWidth((current) => clampSidebarWidth(current - step))
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      markResizing()
      setSidebarWidth((current) => clampSidebarWidth(current + step))
    }
  }

  function resetSidebarWidth() {
    markResizing()
    setSidebarWidth(SIDEBAR_DEFAULT_WIDTH)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "k"
      )
        return
      const modal =
        event.target instanceof Element
          ? event.target.closest(
              '[aria-modal="true"]:not([data-mobile="true"])'
            )
          : null
      if (modal && !modal.querySelector('[data-slot="command"]')) return
      event.preventDefault()
      setSearchOpen((open) => !open)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  function closePeek() {
    setFocused(false)
  }

  function closeNavigation() {
    context.setOpenMobile(false)
    if (!expanded && !context.isMobile) closePeek()
  }

  function toggleExpanded() {
    setExpanded(!expanded)
  }

  function selectItem(item: SidebarRailItem) {
    if (!section) return
    setItemId(item.id)
    onItemSelect?.(item, section)
    if (section.collapseOnSelect) setExpanded(false)
    if (!expanded && !context.isMobile) {
      toggleRef.current?.focus({ preventScroll: true })
      closePeek()
    }
  }

  function selectSearchItem(target: SidebarRailSection, item: SidebarRailItem) {
    setSectionId(target.id)
    setItemId(item.id)
    onItemSelect?.(item, target)
    if (target.collapseOnSelect) setExpanded(false)
    setSearchOpen(false)
    context.setOpenMobile(false)
    if (!expanded && !context.isMobile) {
      toggleRef.current?.focus({ preventScroll: true })
      closePeek()
    }
  }

  function selectOverview(target: SidebarRailSection) {
    setSectionId(target.id)
    setItemId("")
    if (onParentSelect) onParentSelect(target)
    else onSectionSelect?.(target)
    setSearchOpen(false)
    closeNavigation()
  }

  function runSectionAction(action: SidebarRailAction) {
    if (action.disabled) return
    action.onSelect()
    context.setOpenMobile(false)
    if (!expanded && !context.isMobile) {
      toggleRef.current?.focus({ preventScroll: true })
      closePeek()
    }
  }

  const panelHeaderNode = (
    <AnimatedSidebarHeader className="gap-3 p-4 pb-2">
      <div className="flex items-center gap-1">
        <div data-slot="sidebar-rail-panel-header" className="min-w-0 flex-1">
          {panelHeader === undefined ? (
            <h2 className="truncate text-xl font-medium">{workspaceName}</h2>
          ) : (
            panelHeader
          )}
        </div>
        <MorphicTooltip
          content="搜索导航（⌘K）"
          side="bottom"
          disabled={context.isMobile}
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label="搜索导航"
            aria-haspopup="dialog"
            onClick={() => setSearchOpen(true)}
            className={iconButtonClass}
          >
            <HugeiconsIcon icon={Search01Icon} aria-hidden="true" size={16} />
          </Button>
        </MorphicTooltip>
        <AnimatedSidebarClose className="size-9 rounded-full text-muted-foreground hover:bg-muted md:hidden">
          <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" size={16} />
        </AnimatedSidebarClose>
      </div>
      <div className="flex flex-col gap-1">
        {sectionAction ? (
          <Button
            variant="ghost"
            disabled={sectionAction.disabled}
            onClick={() => runSectionAction(sectionAction)}
            className="h-9 justify-start rounded-full px-2 text-foreground pointer-coarse:min-h-11"
          >
            <HugeiconsIcon
              icon={sectionAction.icon ?? PlusSignIcon}
              aria-hidden="true"
              size={16}
            />
            {sectionAction.label}
          </Button>
        ) : null}
        {section?.overviewLabel ? (
          <Button
            variant="ghost"
            aria-current={itemId === "" ? "page" : undefined}
            onClick={() => selectOverview(section)}
            className={cn(
              "h-9 justify-start rounded-full px-2 text-muted-foreground hover:text-foreground pointer-coarse:min-h-11",
              itemId === "" && "bg-accent text-accent-foreground"
            )}
          >
            <HugeiconsIcon icon={ListViewIcon} aria-hidden="true" size={16} />
            {section.overviewLabel}
          </Button>
        ) : null}
      </div>
    </AnimatedSidebarHeader>
  )

  const headerNode = (
    <header inert={workspaceInert} className="relative flex min-h-12 shrink-0 items-center gap-3 px-3 sm:px-4">
      <MorphicTooltip
        content={expanded ? "收起导航" : "展开导航"}
        side="bottom"
        disabled={context.isMobile}
      >
        <Button
          ref={toggleRef}
          variant="ghost"
          size="icon"
          aria-label={
            expanded && !context.isMobile ? "收起导航" : "展开导航"
          }
          aria-controls={context.isMobile ? undefined : panelId}
          aria-expanded={context.isMobile ? context.openMobile : expanded}
          onClick={(event) => {
            if (context.isMobile) {
              triggerRef.current = event.currentTarget
              context.setOpenMobile(!context.openMobile)
            } else toggleExpanded()
          }}
          className={iconButtonClass}
        >
          <HugeiconsIcon
            icon={PanelLeftIcon}
            aria-hidden="true"
            size={16}
          />
        </Button>
      </MorphicTooltip>
      <div
        data-slot="sidebar-rail-workspace-header"
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3",
          workspaceHeaderClassName
        )}
      >
        {workspaceHeader === undefined ? (
          <Breadcrumbs
            items={[
              {
                label: section?.label ?? "工作区",
                onSelect:
                  onParentSelect && section
                    ? () => onParentSelect(section)
                    : undefined,
              },
              {
                label:
                  itemId === "new-page"
                    ? "未命名页面"
                    : (selectedItem?.label ?? "工作区"),
              },
            ]}
          />
        ) : (
          workspaceHeader
        )}
      </div>
      {titlebarTarget ? headerOverlay : null}
    </header>
  )

  return (
    <>
      <motion.div
        initial={false}
        animate={{
          width:
            !context.isMobile && expanded
              ? RAIL_WIDTH + sidebarWidth
              : RAIL_WIDTH,
        }}
        transition={
          reduce || dragging || resizing ? { duration: 0 } : SPRING_PANEL
        }
        data-rail-state={expanded ? "expanded" : "collapsed"}
        data-peeking={!expanded && context.open ? "true" : "false"}
        className="relative z-20 h-full shrink-0 max-md:w-16!"
        onFocusCapture={(event) => {
          if (!context.isMobile && event.target.matches(":focus-visible")) {
            setFocused(true)
          }
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setFocused(false)
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !expanded && !context.isMobile) {
            event.preventDefault()
            toggleRef.current?.focus({ preventScroll: true })
            closePeek()
          }
        }}
      >
        <nav
          aria-label="工作区导航区域"
          className="relative z-30 flex h-full w-16 flex-col items-center gap-4 border-r border-sidebar-border bg-sidebar py-4"
        >
          {sections.map((entry) => {
            const Icon = entry.icon
            const active = section?.id === entry.id
            return (
              <MorphicTooltip
                key={entry.id}
                content={entry.label}
                side="right"
                disabled={context.isMobile}
                className={entry.id === "settings" ? "mt-auto" : undefined}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={entry.label}
                  aria-current={active ? "page" : undefined}
                  aria-controls={context.isMobile ? undefined : panelId}
                  aria-expanded={
                    active &&
                    (context.isMobile ? context.openMobile : context.open)
                  }
                  onClick={(event) => {
                    setSectionId(entry.id)
                    onSectionSelect?.(entry)
                    if (
                      entry.id !== section?.id &&
                      !entry.renderContent &&
                      entry.selectFirstItem !== false
                    ) {
                      const firstItem = entry.groups[0]?.items[0]
                      if (firstItem) {
                        setItemId(firstItem.id)
                        onItemSelect?.(firstItem, entry)
                      }
                    }
                    if (entry.collapseOnSelect) {
                      context.setOpenMobile(false)
                      setExpanded(false)
                    } else if (context.isMobile) {
                      triggerRef.current = event.currentTarget
                      context.setOpenMobile(true)
                    } else setExpanded(true)
                  }}
                  className={cn(
                    iconButtonClass,
                    active && "bg-accent text-accent-foreground"
                  )}
                >
                  <HugeiconsIcon
                    icon={Icon}
                    aria-hidden="true"
                    size={20}
                    strokeWidth={1.7}
                  />
                </Button>
              </MorphicTooltip>
            )
          })}
          <div
            data-slot="sidebar-rail-footer"
            className={cn(
              "flex flex-col items-center gap-3",
              !sections.some((entry) => entry.id === "settings") && "mt-auto"
            )}
          >
            {railActions}
            {railFooter === undefined ? (
              <MorphicTooltip
                content={account.name}
                side="right"
                disabled={context.isMobile}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`账户：${account.name}`}
                  onClick={onAccountClick}
                  className={cn(
                    iconButtonClass,
                    "border border-border text-xs text-foreground"
                  )}
                >
                  {account.initials}
                </Button>
              </MorphicTooltip>
            ) : (
              railFooter
            )}
          </div>
        </nav>

        <AnimatedSidebar
          id={panelId}
          ariaLabel={`${section?.label ?? workspaceName} 导航`}
          collapsible="offcanvas"
          className="w-76 shadow-none md:absolute md:inset-y-0 md:left-16 md:w-auto"
          panelClassName={cn(
            "static h-full border-r border-sidebar-border bg-sidebar shadow-none",
            !expanded && context.open && "bg-popover shadow-md"
          )}
        >
          {panelHeaderNode}

          <AnimatedSidebarContent className="gap-5 px-2 pt-3 pb-5">
            {section?.renderContent
              ? section.renderContent(closeNavigation)
              : groups.map((group) => (
                  <SidebarNavGroup
                    key={`${section?.id}:${group.label}`}
                    group={group}
                    itemId={itemId}
                    onSelect={selectItem}
                  />
                ))}
            {!section?.renderContent && groups.length === 0 ? (
              <output className="px-3 py-4 text-sm text-muted-foreground">
                没有找到页面。
              </output>
            ) : null}
          </AnimatedSidebarContent>
        </AnimatedSidebar>

        {!context.isMobile && expanded ? (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="调整导航宽度"
            aria-valuenow={sidebarWidth}
            aria-valuemin={SIDEBAR_MIN_WIDTH}
            aria-valuemax={SIDEBAR_MAX_WIDTH}
            tabIndex={0}
            title="拖拽调整宽度，双击恢复默认"
            data-slot="sidebar-resize-handle"
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            onDoubleClick={resetSidebarWidth}
            onKeyDown={handleResizeKeyDown}
            className="group absolute inset-y-0 right-0 z-40 w-2 translate-x-1/2 cursor-col-resize touch-none outline-none max-md:hidden"
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
        ) : null}
      </motion.div>

      <MorphicCommandPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        shortcut={false}
        fallbackFocusRef={toggleRef}
        items={sections.flatMap((entry) => [
          ...(entry.overviewLabel ? [{
            id: `overview:${entry.id}`,
            label: entry.overviewLabel,
            group: "页面",
            icon: <HugeiconsIcon icon={ListViewIcon} aria-hidden="true" size={16} />,
            onSelect: () => selectOverview(entry),
          }] : []),
          ...entry.groups.flatMap((group) => group.items.map((item) => ({
            id: `item:${entry.id}:${group.label}:${item.id}`,
            label: item.label,
            group: `${entry.label} · ${group.label}`,
            keywords: [entry.label, group.label, entry.id, item.id],
            icon: item.icon ? <HugeiconsIcon icon={item.icon} aria-hidden="true" size={16} strokeWidth={1.7} className="text-muted-foreground" /> : undefined,
            onSelect: () => selectSearchItem(entry, item),
          }))),
        ])}
      >
        <MorphicCommandPaletteContent
          title="搜索导航"
          description="搜索可用页面"
          placeholder="查找页面…"
          emptyMessage="没有找到页面。"
          clearLabel="清空搜索"
          closeLabel="关闭搜索"
          footer={false}
        />
      </MorphicCommandPalette>

      <div inert={workspaceInert} className="relative flex min-w-0 flex-1 flex-col">
        {titlebarTarget ? createPortal(headerNode, titlebarTarget) : headerNode}
        <div
          className={cn(
            "min-h-0 flex-1 overflow-auto p-4 pt-6 sm:p-8 sm:pt-8",
            contentClassName
          )}
        >
          {children}
        </div>
        {titlebarTarget ? null : headerOverlay}
      </div>

      {endPanel}
    </>
  )
}
