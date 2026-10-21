"use client";

import { useEffect, useRef, useState } from "react";
import type { ButtonState } from "@/components/beui/motion/button";

/**
 * Drives a StatefulButton through loading → success → idle. The action may
 * return a promise; a rejection shows the error state before resetting.
 */
export function useTradeSubmit(resetAfter = 1600) {
  const [state, setState] = useState<ButtonState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const run = async (action: () => unknown, onSuccess?: () => void) => {
    if (state === "loading") return;
    clearTimeout(timer.current);
    setState("loading");
    try {
      await action();
      setState("success");
      onSuccess?.();
    } catch {
      setState("error");
    }
    timer.current = setTimeout(() => setState("idle"), resetAfter);
  };

  return [state, run] as const;
}

/** Simulated confirmation delay for demo mode. */
export const demoConfirm = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 1100));
