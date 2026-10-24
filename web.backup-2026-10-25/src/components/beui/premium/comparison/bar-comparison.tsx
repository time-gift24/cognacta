"use client";

import { ArrowLeftRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { Select } from "@/components/beui/premium/select/select";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type BarComparisonProduct = { id: string; name: string };
export type BarComparisonMetric = {
  id: string;
  name: string;
  description: string;
  /** Percentage scores between 0 and 100. */
  values: Record<string, number>;
};
export type BarComparisonProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  product?: BarComparisonProduct;
  alternatives?: readonly BarComparisonProduct[];
  metrics?: readonly BarComparisonMetric[];
  footnote?: string;
  className?: string;
};
const PRODUCT = { id: "forma", name: "Forma" };
const ALTERNATIVES = [
  { id: "layer", name: "Layer" },
  { id: "orbit", name: "Orbit" },
];
const METRICS: BarComparisonMetric[] = [
  {
    id: "reasoning",
    name: "Visual reasoning",
    description: "Complex pattern recognition",
    values: { forma: 45.1, layer: 31.1, orbit: 23.8 },
  },
  {
    id: "coding",
    name: "Code repair",
    description: "Issues resolved successfully",
    values: { forma: 39.6, layer: 16.8, orbit: 24.2 },
  },
  {
    id: "security",
    name: "Security fixes",
    description: "Vulnerabilities resolved",
    values: { forma: 74.4, layer: 22.3, orbit: 38.5 },
  },
];
const scoreFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});
function validScore(value: number | undefined): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

export function BarComparison({
  eyebrow = "Performance, compared",
  title = "A clearer view of what’s possible.",
  description = "Compare success rates across reasoning, code, and security. Same tasks. Same scale.",
  product = PRODUCT,
  alternatives = ALTERNATIVES,
  metrics = METRICS,
  footnote = "Illustrative scores for fictional products, not measured benchmarks. Replace with verified results and your evaluation methodology.",
  className,
}: BarComparisonProps) {
  const [alternativeId, setAlternativeId] = useState(alternatives[0]?.id ?? "");
  const alternative =
    alternatives.find((entry) => entry.id === alternativeId) ?? alternatives[0];
  const reduce = useReducedMotion();
  const id = useId();
  if (!alternative) return null;
  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-20 text-foreground sm:px-8 sm:py-24",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
          <h2
            id={id}
            className="mt-4 text-balance text-4xl font-medium tracking-tight"
          >
            {title}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-5">
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-3 rounded-full bg-accent/70"
              />
              {product.name}
            </span>
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <span
                aria-hidden="true"
                className="size-3 rounded-full bg-foreground/20"
              />
              {alternative.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Compare with</span>
            <Select
              label="Compare with"
              options={alternatives.map((entry) => ({
                id: entry.id,
                label: entry.name,
              }))}
              value={alternative.id}
              onValueChange={setAlternativeId}
              portal
              buttonClassName="h-10 min-w-28 justify-between gap-4 rounded-full border-transparent bg-muted/60 px-4 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              optionsClassName="shadow-none"
            />
          </div>
        </div>
        <section
          aria-labelledby={id}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Allows keyboard users to scroll the full chart horizontally.
          tabIndex={0}
          className="mt-8 overflow-x-auto rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div
            className="relative pb-2 pl-10 pt-16"
            style={{ minWidth: Math.max(480, metrics.length * 240 + 40) }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 right-0 top-16 h-80"
            >
              {[100, 75, 50, 25, 0].map((tick) => (
                <div
                  key={tick}
                  className="absolute left-0 right-0 flex items-center"
                  style={{ bottom: `${tick}%` }}
                >
                  <span className="absolute left-0 w-8 -translate-y-1/2 text-right text-xs tabular-nums text-muted-foreground">
                    {tick}
                  </span>
                  <span
                    className={cn(
                      "ml-10 w-full border-t",
                      tick === 0
                        ? "border-border"
                        : "border-dashed border-border/50",
                    )}
                  />
                </div>
              ))}
            </div>
            <div
              className="relative grid gap-10 px-5 sm:gap-14"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, metrics.length)}, minmax(0, 1fr))`,
              }}
            >
              {metrics.map((metric, index) => {
                const ours = metric.values[product.id];
                const theirs = metric.values[alternative.id];
                const showRatio =
                  validScore(ours) &&
                  validScore(theirs) &&
                  theirs > 0 &&
                  ours > theirs;
                const ratio = showRatio ? ours / theirs : 0;
                return (
                  <figure key={metric.id} className="min-w-0">
                    <div className="relative h-80">
                      {showRatio && (
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute left-1/2 right-0 border-r border-t border-dashed border-foreground/25"
                          style={{
                            bottom: `${theirs}%`,
                            height: `${ours - theirs}%`,
                          }}
                        >
                          <span className="absolute bottom-full right-0 mb-2 bg-background/90 px-1.5 py-1 text-center text-xs text-muted-foreground">
                            <span className="block text-xl font-medium tabular-nums text-foreground">
                              {ratio < 1.05 ? "<1.1" : ratio.toFixed(1)}×
                            </span>
                            the score
                          </span>
                        </div>
                      )}
                      {[product, alternative].map((entry, productIndex) => {
                        const score = metric.values[entry.id];
                        const available = validScore(score);
                        return (
                          <div
                            key={entry.id}
                            className={cn(
                              "absolute bottom-0 w-[45%]",
                              productIndex === 0 ? "left-0" : "right-0",
                            )}
                            style={{ height: `${available ? score : 0}%` }}
                          >
                            <span className="absolute bottom-full left-0 right-0 mb-2 text-center text-xl font-medium tabular-nums">
                              {available ? (
                                <>
                                  {scoreFormat.format(score)}
                                  <span className="text-sm">%</span>
                                </>
                              ) : (
                                <span className="text-xs">No data</span>
                              )}
                            </span>
                            <motion.div
                              initial={{ scaleY: reduce ? 1 : 0 }}
                              whileInView={{ scaleY: 1 }}
                              viewport={{ once: true }}
                              transition={{
                                duration: reduce ? 0 : 0.6,
                                delay: reduce
                                  ? 0
                                  : index * 0.06 + productIndex * 0.05,
                                ease: EASE_OUT,
                              }}
                              className={cn(
                                "absolute inset-0 origin-bottom rounded-t-xl",
                                productIndex === 0
                                  ? "bg-gradient-to-t from-accent/60 to-accent/20"
                                  : "bg-gradient-to-t from-foreground/15 to-foreground/5",
                              )}
                              aria-hidden="true"
                            />
                            <span className="sr-only">{entry.name}</span>
                          </div>
                        );
                      })}
                    </div>
                    <figcaption className="pt-6 text-center">
                      <h3 className="text-xl font-medium">{metric.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {metric.description}
                      </p>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        </section>
        <div className="mt-7 flex flex-wrap items-start justify-between gap-3 text-xs leading-5 text-muted-foreground">
          <p className="max-w-2xl">{footnote}</p>
          <span className="inline-flex items-center gap-2 lg:hidden">
            <ArrowLeftRight className="size-3.5" aria-hidden="true" />
            Scroll to compare
          </span>
        </div>
      </div>
    </section>
  );
}
