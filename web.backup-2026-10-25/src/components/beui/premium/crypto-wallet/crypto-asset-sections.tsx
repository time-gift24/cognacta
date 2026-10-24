"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { CryptoChange } from "./crypto-change";
import { cryptoUsd } from "./crypto-wallet-data";

export type CryptoAssetPerformance = {
  averageCost: number;
  unrealizedReturn: number;
  realizedReturn: number;
  unrealizedPercent?: number;
  realizedPercent?: number;
};

export type CryptoAssetStat = { label: string; value: string };

export function CryptoAssetSection({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-10", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xl font-medium">{title}</h3>
        {aside ? (
          <span className="text-xs text-muted-foreground">{aside}</span>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Low-to-high track with a marker that glides to the current price. */
export function CryptoPriceRange({
  low,
  high,
  current,
  lowLabel,
  highLabel,
}: {
  low: number;
  high: number;
  current: number;
  lowLabel: string;
  highLabel: string;
}) {
  const reduce = useReducedMotion();
  const share =
    high > low
      ? Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100))
      : 50;
  return (
    <div>
      {/* biome-ignore lint/a11y/useSemanticElements: A native meter cannot render the animated fill and price marker. */}
      <div
        role="meter"
        aria-label="Current price within the period range"
        aria-valuemin={low}
        aria-valuemax={high}
        aria-valuenow={current}
        aria-valuetext={`${cryptoUsd(current)}, between ${cryptoUsd(low)} and ${cryptoUsd(high)}`}
        className="relative h-2 rounded-full bg-muted"
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red-500/50 via-amber-500/50 to-emerald-500/60"
          style={{ width: "100%", originX: 0 }}
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: share / 100 }}
          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
        />
        {/* Full-width layer so a percent translate maps onto the track. */}
        <motion.div
          className="absolute inset-0"
          initial={reduce ? false : { x: "0%" }}
          animate={{ x: `${share}%` }}
          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
        >
          <span className="absolute top-1/2 left-0 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground" />
        </motion.div>
      </div>
      <div className="mt-3 flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>
          {lowLabel}
          <span className="ml-1.5 font-medium text-foreground">
            {cryptoUsd(low)}
          </span>
        </span>
        <span>
          {highLabel}
          <span className="ml-1.5 font-medium text-foreground">
            {cryptoUsd(high)}
          </span>
        </span>
      </div>
    </div>
  );
}

export function CryptoAssetStats({
  stats,
}: {
  stats: readonly CryptoAssetStat[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-2">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-border bg-background px-4 py-3"
        >
          <dt className="truncate text-xs text-muted-foreground">
            {stat.label}
          </dt>
          <dd className="mt-1.5 truncate text-sm font-medium tabular-nums">
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function CryptoAssetPerformanceList({
  performance,
}: {
  performance: CryptoAssetPerformance;
}) {
  const total = performance.unrealizedReturn + performance.realizedReturn;
  const rows = [
    {
      label: "Unrealized return",
      value: performance.unrealizedReturn,
      percent: performance.unrealizedPercent,
    },
    {
      label: "Realized return",
      value: performance.realizedReturn,
      percent: performance.realizedPercent,
    },
  ];
  return (
    <div className="rounded-3xl border border-border bg-background p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Total return</p>
          <p className="mt-1.5 text-2xl font-medium tracking-tight">
            <CryptoChange value={total} />
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Average cost</p>
          <p className="mt-1.5 text-sm font-medium tabular-nums">
            {cryptoUsd(performance.averageCost)}
          </p>
        </div>
      </div>
      <dl className="mt-4 space-y-2.5 border-t border-border pt-4 text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="text-right">
              <CryptoChange value={row.value} percent={row.percent} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
