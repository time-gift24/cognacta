"use client";
// beui.dev/components/motion/popover
// 保留上游 portal 就绪标记与 context ref/id 传递，便于升级对照。

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  usePresence,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  cloneElement,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePopoverPortalPosition } from "@/components/beui/motion/popover-position";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

type Side = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";

type MorphContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  triggerId: string;
  contentId: string;
  /** The element the panel measures against — see `registerTrigger`. */
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  registerTrigger: (node: HTMLElement | null) => void;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
};

const MorphContext = createContext<MorphContextValue | null>(null);

function useMorphContext(component: string) {
  const ctx = useContext(MorphContext);
  if (!ctx) throw new Error(`${component} must be used within <MorphPopover>`);
  return ctx;
}

export interface MorphPopoverProps {
  children: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/** Reveals from the trigger's nearest corner; closes on outside pointer or Escape. */
export function MorphPopover({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
}: MorphPopoverProps) {
  const baseId = useId();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );
  const toggle = useCallback(() => setOpen(!open), [setOpen, open]);

  // Use the root for measurement when a wrapper prevents trigger registration.
  // State lets the open panel re-anchor when the trigger mounts or unmounts.
  const anchorRef = useMemo<React.MutableRefObject<HTMLElement | null>>(
    () => ({ current: trigger ?? root }),
    [root, trigger],
  );

  // Restore focus only if it would be stranded in the closing, inert panel.
  // Without a trigger, only a focusable root can receive it.
  const close = useCallback(() => {
    setOpen(false);
    const focused = document.activeElement;
    const inPanel =
      focused instanceof HTMLElement && contentRef.current?.contains(focused);
    if (!inPanel) return;
    const restore = trigger ?? (root && root.tabIndex >= 0 ? root : null);
    restore?.focus();
  }, [root, setOpen, trigger]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // A modal opened above this popover owns its Escape key.
      if (e.target instanceof Element && e.target.closest('[aria-modal="true"]') && !contentRef.current?.contains(e.target)) return;
      e.preventDefault();
      close();
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        root &&
        !root.contains(target) &&
        !contentRef.current?.contains(target)
      )
        close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open, root, close]);

  const ctx = useMemo<MorphContextValue>(
    () => ({
      open,
      setOpen,
      toggle,
      triggerId: `${baseId}-trigger`,
      contentId: `${baseId}-content`,
      triggerRef: anchorRef,
      registerTrigger: setTrigger,
      contentRef,
    }),
    [open, setOpen, toggle, baseId, anchorRef],
  );

  return (
    <MorphContext.Provider value={ctx}>
      <div ref={setRoot} className={cn("relative inline-flex", className)}>
        {children}
      </div>
    </MorphContext.Provider>
  );
}

export interface MorphPopoverTriggerProps {
  children: ReactElement;
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref && typeof ref === "object")
        (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}

export function MorphPopoverTrigger({ children }: MorphPopoverTriggerProps) {
  const ctx = useMorphContext("MorphPopoverTrigger");
  const child = children as ReactElement<Record<string, unknown>>;
  const childOnClick = child?.props?.onClick as
    | ((e: unknown) => void)
    | undefined;
  const childRef = (child?.props as { ref?: Ref<HTMLElement> } | undefined)
    ?.ref;
  // Register once per actual ref change, not once per open-state render.
  const mergedRef = useMemo(
    () => mergeRefs(childRef, ctx.registerTrigger),
    [childRef, ctx.registerTrigger],
  );
  if (!isValidElement(children)) return children;

  return cloneElement(child, {
    id: ctx.triggerId,
    ref: mergedRef,
    onClick: (e: unknown) => {
      childOnClick?.(e);
      ctx.toggle();
    },
    "aria-haspopup": "dialog",
    "aria-expanded": ctx.open,
    "aria-controls": ctx.open ? ctx.contentId : undefined,
  });
}

// Full-distance clip travel needs a shorter tail than SPRING_PANEL.
const MORPH_ENTER = { type: "spring", duration: 0.26, bounce: 0 } as const;
const MORPH_EXIT = { duration: 0.2, ease: EASE_OUT } as const;

// Clipping preserves content size and focus geometry; the clip and shadow may paint.
function clipAt(side: Side, align: Align, radius: number, inset: number) {
  const start = align === "center" ? inset / 2 : align === "end" ? inset : 0;
  const end = align === "center" ? inset / 2 : align === "start" ? inset : 0;
  return side === "top" || side === "bottom"
    ? `inset(${side === "top" ? inset : 0}% ${end}% ${side === "bottom" ? inset : 0}% ${start}% round ${radius}px)`
    : `inset(${start}% ${side === "right" ? inset : 0}% ${end}% ${side === "left" ? inset : 0}% round ${radius}px)`;
}

export interface MorphPopoverContentProps {
  children: ReactNode;
  side?: Side;
  align?: Align;
  /** Gap between trigger and panel, in px. Default 8. */
  sideOffset?: number;
  /** Panel corner radius, in px. Default 16. */
  radius?: number;
  /** Draw the surface shadow. Default true. */
  shadow?: boolean;
  /** Runs after the portalled surface is positioned and visible. */
  onOpenAutoFocus?: (content: HTMLDivElement) => void;
  className?: string;
}

export function MorphPopoverContent(props: MorphPopoverContentProps) {
  const ctx = useMorphContext("MorphPopoverContent");
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => setPortalReady(true), []);
  if (!portalReady) return null;
  return createPortal(
    <AnimatePresence>
      {ctx.open && <MorphPopoverSurface {...props} />}
    </AnimatePresence>,
    document.body,
  );
}

// Measure each portal mount so reopening cannot animate from stale coordinates.
function MorphPopoverSurface({
  children,
  side = "bottom",
  align = "end",
  sideOffset = 8,
  radius = 16,
  shadow = true,
  onOpenAutoFocus,
  className,
}: MorphPopoverContentProps) {
  const ctx = useMorphContext("MorphPopoverContent");
  const reduce = useReducedMotion() ?? false;
  const [isPresent, safeToRemove] = usePresence();
  const layout = usePopoverPortalPosition(
    ctx.triggerRef,
    ctx.contentRef,
    isPresent,
  );

  // Use the roomier side only when the requested side cannot fit the content.
  const gutter = 12;
  const vertical = side === "top" || side === "bottom";
  const space = {
    top: layout ? Math.max(0, layout.trigger.top - sideOffset - gutter) : 0,
    bottom: layout ? Math.max(0, layout.viewport.height - layout.trigger.top - layout.trigger.height - sideOffset - gutter) : 0,
    left: layout ? Math.max(0, layout.trigger.left - sideOffset - gutter) : 0,
    right: layout ? Math.max(0, layout.viewport.width - layout.trigger.left - layout.trigger.width - sideOffset - gutter) : 0,
  };
  const opposite: Record<Side, Side> = { top: "bottom", bottom: "top", left: "right", right: "left" };
  const requestedSpace = space[side];
  const otherSpace = space[opposite[side]];
  const resolvedSide =
    layout &&
    (vertical ? layout.content.height : layout.content.width) > requestedSpace &&
    otherSpace > requestedSpace
      ? opposite[side]
      : side;
  const availableHeight = layout ? vertical ? space[resolvedSide] : Math.max(0, layout.viewport.height - 2 * gutter) : 0;
  const availableWidth = layout ? vertical ? Math.max(0, layout.viewport.width - 2 * gutter) : space[resolvedSide] : 0;
  const crossOffset = (trigger: number, content: number) => align === "start" ? 0 : (trigger - content) / (align === "center" ? 2 : 1);
  const preferredLeft = layout
    ? vertical
      ? layout.trigger.left + crossOffset(layout.trigger.width, layout.content.width)
      : resolvedSide === "right"
        ? layout.trigger.left + layout.trigger.width + sideOffset
        : layout.trigger.left - layout.content.width - sideOffset
    : 0;
  const preferredTop = layout
    ? vertical
      ? resolvedSide === "bottom"
        ? layout.trigger.top + layout.trigger.height + sideOffset
        : layout.trigger.top - layout.content.height - sideOffset
      : layout.trigger.top + crossOffset(layout.trigger.height, layout.content.height)
    : 0;
  const left = layout
    ? Math.max(
        gutter,
        Math.min(
          preferredLeft,
          layout.viewport.width - layout.content.width - gutter,
        ),
      )
    : 0;
  const top = layout
    ? Math.max(gutter, Math.min(preferredTop, layout.viewport.height - layout.content.height - gutter))
    : 0;

  const progress = useMotionValue(0);
  const clipPath = useTransform(progress, (p) =>
    clipAt(resolvedSide, align, radius, 92 * (1 - p)),
  );
  const surfaceOpacity = useTransform(progress, [0, 0.15], [0, 1]);
  const fade = useMotionValue(reduce ? 0 : 1);
  const ready = layout !== null;
  const focusedOnOpen = useRef(false);
  useEffect(() => {
    if (!isPresent) {
      focusedOnOpen.current = false;
      return;
    }
    if (
      !ready ||
      focusedOnOpen.current ||
      !ctx.contentRef.current
    )
      return;
    focusedOnOpen.current = true;
    onOpenAutoFocus?.(ctx.contentRef.current);
  }, [ready, isPresent, ctx.contentRef, onOpenAutoFocus]);
  // safeToRemove changes on each render; a ref prevents exit restarts that
  // could leave the invisible panel mounted indefinitely.
  const safeToRemoveRef = useRef(safeToRemove);
  useLayoutEffect(() => {
    safeToRemoveRef.current = safeToRemove;
  });
  useEffect(() => {
    if (!ready) {
      if (!isPresent) safeToRemoveRef.current?.();
      return;
    }
    const settle = () => {
      if (!isPresent) safeToRemoveRef.current?.();
    };
    if (reduce) {
      progress.jump(1);
      const animation = animate(fade, isPresent ? 1 : 0, {
        duration: 0.12,
        onComplete: settle,
      });
      return () => animation.stop();
    }
    const animation = animate(progress, isPresent ? 1 : 0, {
      ...(isPresent ? MORPH_ENTER : MORPH_EXIT),
      onComplete: settle,
    });
    return () => animation.stop();
  }, [fade, progress, ready, isPresent, reduce]);

  return (
    <motion.div
      data-morph-popover-portal=""
      inert={!isPresent}
      style={{
        left,
        top,
        opacity: reduce ? fade : surfaceOpacity,
        pointerEvents: isPresent ? "auto" : "none",
        visibility: layout ? "visible" : "hidden",
      }}
      // drop-shadow follows the clipped surface; box-shadow would be clipped off.
      className={cn(
        "fixed z-[9999]",
        shadow && "[filter:drop-shadow(0_10px_18px_rgba(0,0,0,0.14))]",
      )}
    >
      <motion.div
        ref={ctx.contentRef}
        id={ctx.contentId}
        role="dialog"
        aria-labelledby={ctx.triggerId}
        style={{
          clipPath: reduce ? undefined : clipPath,
          borderRadius: radius,
          maxHeight: layout ? availableHeight : undefined,
          maxWidth: layout ? availableWidth : undefined,
          overflowX: "hidden",
          overflowY: "auto",
        }}
        className={cn(
          "overflow-hidden border border-border bg-background",
          className,
        )}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
