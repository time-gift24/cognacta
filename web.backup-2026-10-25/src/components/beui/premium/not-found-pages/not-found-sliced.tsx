"use client";

import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";

const SLICES = [
  { id: "slice-1", top: 0, bottom: 86, offset: -1 },
  { id: "slice-2", top: 14, bottom: 72, offset: 1 },
  { id: "slice-3", top: 28, bottom: 58, offset: -1 },
  { id: "slice-4", top: 42, bottom: 44, offset: 1 },
  { id: "slice-5", top: 56, bottom: 30, offset: -1 },
  { id: "slice-6", top: 70, bottom: 16, offset: 1 },
  { id: "slice-7", top: 84, bottom: 0, offset: -1 },
] as const;

export type NotFoundSlicedProps = {
  homeHref?: string;
  className?: string;
};

export function NotFoundSliced({
  homeHref = "/",
  className,
}: NotFoundSlicedProps) {
  const reduce = useReducedMotion() ?? false;
  const canHover = useHoverCapable();
  const [split, setSplit] = useState(false);
  const active = canHover && split && !reduce;

  return (
    <section
      className={cn(
        "flex min-h-[680px] w-full flex-col overflow-hidden bg-secondary text-secondary-foreground [container-type:inline-size]",
        className,
      )}
    >
      <header className="flex min-h-20 items-center justify-between px-5 sm:px-8">
        <a
          href={homeHref}
          className="font-medium text-sm focus-visible:outline-2 focus-visible:outline-ring"
        >
          Home
        </a>
        <span className="font-mono text-xs uppercase tracking-[0.18em] opacity-60">
          Page missing
        </span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center">
        <Button
          variant="plain"
          type="button"
          aria-label="404. Hover to split the number."
          onMouseEnter={() => setSplit(true)}
          onMouseLeave={() => setSplit(false)}
          onFocus={() => setSplit(true)}
          onBlur={() => setSplit(false)}
          className="relative h-[34cqw] max-h-[350px] min-h-40 w-full cursor-default overflow-hidden"
        >
          {SLICES.map((slice, index) => {
            const distance = (18 + index * 4) * slice.offset;
            return (
              <motion.span
                key={slice.id}
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 flex items-center justify-center font-semibold text-9xl leading-tight tracking-[-0.1em]",
                  index === 2 || index === 5
                    ? "text-muted-foreground"
                    : "text-foreground",
                )}
                style={{
                  clipPath: `inset(${slice.top}% 0 ${slice.bottom}% 0)`,
                }}
                animate={
                  active
                    ? {
                        transform: [
                          "translate3d(0,0,0)",
                          `translate3d(${distance}px,0,0)`,
                          `translate3d(${-distance * 0.55}px,0,0)`,
                          "translate3d(0,0,0)",
                        ],
                      }
                    : { transform: "translate3d(0,0,0)" }
                }
                transition={
                  active
                    ? {
                        duration: 1.5,
                        delay: index * 0.035,
                        ease: [0.77, 0, 0.18, 1],
                        repeat: Number.POSITIVE_INFINITY,
                        repeatDelay: 0.15,
                      }
                    : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }
                }
              >
                404
              </motion.span>
            );
          })}
        </Button>

        <h1 className="mt-2 tracking-[-0.03em] text-4xl md:text-5xl font-medium">
          Lost the thread.
        </h1>
        <ButtonLink
          href={homeHref}
          size="lg"
          className="mt-5 bg-primary text-primary-foreground hover:bg-primary/85 rounded-full h-9"
        >
          Start again
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </ButtonLink>
      </div>

      <p className="px-5 pb-6 text-center font-mono text-xs uppercase tracking-[0.16em] opacity-55 sm:px-8">
        Hover the number
      </p>
    </section>
  );
}
