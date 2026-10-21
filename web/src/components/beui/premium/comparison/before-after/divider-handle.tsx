"use client";

import { ChevronsLeftRight } from "lucide-react";
import { type MotionValue, motion, useTransform } from "motion/react";
import type { KeyboardEvent } from "react";
import { cn } from "@/lib/beui/utils";

export function DividerHandle({
  position,
  value,
  label,
  beforeLabel,
  afterLabel,
  dragging,
  onKeyDown,
}: {
  position: MotionValue<number>;
  value: number;
  label: string;
  beforeLabel: string;
  afterLabel: string;
  dragging: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}) {
  // A full-width rail translated by percent of its own width keeps the line
  // on the compositor instead of animating `left`.
  const x = useTransform(position, (p) => `${p}%`);
  return (
    <motion.div style={{ x }} className="pointer-events-none absolute inset-0">
      <div className="absolute inset-y-0 left-0 w-px -translate-x-1/2 bg-background/90" />
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}% ${beforeLabel.toLowerCase()}, ${100 - value}% ${afterLabel.toLowerCase()}`}
        onKeyDown={onKeyDown}
        className={cn(
          "pointer-events-auto absolute top-1/2 left-0 flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-full border border-border bg-background text-foreground transition-transform duration-150 outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          dragging && "scale-110",
        )}
      >
        <ChevronsLeftRight className="size-4" aria-hidden="true" />
        {/* Invisible hit area so the 44px handle is easy to grab on touch. */}
        <span className="absolute -inset-2 rounded-full" aria-hidden="true" />
      </div>
    </motion.div>
  );
}
