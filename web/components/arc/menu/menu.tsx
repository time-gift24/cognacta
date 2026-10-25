"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  ReactNode,
  RefObject,
} from "react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./menu.module.css";

/**
 * Arc's dropdown menu, extended with the primitives a real navigation menu needs
 * (radio groups, submenus, shortcuts). The public `DropdownMenu` convenience
 * component stays available for simple action lists; the parts below compose the
 * same surface for the workspace switcher, sessions, and the account menu.
 */
export const Menu = DropdownPrimitive.Root;
export const MenuTrigger = DropdownPrimitive.Trigger;
export const MenuGroup = DropdownPrimitive.Group;
export const MenuRadioGroup = DropdownPrimitive.RadioGroup;
export const MenuSub = DropdownPrimitive.Sub;

type Highlight = { top: number; height: number; danger: boolean; glide: boolean };

function useMenuHighlight() {
  const reduce = useReducedMotion();
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const pointer = useRef(false);
  const clearTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(clearTimer.current), []);

  function onFocus(event: ReactFocusEvent<HTMLDivElement>) {
    const item =
      event.target instanceof HTMLElement
        ? event.target.closest<HTMLElement>('[role^="menuitem"]')
        : null;
    window.clearTimeout(clearTimer.current);
    if (!item) {
      // A short grace period keeps the highlight gliding across separators and
      // group labels instead of blinking out between every section.
      clearTimer.current = window.setTimeout(
        () => setHighlight(null),
        pointer.current ? 70 : 0,
      );
      return;
    }
    const next = {
      top: item.offsetTop,
      height: item.offsetHeight,
      danger: item.dataset.tone === "danger",
    };
    const glide = pointer.current;
    setHighlight((current) => ({
      ...next,
      glide: glide && current !== null,
    }));
  }

  return {
    highlight,
    pointer,
    handlers: {
      onFocus,
      onPointerDownCapture: () => {
        pointer.current = true;
      },
      onPointerMoveCapture: () => {
        pointer.current = true;
      },
      onKeyDownCapture: () => {
        pointer.current = false;
      },
    },
  };
}

function HighlightLayer({
  highlight,
  reduce,
}: {
  highlight: Highlight | null;
  reduce: boolean;
}) {
  return (
    <motion.span
      className={styles.highlight}
      data-tone={highlight?.danger ? "danger" : undefined}
      aria-hidden="true"
      initial={false}
      animate={
        highlight
          ? { y: highlight.top, height: highlight.height, opacity: 1 }
          : { opacity: 0 }
      }
      transition={{
        default:
          highlight?.glide && !reduce
            ? motionTokens.spring.snappy
            : { duration: 0 },
        opacity: { duration: reduce ? 0 : 0.08 },
      }}
    />
  );
}

export interface MenuContentProps
  extends ComponentPropsWithoutRef<typeof DropdownPrimitive.Content> {
  className?: string;
  /** Focus returns here after a pointer choice, without a keyboard focus ring. */
  triggerRef?: RefObject<HTMLElement | null>;
}

export function MenuContent({
  className,
  children,
  sideOffset = 6,
  collisionPadding = 10,
  triggerRef,
  onCloseAutoFocus,
  ...props
}: MenuContentProps) {
  const reduce = useReducedMotion() ?? false;
  const { highlight, pointer, handlers } = useMenuHighlight();
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        className={[styles.content, className].filter(Boolean).join(" ")}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        loop
        {...handlers}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          if (event.defaultPrevented) return;
          const trigger = triggerRef?.current;
          if (!trigger || !pointer.current) return;
          event.preventDefault();
          trigger.dataset.pointerFocus = "";
          trigger.focus({ preventScroll: true });
          const clear = () => {
            delete trigger.dataset.pointerFocus;
            trigger.removeEventListener("blur", clear);
          };
          trigger.addEventListener("blur", clear);
        }}
        {...props}
      >
        <HighlightLayer highlight={highlight} reduce={reduce} />
        {children}
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  );
}

export function MenuSubContent({
  className,
  children,
  sideOffset = 4,
  collisionPadding = 10,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownPrimitive.SubContent>) {
  const reduce = useReducedMotion() ?? false;
  const { highlight, handlers } = useMenuHighlight();
  return (
    <DropdownPrimitive.SubContent
      className={[styles.content, styles.subContent, className]
        .filter(Boolean)
        .join(" ")}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      {...handlers}
      {...props}
    >
      <HighlightLayer highlight={highlight} reduce={reduce} />
      {children}
    </DropdownPrimitive.SubContent>
  );
}

export function MenuLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>) {
  return (
    <DropdownPrimitive.Label
      className={[styles.menuLabel, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export function MenuSeparator({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>) {
  return (
    <DropdownPrimitive.Separator
      className={[styles.separator, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

type ItemChrome = {
  icon?: ReactNode;
  shortcut?: string;
  destructive?: boolean;
  className?: string;
  children?: ReactNode;
};

export function MenuItem({
  icon,
  shortcut,
  destructive,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & ItemChrome) {
  return (
    <DropdownPrimitive.Item
      className={[styles.item, className].filter(Boolean).join(" ")}
      data-tone={destructive ? "danger" : undefined}
      {...props}
    >
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.label}>{children}</span>
      {shortcut ? (
        <kbd className={styles.shortcut} aria-hidden="true">
          {shortcut}
        </kbd>
      ) : null}
    </DropdownPrimitive.Item>
  );
}

export function MenuRadioItem({
  icon,
  shortcut,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownPrimitive.RadioItem> & ItemChrome) {
  return (
    <DropdownPrimitive.RadioItem
      className={[styles.item, className].filter(Boolean).join(" ")}
      {...props}
    >
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.label}>{children}</span>
      {shortcut ? (
        <kbd className={styles.shortcut} aria-hidden="true">
          {shortcut}
        </kbd>
      ) : null}
      <DropdownPrimitive.ItemIndicator className={styles.indicator}>
        <Check size={14} strokeWidth={2} aria-hidden="true" />
      </DropdownPrimitive.ItemIndicator>
    </DropdownPrimitive.RadioItem>
  );
}

export function MenuSubTrigger({
  icon,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownPrimitive.SubTrigger> & {
  icon?: ReactNode;
}) {
  return (
    <DropdownPrimitive.SubTrigger
      className={[styles.item, className].filter(Boolean).join(" ")}
      {...props}
    >
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.label}>{children}</span>
      <ChevronRight
        className={styles.subChevron}
        size={14}
        strokeWidth={1.8}
        aria-hidden="true"
      />
    </DropdownPrimitive.SubTrigger>
  );
}

/* ------------------------------------------------------------------ */
/* The simple action menu from the registry, now built on the parts.  */
/* ------------------------------------------------------------------ */

export interface DropdownMenuEntry {
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  destructive?: boolean;
  separatorBefore?: boolean;
}

export interface DropdownMenuProps {
  label: string;
  items: DropdownMenuEntry[];
  icon?: ReactNode;
}

/** A new trigger label rises in while the old one leaves, and the trigger width springs to the measured text. */
function TriggerLabel({ text }: { text: string }) {
  const reduced = useReducedMotion();
  const measure = useRef<HTMLSpanElement>(null);
  const measured = useRef<string | null>(null);
  const [size, setSize] = useState<{ width: number | "auto"; animate: boolean }>({
    width: "auto",
    animate: false,
  });

  useEffect(() => {
    const node = measure.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const current = node.textContent;
      const animate = measured.current !== null && measured.current !== current;
      measured.current = current;
      setSize({
        width: Math.ceil(entry.borderBoxSize?.[0]?.inlineSize ?? node.offsetWidth),
        animate,
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.span
      className={styles.triggerLabel}
      initial={false}
      animate={{ width: size.width }}
      transition={
        size.animate && !reduced ? motionTokens.spring.morph : { duration: 0 }
      }
    >
      <span ref={measure} className={styles.triggerMeasure} aria-hidden="true">
        {text}
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          className={styles.triggerText}
          initial={
            reduced
              ? false
              : {
                  opacity: 0,
                  y: "0.3em",
                  filter: `blur(${motionTokens.blur.soft}px)`,
                }
          }
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={
            reduced
              ? { opacity: 0, transition: { duration: 0 } }
              : {
                  opacity: 0,
                  y: "-0.3em",
                  filter: `blur(${motionTokens.blur.subtle}px)`,
                  transition: {
                    duration: motionTokens.duration.fast,
                    ease: [...motionTokens.ease.standard],
                  },
                }
          }
          transition={{
            duration: motionTokens.duration.standard,
            ease: [...motionTokens.ease.enter],
          }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

export function DropdownMenu({ label, items, icon }: DropdownMenuProps) {
  return (
    <Menu>
      <MenuTrigger className={styles.trigger} type="button">
        {icon ? (
          <span className={styles.triggerIcon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <TriggerLabel text={label} />
        <ChevronDown
          className={styles.triggerChevron}
          size={15}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </MenuTrigger>
      <MenuContent align="end">
        {items.map((item, index) => (
          <div key={item.label} className={styles.entry}>
            {item.separatorBefore ? <MenuSeparator /> : null}
            <MenuItem
              icon={item.icon}
              destructive={item.destructive}
              disabled={item.disabled}
              onSelect={item.onSelect}
              style={{ "--i": index } as CSSProperties}
            >
              {item.label}
            </MenuItem>
          </div>
        ))}
      </MenuContent>
    </Menu>
  );
}

export default DropdownMenu;
