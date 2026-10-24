"use client";

import { type MotionValue, motion, useTransform } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import { EASE_OUT_CSS } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type StepRowProps = {
  index: number;
  count: number;
  title: string;
  description: string;
  active: boolean;
  progress: MotionValue<number>;
  onSelect: () => void;
};

/** Desktop step: number, title, expanding description, and scroll fill. */
export function StepRow({
  index,
  count,
  title,
  description,
  active,
  progress,
  onSelect,
}: StepRowProps) {
  const fill = useTransform(progress, (value) =>
    Math.min(1, Math.max(0, value * count - index)),
  );

  return (
    <li className="rounded-2xl has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground">
      <Button
        variant="plain"
        type="button"
        aria-current={active ? "step" : undefined}
        onClick={onSelect}
        className="block w-full py-4 text-left focus-visible:ring-0 focus-visible:ring-offset-0"
      >
        <span className="flex items-baseline gap-4">
          <span className="w-6 shrink-0 font-mono text-muted-foreground text-xs tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span
            className={cn(
              "font-medium text-xl transition-colors duration-300",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {title}
          </span>
        </span>
        <span
          style={{ transitionTimingFunction: EASE_OUT_CSS }}
          className={cn(
            "grid pl-10 transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none",
            active
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0",
          )}
        >
          <span className="min-h-0 overflow-hidden">
            <span className="block pt-2 text-muted-foreground text-sm leading-6">
              {description}
            </span>
          </span>
        </span>
        <span className="mt-4 ml-10 block h-px overflow-hidden rounded-full bg-border">
          <motion.span
            style={{ scaleX: fill }}
            className="block h-full origin-left bg-foreground"
          />
        </span>
      </Button>
    </li>
  );
}
