"use client";

import {
  ArrowUpRight,
  BookOpen,
  FileText,
  Folder,
  History,
  House,
  Layers2,
  type LucideIcon,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
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
} from "@/components/beui/motion/animated-sidebar";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { SharedLayoutBg } from "@/components/beui/motion/shared-layout-bg";
import {
  MorphicTooltip,
  MorphicTooltipProvider,
} from "@/components/beui/premium/morphic-tooltip";
import { SPRING_PANEL } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";

export type SidebarRailItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
};

export type SidebarRailSection = {
  id: string;
  label: string;
  icon: LucideIcon;
  groups: readonly {
    label: string;
    items: readonly SidebarRailItem[];
  }[];
};

const defaultSections: readonly SidebarRailSection[] = [
  {
    id: "workspace",
    label: "Workspace",
    icon: House,
    groups: [
      {
        label: "Pinned",
        items: [
          { id: "brand-notes", label: "Brand notes", icon: Folder },
          { id: "website-refresh", label: "Website refresh", icon: Folder },
        ],
      },
      {
        label: "Projects",
        items: [{ id: "fieldwork", label: "Fieldwork", icon: Folder }],
      },
      {
        label: "Recent",
        items: [
          { id: "launch-direction", label: "Launch direction" },
          { id: "research-notes", label: "Research notes" },
          { id: "campaign-outline", label: "Campaign outline" },
          { id: "a-few-good-ideas", label: "A few good ideas" },
          { id: "onboarding-checklist", label: "Onboarding checklist" },
          { id: "friday-recap", label: "Friday recap" },
        ],
      },
    ],
  },
  {
    id: "library",
    label: "Library",
    icon: Layers2,
    groups: [
      {
        label: "Collections",
        items: [
          { id: "references", label: "References", icon: BookOpen },
          { id: "saved-pages", label: "Saved pages", icon: FileText },
          { id: "assets", label: "Assets", icon: Folder },
        ],
      },
    ],
  },
  {
    id: "activity",
    label: "Activity",
    icon: History,
    groups: [
      {
        label: "Updates",
        items: [
          { id: "this-week", label: "This week", icon: History },
          { id: "shared-with-you", label: "Shared with you", icon: FileText },
          { id: "archive", label: "Archive", icon: Folder },
        ],
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings2,
    groups: [
      {
        label: "Workspace",
        items: [
          { id: "preferences", label: "Preferences", icon: Settings2 },
          { id: "members", label: "Members", icon: House },
          { id: "connections", label: "Connections", icon: Layers2 },
        ],
      },
    ],
  },
];

export type SidebarRailProps = {
  workspaceName?: string;
  sections?: readonly SidebarRailSection[];
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  defaultItemId?: string;
  onItemSelect?: (item: SidebarRailItem, section: SidebarRailSection) => void;
  onCreate?: () => void;
  account?: { name: string; initials: string };
  onAccountClick?: () => void;
  /** Replaces the panel title; search and collapse controls stay built in. Pass null to hide it. */
  panelHeader?: ReactNode;
  /** Replaces the account control at the bottom of the icon rail. Pass null to hide it. */
  railFooter?: ReactNode;
  /** Replaces the workspace breadcrumbs; the navigation toggle stays built in. Pass null to hide them. */
  workspaceHeader?: ReactNode;
  children?: ReactNode;
  className?: string;
};

const iconButtonClass =
  "size-9 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function SidebarRail({
  defaultExpanded = true,
  expanded: controlledExpanded,
  onExpandedChange,
  className,
  ...props
}: SidebarRailProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const expanded = controlledExpanded ?? internalExpanded;

  function setExpanded(next: boolean) {
    if (!next) toggleRef.current?.focus({ preventScroll: true });
    if (controlledExpanded === undefined) setInternalExpanded(next);
    onExpandedChange?.(next);
    setHovered(false);
    setFocused(false);
  }

  return (
    <div className={cn("w-full p-2 sm:p-3", className)}>
      <MorphicTooltipProvider>
        <AnimatedSidebarProvider
          open={expanded || hovered || focused}
          onOpenChange={setExpanded}
          style={{
            "--sidebar-width": "17rem",
            "--sidebar-width-mobile": "19rem",
          }}
          className="relative h-[720px] min-h-0 overflow-hidden rounded-2xl border border-border bg-background"
        >
          <SidebarRailShell
            {...props}
            expanded={expanded}
            setExpanded={setExpanded}
            setHovered={setHovered}
            setFocused={setFocused}
            toggleRef={toggleRef}
          />
        </AnimatedSidebarProvider>
      </MorphicTooltipProvider>
    </div>
  );
}

function SidebarRailShell({
  workspaceName = "Canvas",
  sections = defaultSections,
  defaultItemId = "launch-direction",
  onItemSelect,
  onCreate,
  account = { name: "Alex Morgan", initials: "AM" },
  onAccountClick,
  panelHeader,
  railFooter,
  workspaceHeader,
  children,
  expanded,
  setExpanded,
  setHovered,
  setFocused,
  toggleRef,
}: Omit<SidebarRailProps, "expanded" | "onExpandedChange"> & {
  expanded: boolean;
  setExpanded: (next: boolean) => void;
  setHovered: (next: boolean) => void;
  setFocused: (next: boolean) => void;
  toggleRef: RefObject<HTMLButtonElement | null>;
}) {
  const context = useAnimatedSidebar();
  const canHover = useHoverCapable();
  const reduce = useReducedMotion();
  const [sectionId, setSectionId] = useState(sections[0]?.id);
  const [itemId, setItemId] = useState(defaultItemId);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = useId();
  const section =
    sections.find((entry) => entry.id === sectionId) ?? sections[0];
  const selectedItem = sections
    .flatMap((entry) => entry.groups.flatMap((group) => group.items))
    .find((item) => item.id === itemId);
  const groups = (section?.groups ?? [])
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    }))
    .filter((group) => group.items.length > 0);

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  function closePeek() {
    cancelClose();
    setHovered(false);
    setFocused(false);
  }

  function toggleExpanded() {
    cancelClose();
    setExpanded(!expanded);
  }

  function selectItem(item: SidebarRailItem) {
    if (!section) return;
    setItemId(item.id);
    onItemSelect?.(item, section);
    if (!expanded && !context.isMobile) {
      toggleRef.current?.focus({ preventScroll: true });
      closePeek();
    }
  }

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (searching) searchRef.current?.focus({ preventScroll: true });
  }, [searching]);

  return (
    <>
      <motion.div
        initial={false}
        animate={{ width: !context.isMobile && expanded ? "21.5rem" : "4rem" }}
        transition={reduce ? { duration: 0 } : SPRING_PANEL}
        data-rail-state={expanded ? "expanded" : "collapsed"}
        data-peeking={!expanded && context.open ? "true" : "false"}
        className="relative z-20 h-full shrink-0 max-md:w-16!"
        onPointerEnter={(event) => {
          cancelClose();
          if (canHover && event.pointerType === "mouse" && !context.isMobile) {
            setHovered(true);
          }
        }}
        onPointerLeave={() => {
          cancelClose();
          closeTimer.current = setTimeout(() => setHovered(false), 140);
        }}
        onFocusCapture={(event) => {
          if (!context.isMobile && event.target.matches(":focus-visible")) {
            cancelClose();
            setFocused(true);
          }
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setFocused(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !expanded && !context.isMobile) {
            event.preventDefault();
            toggleRef.current?.focus({ preventScroll: true });
            closePeek();
          }
        }}
      >
        <nav
          aria-label="Workspace areas"
          className="relative z-30 flex h-full w-16 flex-col items-center gap-4 bg-background py-4"
        >
          {sections.map((entry) => {
            const Icon = entry.icon;
            const active = section?.id === entry.id;
            return (
              <MorphicTooltip
                key={entry.id}
                content={entry.label}
                side="right"
                disabled={context.isMobile}
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
                    cancelClose();
                    setSectionId(entry.id);
                    setQuery("");
                    if (entry.id !== section?.id) {
                      const firstItem = entry.groups[0]?.items[0];
                      if (firstItem) {
                        setItemId(firstItem.id);
                        onItemSelect?.(firstItem, entry);
                      }
                    }
                    if (context.isMobile) {
                      context.triggerRef.current = event.currentTarget;
                      context.setOpenMobile(true);
                    } else setExpanded(true);
                  }}
                  className={cn(
                    iconButtonClass,
                    active && "bg-muted text-foreground",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-5"
                    strokeWidth={1.7}
                  />
                </Button>
              </MorphicTooltip>
            );
          })}
          <div data-slot="sidebar-rail-footer" className="mt-auto">
            {railFooter === undefined ? (
              <MorphicTooltip
                content={account.name}
                side="right"
                disabled={context.isMobile}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Account: ${account.name}`}
                  onClick={onAccountClick}
                  className={cn(
                    iconButtonClass,
                    "border border-border text-xs text-foreground",
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
          ariaLabel={`${workspaceName} navigation`}
          collapsible="offcanvas"
          className="w-76 rounded-2xl border border-border bg-background shadow-none md:absolute md:inset-y-2 md:left-16 md:w-auto md:border-0"
          panelClassName={cn(
            "static h-full rounded-2xl border border-border shadow-none",
            !expanded && context.open && "bg-popover",
          )}
        >
          <AnimatedSidebarHeader className="gap-3 p-4 pb-2">
            <div className="flex items-center gap-1">
              <div
                data-slot="sidebar-rail-panel-header"
                className="min-w-0 flex-1"
              >
                {panelHeader === undefined ? (
                  <h2 className="truncate text-xl font-medium">
                    {workspaceName}
                  </h2>
                ) : (
                  panelHeader
                )}
              </div>
              <MorphicTooltip
                content="Search navigation"
                side="bottom"
                disabled={context.isMobile}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Search navigation"
                  aria-expanded={searching}
                  ref={searchToggleRef}
                  onClick={() => {
                    setSearching(!searching);
                    if (searching) setQuery("");
                  }}
                  className={iconButtonClass}
                >
                  <Search aria-hidden="true" className="size-4" />
                </Button>
              </MorphicTooltip>
              <MorphicTooltip
                content={
                  expanded ? "Collapse navigation" : "Keep navigation open"
                }
                side="bottom"
                className="hidden md:inline-flex"
                disabled={context.isMobile}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={
                    expanded ? "Collapse navigation" : "Keep navigation open"
                  }
                  aria-pressed={expanded}
                  onClick={toggleExpanded}
                  className={iconButtonClass}
                >
                  {expanded ? (
                    <PanelLeftClose aria-hidden="true" className="size-4" />
                  ) : (
                    <PanelLeftOpen aria-hidden="true" className="size-4" />
                  )}
                </Button>
              </MorphicTooltip>
              <AnimatedSidebarClose className="size-9 rounded-full text-muted-foreground hover:bg-muted md:hidden">
                <X aria-hidden="true" className="size-4" />
              </AnimatedSidebarClose>
            </div>
            {searching ? (
              <Input
                aria-label="Filter navigation"
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    setSearching(false);
                    setQuery("");
                    searchToggleRef.current?.focus();
                  }
                }}
                placeholder="Find a page…"
                className="w-full"
                classNames={{ input: "px-3 text-sm" }}
              />
            ) : null}
            <Button
              variant="ghost"
              onClick={() => {
                setItemId("new-page");
                onCreate?.();
                context.setOpenMobile(false);
                if (!expanded && !context.isMobile) {
                  toggleRef.current?.focus({ preventScroll: true });
                  closePeek();
                }
              }}
              className="h-9 justify-start rounded-full px-2 text-foreground"
            >
              <Plus aria-hidden="true" className="size-4" />
              New page
            </Button>
          </AnimatedSidebarHeader>

          <AnimatedSidebarContent className="gap-5 px-2 pb-5 pt-3">
            {groups.map((group) => (
              <AnimatedSidebarGroup key={group.label} className="gap-2 p-0">
                <AnimatedSidebarGroupLabel className="px-3 text-xs font-medium text-muted-foreground">
                  {group.label}
                </AnimatedSidebarGroupLabel>
                <AnimatedSidebarGroupContent>
                  <SharedLayoutBg
                    as="ul"
                    inset={0}
                    pillClassName="rounded-full bg-muted/70"
                    pillContainerClassName="inset-y-auto top-0 h-9"
                    className="flex w-full min-w-0 list-none flex-col gap-0.5"
                  >
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <AnimatedSidebarMenuItem key={item.id}>
                          <AnimatedSidebarMenuButton
                            icon={
                              Icon ? (
                                <Icon
                                  aria-hidden="true"
                                  className="size-4"
                                  strokeWidth={1.7}
                                />
                              ) : undefined
                            }
                            isActive={item.id === itemId}
                            onSelect={() => selectItem(item)}
                            className="rounded-full font-normal [&>span]:rounded-full"
                          >
                            {item.label}
                          </AnimatedSidebarMenuButton>
                        </AnimatedSidebarMenuItem>
                      );
                    })}
                  </SharedLayoutBg>
                </AnimatedSidebarGroupContent>
              </AnimatedSidebarGroup>
            ))}
            {groups.length === 0 ? (
              <output className="px-3 py-4 text-sm text-muted-foreground">
                No pages found.
              </output>
            ) : null}
          </AnimatedSidebarContent>
        </AnimatedSidebar>
      </motion.div>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 px-4 sm:px-6">
          <MorphicTooltip
            content={expanded ? "Collapse navigation" : "Expand navigation"}
            side="bottom"
            disabled={context.isMobile}
          >
            <Button
              ref={toggleRef}
              variant="ghost"
              size="icon"
              aria-label={
                expanded && !context.isMobile
                  ? "Collapse navigation"
                  : "Expand navigation"
              }
              aria-controls={context.isMobile ? undefined : panelId}
              aria-expanded={context.isMobile ? context.openMobile : expanded}
              onClick={(event) => {
                if (context.isMobile) {
                  context.triggerRef.current = event.currentTarget;
                  context.setOpenMobile(!context.openMobile);
                } else toggleExpanded();
              }}
              className={iconButtonClass}
            >
              <PanelLeft aria-hidden="true" className="size-4" />
            </Button>
          </MorphicTooltip>
          <div
            data-slot="sidebar-rail-workspace-header"
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            {workspaceHeader === undefined ? (
              <>
                <span className="hidden text-sm text-muted-foreground lg:inline">
                  {section?.label}
                </span>
                <span
                  aria-hidden="true"
                  className="hidden text-sm text-muted-foreground/50 lg:inline"
                >
                  /
                </span>
                <p className="min-w-0 truncate text-sm font-medium">
                  {itemId === "new-page"
                    ? "Untitled page"
                    : (selectedItem?.label ?? "Workspace")}
                </p>
              </>
            ) : (
              workspaceHeader
            )}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-4 pt-6 sm:p-8 sm:pt-8">
          {children ?? (
            <div className="grid h-full place-content-center gap-3 text-center">
              <span className="mx-auto grid size-10 place-items-center rounded-full border border-border text-muted-foreground">
                <ArrowUpRight aria-hidden="true" className="size-5" />
              </span>
              <h3 className="text-xl font-medium">
                {selectedItem?.label ?? "Your next idea starts here"}
              </h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                Keep your projects, pages, and references close.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
