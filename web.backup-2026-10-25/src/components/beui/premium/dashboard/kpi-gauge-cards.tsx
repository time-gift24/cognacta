"use client";

import { EllipsisVertical } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
  AnimatedDropdownTrigger,
} from "@/components/beui/premium/animated-dropdown";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { formatReportValue, type ReportValueFormat } from "./format";

export type KpiGaugeAction = {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
};

export type KpiGaugeMetric = {
  id: string;
  label: string;
  value: number;
  format?: ReportValueFormat;
  unit?: string;
  note?: string;
  /** A percentage, from 0 to 100, with its own accessible description. */
  gauge: {
    value: number;
    label: string;
    tone?: "primary" | "accent" | "success" | "neutral";
  };
  actions?: readonly KpiGaugeAction[];
};

export type KpiGaugeCardsProps = {
  metrics: readonly KpiGaugeMetric[];
  title?: string;
  description?: string;
  className?: string;
  /** Four compact cards for full dashboard layouts. */
  compact?: boolean;
};

const CIRCUMFERENCE = 2 * Math.PI * 36;
const GAUGE_TONES = {
  primary: "text-primary",
  accent: "text-accent",
  success: "text-success-foreground",
  neutral: "text-foreground",
} as const;

/** Compact metric cards pairing a headline value with an independent gauge. */
export function KpiGaugeCards({
  metrics,
  title,
  description,
  className,
  compact = false,
}: KpiGaugeCardsProps) {
  const heading = useId();
  const reduce = useReducedMotion();

  return (
    <section
      aria-labelledby={title ? heading : undefined}
      aria-label={title ? undefined : "Key performance indicators"}
      className={cn("@container w-full min-w-0", className)}
    >
      {title && (
        <header className="mb-5">
          <h2 id={heading} className="text-4xl font-medium tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          )}
        </header>
      )}
      {metrics.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          No metrics to display.
        </p>
      ) : (
        <dl
          className={cn(
            "grid gap-4 @lg:grid-cols-2",
            compact ? "@5xl:grid-cols-4" : "@5xl:grid-cols-3",
          )}
        >
          {metrics.map((metric) => {
            const percentage = Number.isFinite(metric.gauge.value)
              ? Math.min(100, Math.max(0, metric.gauge.value))
              : 0;
            const gaugeText = `${Math.round(percentage)}%`;

            return (
              <div
                key={metric.id}
                className="min-w-0 rounded-2xl border border-border bg-background p-5"
              >
                <div className="flex min-h-9 items-center justify-between gap-3">
                  <dt
                    className={cn(
                      "font-medium",
                      compact ? "text-sm text-muted-foreground" : "text-xl",
                    )}
                  >
                    {metric.label}
                  </dt>
                  {metric.actions && metric.actions.length > 0 && (
                    <AnimatedDropdown>
                      <AnimatedDropdownTrigger
                        aria-label={`Actions for ${metric.label}`}
                        className="-mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <EllipsisVertical aria-hidden className="size-4" />
                      </AnimatedDropdownTrigger>
                      <AnimatedDropdownContent align="end" className="min-w-44">
                        {metric.actions.map((action) => (
                          <AnimatedDropdownItem
                            key={action.id}
                            disabled={action.disabled}
                            onSelect={action.onSelect}
                          >
                            {action.label}
                          </AnimatedDropdownItem>
                        ))}
                      </AnimatedDropdownContent>
                    </AnimatedDropdown>
                  )}
                </div>
                <dd
                  className={cn(
                    "mt-4 flex justify-between gap-4",
                    compact ? "items-start" : "items-end",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <NumberTicker
                        value={metric.value}
                        format={() =>
                          formatReportValue(metric.value, metric.format)
                        }
                        duration={0.6}
                        stagger={0.02}
                        className={cn(
                          "whitespace-nowrap font-medium tabular-nums tracking-tight",
                          compact ? "text-3xl" : "text-4xl",
                        )}
                      />
                      {metric.unit && (
                        <span
                          className={cn(
                            "text-muted-foreground",
                            compact ? "text-sm" : "text-base",
                          )}
                        >
                          {metric.unit}
                        </span>
                      )}
                    </div>
                    {metric.note && (
                      <p
                        className={cn(
                          "mt-2 text-muted-foreground",
                          compact ? "text-xs" : "text-sm",
                        )}
                      >
                        {metric.note}
                      </p>
                    )}
                  </div>
                  <div
                    className={cn(
                      "relative grid shrink-0 place-items-center",
                      compact ? "size-12" : "size-16",
                      GAUGE_TONES[metric.gauge.tone ?? "primary"],
                    )}
                  >
                    <meter
                      aria-label={metric.gauge.label}
                      min={0}
                      max={100}
                      value={percentage}
                      className="sr-only"
                    >
                      {gaugeText}
                    </meter>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 80 80"
                      className="absolute inset-0 size-full -rotate-90"
                    >
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-10"
                      />
                      <motion.circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        initial={
                          reduce
                            ? false
                            : { strokeDashoffset: CIRCUMFERENCE, opacity: 0 }
                        }
                        animate={{
                          strokeDashoffset:
                            CIRCUMFERENCE * (1 - percentage / 100),
                          opacity: percentage === 0 ? 0 : 1,
                        }}
                        transition={{
                          duration: reduce ? 0 : 0.7,
                          ease: EASE_OUT,
                        }}
                      />
                    </svg>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid place-items-center rounded-full bg-current/5",
                        compact ? "size-9" : "size-12",
                      )}
                    >
                      <NumberTicker
                        value={Math.round(percentage)}
                        suffix="%"
                        duration={0.6}
                        stagger={0.02}
                        className={cn(
                          "whitespace-nowrap font-medium tabular-nums text-foreground",
                          compact ? "text-xs" : "text-sm",
                        )}
                      />
                    </span>
                  </div>
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}
