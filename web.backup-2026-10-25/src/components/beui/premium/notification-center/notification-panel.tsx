"use client";

import { Bell, CheckCheck, Search, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import {
  MorphicTooltip,
  MorphicTooltipProvider,
} from "@/components/beui/premium/morphic-tooltip";
import { cn } from "@/lib/beui/utils";
import { NotificationFeed } from "./notification-feed";
import type { NotificationPanelProps } from "./types";

export type {
  NotificationActions,
  NotificationFilter,
  NotificationItem,
  NotificationPanelProps,
} from "./types";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** An embedded inbox. The host owns data; search and filters stay in the panel. */
export function NotificationPanel({
  items,
  filters,
  title = "Notifications",
  headerActions,
  footer,
  query: controlledQuery,
  onQueryChange,
  className,
  onMarkAllRead,
  ...actions
}: NotificationPanelProps) {
  const [internalQuery, setInternalQuery] = useState("");
  const [menuContainer, setMenuContainer] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const query = controlledQuery ?? internalQuery;
  const unread = items.filter((item) => !item.read).length;

  function updateQuery(next: string) {
    if (controlledQuery === undefined) setInternalQuery(next);
    onQueryChange?.(next);
  }

  function clearSearch() {
    updateQuery("");
    inputRef.current?.focus({ preventScroll: true });
  }

  return (
    <section
      ref={setMenuContainer}
      aria-labelledby={`${id}-title`}
      className={cn(
        "flex h-168 w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-background text-foreground",
        className,
      )}
    >
      <MorphicTooltipProvider delay={180}>
        <header className="shrink-0 px-4 pt-5 pb-4 sm:px-6 sm:pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground"
              >
                <Bell className="size-4" />
              </span>
              <div className="min-w-0">
                <h2 id={`${id}-title`} className="truncate text-xl font-medium">
                  {title}
                </h2>
                <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                  {unread ? `${unread} unread updates` : "You’re all caught up"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {headerActions}
              {onMarkAllRead && (
                <Button
                  tabIndex={0}
                  variant="outline"
                  disabled={!unread}
                  className={cn("h-9 rounded-full px-3 text-xs", FOCUS_RING)}
                  onClick={() => {
                    menuContainer
                      ?.querySelector<HTMLElement>(
                        '[role="tab"][aria-selected="true"]',
                      )
                      ?.focus({ preventScroll: true });
                    onMarkAllRead();
                  }}
                >
                  <CheckCheck aria-hidden className="size-4" /> Mark all read
                </Button>
              )}
            </div>
          </div>
          <Input
            rightIcon={
              query && (
                <MorphicTooltip content="Clear search">
                  <Button
                    tabIndex={0}
                    variant="ghost"
                    size="icon"
                    aria-label="Clear search"
                    className={cn("size-9 rounded-full", FOCUS_RING)}
                    onClick={clearSearch}
                  >
                    <X aria-hidden className="size-3.5" />
                  </Button>
                </MorphicTooltip>
              )
            }
            leftIcon={<Search aria-hidden className="size-4" />}
            ref={inputRef}
            type="search"
            aria-label="Search notifications"
            placeholder="Search updates…"
            value={query}
            onChange={(event) => updateQuery(event)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.preventDefault();
                event.stopPropagation();
                clearSearch();
              }
            }}
            className="w-full min-w-0 flex-1 mt-5"
            classNames={{
              input: "text-sm placeholder:text-muted-foreground",
            }}
          />
        </header>
        <NotificationFeed
          items={items}
          filters={filters}
          query={query}
          onClearQuery={clearSearch}
          presentation="panel"
          menuContainer={menuContainer}
          {...actions}
        />
        {footer && (
          <footer className="shrink-0 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-6">
            {footer}
          </footer>
        )}
      </MorphicTooltipProvider>
    </section>
  );
}
