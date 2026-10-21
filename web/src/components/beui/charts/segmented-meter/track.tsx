"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Button } from "@/components/beui/motion/button";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { useSegmentedMeter } from "./context";

/* Segments grow from the left 80ms apart on mount and spring to new widths
 * when values change. Inactive segments fade while one is focused. */
export type SegmentedMeterTrackProps = {
  /** Overlays positioned against the track, such as the tooltip. */
  children?: ReactNode;
  className?: string;
};

export function SegmentedMeterTrack({
  children,
  className,
}: SegmentedMeterTrackProps) {
  const {
    placed,
    remainder,
    focus,
    setActive,
    onSelect,
    selectedId,
    formatValue,
    reduce,
    canHover,
  } = useSegmentedMeter();

  return (
    <div className={cn("relative", className)}>
      {children}
      <div className="flex h-2.5 w-full gap-1">
        {placed.map((segment, index) => (
          <Button
            key={segment.id}
            type="button"
            variant="plain"
            aria-label={`${segment.label}: ${formatValue(segment.value)}`}
            aria-pressed={onSelect ? selectedId === segment.id : undefined}
            onClick={onSelect ? () => onSelect(segment.id) : undefined}
            onPointerEnter={canHover ? () => setActive(segment.id) : undefined}
            onPointerLeave={canHover ? () => setActive(null) : undefined}
            onFocus={() => setActive(segment.id)}
            onBlur={() => setActive(null)}
            initial={reduce ? false : { scaleX: 0 }}
            animate={{
              scaleX: 1,
              flexGrow: segment.width,
              opacity: focus !== null && focus !== segment.id ? 0.35 : 1,
            }}
            transition={
              reduce
                ? { duration: 0 }
                : {
                    scaleX: {
                      duration: 0.7,
                      ease: EASE_OUT,
                      delay: 0.35 + index * 0.08,
                    },
                    flexGrow: SPRING_LAYOUT,
                    opacity: { duration: 0.2 },
                  }
            }
            whileHover={undefined}
            whileTap={undefined}
            style={{ flexBasis: 0, originX: 0 }}
            className="relative h-full min-w-0 after:absolute after:-inset-y-3 after:inset-x-0 after:content-['']"
          >
            <span
              className={cn("absolute inset-0 rounded-full", segment.color)}
            />
          </Button>
        ))}
        <motion.span
          aria-hidden="true"
          animate={{ flexGrow: remainder }}
          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
          style={{ flexBasis: 0 }}
          className="h-full rounded-full bg-muted"
        />
      </div>
    </div>
  );
}
