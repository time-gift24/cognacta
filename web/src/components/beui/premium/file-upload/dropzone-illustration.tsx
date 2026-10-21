"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { SPRING_BOUNCE, SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { FLOAT_TRANSITION } from "./file-upload-motion";
import type { DropzoneState } from "./use-dropzone";

type Mode = DropzoneState["kind"];

const SHEET_STYLE = {
  transformBox: "fill-box",
  transformOrigin: "50% 100%",
} as const;

const POSES: Record<
  Mode,
  Record<"left" | "right" | "front", Record<string, number>>
> = {
  idle: {
    left: { rotate: -7, x: -7, y: 2 },
    right: { rotate: 7, x: 7, y: 2 },
    front: { rotate: 0, x: 0, y: 0, scale: 1 },
  },
  over: {
    left: { rotate: -20, x: -24, y: -2 },
    right: { rotate: 20, x: 24, y: -2 },
    front: { rotate: 0, x: 0, y: -8, scale: 1.05 },
  },
  invalid: {
    left: { rotate: -3, x: -3, y: 3 },
    right: { rotate: 3, x: 3, y: 3 },
    front: { rotate: -4, x: 0, y: 2, scale: 0.98 },
  },
};

function Sheet({ className }: { className: string }) {
  return (
    <>
      <path
        d="M8 0h28l16 16v42a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6V6a6 6 0 0 1 6-6Z"
        className={cn("fill-background transition-colors", className)}
        strokeWidth="1.5"
      />
      <path
        d="M36 0v10a6 6 0 0 0 6 6h10"
        className={cn("fill-none transition-colors", className)}
        strokeWidth="1.5"
      />
    </>
  );
}

/**
 * Stacked documents. Idle: the stack floats (only while visible). Drag-over:
 * the back sheets fan out and the front sheet lifts. Invalid: the stack
 * tightens and tints amber. Reduced motion: poses snap, no float.
 */
export function DropzoneIllustration({ mode }: { mode: Mode }) {
  const reduce = useReducedMotion();
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const pose = POSES[mode];
  const transition = reduce
    ? { duration: 0 }
    : mode === "over"
      ? SPRING_BOUNCE
      : SPRING_SWAP;
  const stroke =
    mode === "invalid"
      ? "stroke-amber-500"
      : mode === "over"
        ? "stroke-foreground/50"
        : "stroke-border";
  const detail =
    mode === "invalid" ? "stroke-amber-500/60" : "stroke-muted-foreground/40";
  const floating = !reduce && mode === "idle" && inView;

  return (
    <motion.svg
      ref={ref}
      viewBox="-14 -14 116 96"
      className="h-24 w-28 overflow-visible"
      aria-hidden="true"
      animate={floating ? { y: [-3, 3] } : { y: 0 }}
      transition={floating ? FLOAT_TRANSITION : { duration: 0.3 }}
    >
      <motion.g
        style={SHEET_STYLE}
        initial={false}
        animate={pose.left}
        transition={transition}
      >
        <g transform="translate(10 6)">
          <Sheet className={stroke} />
          <circle cx="17" cy="30" r="4" className={cn("fill-none", detail)} />
          <path
            d="M10 50l10-10 7 7 6-5 9 8"
            className={cn("fill-none", detail)}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </motion.g>
      <motion.g
        style={SHEET_STYLE}
        initial={false}
        animate={pose.right}
        transition={transition}
      >
        <g transform="translate(26 6)">
          <Sheet className={stroke} />
          <path
            d="M10 28h32M10 38h32M10 48h32M24 22v32"
            className={cn("fill-none", detail)}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      </motion.g>
      <motion.g
        style={SHEET_STYLE}
        initial={false}
        animate={pose.front}
        transition={transition}
      >
        <g transform="translate(18 10)">
          <Sheet className={stroke} />
          <path
            d="M10 24h20M10 32h30M10 40h24"
            className={cn("fill-none", detail)}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle
            cx="27"
            cy="53"
            r="7"
            className={cn(
              "transition-colors",
              mode === "invalid"
                ? "fill-amber-500/15"
                : mode === "over"
                  ? "fill-foreground"
                  : "fill-muted",
            )}
          />
          <path
            d={
              mode === "invalid"
                ? "M24 50l6 6M30 50l-6 6"
                : "M27 57v-7M24 52.5l3-3 3 3"
            }
            className={cn(
              "fill-none transition-colors",
              mode === "invalid"
                ? "stroke-amber-600 dark:stroke-amber-400"
                : mode === "over"
                  ? "stroke-background"
                  : "stroke-muted-foreground",
            )}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </motion.g>
    </motion.svg>
  );
}
