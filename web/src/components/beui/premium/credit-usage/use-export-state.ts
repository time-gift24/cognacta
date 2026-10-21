"use client";

import { useEffect, useState } from "react";
import type { ButtonState } from "@/components/beui/motion/button";

/**
 * Drives a StatefulButton through loading, success, and error. Without a
 * handler it simulates a short export so previews still respond.
 */
export function useExportState(onExport?: () => void | Promise<void>) {
  const [state, setState] = useState<ButtonState>("idle");

  useEffect(() => {
    if (state !== "success" && state !== "error") return;
    const timer = setTimeout(() => setState("idle"), 1400);
    return () => clearTimeout(timer);
  }, [state]);

  const run = async () => {
    if (state !== "idle") return;
    setState("loading");
    try {
      await (onExport
        ? onExport()
        : new Promise((resolve) => setTimeout(resolve, 900)));
      setState("success");
    } catch {
      setState("error");
    }
  };

  return { state, run };
}
