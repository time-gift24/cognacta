"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Tracks an element's height so a wrapper can animate between stages. Uses a
 * callback ref so it starts observing whenever the element mounts (for
 * example each time a dialog opens).
 */
export function useMeasuredHeight<T extends HTMLElement>() {
  const observer = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node) {
      setHeight("auto");
      return;
    }
    observer.current = new ResizeObserver(([entry]) => {
      setHeight(entry.borderBoxSize?.[0]?.blockSize ?? node.offsetHeight);
    });
    observer.current.observe(node);
  }, []);

  return { ref, height };
}
