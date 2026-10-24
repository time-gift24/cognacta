"use client";

import {
  Archive,
  Bell,
  Check,
  ChevronDown,
  Clock3,
  Mail,
  MailOpen,
  MoreHorizontal,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from "motion/react";
import { type Ref, useId, useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
  AnimatedDropdownTrigger,
} from "@/components/beui/premium/animated-dropdown";
import { MorphicTooltip } from "@/components/beui/premium/morphic-tooltip";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type {
  NotificationActions,
  NotificationFilter,
  NotificationItem,
} from "./types";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type NotificationFeedProps = NotificationActions & {
  items: NotificationItem[];
  filters?: NotificationFilter[];
  menuContainer: HTMLElement | null;
  presentation?: "compact" | "panel";
  query?: string;
  onClearQuery?: () => void;
};

/** The feed owns presentation; the host owns notification data and actions. */
export function NotificationFeed({
  items,
  filters,
  menuContainer,
  presentation = "compact",
  query = "",
  onClearQuery,
  ...actions
}: NotificationFeedProps) {
  const reduce = useReducedMotion();
  const [selectedFilter, setFilter] = useState("all");
  const filterRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const filterOptions = [
    { id: "all", label: "All" },
    ...(filters ?? [{ id: "unread", label: "Unread" }]),
  ];
  const filter = filterOptions.some((entry) => entry.id === selectedFilter)
    ? selectedFilter
    : "all";
  const unread = items.filter((item) => !item.read).length;
  const needle = query.trim().toLocaleLowerCase();
  const visible = items.filter(
    (item) =>
      (filter === "all" ||
        (filter === "unread" ? !item.read : item.category === filter)) &&
      (!needle ||
        [item.title, item.description, item.category, item.group]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase()
          .includes(needle)),
  );
  const groups = new Map<string, NotificationItem[]>();
  for (const item of visible) {
    const group = item.group ?? "";
    const entries = groups.get(group) ?? [];
    entries.push(item);
    groups.set(group, entries);
  }

  function changeFilter(next: string) {
    if (next === filter) return;
    setFilter(next);
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
  }

  // A menu action can remove its own trigger. Move focus before the host update,
  // then prevent Radix from restoring focus to that disappearing trigger.
  function focusAfterRemoval(itemId: string) {
    const rows = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>(
        "[data-notification-row]:not([inert])",
      ) ?? [],
    );
    const index = rows.findIndex(
      (row) => row.dataset.notificationRow === itemId,
    );
    if (index < 0) return;
    const next = rows[index + 1] ?? rows[index - 1];
    const target =
      next?.querySelector<HTMLElement>("button:not([disabled]), a[href]") ??
      filterRef.current?.querySelector<HTMLElement>(
        '[role="tab"][aria-selected="true"]',
      );
    target?.focus({ preventScroll: true });
    return target ?? null;
  }

  return (
    <Tabs
      value={filter}
      onValueChange={changeFilter}
      variant="underline"
      className="flex min-h-0 flex-1 flex-col"
    >
      <div
        ref={filterRef}
        className={cn(
          "shrink-0 overflow-x-auto border-b border-border px-5",
          presentation === "panel" && "px-4 sm:px-6",
        )}
      >
        <TabsList
          aria-label="Filter notifications"
          className="w-max min-w-full gap-4 border-0"
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const current = filterOptions.findIndex(
              (entry) => entry.id === filter,
            );
            const index =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? filterOptions.length - 1
                  : (current +
                      (event.key === "ArrowRight" ? 1 : -1) +
                      filterOptions.length) %
                    filterOptions.length;
            const next = filterOptions[index].id;
            changeFilter(next);
            Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'),
            )[index]?.focus();
          }}
        >
          {filterOptions.map((entry) => (
            <TabsTrigger
              key={entry.id}
              id={`${id}-${entry.id}`}
              value={entry.id}
              tabIndex={filter === entry.id ? 0 : -1}
              aria-controls={`${id}-panel`}
              className={cn(
                "mb-0 min-h-10 shrink-0 whitespace-nowrap rounded-md px-0 text-sm",
                FOCUS_RING,
              )}
              indicatorClassName="bottom-0 h-0.5 bg-foreground"
            >
              {entry.label}
              {entry.id === "unread" && unread > 0 && (
                <span className="ml-1.5 tabular-nums">{unread}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <output aria-atomic="true" className="sr-only">
        {unread} unread notifications. {visible.length} shown.
      </output>
      <motion.div
        ref={viewportRef}
        layoutScroll
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${filter}`}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5",
          presentation === "panel" && "px-3 pb-3 sm:px-4 sm:pb-4",
        )}
      >
        {visible.length ? (
          <motion.ul
            key={filter}
            ref={listRef}
            aria-label="Notifications"
            className="relative"
            // A tab is a new result set, not a rearrangement of the old rows.
            // Remount it as one surface so per-row exit/layout springs never
            // cross over the next category. Mutations within a tab still reflow.
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.14, ease: EASE_OUT }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {Array.from(groups, ([group, entries]) => [
                ...(group
                  ? [
                      <motion.li
                        key={`group:${group}`}
                        layout={reduce ? false : "position"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className={cn(
                          "pt-4 pb-1 text-xs font-medium text-muted-foreground",
                          presentation === "panel" && "px-2 pt-5 pb-3",
                        )}
                        aria-hidden
                      >
                        {group}
                      </motion.li>,
                    ]
                  : []),
                ...entries.map((item) => (
                  <NotificationRow
                    key={`item:${item.id}`}
                    item={item}
                    presentation={presentation}
                    menuContainer={menuContainer}
                    onWillRemove={() => focusAfterRemoval(item.id)}
                    removesOnRead={filter === "unread"}
                    {...actions}
                  />
                )),
              ])}
            </AnimatePresence>
          </motion.ul>
        ) : (
          <motion.div
            key={filter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12 }}
            className="flex h-full flex-col items-center justify-center gap-3 px-4 py-6 text-center"
          >
            <span className="flex size-12 items-center justify-center rounded-full border border-border">
              <Check aria-hidden className="size-5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-sm font-medium">
                {needle
                  ? "No matching updates"
                  : filter === "unread"
                    ? "You’re all caught up"
                    : "No notifications"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {needle
                  ? "Try another search or clear it to see more updates."
                  : "Your next update will appear here."}
              </p>
            </div>
            {needle && onClearQuery ? (
              <Button
                tabIndex={0}
                variant="outline"
                className={cn("h-9 rounded-full px-4 text-xs", FOCUS_RING)}
                onClick={onClearQuery}
              >
                Clear search
              </Button>
            ) : filter !== "all" && items.length > 0 ? (
              <Button
                tabIndex={0}
                variant="outline"
                className={cn("h-9 rounded-full px-4 text-xs", FOCUS_RING)}
                onClick={() => changeFilter("all")}
              >
                View all updates
              </Button>
            ) : null}
          </motion.div>
        )}
      </motion.div>
    </Tabs>
  );
}

function NotificationRow({
  ref,
  item,
  presentation,
  menuContainer,
  onWillRemove,
  removesOnRead,
  onReadChange,
  onSnooze,
  onArchive,
  onSelect,
}: NotificationActions & {
  item: NotificationItem;
  presentation: "compact" | "panel";
  ref?: Ref<HTMLLIElement>;
  menuContainer: HTMLElement | null;
  onWillRemove: () => HTMLElement | null | undefined;
  removesOnRead: boolean;
}) {
  const reduce = useReducedMotion();
  const present = useIsPresent();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const skipRestore = useRef(false);
  const removalFocus = useRef<HTMLElement | null>(null);
  const detailsId = useId();
  const hasMenu = onReadChange || onSnooze || onArchive;
  const roomy = presentation === "panel";

  function beforeRemove() {
    skipRestore.current = true;
    removalFocus.current = onWillRemove() ?? null;
  }

  return (
    <motion.li
      ref={ref}
      data-notification-row={item.id}
      inert={present ? undefined : true}
      layout={reduce ? false : roomy ? true : "position"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 8 }}
      transition={{
        layout: SPRING_LAYOUT,
        opacity: { duration: 0.12 },
        x: { duration: 0.15, ease: EASE_OUT },
      }}
      className={cn(
        "border-b border-border py-4 last:border-b-0",
        roomy &&
          "mb-2 overflow-hidden rounded-2xl border bg-background px-3 sm:px-4 last:border-b",
      )}
    >
      <motion.div
        layout={reduce || !roomy ? false : "position"}
        className="flex items-start gap-3"
      >
        <span
          className={cn(
            "relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground",
            roomy && "size-10",
          )}
          aria-hidden
        >
          {item.avatarUrl ? (
            // biome-ignore lint/performance/noImgElement: sender portraits keep the installable inbox framework-agnostic.
            <img
              src={item.avatarUrl}
              alt=""
              width={40}
              height={40}
              loading="lazy"
              decoding="async"
              className="size-full rounded-full object-cover"
            />
          ) : (
            (item.icon ?? <Bell className="size-4" />)
          )}
          {!item.read && (
            <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full border-2 border-background bg-primary" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <p
              className={cn(
                "break-words text-sm",
                item.read ? "font-normal" : "font-medium",
              )}
            >
              {item.title}
              <span className="sr-only">
                . {item.group ? `${item.group}. ` : ""}
                {item.read ? "Read" : "Unread"}.
              </span>
            </p>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              <span aria-hidden className="mr-1.5">
                ·
              </span>
              {item.time}
            </span>
          </div>
          {item.description && (
            <p
              className={cn(
                "mt-1 break-words text-xs leading-relaxed text-muted-foreground",
                roomy && "text-sm",
              )}
            >
              {item.description}
            </p>
          )}
          {(item.details != null || (onSelect && item.actionLabel)) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {onSelect && item.actionLabel && (
                <Button
                  tabIndex={0}
                  variant="outline"
                  className={cn("h-9 rounded-full px-3 text-xs", FOCUS_RING)}
                  aria-label={`${item.actionLabel}: ${item.title}`}
                  onClick={() => {
                    // A selection may mark this item read while this inbox stays
                    // open. Preserve focus if its unread row disappears.
                    if (removesOnRead) onWillRemove();
                    onSelect(item);
                  }}
                >
                  {item.actionLabel}
                </Button>
              )}
              {item.details != null && (
                <Button
                  tabIndex={0}
                  variant="ghost"
                  className={cn(
                    "h-9 rounded-full px-2 text-xs text-muted-foreground",
                    FOCUS_RING,
                  )}
                  aria-expanded={expanded}
                  aria-controls={expanded ? detailsId : undefined}
                  aria-label={`${expanded ? "Hide" : "Show"} details for ${item.title}`}
                  onClick={() => setExpanded(!expanded)}
                >
                  {roomy
                    ? expanded
                      ? "Less detail"
                      : "View details"
                    : "Details"}
                  <motion.span
                    animate={{ rotate: expanded && !reduce ? 180 : 0 }}
                    transition={SPRING_LAYOUT}
                  >
                    <ChevronDown aria-hidden className="size-3" />
                  </motion.span>
                </Button>
              )}
            </div>
          )}
        </div>
        {hasMenu && (
          <AnimatedDropdown
            open={menuOpen}
            onOpenChange={setMenuOpen}
            modal={false}
          >
            <MorphicTooltip content="Notification actions" disabled={menuOpen}>
              <AnimatedDropdownTrigger asChild>
                <Button
                  tabIndex={0}
                  // Radix owns Enter/Space; Motion's keyboard pointerdown would
                  // toggle the same menu a second time.
                  whileTap={undefined}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "-mt-1.5 -mr-2 size-9 shrink-0 rounded-full text-muted-foreground",
                    FOCUS_RING,
                  )}
                  aria-label={`Actions for ${item.title}`}
                >
                  <MoreHorizontal aria-hidden className="size-4" />
                </Button>
              </AnimatedDropdownTrigger>
            </MorphicTooltip>
            <AnimatedDropdownContent
              align="end"
              sideOffset={4}
              portalContainer={menuContainer}
              collisionBoundary={menuContainer}
              collisionPadding={8}
              inert={!menuOpen || !present}
              className="overscroll-contain"
              onEscapeKeyDown={(event) => {
                if (menuOpen) event.stopPropagation();
              }}
              onCloseAutoFocus={(event) => {
                if (skipRestore.current) {
                  event.preventDefault();
                  if (document.activeElement === document.body) {
                    removalFocus.current?.focus({ preventScroll: true });
                  }
                  skipRestore.current = false;
                  removalFocus.current = null;
                }
              }}
            >
              {onReadChange && (
                <AnimatedDropdownItem
                  onSelect={() => {
                    if (removesOnRead && !item.read) beforeRemove();
                    onReadChange(item, !item.read);
                  }}
                >
                  {item.read ? (
                    <Mail aria-hidden className="size-4" />
                  ) : (
                    <MailOpen aria-hidden className="size-4" />
                  )}
                  {item.read ? "Mark as unread" : "Mark as read"}
                </AnimatedDropdownItem>
              )}
              {onSnooze && (
                <AnimatedDropdownItem
                  onSelect={() => {
                    beforeRemove();
                    onSnooze(item);
                  }}
                >
                  <Clock3 aria-hidden className="size-4" /> Snooze for later
                </AnimatedDropdownItem>
              )}
              {onArchive && (
                <AnimatedDropdownItem
                  onSelect={() => {
                    beforeRemove();
                    onArchive(item);
                  }}
                >
                  <Archive aria-hidden className="size-4" /> Archive
                </AnimatedDropdownItem>
              )}
            </AnimatedDropdownContent>
          </AnimatedDropdown>
        )}
      </motion.div>
      {expanded && (
        <motion.div
          id={detailsId}
          layout={reduce || !roomy ? false : "position"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12 }}
          className={cn(
            "mt-3 ml-11 text-xs leading-relaxed text-muted-foreground",
            roomy && "ml-0 border-t border-border pt-4 text-sm sm:ml-13",
          )}
        >
          {item.details}
        </motion.div>
      )}
    </motion.li>
  );
}
