"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "./types";

export const PINS_KEY = "cognacta.sidebar.pins.v1";

/**
 * Pinned conversations are the sidebar's favorites: a flat, reorderable list
 * above the project tree. The order is its own small store so pinning never
 * rewrites workspace history, and ids that no longer exist are pruned on read.
 */
export function usePinnedSessions(sessions: Session[]) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const written = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PINS_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (
        Array.isArray(parsed) &&
        parsed.every((id) => typeof id === "string")
      ) {
        setIds(Array.from(new Set(parsed)));
      }
    } catch {
      // A corrupt pin list should never hide the workspace.
    }
    setReady(true);
  }, []);

  const live = useMemo(() => new Set(sessions.map((session) => session.id)), [sessions]);
  const valid = useMemo(() => ids.filter((id) => live.has(id)), [ids, live]);

  useEffect(() => {
    if (!ready) return;
    // Deleted or replaced sessions leave the pinned list without a second write.
    if (valid.length !== ids.length) {
      setIds(valid);
      return;
    }
    const next = JSON.stringify(valid);
    if (written.current === next) return;
    written.current = next;
    try {
      localStorage.setItem(PINS_KEY, next);
    } catch {
      // The workspace already reports unavailable storage in the footer.
    }
  }, [ids, ready, valid]);

  const pinned = useMemo(
    () =>
      valid
        .map((id) => sessions.find((session) => session.id === id))
        .filter((session): session is Session => Boolean(session && !session.archived)),
    [sessions, valid],
  );

  function toggle(id: string) {
    setIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function reorder(next: string[]) {
    setIds(Array.from(new Set(next)));
  }

  return {
    ids: valid,
    pinned,
    pinnedIds: new Set(valid),
    ready,
    toggle,
    reorder,
  };
}
