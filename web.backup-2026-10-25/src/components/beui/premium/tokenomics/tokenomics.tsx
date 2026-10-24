"use client";

/*
 * Storyboard
 * 1. View: heading and stats blur-rise 70ms apart while stat values count up;
 *    the donut draws its arcs clockwise and the unlock bars grow in.
 * 2. Link: hovering or focusing an allocation (arc or legend row) thickens
 *    its arc, swaps the donut center to that allocation, fades other series
 *    in the unlock chart, and re-totals the unlocked figure for it alone.
 * 3. Inspect: scrubbing the unlock chart rolls the unlocked figure to that
 *    month; hovering an area focuses its allocation everywhere.
 * Reduced motion: no rise, count-up, or draw; emphasis changes in place.
 */

import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  TOKENOMICS_ALLOCATIONS,
  TOKENOMICS_COPY,
  TOKENOMICS_SUPPLY,
  TOKENOMICS_SYMBOL,
  type TokenAllocation,
  type TokenomicsCopy,
  type TokenomicsStat,
} from "./tokenomics-data";
import { TokenomicsDistribution } from "./tokenomics-distribution";
import { TokenomicsSchedule } from "./tokenomics-schedule";

export type TokenomicsProps = {
  allocations?: readonly TokenAllocation[];
  supply?: number;
  symbol?: string;
  /** Overrides the stats derived from the allocations. */
  stats?: readonly TokenomicsStat[];
  copy?: Partial<TokenomicsCopy>;
  /** Last month shown in the unlock chart. */
  scheduleMonths?: number;
  className?: string;
};

function deriveStats(
  allocations: readonly TokenAllocation[],
  supply: number,
  symbol: string,
): TokenomicsStat[] {
  const atLaunch = allocations.reduce(
    (sum, item) => sum + item.percent * item.tgeUnlock,
    0,
  );
  const fullyVested = Math.max(
    0,
    ...allocations.map((item) => item.cliffMonths + item.vestingMonths),
  );
  return [
    {
      label: "Total supply",
      value: supply / 1e9,
      suffix: `B\u00a0${symbol}`,
      decimals: 1,
    },
    {
      label: "Circulating at launch",
      value: atLaunch,
      suffix: "%",
      decimals: 1,
    },
    {
      label: "Fully vested after",
      value: fullyVested,
      suffix: "\u00a0months",
    },
  ];
}

const rise = (reduce: boolean, index: number) => ({
  initial: reduce ? false : { opacity: 0, y: 14, filter: "blur(6px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.5, ease: EASE_OUT, delay: index * 0.07 },
});

export function Tokenomics({
  allocations = TOKENOMICS_ALLOCATIONS,
  supply = TOKENOMICS_SUPPLY,
  symbol = TOKENOMICS_SYMBOL,
  stats,
  copy: copyOverrides,
  scheduleMonths = 48,
  className,
}: TokenomicsProps) {
  const copy = { ...TOKENOMICS_COPY, ...copyOverrides };
  const reduce = useReducedMotion() ?? false;
  const titleId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  const items = stats ?? deriveStats(allocations, supply, symbol);

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "w-full bg-background px-4 py-20 text-foreground sm:px-8 sm:py-24",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <motion.p
            {...rise(reduce, 0)}
            className="inline-flex rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]"
          >
            {copy.eyebrow}
          </motion.p>
          <motion.h2
            {...rise(reduce, 1)}
            id={titleId}
            className="mt-4 text-4xl font-medium tracking-tight"
          >
            {copy.title}
          </motion.h2>
          <motion.p
            {...rise(reduce, 2)}
            className="mt-4 text-base text-muted-foreground"
          >
            {copy.description}
          </motion.p>
        </div>

        <dl className="mt-10 grid divide-y divide-border rounded-3xl border border-border bg-background sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {items.map((stat, index) => (
            <motion.div
              key={stat.label}
              {...rise(reduce, 3 + index)}
              className="px-6 py-5"
            >
              <dt className="text-sm text-muted-foreground">{stat.label}</dt>
              <dd className="mt-2 text-3xl font-medium tracking-tight tabular-nums">
                <NumberTicker
                  value={stat.value}
                  decimals={stat.decimals}
                  locale
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                />
              </dd>
            </motion.div>
          ))}
        </dl>

        <div className="mt-6 grid gap-6">
          <motion.div
            {...rise(reduce, 6)}
            className="rounded-3xl border border-border bg-background p-6 sm:p-8"
          >
            <h3 className="text-xl font-medium">{copy.distribution}</h3>
            <div className="mt-6">
              <TokenomicsDistribution
                allocations={allocations}
                supply={supply}
                symbol={symbol}
                copy={copy}
                activeId={activeId}
                onActiveChange={setActiveId}
              />
            </div>
          </motion.div>
          <motion.div
            {...rise(reduce, 7)}
            className="rounded-3xl border border-border bg-background p-6 sm:p-8"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-xl font-medium">{copy.schedule}</h3>
              <p className="text-sm text-muted-foreground">
                {copy.scheduleHint}
              </p>
            </div>
            <div className="mt-6">
              <TokenomicsSchedule
                allocations={allocations}
                supply={supply}
                symbol={symbol}
                copy={copy}
                months={scheduleMonths}
                activeId={activeId}
                onActiveChange={setActiveId}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
