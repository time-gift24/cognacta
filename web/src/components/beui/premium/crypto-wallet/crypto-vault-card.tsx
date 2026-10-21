"use client";

import { Lock, Unlock } from "lucide-react";
import { Sparkline } from "@/components/beui/charts/sparkline";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import {
  CRYPTO_VAULT_RISK,
  type CryptoStakingLabels,
  type CryptoVault,
  compactUsd,
  vaultLockLabel,
} from "./crypto-staking-data";
import { CryptoTokenIcon } from "./crypto-token-icon";

export function CryptoVaultCard({
  vault,
  labels,
  index,
  staked,
  onStake,
}: {
  vault: CryptoVault;
  labels: CryptoStakingLabels;
  /** Order in the grid, used to stagger the sparkline draw. */
  index: number;
  /** Whether the wallet already has a position in this vault. */
  staked: boolean;
  onStake: () => void;
}) {
  const risk = CRYPTO_VAULT_RISK[vault.risk];
  const history = vault.apyHistory ?? [];
  const rising =
    history.length > 1 && history[history.length - 1] >= history[0];
  const LockIcon = vault.lockDays ? Lock : Unlock;

  return (
    <article className="flex h-full flex-col rounded-3xl border border-border bg-background p-5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring hover:border-foreground/20">
      <header className="flex items-start gap-3">
        <CryptoTokenIcon symbol={vault.symbol} network={vault.network} />
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-medium">{vault.name}</h4>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {vault.strategy}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-xs",
            risk.tone,
          )}
        >
          {risk.label}
        </span>
      </header>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{labels.apy}</p>
          <p className="mt-1 text-3xl font-medium tracking-tight tabular-nums">
            {vault.apy.toFixed(2)}
            <span className="text-lg text-muted-foreground">%</span>
          </p>
        </div>
        {history.length > 1 ? (
          <Sparkline
            values={history}
            delay={0.15 + index * 0.06}
            strokeClassName={rising ? "stroke-emerald-500" : "stroke-red-500"}
            label={`${vault.name} APY trend`}
            className="mb-2 h-8 w-24"
          />
        ) : null}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
        <div>
          <dt className="text-muted-foreground">{labels.tvl}</dt>
          <dd className="mt-1 font-medium tabular-nums">
            {compactUsd(vault.tvl)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{labels.lockup}</dt>
          <dd className="mt-1 flex items-center gap-1.5 font-medium">
            <LockIcon
              className="size-3 text-muted-foreground"
              aria-hidden="true"
            />
            {vaultLockLabel(vault.lockDays, labels.flexible)}
          </dd>
        </div>
      </dl>

      <Button
        type="button"
        variant={staked ? "outline" : "primary"}
        onClick={onStake}
        aria-label={`${staked ? labels.addMore : labels.stake} ${vault.name}`}
        className={cn("mt-5 w-full", staked && "bg-background")}
      >
        {staked
          ? `${labels.addMore} ${vault.symbol}`
          : `${labels.stake} ${vault.symbol}`}
      </Button>
    </article>
  );
}
