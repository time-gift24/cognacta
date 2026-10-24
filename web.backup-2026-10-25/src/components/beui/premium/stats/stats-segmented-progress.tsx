"use client";

import { CheckCheck, Sparkles, Zap } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useId, useRef } from "react";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type SegmentedProgressStat = {
  label: string;
  value: number;
  description: string;
  accent?: "primary" | "violet" | "rose" | "teal";
};

export type StatsSegmentedProgressProps = {
  title?: string;
  description?: string;
  stats?: SegmentedProgressStat[];
  tone?: "primary" | "monochrome" | "varied";
  className?: string;
};

const DEFAULT_STATS: SegmentedProgressStat[] = [
  {
    label: "Resolution",
    accent: "violet",
    value: 92,
    description: "Everyday questions answered, without another handoff.",
  },
  {
    label: "Response time",
    accent: "rose",
    value: 38,
    description: "Less time waiting. More time moving things forward.",
  },
  {
    label: "Team capacity",
    accent: "teal",
    value: 24,
    description: "Fewer repetitive tasks. More room for the work that matters.",
  },
];
const ACCENTS = {
  primary: { color: "text-primary", icon: Zap },
  violet: {
    color: "text-violet-300 dark:text-violet-300",
    icon: CheckCheck,
  },
  rose: {
    color: "text-rose-300 dark:text-rose-300",
    icon: Zap,
  },
  teal: {
    color: "text-teal-300 dark:text-teal-300",
    icon: Sparkles,
  },
};
const SEGMENTS = Array.from({ length: 40 }, (_, index) => index);

export function SegmentedProgressCard({
  label,
  value,
  description,
  accent = "primary",
  tone = "varied",
  className,
}: SegmentedProgressStat & {
  tone?: "primary" | "monochrome" | "varied";
  className?: string;
}) {
  const treatment = ACCENTS[tone === "primary" ? "primary" : accent];
  const color = tone === "monochrome" ? "text-foreground" : treatment.color;
  const Icon = treatment.icon;
  const ref = useRef<HTMLElement>(null);
  const labelId = useId();
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduceMotion = useReducedMotion();
  const percentage = Math.round(
    Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)),
  );
  const revealed = Boolean(reduceMotion || inView);

  return (
    <article
      ref={ref}
      aria-labelledby={labelId}
      className={cn(
        "flex min-w-0 flex-col rounded-3xl border border-border bg-background p-6 sm:p-7",
        className,
      )}
    >
      <div className="flex flex-col items-start gap-4">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground",
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <h3 id={labelId} className="text-xl font-medium tracking-tight">
          {label}
        </h3>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <div className="mt-10 sm:mt-14">
        <p className="mb-6 flex text-5xl font-medium leading-none tracking-tight tabular-nums sm:text-6xl">
          <NumberTicker
            value={revealed ? percentage : 0}
            suffix="%"
            startOnView={false}
            animateOnMount={false}
            duration={1.15}
          />
        </p>

        <div
          aria-hidden
          className="mb-4 flex justify-between text-xs tabular-nums text-muted-foreground"
        >
          <span>0%</span>
          <span>100%</span>
        </div>
        <div aria-hidden className="relative">
          <div className="flex h-12 gap-0.5 sm:h-14">
            {SEGMENTS.map((index) => {
              const fill = Math.max(
                0,
                Math.min(1, (percentage / 100) * SEGMENTS.length - index),
              );
              return (
                <span
                  key={index}
                  className="relative h-full min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
                >
                  <motion.span
                    className={cn(
                      "absolute inset-0 origin-bottom rounded-full bg-current",
                      color,
                    )}
                    initial={false}
                    animate={{
                      opacity: revealed && fill > 0 ? 1 : 0,
                      scaleY: revealed ? 1 : 0.6,
                    }}
                    style={{ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.22,
                      delay: reduceMotion || !revealed ? 0 : index * 0.024,
                      ease: EASE_OUT,
                    }}
                  />
                </span>
              );
            })}
          </div>
          <motion.div
            className="pointer-events-none absolute inset-x-0 -top-3"
            initial={false}
            animate={{
              x: revealed ? `${percentage}%` : "0%",
              opacity: revealed ? 1 : 0,
            }}
            transition={{ duration: reduceMotion ? 0 : 1.15, ease: EASE_OUT }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 10 6"
              className={cn("h-1.5 w-2.5 -translate-x-1/2 fill-current", color)}
            >
              <path d="M0 0h10L5 6Z" />
            </svg>
          </motion.div>
        </div>
      </div>
    </article>
  );
}

export function StatsSegmentedProgress({
  title = "Less busywork. More progress.",
  description = "Small improvements add up to a better day for your team.",
  stats = DEFAULT_STATS,
  tone = "varied",
  className,
}: StatsSegmentedProgressProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={cn(
        "w-full bg-background px-4 py-16 text-foreground sm:px-8 sm:py-24",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        {(title || description) && (
          <header className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
            {title && (
              <h2
                id={titleId}
                className="text-balance text-4xl font-medium tracking-tight"
              >
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-4 text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
                {description}
              </p>
            )}
          </header>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <SegmentedProgressCard key={stat.label} {...stat} tone={tone} />
          ))}
        </div>
      </div>
    </section>
  );
}
