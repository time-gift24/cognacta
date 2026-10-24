"use client";

import { type MotionValue, motion } from "motion/react";
import { useBlendedValue } from "./use-morph-value";

function Bar({
  afterShare,
  before,
  after,
}: {
  afterShare: MotionValue<number>;
  before: number;
  after: number;
}) {
  const scaleY = useBlendedValue(afterShare, before, after);
  return (
    <motion.span
      style={{ scaleY }}
      className="h-full flex-1 origin-bottom rounded-full bg-foreground/70"
    />
  );
}

/**
 * Tonal histogram whose buckets blend between the before and after curves as
 * the divider moves, and morph to the new curves when the scene changes.
 */
export function Histogram({
  afterShare,
  before,
  after,
  title,
  shadows,
  highlights,
}: {
  afterShare: MotionValue<number>;
  before: readonly number[];
  after: readonly number[];
  title: string;
  shadows: string;
  highlights: string;
}) {
  const buckets = Math.max(before.length, after.length);
  return (
    <figure className="space-y-3">
      <figcaption className="text-sm font-medium">{title}</figcaption>
      <div
        aria-hidden="true"
        className="flex h-20 items-end gap-0.5 rounded-2xl border border-border px-3 pt-3"
      >
        {Array.from({ length: buckets }, (_, index) => (
          <Bar
            // biome-ignore lint/suspicious/noArrayIndexKey: Buckets are positional tonal ranges.
            key={index}
            afterShare={afterShare}
            before={before[index] ?? 0}
            after={after[index] ?? 0}
          />
        ))}
      </div>
      <div className="flex justify-between font-mono text-xs text-muted-foreground">
        <span>{shadows}</span>
        <span>{highlights}</span>
      </div>
    </figure>
  );
}
