"use client";

import { Bell, CheckCheck, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from "@/components/beui/motion/popover-morph";
import {
  MorphicTooltip,
  MorphicTooltipProvider,
} from "@/components/beui/premium/morphic-tooltip";
import { cn } from "@/lib/beui/utils";
import { NotificationFeed } from "./notification-feed";
import type { NotificationDropdownProps } from "./types";

export type {
  NotificationActions,
  NotificationDropdownProps,
  NotificationFilter,
  NotificationItem,
} from "./types";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function NotificationDropdown({
  items,
  filters,
  title = "Notifications",
  trigger,
  footer,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  align = "end",
  className,
  onMarkAllRead,
  onSelect,
  ...actions
}: NotificationDropdownProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [menuContainer, setMenuContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const panelRef = useRef<HTMLDivElement | null>(null);
  const focusFrame = useRef<number | null>(null);
  const open = controlledOpen ?? internalOpen;
  const unread = items.filter((item) => !item.read).length;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!next) {
        const panel = panelRef.current;
        if (panel?.contains(document.activeElement)) {
          const triggerId = panel.getAttribute("aria-labelledby");
          if (triggerId) document.getElementById(triggerId)?.focus();
        }
      }
      if (controlledOpen === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );

  useEffect(() => {
    // AnimatePresence retains the panel during its exit; remove it from keyboard
    // navigation immediately, including menus portalled inside the panel.
    const panel = panelRef.current;
    if (panel) {
      if (!open && panel.contains(document.activeElement)) {
        const triggerId = panel.getAttribute("aria-labelledby");
        if (triggerId) document.getElementById(triggerId)?.focus();
      }
      panel.inert = !open;
    }
    if (!open && focusFrame.current !== null) {
      cancelAnimationFrame(focusFrame.current);
      focusFrame.current = null;
    }
    if (!open) return;
    const onFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      const panel = panelRef.current;
      if (!panel || panel.contains(target)) return;
      if (target.id === panel.getAttribute("aria-labelledby")) return;
      setOpen(false);
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, [open, setOpen]);

  useEffect(
    () => () => {
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    },
    [],
  );

  const focusOnOpen = useCallback((panel: HTMLDivElement) => {
    panelRef.current = panel;
    panel.inert = false;
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    const focusSelectedTab = () => {
      focusFrame.current = null;
      if (panel.inert || !panel.isConnected) return;
      const target = panel.querySelector<HTMLElement>(
        '[role="tab"][aria-selected="true"]',
      );
      if (!target) return;
      if (getComputedStyle(target).visibility !== "visible") {
        focusFrame.current = requestAnimationFrame(focusSelectedTab);
        return;
      }
      target.focus({ preventScroll: true });
    };
    focusFrame.current = requestAnimationFrame(focusSelectedTab);
  }, []);

  return (
    <MorphPopover open={open} onOpenChange={setOpen}>
      <MorphPopoverTrigger>
        {trigger ?? (
          <Button
            tabIndex={0}
            variant="outline"
            className={cn("relative size-9 rounded-full p-0", FOCUS_RING)}
            aria-label={`${title}, ${unread} unread`}
          >
            <Bell aria-hidden className="size-4" />
            {unread > 0 && (
              <span
                aria-hidden
                className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium tabular-nums text-primary-foreground"
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Button>
        )}
      </MorphPopoverTrigger>
      <MorphPopoverContent
        align={align}
        shadow={false}
        onOpenAutoFocus={focusOnOpen}
        className={cn(
          "h-144 max-h-[calc(100dvh-2rem)] w-md max-w-[calc(100vw-2rem)] text-foreground",
          className,
        )}
      >
        <div ref={setMenuContainer} className="flex h-full min-h-0 flex-col">
          <MorphicTooltipProvider delay={180}>
            <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-4 pb-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <h2 className="truncate text-xl font-medium">{title}</h2>
                {unread > 0 && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                    {unread}
                    <span className="sr-only"> unread</span>
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {onMarkAllRead && (
                  <MorphicTooltip content="Mark all as read" disabled={!unread}>
                    <Button
                      tabIndex={0}
                      variant="ghost"
                      size="icon"
                      disabled={!unread}
                      className={cn(
                        "size-9 rounded-full text-muted-foreground",
                        FOCUS_RING,
                      )}
                      aria-label="Mark all as read"
                      onClick={() => {
                        panelRef.current
                          ?.querySelector<HTMLElement>(
                            '[role="tab"][aria-selected="true"]',
                          )
                          ?.focus({ preventScroll: true });
                        onMarkAllRead();
                      }}
                    >
                      <CheckCheck aria-hidden className="size-4" />
                    </Button>
                  </MorphicTooltip>
                )}
                <MorphicTooltip content="Close notifications">
                  <Button
                    tabIndex={0}
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-9 rounded-full text-muted-foreground",
                      FOCUS_RING,
                    )}
                    aria-label="Close notifications"
                    onClick={() => setOpen(false)}
                  >
                    <X aria-hidden className="size-4" />
                  </Button>
                </MorphicTooltip>
              </div>
            </div>
            <NotificationFeed
              items={items}
              filters={filters}
              menuContainer={menuContainer}
              {...actions}
              onSelect={
                onSelect
                  ? (item) => {
                      setOpen(false);
                      onSelect(item);
                    }
                  : undefined
              }
            />
            <div className="shrink-0 border-t border-border px-5 py-3">
              {footer ?? (
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{unread ? `${unread} unread` : "All caught up"}</span>
                  <span>
                    <kbd className="rounded-md border border-border px-1.5 py-0.5 font-sans">
                      Esc
                    </kbd>
                    <span className="ml-2">to close</span>
                  </span>
                </div>
              )}
            </div>
          </MorphicTooltipProvider>
        </div>
      </MorphPopoverContent>
    </MorphPopover>
  );
}
