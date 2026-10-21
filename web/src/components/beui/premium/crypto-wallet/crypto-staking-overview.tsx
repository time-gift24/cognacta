"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button, StatefulButton } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { EASE_IN, EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";
import {
  type CryptoStakingLabels,
  type CryptoVault,
  stakeAmount,
  stakeUsd,
} from "./crypto-staking-data";
import { CryptoTokenIcon } from "./crypto-token-icon";
import { useTradeSubmit } from "./use-trade-submit";

export type CryptoStakingRow = {
  vault: CryptoVault;
  staked: number;
  rewards: number;
};

const usdPrecise = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);

export function CryptoStakingSummary({
  rows,
  labels,
}: {
  rows: readonly CryptoStakingRow[];
  labels: CryptoStakingLabels;
}) {
  const staked = rows.reduce(
    (sum, row) => sum + row.staked * row.vault.usdPrice,
    0,
  );
  const rewards = rows.reduce(
    (sum, row) => sum + row.rewards * row.vault.usdPrice,
    0,
  );
  const apy = staked
    ? rows.reduce(
        (sum, row) => sum + row.staked * row.vault.usdPrice * row.vault.apy,
        0,
      ) / staked
    : 0;
  const items = [
    { label: labels.totalStaked, value: stakeUsd(staked) },
    { label: labels.rewardsEarned, value: usdPrecise(rewards), accent: true },
    { label: labels.averageApy, value: `${apy.toFixed(2)}%` },
  ];
  return (
    <dl className="grid grid-cols-1 divide-y divide-border rounded-3xl border border-border bg-background sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {items.map((item) => (
        <div key={item.label} className="px-5 py-4">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd
            className={
              item.accent
                ? "mt-1.5 text-2xl font-medium tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400"
                : "mt-1.5 text-2xl font-medium tracking-tight tabular-nums"
            }
          >
            <DigitSwap value={item.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PositionRow({
  row,
  labels,
  onClaim,
  onAdd,
}: {
  row: CryptoStakingRow;
  labels: CryptoStakingLabels;
  onClaim: () => unknown;
  onAdd: () => void;
}) {
  const [state, run] = useTradeSubmit(1400);
  const { vault } = row;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-3 py-3.5">
      <CryptoTokenIcon symbol={vault.symbol} network={vault.network} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{vault.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
          {stakeAmount(row.staked, 4)} {vault.symbol} ·{" "}
          {stakeUsd(row.staked * vault.usdPrice)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
          <DigitSwap value={`+${stakeAmount(row.rewards, vault.precision)}`} />
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {vault.symbol} · {vault.apy.toFixed(2)}% {labels.apy}
        </p>
      </div>
      <div className="flex w-full gap-2 sm:w-auto">
        <Button
          type="button"
          variant="outline"
          onClick={onAdd}
          aria-label={`${labels.addMore} ${vault.symbol} to ${vault.name}`}
          className="flex-1 bg-background sm:flex-none"
        >
          {labels.addMore}
        </Button>
        <StatefulButton
          type="button"
          state={state}
          disabled={row.rewards <= 0 && state === "idle"}
          onClick={() => run(onClaim)}
          loadingText={labels.claiming}
          successText={labels.claimed}
          aria-label={`${labels.claim} ${vault.name} rewards`}
          className="min-w-24 flex-1 sm:flex-none"
        >
          {labels.claim}
        </StatefulButton>
      </div>
    </div>
  );
}

export function CryptoStakingPositions({
  rows,
  labels,
  onClaim,
  onAdd,
}: {
  rows: readonly CryptoStakingRow[];
  labels: CryptoStakingLabels;
  onClaim: (vaultId: string) => unknown;
  onAdd: (vaultId: string) => void;
}) {
  const reduce = useReducedMotion();
  if (!rows.length) return null;
  return (
    <section className="mt-10">
      <h3 className="text-xl font-medium">{labels.positions}</h3>
      <ul className="mt-2 divide-y divide-border">
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((row) => (
            <motion.li
              key={row.vault.id}
              layout={reduce ? false : "position"}
              initial={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, y: 10, filter: "blur(4px)" }
              }
              animate={{
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                transition: { duration: 0.45, ease: EASE_OUT },
              }}
              exit={{
                opacity: 0,
                transition: { duration: 0.15, ease: EASE_IN },
              }}
              transition={SPRING_LAYOUT}
            >
              <PositionRow
                row={row}
                labels={labels}
                onClaim={() => onClaim(row.vault.id)}
                onAdd={() => onAdd(row.vault.id)}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
