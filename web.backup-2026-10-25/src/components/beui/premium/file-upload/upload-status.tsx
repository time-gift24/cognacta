"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { EASE_OUT } from "@/lib/beui/ease";
import type { FileUploadLabels, UploadItem } from "./file-upload-data";
import { SWAP_VARIANTS } from "./file-upload-motion";

/** Emerald check whose circle pops and tick draws in once. */
function DoneCheck({ label }: { label: string }) {
  const reduce = useReducedMotion();
  return (
    <span className="flex items-center gap-1.5 text-emerald-700 text-xs dark:text-emerald-300">
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
        <motion.circle
          cx="10"
          cy="10"
          r="9"
          className="fill-emerald-500/15"
          initial={reduce ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
          style={{ transformOrigin: "50% 50%" }}
        />
        <motion.path
          d="M6 10.4l2.6 2.6L14 7.5"
          className="fill-none stroke-emerald-600 dark:stroke-emerald-400"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, delay: 0.12, ease: EASE_OUT }}
        />
      </svg>
      <span className="sr-only sm:not-sr-only">{label}</span>
    </span>
  );
}

/**
 * Right-hand status: a rolling percentage while uploading, then a swap to
 * the paused, failed, or drawn-in done state.
 */
export function UploadStatusSlot({
  item,
  labels,
}: {
  item: UploadItem;
  labels: FileUploadLabels;
}) {
  const reduce = useReducedMotion();
  const percent = Math.round(item.progress * 100);
  const swap = {
    variants: reduce ? undefined : SWAP_VARIANTS,
    initial: reduce ? false : ("enter" as const),
    animate: "show",
    exit: reduce ? { opacity: 0 } : "exit",
  };

  let content: React.ReactNode;
  switch (item.status) {
    case "uploading":
      content = (
        <NumberTicker
          value={percent}
          suffix="%"
          duration={0.45}
          startOnView={false}
          animateOnMount={false}
          className="font-mono text-foreground text-xs"
        />
      );
      break;
    case "queued":
      content = (
        <span className="text-muted-foreground text-xs">{labels.queued}</span>
      );
      break;
    case "paused":
      content = (
        <span className="font-mono text-muted-foreground text-xs tabular-nums">
          {labels.paused} · {percent}%
        </span>
      );
      break;
    case "failed":
      content = (
        <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-rose-700 text-xs dark:text-rose-300">
          {labels.failed}
        </span>
      );
      break;
    case "done":
      content = <DoneCheck label={labels.done} />;
      break;
  }

  return (
    <span className="relative flex h-6 shrink-0 items-center justify-end">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={item.status} {...swap} className="flex items-center">
          {content}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
