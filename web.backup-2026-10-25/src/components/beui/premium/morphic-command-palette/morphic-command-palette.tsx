"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ArrowDown,
  ArrowUp,
  Command,
  CornerDownLeft,
  type LucideIcon,
  Search,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  createContext,
  type ReactNode,
  type ReactElement,
  type RefObject,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, type ButtonProps } from "@/components/beui/motion/button/base";
import {
  MorphicTooltip,
  MorphicTooltipProvider,
} from "@/components/beui/premium/morphic-tooltip";
import { searchCommands } from "@/lib/beui/command-search";
import { EASE_OUT, SPRING_GLIDE, SPRING_LAYOUT } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { useOnOpen } from "@/lib/beui/hooks/use-on-open";
import { useRowCursor } from "@/lib/beui/hooks/use-row-cursor";
import { useTouchCapable } from "@/lib/beui/hooks/use-touch-capable";
import { PresenceGate } from "@/lib/beui/presence-gate";
import { cn } from "@/lib/beui/utils";

export type MorphicCommandItem = {
  /** Stable and unique within this palette. */
  id: string;
  label: string;
  description?: string;
  group?: string;
  icon?: LucideIcon | ReactElement;
  keywords?: string[];
  /** Display hint only; item shortcuts aren't registered globally. */
  hint?: string;
  onSelect?: () => void;
};

export type MorphicCommandPaletteProps = {
  items: readonly MorphicCommandItem[];
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect?: (item: MorphicCommandItem) => void;
  /** Cmd/Ctrl + this key. Pass false to disable the global shortcut. */
  shortcut?: string | false;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
};

type PaletteContext = {
  id: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  shortcut: string | false;
  query: string;
  setQuery: (query: string) => void;
  grouped: [string, MorphicCommandItem[]][];
  rows: MorphicCommandItem[];
  activeIndex: number;
  moveTo: (id: string | null) => void;
  moveActive: (direction: 1 | -1) => void;
  select: (item: MorphicCommandItem) => void;
  restoreFocus: () => void;
};

const PaletteContext = createContext<PaletteContext | null>(null);

function usePalette() {
  const context = useContext(PaletteContext);
  if (!context)
    throw new Error(
      "MorphicCommandPalette parts must be inside MorphicCommandPalette.",
    );
  return context;
}

/** Owns search and selection. Compose a trigger and content. */
export function MorphicCommandPalette({
  items,
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  onSelect,
  shortcut = "k",
  fallbackFocusRef,
}: MorphicCommandPaletteProps) {
  const id = useId();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const open = controlledOpen ?? internalOpen;
  const controlled = controlledOpen !== undefined;
  const setOpen = useCallback(
    (next: boolean) => {
      if (next && !open) {
        const target = document.activeElement;
        if (target instanceof HTMLElement && target !== document.body && !document.getElementById(`${id}-dialog`)?.contains(target)) {
          returnFocusRef.current = target;
        }
      }
      if (!controlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlled, id, onOpenChange, open],
  );

  // The shared trigger becomes hidden before the dialog's focus history is
  // captured. Keep its original focus target for the return morph as well.
  useLayoutEffect(() => {
    if (!open) return;
    const target = document.activeElement;
    if (
      target instanceof HTMLElement && target !== document.body &&
      !document.getElementById(`${id}-dialog`)?.contains(target)
    )
      returnFocusRef.current = target;
  }, [id, open]);

  const openRef = useRef(open);
  const restoreFrame = useRef<number | null>(null);
  useLayoutEffect(() => {
    openRef.current = open;
    if (open && restoreFrame.current !== null) {
      cancelAnimationFrame(restoreFrame.current);
      restoreFrame.current = null;
    }
  }, [open]);
  useEffect(() => () => {
    if (restoreFrame.current !== null) cancelAnimationFrame(restoreFrame.current);
  }, []);
  const restoreFocus = useCallback(() => {
    restoreFrame.current = requestAnimationFrame(() => {
      restoreFrame.current = null;
      if (openRef.current) return;
      const previous = returnFocusRef.current;
      const target = previous?.isConnected && !previous.closest("[inert]") && previous.getClientRects().length
        ? previous
        : fallbackFocusRef?.current;
      const active = document.activeElement;
      // Headless UI may already have restored focus, or the user moved on.
      if (!(active instanceof HTMLElement) || active === document.body || active.closest("[inert]") || !active.getClientRects().length) {
        target?.focus({ preventScroll: true });
      }
      returnFocusRef.current = null;
    });
  }, [fallbackFocusRef]);

  const grouped = useMemo(() => {
    const searchable = items.map((item) => ({
      ...item,
      keywords: [...(item.keywords ?? []), item.description ?? ""],
    }));
    const groups = new Map<string, MorphicCommandItem[]>();
    for (const item of searchCommands(searchable, query)) {
      const label = item.group ?? "Commands";
      const list = groups.get(label) ?? [];
      list.push(item);
      groups.set(label, list);
    }
    return Array.from(groups.entries());
  }, [items, query]);
  const rows = useMemo(() => grouped.flatMap(([, list]) => list), [grouped]);
  const { activeIndex, moveTo, moveActive } = useRowCursor(rows, query);

  useOnOpen(open, () => {
    setQuery("");
    moveTo(null);
  });

  useEffect(() => {
    if (!shortcut) return;
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.altKey ||
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== shortcut.toLowerCase()
      )
        return;
      // Don't steal the shortcut from a different modal on the page.
      if (!open && document.querySelector('[role="dialog"][aria-modal="true"]'))
        return;
      event.preventDefault();
      setOpen(!open);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [open, setOpen, shortcut]);

  const select = (item: MorphicCommandItem) => {
    setOpen(false);
    // Return the original object, including any consumer metadata.
    const original =
      items.find((candidate) => candidate.id === item.id) ?? item;
    original.onSelect?.();
    onSelect?.(original);
  };

  return (
    <PaletteContext.Provider
      value={{
        id,
        open,
        setOpen,
        shortcut,
        query,
        setQuery,
        grouped,
        rows,
        activeIndex,
        moveTo,
        moveActive,
        select,
        restoreFocus,
      }}
    >
      <LayoutGroup id={id}>
        <MorphicTooltipProvider>{children}</MorphicTooltipProvider>
      </LayoutGroup>
    </PaletteContext.Provider>
  );
}

export type MorphicCommandPaletteTriggerProps = Omit<
  ButtonProps,
  "layout" | "layoutId" | "variant"
>;

export function MorphicCommandPaletteTrigger({
  children,
  className,
  onClick,
  disabled,
  ...props
}: MorphicCommandPaletteTriggerProps) {
  const { id, open, setOpen, shortcut } = usePalette();
  const reduce = useReducedMotion();
  return (
    <Button
      variant="ghost"
      {...props}
      disabled={disabled}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={`${id}-dialog`}
      style={{ ...props.style, visibility: open ? "hidden" : "visible" }}
      whileHover={undefined}
      whileTap={undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(true);
      }}
      className={cn(
        "relative isolate h-10 rounded-full bg-transparent px-4 text-sm text-foreground outline-none hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {/* Only the surface morphs; the button keeps its real hit area and the
          label isn't stretched by the shared layout's scale correction. */}
      <motion.span
        aria-hidden
        layoutId={reduce ? undefined : `${id}-surface`}
        transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
        className="pointer-events-none absolute inset-0 -z-10 rounded-full border border-border bg-background"
      />
      <motion.span
        initial={false}
        animate={{ opacity: open ? 0 : 1 }}
        transition={{ duration: reduce ? 0 : 0.15 }}
        className="flex min-w-0 flex-1 items-center justify-center gap-3"
      >
        {children ?? (
          <>
            <Search aria-hidden className="size-4 text-muted-foreground" />
            <span>Search commands</span>
            {shortcut ? (
              <kbd className="ml-6 text-xs text-muted-foreground">
                ⌘ / Ctrl {shortcut.toUpperCase()}
              </kbd>
            ) : null}
          </>
        )}
      </motion.span>
    </Button>
  );
}

export type MorphicCommandPaletteContentProps = {
  title?: string;
  description?: string;
  clearLabel?: string;
  closeLabel?: string;
  placeholder?: string;
  emptyMessage?: string;
  footer?: ReactNode;
  className?: string;
};

const MotionPanel = motion.create(DialogPanel);
const MotionBackdrop = motion.create(DialogBackdrop);

export function MorphicCommandPaletteContent({
  title = "Command palette",
  description,
  clearLabel = "Clear search",
  closeLabel = "Close palette",
  placeholder = "Search commands…",
  emptyMessage = "No commands found.",
  footer,
  className,
}: MorphicCommandPaletteContentProps) {
  const {
    id,
    open,
    setOpen,
    query,
    setQuery,
    grouped,
    rows,
    activeIndex,
    moveTo,
    moveActive,
    select,
    restoreFocus,
  } = usePalette();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const canTouch = useTouchCapable();
  const activeItem = rows[activeIndex];

  useEffect(() => {
    if (!open) return;
    // Preserve search input focus on touch devices as well as keyboard devices.
    const frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open || !activeItem) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, activeItem]);

  return (
    <AnimatePresence initial={false} onExitComplete={restoreFocus}>
      {open ? (
        <PresenceGate key="palette">
          {({ isPresent, gate }) => (
            <Dialog
              static
              open={isPresent}
              onClose={() => setOpen(false)}
              initialFocus={inputRef}
              id={`${id}-dialog`}
              className="fixed inset-0 z-[100]"
              inert={!isPresent}
            >
              <MotionBackdrop
                {...gate}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.15, ease: EASE_OUT }}
                className="fixed inset-0 bg-foreground/10 backdrop-blur-md"
              />
              <div className="pointer-events-none fixed inset-0 flex items-start justify-center px-3 pb-3 pt-[min(16vh,6rem)] sm:px-6 sm:pb-6">
                <MotionPanel
                  {...gate}
                  data-slot="dialog-content"
                  layout={!reduce}
                  layoutId={reduce ? undefined : `${id}-surface`}
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{
                    opacity: 0,
                    transition: { duration: reduce ? 0 : 0.15, ease: EASE_OUT },
                  }}
                  transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                  className={cn(
                    "pointer-events-auto flex max-h-[calc(100dvh-7rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground",
                    className,
                  )}
                >
                  <motion.div
                    data-slot="command"
                    layout={reduce ? false : "position"}
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.15, ease: EASE_OUT }}
                    className="flex min-h-0 flex-col"
                  >
                    <DialogTitle className="sr-only">{title}</DialogTitle>
                    {description ? <DialogDescription className="sr-only">{description}</DialogDescription> : null}
                    <div className="flex shrink-0 items-center gap-2 border-b border-border p-3">
                      <div className="flex h-10 min-w-0 flex-1 items-center gap-3 rounded-full border border-border px-3 focus-within:border-ring">
                        <Search
                          aria-hidden
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                        <input
                          ref={inputRef}
                          data-slot="command-input"
                          data-autofocus
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder={placeholder}
                          aria-label={placeholder}
                          role="combobox"
                          aria-expanded="true"
                          aria-autocomplete="list"
                          aria-controls={`${id}-results`}
                          aria-activedescendant={
                            activeItem
                              ? `${id}-option-${activeIndex}`
                              : undefined
                          }
                          autoComplete="off"
                          spellCheck={false}
                          onKeyDown={(event) => {
                            if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
                            if (
                              event.key === "ArrowDown" ||
                              event.key === "ArrowUp"
                            ) {
                              event.preventDefault();
                              moveActive(event.key === "ArrowDown" ? 1 : -1);
                            } else if (
                              event.key === "Home" ||
                              event.key === "End"
                            ) {
                              event.preventDefault();
                              moveTo(
                                (event.key === "Home" ? rows[0] : rows.at(-1))
                                  ?.id ?? null,
                              );
                            } else if (event.key === "Enter" && activeItem) {
                              event.preventDefault();
                              select(activeItem);
                            }
                          }}
                          className={cn(
                            "h-10 min-w-0 flex-1 rounded-full bg-transparent text-sm outline-none placeholder:text-muted-foreground",
                            canTouch && "text-base",
                          )}
                        />
                        {query ? (
                          <MorphicTooltip content={clearLabel} side="bottom">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={clearLabel}
                              onClick={() => {
                                setQuery("");
                                inputRef.current?.focus();
                              }}
                              className="size-8 rounded-full focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <X aria-hidden className="size-3.5" />
                            </Button>
                          </MorphicTooltip>
                        ) : null}
                      </div>
                      <MorphicTooltip content={closeLabel} side="bottom">
                        <Button
                          variant="ghost"
                          onClick={() => setOpen(false)}
                          aria-label={closeLabel}
                          className="h-9 shrink-0 rounded-full px-2 text-xs focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <kbd>Esc</kbd>
                        </Button>
                      </MorphicTooltip>
                    </div>
                    <div
                      ref={listRef}
                      id={`${id}-results`}
                      role="listbox"
                      aria-label={title}
                      className="min-h-0 max-h-[min(50dvh,24rem)] overflow-y-auto overscroll-contain p-2"
                    >
                      {rows.length ? (
                        grouped.map(([label, list]) => (
                          <fieldset
                            aria-label={label}
                            key={label}
                            className="mb-2 min-w-0 last:mb-0"
                          >
                            <p
                              aria-hidden
                              data-slot="command-group-heading"
                              className="px-3 pb-1.5 pt-2 text-xs text-muted-foreground"
                            >
                              {label}
                            </p>
                            {list.map((item) => {
                              const index = rows.indexOf(item);
                              const selected = index === activeIndex;
                              const Icon = item.icon ?? Command;
                              return (
                                <button
                                  type="button"
                                  role="option"
                                  data-slot="command-item"
                                  aria-selected={selected}
                                  id={`${id}-option-${index}`}
                                  data-index={index}
                                  key={item.id}
                                  tabIndex={-1}
                                  onPointerMove={(event) => {
                                    if (
                                      canHover &&
                                      event.pointerType === "mouse" &&
                                      !selected
                                    )
                                      moveTo(item.id);
                                  }}
                                  onClick={() => select(item)}
                                  className="relative isolate flex min-h-10 w-full items-center gap-3 rounded-full px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  {selected ? (
                                    <motion.span
                                      layoutId={
                                        reduce ? undefined : `${id}-cursor`
                                      }
                                      transition={
                                        reduce ? { duration: 0 } : SPRING_GLIDE
                                      }
                                      className="absolute inset-0 -z-10 rounded-full bg-muted"
                                    />
                                  ) : null}
                                  {isValidElement(Icon) ? Icon : <Icon
                                    aria-hidden
                                    className="size-4 shrink-0 text-muted-foreground"
                                  />}
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm">
                                      {item.label}
                                    </span>
                                    {item.description ? (
                                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                        {item.description}
                                      </span>
                                    ) : null}
                                  </span>
                                  {item.hint ? (
                                    <kbd className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                                      {item.hint}
                                    </kbd>
                                  ) : selected ? (
                                    <CornerDownLeft
                                      aria-hidden
                                      className="size-3.5 shrink-0 text-muted-foreground"
                                    />
                                  ) : null}
                                </button>
                              );
                            })}
                          </fieldset>
                        ))
                      ) : (
                        <div className="flex min-h-32 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                          {emptyMessage}
                        </div>
                      )}
                    </div>
                    {footer !== false ? <div className="flex shrink-0 items-center gap-4 border-t border-border px-4 py-3 text-xs text-muted-foreground">
                      {footer ?? (
                        <>
                          <span className="inline-flex items-center gap-1">
                            <ArrowUp aria-hidden className="size-3" />
                            <ArrowDown aria-hidden className="size-3" />
                            <span className="ml-1">Navigate</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <CornerDownLeft aria-hidden className="size-3" />
                            Select
                          </span>
                          <span className="ml-auto tabular-nums">
                            {rows.length}{" "}
                            {rows.length === 1 ? "result" : "results"}
                          </span>
                        </>
                      )}
                      <output className="sr-only">
                        {rows.length}{" "}
                        {rows.length === 1 ? "command" : "commands"} found.
                      </output>
                    </div> : null}
                  </motion.div>
                </MotionPanel>
              </div>
            </Dialog>
          )}
        </PresenceGate>
      ) : null}
    </AnimatePresence>
  );
}
