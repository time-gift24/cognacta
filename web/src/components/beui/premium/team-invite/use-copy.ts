"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Copies text and reports `copied` for a short moment afterwards. */
export function useCopy(holdMs = 1800) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return false;
      }
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), holdMs);
      return true;
    },
    [holdMs],
  );

  return { copied, copy };
}
