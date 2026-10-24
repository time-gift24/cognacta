"use client";

import { useEffect, useRef } from "react";

/**
 * Entrance delays for a keyed list. Rows present on mount cascade from the
 * top; rows that arrive later cascade only among themselves (after `lead`),
 * so adding items never restarts the whole list.
 */
export function useCascadeDelays(
  ids: readonly string[],
  stagger: number,
  lead = 0,
) {
  const known = useRef<Set<string> | null>(null);
  const firstPass = known.current === null;
  const seen = known.current ?? new Set<string>();

  const delays = new Map<string, number>();
  let fresh = 0;
  ids.forEach((id, index) => {
    if (firstPass) {
      delays.set(id, index * stagger);
    } else if (seen.has(id)) {
      delays.set(id, 0);
    } else {
      delays.set(id, lead + fresh * stagger);
      fresh += 1;
    }
  });

  useEffect(() => {
    known.current = new Set(ids);
  });

  return delays;
}
