"use client";

import { useMotionValue } from "motion/react";
import {
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { DropTarget, KanbanTask } from "./types";

type DragSession = {
  pointerId: number | null;
  touchId: number | null;
  trigger: HTMLElement;
  task: KanbanTask;
  startX: number;
  startY: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
  active: boolean;
  target: DropTarget | null;
};

const DRAG_THRESHOLD = 6;
const TOUCH_HOLD_MS = 200;

function releaseCapture(active: DragSession) {
  if (
    active.pointerId !== null &&
    active.trigger.hasPointerCapture(active.pointerId)
  )
    active.trigger.releasePointerCapture(active.pointerId);
}

/** Mouse/pen drags start on movement; touch cards activate on hold to keep swipes scrollable. */
export function useBoardDrag({
  root,
  onDrop,
  onCancel,
}: {
  root: RefObject<HTMLElement | null>;
  onDrop: (id: string, target: DropTarget) => void;
  onCancel: () => void;
}) {
  const session = useRef<DragSession | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);
  const frame = useRef(0);
  const callbacks = useRef({ onDrop, onCancel });
  useLayoutEffect(() => {
    callbacks.current = { onDrop, onCancel };
  });
  const [drag, setDrag] = useState<{ task: KanbanTask; width: number } | null>(
    null,
  );
  const [target, setTarget] = useState<DropTarget | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const clearHold = useCallback(() => {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }, []);

  const activate = useCallback((active: DragSession) => {
    active.active = true;
    suppressClick.current = true;
    if (active.pointerId !== null) {
      active.trigger.focus({ preventScroll: true });
      active.trigger.setPointerCapture(active.pointerId);
    }
    setDrag({ task: active.task, width: active.width });
  }, []);

  useEffect(() => {
    function detect(active: DragSession) {
      const surface = document
        .elementFromPoint(active.x, active.y)
        ?.closest<HTMLElement>("[data-kanban-column]");
      let next: DropTarget | null = null;
      if (surface && root.current?.contains(surface)) {
        const before = Array.from(
          surface.querySelectorAll<HTMLElement>("[data-kanban-task]"),
        ).find((card) => {
          if (card.dataset.kanbanTask === active.task.id) return false;
          const rect = card.getBoundingClientRect();
          return active.y < rect.top + rect.height / 2;
        });
        next = {
          columnId: surface.dataset.kanbanColumn ?? "",
          beforeId: before?.dataset.kanbanTask,
        };
      }
      if (
        next?.columnId !== active.target?.columnId ||
        next?.beforeId !== active.target?.beforeId
      ) {
        active.target = next;
        setTarget(next);
      }
    }
    function autoScroll() {
      const active = session.current;
      if (!active?.active) return;
      const board = root.current?.querySelector<HTMLElement>(
        "[data-kanban-scroll]",
      );
      if (board) {
        const rect = board.getBoundingClientRect();
        const direction =
          active.x < rect.left + 28 ? -1 : active.x > rect.right - 28 ? 1 : 0;
        if (direction && active.y >= rect.top && active.y <= rect.bottom)
          board.scrollLeft += direction * 10;
      }
      const list = document
        .elementFromPoint(active.x, active.y)
        ?.closest<HTMLElement>("[data-kanban-cards]");
      if (list && root.current?.contains(list)) {
        const rect = list.getBoundingClientRect();
        if (active.y < rect.top + 28) list.scrollTop -= 8;
        else if (active.y > rect.bottom - 28) list.scrollTop += 8;
      }
      detect(active);
      frame.current = requestAnimationFrame(autoScroll);
    }
    function update(active: DragSession, clientX: number, clientY: number) {
      active.x = clientX;
      active.y = clientY;
      x.set(active.x - active.offsetX);
      y.set(active.y - active.offsetY);
      detect(active);
    }
    function complete(cancelled: boolean) {
      const active = session.current;
      if (!active) return;
      session.current = null;
      clearHold();
      releaseCapture(active);
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      setDrag(null);
      setTarget(null);
      if (!active.active) return;
      if (!cancelled && active.target)
        callbacks.current.onDrop(active.task.id, active.target);
      else callbacks.current.onCancel();
    }
    function move(event: PointerEvent) {
      const active = session.current;
      if (
        !active ||
        active.pointerId === null ||
        active.pointerId !== event.pointerId
      )
        return;
      if (!active.active) {
        if (
          Math.hypot(
            event.clientX - active.startX,
            event.clientY - active.startY,
          ) < DRAG_THRESHOLD
        )
          return;
        activate(active);
        frame.current = requestAnimationFrame(autoScroll);
      }
      event.preventDefault();
      update(active, event.clientX, event.clientY);
    }
    function finish(event: PointerEvent) {
      const active = session.current;
      if (
        !active ||
        active.pointerId === null ||
        active.pointerId !== event.pointerId
      )
        return;
      complete(event.type !== "pointerup");
    }
    function touchMove(event: TouchEvent) {
      const active = session.current;
      if (!active || active.touchId === null) return;
      const touch = Array.from(event.changedTouches).find(
        (touch) => touch.identifier === active.touchId,
      );
      if (!touch) return;
      if (!active.active) {
        if (
          Math.hypot(
            touch.clientX - active.startX,
            touch.clientY - active.startY,
          ) >= DRAG_THRESHOLD
        ) {
          suppressClick.current = true;
          complete(true);
        }
        return;
      }
      if (event.cancelable) event.preventDefault();
      if (!frame.current) frame.current = requestAnimationFrame(autoScroll);
      update(active, touch.clientX, touch.clientY);
    }
    function touchFinish(event: TouchEvent) {
      const active = session.current;
      if (!active || active.touchId === null) return;
      if (
        !Array.from(event.changedTouches).some(
          (touch) => touch.identifier === active.touchId,
        )
      )
        return;
      complete(event.type !== "touchend");
    }
    function cancel(event: KeyboardEvent) {
      if (event.key !== "Escape" || !session.current) return;
      event.preventDefault();
      complete(true);
    }
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    window.addEventListener("keydown", cancel);
    window.addEventListener("touchmove", touchMove, { passive: false });
    window.addEventListener("touchend", touchFinish);
    window.addEventListener("touchcancel", touchFinish);
    return () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      clearHold();
      if (session.current) releaseCapture(session.current);
      session.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("keydown", cancel);
      window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("touchend", touchFinish);
      window.removeEventListener("touchcancel", touchFinish);
    };
  }, [root, x, y, activate, clearHold]);

  function start(event: ReactPointerEvent<HTMLElement>, task: KanbanTask) {
    if (event.button !== 0 || !event.isPrimary) return;
    const handle = (event.target as Element).closest<HTMLElement>(
      "[data-kanban-handle]",
    );
    if (event.pointerType === "touch" && !handle) return;
    suppressClick.current = false;
    const card = event.currentTarget.closest<HTMLElement>("[data-kanban-task]");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const trigger =
      handle ?? card.querySelector<HTMLElement>("[data-kanban-open]");
    if (!trigger) return;
    clearHold();
    session.current = {
      pointerId: event.pointerId,
      touchId: null,
      trigger,
      task,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      active: false,
      target: null,
    };
    x.set(rect.left);
    y.set(rect.top);
  }

  function startTouch(event: ReactTouchEvent<HTMLElement>, task: KanbanTask) {
    if ((event.target as Element).closest("[data-kanban-handle]")) return;
    if (event.touches.length !== 1) {
      clearHold();
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      if (session.current) releaseCapture(session.current);
      session.current = null;
      setDrag(null);
      setTarget(null);
      return;
    }
    const card = event.currentTarget.closest<HTMLElement>("[data-kanban-task]");
    const trigger = card?.querySelector<HTMLElement>("[data-kanban-open]");
    if (!card || !trigger) return;
    clearHold();
    suppressClick.current = false;
    const touch = event.touches[0];
    const rect = card.getBoundingClientRect();
    const active: DragSession = {
      pointerId: null,
      touchId: touch.identifier,
      trigger,
      task,
      startX: touch.clientX,
      startY: touch.clientY,
      x: touch.clientX,
      y: touch.clientY,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
      width: rect.width,
      active: false,
      target: null,
    };
    session.current = active;
    x.set(rect.left);
    y.set(rect.top);
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      if (session.current === active) activate(active);
    }, TOUCH_HOLD_MS);
  }

  return {
    drag,
    target,
    x,
    y,
    start,
    startTouch,
    shouldSuppressClick: () => suppressClick.current,
  };
}
