"use client";

import { CircleAlert } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { EASE_OUT, SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type { TeamInviteLabels } from "./team-invite-data";
import { EXIT_TRANSITION } from "./team-invite-motion";

export type SeatMeterProps = {
  /** Seats taken by members and pending invites. */
  used: number;
  /** Valid addresses in the current batch. */
  batch: number;
  limit: number;
  labels: Pick<
    TeamInviteLabels,
    "seatsOf" | "seatsSummary" | "seatsOver" | "seatsLeft"
  >;
  className?: string;
};

type SeatState = "used" | "batch" | "over" | "free";

/**
 * One pill per seat. Taken seats are solid, the current batch fills the next
 * pills in teal, and the batch turns amber once it passes the limit. The
 * count rolls with DigitSwap as chips are added and removed.
 */
export function SeatMeter({
  used,
  batch,
  limit,
  labels,
  className,
}: SeatMeterProps) {
  const reduce = useReducedMotion();
  const total = used + batch;
  const over = Math.max(0, total - limit);
  const left = Math.max(0, limit - total);
  const seats: SeatState[] = Array.from({ length: limit }, (_, index) =>
    index < used
      ? "used"
      : index < total
        ? over > 0
          ? "over"
          : "batch"
        : "free",
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <p className="flex items-center gap-1 text-foreground">
          <DigitSwap
            value={total}
            direction={batch > 0 ? "up" : "down"}
            className={cn(
              "font-medium font-mono tabular-nums",
              over > 0 && "text-amber-700 dark:text-amber-300",
            )}
          />
          <span className="text-muted-foreground">{labels.seatsOf(limit)}</span>
        </p>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={over > 0 ? "over" : "left"}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: EXIT_TRANSITION }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className={cn(
              "flex items-center gap-1 text-xs",
              over > 0
                ? "text-amber-700 dark:text-amber-300"
                : "text-muted-foreground",
            )}
          >
            {over > 0 ? (
              <>
                <CircleAlert aria-hidden className="size-3.5" />
                {labels.seatsOver(over)}
              </>
            ) : (
              labels.seatsLeft(left)
            )}
          </motion.p>
        </AnimatePresence>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: a native <meter> cannot render one animated pill per seat. */}
      <div
        role="meter"
        aria-label={labels.seatsSummary(Math.min(total, limit), limit)}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(total, limit)}
        className="flex h-2 gap-1"
      >
        {seats.map((state, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: each pill is a fixed seat slot.
            key={index}
            className="relative flex-1 overflow-hidden rounded-full bg-muted"
          >
            <motion.span
              aria-hidden
              initial={false}
              animate={{
                scaleX: state === "free" ? 0 : 1,
                opacity: state === "free" ? 0 : 1,
              }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { ...SPRING_SWAP, delay: Math.max(0, index - used) * 0.03 }
              }
              className={cn(
                "absolute inset-0 origin-left rounded-full transition-colors duration-200",
                state === "used" && "bg-foreground",
                state === "batch" && "bg-teal-500",
                state === "over" && "bg-amber-500",
              )}
            />
          </span>
        ))}
      </div>
      <span className="sr-only" aria-live="polite">
        {labels.seatsSummary(total, limit)}
        {over > 0 ? `. ${labels.seatsOver(over)}` : ""}
      </span>
    </div>
  );
}
