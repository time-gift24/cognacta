"use client";

import { ArrowUpRight, Check, FileCheck2, ScanSearch } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/beui/motion/button";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { ShaderBackground } from "@/components/beui/motion/shader-background";
import { EASE_OUT, SPRING_PANEL } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type EvidenceMetric = {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
};

export type SocialProofEvidenceProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  secondaryDescription?: string;
  actionLabel?: string;
  actionHref?: string;
  metrics?: EvidenceMetric[];
  className?: string;
};

const DEFAULT_METRICS: EvidenceMetric[] = [
  { value: 99, suffix: "%", label: "claims matched to source evidence" },
  { value: 41, suffix: "%", label: "faster review-to-approval time" },
  { value: 3200, label: "verified decisions in the benchmark" },
];

export function SocialProofEvidence({
  eyebrow = "Independent benchmark 04",
  title = "Confidence should come with receipts.",
  description = "Every recommendation is tested against a known answer set, reviewed by domain experts, and linked back to the evidence that produced it.",
  secondaryDescription = "The result is a workflow your team can inspect before it reaches a customer, a board deck, or a production decision.",
  actionLabel = "Read the benchmark",
  actionHref = "#benchmark",
  metrics = DEFAULT_METRICS,
  className,
}: SocialProofEvidenceProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-20 text-foreground sm:px-8 sm:py-28",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-[0.86fr_1.14fr] lg:gap-20">
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-80px" }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.65, ease: EASE_OUT }
            }
          >
            <p className="font-mono text-muted-foreground text-xs uppercase tracking-[0.18em]">
              {eyebrow}
            </p>
            <h2 className="mt-5 max-w-xl text-balance leading-[1.04] tracking-[-0.04em] text-4xl font-medium">
              {title}
            </h2>
            <p className="mt-7 max-w-xl text-pretty text-muted-foreground leading-7">
              {description}
            </p>
            <p className="mt-4 max-w-xl text-pretty text-muted-foreground leading-7">
              {secondaryDescription}
            </p>
            <ButtonLink
              href={actionHref}
              tabIndex={0}
              variant="ghost"
              className="mt-6 -ml-3 underline underline-offset-4 rounded-full h-9"
            >
              {actionLabel}
              <ArrowUpRight aria-hidden className="size-4" />
            </ButtonLink>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 24 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.7, delay: 0.08, ease: EASE_OUT }
            }
            className="relative isolate min-h-[31rem] overflow-hidden rounded-2xl border border-border bg-background p-5 sm:p-9"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl"
            >
              <ShaderBackground
                variant="grain-gradient"
                colorBack="#f3e9dc"
                colors={["#f7d8bd", "#d9b8ea", "#a9d9d0", "#f0c6a8"]}
                softness={0.86}
                speed={0.12}
                className="absolute inset-0 size-full"
              />
              <div className="absolute inset-0 bg-background/20" />
            </div>

            <div className="relative z-10 flex items-center justify-between text-muted-foreground text-xs">
              <span className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.14em]">
                <ScanSearch aria-hidden className="size-4" /> Evidence trace
              </span>
              <span>Reviewed 2m ago</span>
            </div>

            <motion.div
              whileHover={reduceMotion ? undefined : { y: -4, rotate: -0.35 }}
              transition={SPRING_PANEL}
              className="relative z-10 mt-20 rounded-2xl border border-border bg-background/95 p-5 sm:p-7"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 font-medium text-sm">
                  <FileCheck2 aria-hidden className="size-4" /> Verified
                  conclusion
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-primary-foreground text-xs">
                  <Check aria-hidden className="size-3.5" /> 4 sources
                </span>
              </div>
              <div className="mt-5 rounded-xl border border-border p-4">
                <p className="font-medium leading-6">
                  Customer activation improved for every cohort after the new
                  onboarding flow shipped.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-muted-foreground text-xs">
                  <span className="rounded-lg border border-border bg-background px-2 py-1">
                    Experiment 07
                  </span>
                  <span className="rounded-lg border border-border bg-background px-2 py-1">
                    Cohort report
                  </span>
                  <span className="rounded-lg border border-border bg-background px-2 py-1">
                    Page 18
                  </span>
                </div>
              </div>
              <p className="mt-5 font-sans text-muted-foreground italic">
                Every claim stays attached to its source.
              </p>
            </motion.div>
          </motion.div>
        </div>

        <div className="mt-16 grid border-border border-t sm:grid-cols-3">
          {metrics.slice(0, 3).map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.5, delay: index * 0.08, ease: EASE_OUT }
              }
              className="border-border border-b py-8 sm:border-b-0 sm:px-8 sm:first:pl-0 sm:[&:not(:first-child)]:border-l"
            >
              <p className="font-medium text-4xl tabular-nums tracking-tight">
                <NumberTicker
                  value={metric.value}
                  prefix={metric.prefix}
                  suffix={metric.suffix}
                  blur
                />
              </p>
              <p className="mt-2 max-w-xs text-muted-foreground text-sm leading-5">
                {metric.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
