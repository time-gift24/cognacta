"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** Tracks an element's content height, for charts that fill a flexible panel. */
export function useElementHeight<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(fallback);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      if (node.clientHeight > 0) setHeight(node.clientHeight);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, height] as const;
}
