"use client";

import { type KeyboardEvent, useCallback, useEffect, useRef } from "react";
import { addDays, weekdayIndex } from "./booking-time";

type Options = {
  /** The day that owns tabindex=0. */
  activeDate: string;
  setActiveDate: (date: string) => void;
  onSelect: (date: string) => void;
  /** Return false to stop focus leaving the bookable window. */
  canVisit: (date: string) => boolean;
};

const STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

/**
 * Roving tabindex for a Monday-first day grid. Arrows move by day/week,
 * Home/End jump within the week, PageUp/PageDown move a month, and focus
 * follows the active date once the matching cell mounts (including after the
 * month slides).
 */
export function useRovingGrid({
  activeDate,
  setActiveDate,
  onSelect,
  canVisit,
}: Options) {
  const cells = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef(false);

  useEffect(() => {
    if (!pendingFocus.current) return;
    const cell = cells.current.get(activeDate);
    if (!cell) return;
    pendingFocus.current = false;
    cell.focus({ preventScroll: true });
  });

  const move = useCallback(
    (target: string) => {
      if (!canVisit(target)) return;
      pendingFocus.current = true;
      setActiveDate(target);
    },
    [canVisit, setActiveDate],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
      const step = STEPS[event.key];
      if (step) {
        event.preventDefault();
        move(addDays(date, step));
        return;
      }
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        const offset = weekdayIndex(date);
        move(addDays(date, event.key === "Home" ? -offset : 6 - offset));
        return;
      }
      if (event.key === "PageUp" || event.key === "PageDown") {
        event.preventDefault();
        const [year, month, day] = date.split("-").map(Number);
        const shift = event.key === "PageUp" ? -1 : 1;
        const lastDay = new Date(
          Date.UTC(year, month - 1 + shift + 1, 0),
        ).getUTCDate();
        const target = new Date(
          Date.UTC(year, month - 1 + shift, Math.min(day, lastDay)),
        );
        move(target.toISOString().slice(0, 10));
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(date);
      }
    },
    [move, onSelect],
  );

  const getCellProps = useCallback(
    (date: string) => ({
      tabIndex: date === activeDate ? 0 : -1,
      ref: (node: HTMLButtonElement | null) => {
        // Months never share dates, so an exiting grid cannot clobber the
        // incoming one; a remounted cell simply overwrites its entry.
        if (node) cells.current.set(date, node);
      },
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) =>
        onKeyDown(event, date),
      onFocus: () => {
        if (date !== activeDate) setActiveDate(date);
      },
    }),
    [activeDate, onKeyDown, setActiveDate],
  );

  return { getCellProps };
}
