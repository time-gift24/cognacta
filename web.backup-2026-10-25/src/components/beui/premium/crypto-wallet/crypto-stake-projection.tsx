"use client";

/*
 * Monthly cumulative reward bars. Bars share one scale (staking the full
 * available balance), so dragging the amount grows or shrinks every bar with
 * a spring. Switching the horizon remounts the bars, which rise 18ms apart.
 * Reduced motion: bars resize without springs or the rising stagger.
 */

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";
import {
  CRYPTO_STAKE_HORIZONS,
  type CryptoStakingLabels,
  type CryptoVault,
  projectRewards,
  stakeAmount,
  stakeUsd,
} from "./crypto-staking-data";

export function CryptoStakeProjection({
  vault,
  amount,
  horizon,
  onHorizonChange,
  labels,
}: {
  vault: CryptoVault;
  amount: number;
  horizon: string;
  onHorizonChange: (horizon: string) => void;
  labels: CryptoStakingLabels;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  const active =
    CRYPTO_STAKE_HORIZONS.find((item) => item.id === horizon) ??
    CRYPTO_STAKE_HORIZONS[1];
  const bars = projectRewards(amount, vault.apy, active.months);
  const scale = projectRewards(
    Math.max(vault.available, amount),
    vault.apy,
    active.months,
  ).at(-1);
  const total = bars.at(-1) ?? 0;

  return (
    <div className="rounded-3xl border border-border bg-background p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {labels.estimatedRewards}
          </p>
          <p className="mt-1 truncate text-2xl font-medium tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
            <DigitSwap
              value={`+${stakeAmount(total, Math.min(vault.precision, 6))}`}
            />
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {vault.symbol} · ≈ {stakeUsd(total * vault.usdPrice)}
          </p>
        </div>
        <Tabs value={active.id} onValueChange={onHorizonChange}>
          <TabsList aria-label={labels.projection}>
            {CRYPTO_STAKE_HORIZONS.map((item, index) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                id={`${id}-${item.id}`}
                tabIndex={active.id === item.id ? 0 : -1}
                className="h-7 px-2.5 text-xs"
                onKeyDown={(event) => {
                  const step =
                    event.key === "ArrowRight"
                      ? 1
                      : event.key === "ArrowLeft"
                        ? -1
                        : 0;
                  if (!step) return;
                  event.preventDefault();
                  const next =
                    CRYPTO_STAKE_HORIZONS[
                      (index + step + CRYPTO_STAKE_HORIZONS.length) %
                        CRYPTO_STAKE_HORIZONS.length
                    ];
                  onHorizonChange(next.id);
                  document.getElementById(`${id}-${next.id}`)?.focus();
                }}
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div
        key={active.id}
        role="img"
        aria-label={`${labels.projection}: ${stakeAmount(total, 6)} ${vault.symbol} after ${active.label}`}
        className="mt-5 flex h-24 items-end gap-1"
      >
        {bars.map((value, index) => (
          <motion.span
            // biome-ignore lint/suspicious/noArrayIndexKey: Bars are fixed monthly slots.
            key={index}
            className="h-full flex-1 origin-bottom rounded-t-sm bg-emerald-500/80"
            initial={reduce ? false : { scaleY: 0, opacity: 0 }}
            animate={{
              scaleY: scale ? Math.max(0.02, value / scale) : 0.02,
              opacity: 1,
            }}
            transition={
              reduce
                ? { duration: 0 }
                : {
                    scaleY: { ...SPRING_LAYOUT, delay: index * 0.018 },
                    opacity: {
                      duration: 0.2,
                      ease: EASE_OUT,
                      delay: index * 0.018,
                    },
                  }
            }
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>Month 1</span>
        <span>Month {active.months}</span>
      </div>
    </div>
  );
}
