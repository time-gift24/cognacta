"use client";

import type { Transition, Variants } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { EASE_IN, EASE_OUT } from "@/lib/beui/ease";

/** Pane swap between Swap, Send, and Buy: soft blur-rise in, short fade out. */
export const tradePaneVariants: Variants = {
  initial: (reduce: boolean) =>
    reduce
      ? { opacity: 0 }
      : { opacity: 0, y: 10, scale: 0.985, filter: "blur(6px)" },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.38, ease: EASE_OUT },
  },
  exit: (reduce: boolean) =>
    reduce
      ? { opacity: 0, transition: { duration: 0.12 } }
      : {
          opacity: 0,
          y: -6,
          filter: "blur(4px)",
          transition: { duration: 0.15, ease: EASE_IN },
        },
};

export const tradeRevealVariants: Variants = {
  hidden: { opacity: 0, height: 0 },
  show: {
    opacity: 1,
    height: "auto",
    transition: { duration: 0.28, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.16, ease: EASE_IN },
  },
};

export const TRADE_INSTANT: Transition = { duration: 0 };

/** Tracks an element's rendered height so a wrapper can spring between panes. */
export function useMeasuredHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => setHeight(node.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, height] as const;
}
