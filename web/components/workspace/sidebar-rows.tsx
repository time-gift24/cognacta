"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  AnimatePresence,
  Reorder,
  motion,
  useDragControls,
  type DragControls,
} from "motion/react";
import {
  ChevronRight,
  MessageCircle,
  Pin,
  Plus,
} from "@/components/icons";
import { motionTokens } from "@/components/arc/lib/motion-tokens";
import { useTranslations } from "next-intl";
import styles from "./sidebar.module.css";
import type { Project, Session } from "./types";
import { SessionActions } from "./sessions/session-actions";

const instant = { duration: 0 } as const;

/* ------------------------------------------------------------------ */
/* Shared chrome                                                        */
/* ------------------------------------------------------------------ */

/** Rail labels describe themselves beside the icon. The tip closes itself when the rail opens. */
export function RailTip({
  enabled = true,
  label,
  note,
  shortcut,
  side = "right",
  children,
}: {
  enabled?: boolean;
  label: string;
  note?: string;
  shortcut?: string;
  side?: "right" | "bottom";
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  if (!enabled && open) setOpen(false);
  return (
    <TooltipPrimitive.Root
      open={enabled && open}
      onOpenChange={(next) => setOpen(next && enabled)}
    >
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className={styles.tip}
          side={side}
          sideOffset={side === "right" ? 12 : 8}
          collisionPadding={8}
        >
          {label}
          {note ? <span className={styles.tipNote}>{note}</span> : null}
          {shortcut ? <kbd>{shortcut}</kbd> : null}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/** The divider in the panel icon slides with the sidebar, so the control shows what it is about to do. */
export function PanelGlyph({
  collapsed,
  reduce,
}: {
  collapsed: boolean;
  reduce: boolean;
}) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="3.5" />
      <motion.path
        d="M8.25 4.25v11.5"
        initial={false}
        animate={{ x: collapsed ? -2.5 : 0 }}
        transition={reduce ? instant : motionTokens.spring.smooth}
      />
    </svg>
  );
}

/** One highlight marks the open page and glides between rows across every section. */
export function Highlight({ reduce }: { reduce: boolean }) {
  return (
    <motion.span
      layoutId="sidebar-active"
      className={styles.highlight}
      aria-hidden="true"
      transition={reduce ? instant : motionTokens.spring.morph}
    />
  );
}

/** Section titles fold into a hairline in the rail. */
export function SectionTitle({
  id,
  text,
  count,
  rail,
  reduce,
}: {
  id: string;
  text: string;
  count?: number;
  rail: boolean;
  reduce: boolean;
}) {
  return (
    <motion.h2
      id={id}
      className={styles.sectionTitle}
      initial={false}
      animate={{ height: rail ? 17 : 32 }}
      transition={reduce ? instant : motionTokens.spring.smooth}
    >
      <span className={styles.sectionText}>{text}</span>
      {typeof count === "number" && count > 0 ? (
        <span className={styles.sectionCount}>{count}</span>
      ) : null}
      <span className={styles.divider} aria-hidden="true" />
    </motion.h2>
  );
}

/* ------------------------------------------------------------------ */
/* Rows                                                                 */
/* ------------------------------------------------------------------ */

/** Keeps the matching letters at full contrast while the rest of the name dims. */
export function Name({
  name,
  query,
  unread = false,
}: {
  name: string;
  query: string;
  unread?: boolean;
}) {
  const index = query ? name.toLowerCase().indexOf(query.toLowerCase()) : -1;
  return (
    <span
      className={styles.name}
      data-searching={query ? "" : undefined}
      data-unread={unread ? "" : undefined}
    >
      {index < 0 ? (
        name
      ) : (
        <>
          {name.slice(0, index)}
          <mark>{name.slice(index, index + query.length)}</mark>
          {name.slice(index + query.length)}
        </>
      )}
    </span>
  );
}

export function NavRow({
  label,
  icon: Icon,
  active,
  shortcut,
  keyshortcuts,
  rail,
  query,
  reduce,
  onClick,
}: {
  label: string;
  icon: (props: { className?: string }) => ReactElement;
  active: boolean;
  shortcut?: string;
  keyshortcuts?: string;
  rail: boolean;
  query: string;
  reduce: boolean;
  onClick: () => void;
}) {
  return (
    <RailTip enabled={rail} label={label} shortcut={shortcut}>
      <button
        type="button"
        data-row
        className={styles.row}
        aria-current={active ? "page" : undefined}
        aria-keyshortcuts={keyshortcuts}
        onClick={onClick}
      >
        {active ? <Highlight reduce={reduce} /> : null}
        <span className={styles.lead}>
          <Icon className={styles.leadIcon} />
        </span>
        <Name name={label} query={query} />
        {shortcut ? (
          <span className={styles.shortcut} aria-hidden="true">
            {shortcut}
          </span>
        ) : null}
      </button>
    </RailTip>
  );
}

type PinDrag = {
  draggable: boolean;
  node: React.RefObject<HTMLButtonElement | null>;
  item: React.RefObject<HTMLLIElement | null>;
  controls: DragControls;
  lifted: boolean;
  dragged: React.RefObject<boolean>;
  onPointerDown: (event: ReactPointerEvent<HTMLLIElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLLIElement>) => void;
  onPointerEnd: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

const LONG_PRESS = 320;

/**
 * A mouse lifts a pinned row as soon as it moves. A finger has to hold still
 * first, so a swipe over the list still scrolls it. The row's menu is excluded.
 */
function useRowDrag({
  draggable,
  onMove,
  onDropped,
}: {
  draggable: boolean;
  onMove: (direction: -1 | 1) => void;
  onDropped: () => void;
}): PinDrag {
  const dragged = useRef(false);
  const node = useRef<HTMLButtonElement>(null);
  const item = useRef<HTMLLIElement>(null);
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const armed = useRef(false);
  const controls = useDragControls();
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const element = item.current;
    if (!element) return;
    const hold = (event: TouchEvent) => {
      if (armed.current && event.cancelable) event.preventDefault();
    };
    element.addEventListener("touchmove", hold, { passive: false });
    return () => {
      element.removeEventListener("touchmove", hold);
      if (press.current) window.clearTimeout(press.current.timer);
    };
  }, []);

  function cancelPress() {
    if (!press.current) return;
    window.clearTimeout(press.current.timer);
    press.current = null;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLLIElement>) {
    dragged.current = false;
    if (!draggable || event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest("[data-no-drag]")
    )
      return;
    if (event.pointerType !== "touch") {
      controls.start(event);
      return;
    }
    const native = event.nativeEvent;
    cancelPress();
    press.current = {
      x: event.clientX,
      y: event.clientY,
      timer: window.setTimeout(() => {
        press.current = null;
        armed.current = true;
        dragged.current = true;
        setLifted(true);
        controls.start(native);
      }, LONG_PRESS),
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLLIElement>) {
    if (
      press.current &&
      Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y) > 8
    )
      cancelPress();
  }

  function onPointerEnd() {
    cancelPress();
    if (armed.current) {
      requestAnimationFrame(() => {
        if (armed.current) {
          armed.current = false;
          setLifted(false);
        }
      });
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!event.altKey || !draggable) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    onMove(event.key === "ArrowUp" ? -1 : 1);
  }

  return {
    draggable,
    node,
    item,
    controls,
    lifted,
    dragged,
    onPointerDown,
    onPointerMove,
    onPointerEnd,
    onDragStart: () => {
      dragged.current = true;
      setLifted(true);
    },
    onDragEnd: () => {
      armed.current = false;
      setLifted(false);
      onDropped();
    },
    onKeyDown,
  };
}

export function PinnedRow({
  session,
  active,
  query,
  rail,
  reduce,
  draggable,
  pinned,
  hintId,
  onTogglePin,
  onSelect,
  onMove,
  onDropped,
}: {
  session: Session;
  active: boolean;
  query: string;
  rail: boolean;
  reduce: boolean;
  draggable: boolean;
  pinned: boolean;
  hintId: string;
  onTogglePin: () => void;
  onSelect: () => void;
  onMove: (direction: -1 | 1) => void;
  onDropped: () => void;
}) {
  const drag = useRowDrag({ draggable, onMove, onDropped });
  return (
    <Reorder.Item
      ref={drag.item}
      value={session}
      as="li"
      className={styles.item}
      data-lifted={drag.lifted ? "" : undefined}
      drag={draggable ? "y" : false}
      dragListener={false}
      dragControls={drag.controls}
      dragMomentum={false}
      dragTransition={{ bounceStiffness: 520, bounceDamping: 40 }}
      transition={
        reduce
          ? instant
          : { ...motionTokens.spring.smooth, layout: motionTokens.spring.smooth }
      }
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerEnd}
      onPointerCancel={drag.onPointerEnd}
      onDragStart={drag.onDragStart}
      onDragEnd={drag.onDragEnd}
      onContextMenu={(event) => {
        if (drag.lifted) event.preventDefault();
      }}
    >
      <div className={styles.itemShell}>
        <RailTip enabled={rail} label={session.title}>
          <button
            ref={drag.node}
            type="button"
            data-row
            data-pin-id={session.id}
            className={styles.row}
            aria-current={active ? "page" : undefined}
            aria-describedby={draggable ? hintId : undefined}
            onKeyDown={drag.onKeyDown}
            onClick={() => {
              if (drag.dragged.current) {
                drag.dragged.current = false;
                return;
              }
              onSelect();
            }}
          >
            {active ? <Highlight reduce={reduce} /> : null}
            <span className={styles.lead}>
              <Pin className={styles.leadIcon} />
            </span>
            <Name name={session.title} query={query} />
          </button>
        </RailTip>
        {!rail ? (
          <div className={styles.actions} data-no-drag>
            <SessionActions
              session={session}
              active={active}
              pinned={pinned}
              onTogglePin={onTogglePin}
            />
          </div>
        ) : null}
      </div>
    </Reorder.Item>
  );
}

export function SessionRow({
  session,
  active,
  query,
  rail,
  reduce,
  nested = false,
  pinned,
  onTogglePin,
  onSelect,
}: {
  session: Session;
  active: boolean;
  query: string;
  rail: boolean;
  reduce: boolean;
  nested?: boolean;
  pinned: boolean;
  onTogglePin: () => void;
  onSelect: () => void;
}) {
  return (
    <div className={styles.itemShell}>
      <RailTip enabled={rail} label={session.title}>
        <button
          type="button"
          data-row
          data-session-id={session.id}
          className={nested ? `${styles.row} ${styles.rowNested}` : styles.row}
          aria-current={active ? "page" : undefined}
          onClick={onSelect}
        >
          {active ? <Highlight reduce={reduce} /> : null}
          <span className={styles.lead}>
            <MessageCircle className={styles.leadIcon} />
          </span>
          <Name name={session.title} query={query} />
        </button>
      </RailTip>
      {!rail ? (
        <div className={styles.actions} data-no-drag>
          <SessionActions
            session={session}
            active={active}
            pinned={pinned}
            onTogglePin={onTogglePin}
          />
        </div>
      ) : null}
    </div>
  );
}

export function ProjectRow({
  project,
  sessions,
  tone,
  expanded,
  held,
  query,
  rail,
  reduce,
  activeId,
  onToggle,
  onSelectSession,
  onNewChat,
  pinnedIds,
  onTogglePin,
}: {
  project: Project;
  sessions: Session[];
  tone: string;
  expanded: boolean;
  held: boolean;
  query: string;
  activeId: string | null;
  rail: boolean;
  reduce: boolean;
  onToggle: () => void;
  onSelectSession: (session: Session) => void;
  onNewChat: () => void;
  pinnedIds: Set<string>;
  onTogglePin: (id: string) => void;
}) {
  const t = useTranslations("Nav");
  const listId = useId();
  const showChildren = expanded && !rail;
  return (
    <li className={styles.item}>
      <RailTip enabled={rail} label={project.title} note={`${sessions.length}`}>
        <button
          type="button"
          data-row
          data-project-row
          data-project-id={project.id}
          className={styles.row}
          aria-expanded={rail ? undefined : expanded}
          aria-controls={sessions.length ? listId : undefined}
          onClick={onToggle}
        >
          <span className={styles.lead}>
            <span
              className={styles.dot}
              data-tone={tone}
              data-held={held ? "" : undefined}
            />
          </span>
          <Name name={project.title} query={query} unread={held} />
          <ChevronRight
            className={styles.rowChevron}
            data-open={expanded ? "" : undefined}
          />
        </button>
      </RailTip>
      <motion.ul
        id={listId}
        className={styles.children}
        initial={false}
        animate={
          showChildren
            ? { height: "auto", opacity: 1 }
            : { height: 0, opacity: 0 }
        }
        transition={
          reduce
            ? instant
            : {
                height: motionTokens.spring.smooth,
                opacity: {
                  duration: showChildren
                    ? motionTokens.duration.fast
                    : motionTokens.duration.instant,
                  delay: showChildren ? 0.04 : 0,
                },
              }
        }
        inert={!showChildren}
        aria-hidden={showChildren ? undefined : true}
      >
        {sessions.map((session) => (
          <li key={session.id}>
            <SessionRow
              session={session}
              active={session.id === activeId}
              query={query}
              rail={rail}
              reduce={reduce}
              nested
              pinned={pinnedIds.has(session.id)}
              onTogglePin={() => onTogglePin(session.id)}
              onSelect={() => onSelectSession(session)}
            />
          </li>
        ))}
        <li>
          <button
            type="button"
            className={`${styles.row} ${styles.rowNested}`}
            onClick={onNewChat}
          >
            <span className={styles.lead}>
              <Plus className={styles.leadIcon} />
            </span>
            <span className={styles.name}>{t("newChat")}</span>
          </button>
        </li>
      </motion.ul>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Inline project creation                                              */
/* ------------------------------------------------------------------ */

export function NewProjectComposer({
  rail,
  reduce,
  onExpand,
  taken,
  onCreate,
}: {
  rail: boolean;
  reduce: boolean;
  onExpand: () => void;
  taken: (name: string) => string | undefined;
  onCreate: (name: string) => void;
}) {
  const t = useTranslations("Nav");
  const id = useId();
  const [state, setState] = useState<"idle" | "open" | "commit">("idle");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function open() {
    setState("open");
    requestAnimationFrame(() => input.current?.focus());
  }
  function close(returnFocus: boolean) {
    setState("idle");
    setValue("");
    setError("");
    if (returnFocus) requestAnimationFrame(() => trigger.current?.focus());
  }
  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (state !== "open") return;
    const name = value.trim().replace(/\s+/g, " ");
    if (!name) {
      close(true);
      return;
    }
    const existing = taken(name);
    if (existing) {
      setError(t("projectExists", { name: existing }));
      return;
    }
    setValue(name);
    setState("commit");
    timer.current = window.setTimeout(
      () => {
        onCreate(name);
        setState("idle");
        setValue("");
        setError("");
      },
      reduce ? 0 : 280,
    );
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  }

  const idle = state === "idle";
  const swapIn = reduce
    ? { opacity: 0 }
    : { opacity: 0, y: "0.3em", filter: "blur(4px)" };
  const swapOut = reduce
    ? { opacity: 0, transition: instant }
    : {
        opacity: 0,
        y: "-0.3em",
        filter: "blur(2px)",
        transition: {
          duration: motionTokens.duration.instant,
          ease: [...motionTokens.ease.standard] as [number, number, number, number],
        },
      };

  return (
    <motion.div
      className={styles.composerWrap}
      initial={reduce ? false : { opacity: 0, y: -6, filter: "blur(2px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: motionTokens.duration.standard,
        ease: [...motionTokens.ease.enter],
        delay: 0.04,
      }}
    >
      <form
        className={styles.composer}
        data-state={state}
        data-invalid={error ? "" : undefined}
        onSubmit={submit}
      >
        <span className={styles.lead} aria-hidden="true">
          <AnimatePresence initial={false} mode="popLayout">
            {idle ? (
              <motion.span
                key="plus"
                className={styles.plus}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  opacity: 0,
                  scale: 0.6,
                  transition: { duration: reduce ? 0 : motionTokens.duration.instant },
                }}
                transition={reduce ? instant : motionTokens.spring.snappy}
              >
                <Plus className={styles.leadIcon} />
              </motion.span>
            ) : (
              <motion.span
                key="dot"
                className={styles.dot}
                data-tone={toneFor(state)}
                data-hollow={state === "open" ? "" : undefined}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{
                  opacity: 1,
                  scale: state === "commit" && !reduce ? [1, 1.45, 1] : 1,
                }}
                exit={{ opacity: 0, transition: instant }}
                transition={
                  reduce
                    ? instant
                    : state === "commit"
                      ? { duration: 0.32, ease: [...motionTokens.ease.standard] }
                      : motionTokens.spring.snappy
                }
              />
            )}
          </AnimatePresence>
        </span>
        <span className={styles.composerField}>
          <AnimatePresence initial={false} mode="popLayout">
            {idle ? (
              <motion.span
                key="label"
                className={styles.composerLabel}
                aria-hidden="true"
                initial={swapIn}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={swapOut}
                transition={
                  reduce
                    ? instant
                    : {
                        duration: motionTokens.duration.standard,
                        ease: [...motionTokens.ease.enter],
                      }
                }
              >
                {t("newProject")}
              </motion.span>
            ) : (
              <motion.input
                key="input"
                ref={input}
                id={`${id}-name`}
                className={styles.composerInput}
                value={value}
                maxLength={32}
                readOnly={state === "commit"}
                placeholder={t("projectName")}
                aria-label={t("projectName")}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : `${id}-help`}
                autoComplete="off"
                enterKeyHint="done"
                onChange={(event) => {
                  setValue(event.target.value);
                  if (error) setError("");
                }}
                onKeyDown={onKeyDown}
                onBlur={() => {
                  if (state !== "open") return;
                  if (value.trim() && !error) submit();
                  else close(false);
                }}
                initial={swapIn}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={swapOut}
                transition={
                  reduce
                    ? instant
                    : {
                        duration: motionTokens.duration.standard,
                        ease: [...motionTokens.ease.enter],
                      }
                }
              />
            )}
          </AnimatePresence>
        </span>
        <span className={styles.composerNote} aria-hidden="true">
          <AnimatePresence initial={false}>
            {error ? (
              <motion.span
                key="taken"
                initial={swapIn}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={swapOut}
                transition={
                  reduce
                    ? instant
                    : {
                        duration: motionTokens.duration.standard,
                        ease: [...motionTokens.ease.enter],
                      }
                }
              >
                {t("nameTaken")}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
        {idle ? (
          <RailTip enabled={rail} label={t("newProject")} side="right">
            <button
              ref={trigger}
              type="button"
              className={styles.composerTrigger}
              aria-label={t("newProject")}
              onClick={() => {
                if (rail) onExpand();
                open();
              }}
            >
              {t("newProject")}
            </button>
          </RailTip>
        ) : null}
        <span id={`${id}-help`} className="sr-only">
          {t("projectNameHint")}
        </span>
        <span id={`${id}-error`} className="sr-only" role="alert">
          {error}
        </span>
      </form>
    </motion.div>
  );
}

function toneFor(state: "idle" | "open" | "commit") {
  return state === "commit" ? "green" : "slate";
}
