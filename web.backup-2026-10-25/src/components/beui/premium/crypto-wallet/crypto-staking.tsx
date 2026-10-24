"use client";

/*
 * Storyboard
 * 1. Live: while on screen, accrued rewards tick up once a second in the
 *    summary and each position (digits roll in place).
 * 2. Filter: the pill glides; vault cards that stay slide to their new cell,
 *    new ones rise in, removed ones fade out in 150ms. APY sparklines draw in.
 * 3. Stake: the dialog's slider and amount stay in sync, projected reward
 *    bars spring to the new size, and confirming adds or grows a position.
 * 4. Claim: the button confirms and the rewards roll back to zero.
 * Reduced motion: no ticking, bars and cards change in place.
 */

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { EASE_IN, EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { CryptoStakeDialog } from "./crypto-stake-dialog";
import {
  CRYPTO_STAKE_POSITIONS,
  CRYPTO_STAKING_LABELS,
  CRYPTO_VAULTS,
  type CryptoClaimRequest,
  type CryptoStakePosition,
  type CryptoStakeRequest,
  type CryptoStakingLabels,
  type CryptoVault,
} from "./crypto-staking-data";
import {
  CryptoStakingPositions,
  CryptoStakingSummary,
} from "./crypto-staking-overview";
import { CryptoVaultCard } from "./crypto-vault-card";
import {
  accruedRewards,
  type LivePosition,
  toLivePositions,
  useLiveClock,
} from "./use-live-rewards";
import { demoConfirm } from "./use-trade-submit";

type VaultFilter = "all" | "flexible" | "locked";
const FILTERS: VaultFilter[] = ["all", "flexible", "locked"];

export type CryptoStakingProps = {
  vaults?: readonly CryptoVault[];
  positions?: readonly CryptoStakePosition[];
  labels?: Partial<CryptoStakingLabels>;
  /** Return a promise to keep the button confirming until it settles. */
  onStake?: (request: CryptoStakeRequest) => unknown;
  onClaim?: (request: CryptoClaimRequest) => unknown;
  /** Simulate confirmations and update positions locally. */
  demo?: boolean;
  className?: string;
};

export function CryptoStaking({
  vaults: vaultsProp = CRYPTO_VAULTS,
  positions: positionsProp = CRYPTO_STAKE_POSITIONS,
  labels: labelOverrides,
  onStake,
  onClaim,
  demo = true,
  className,
}: CryptoStakingProps) {
  const labels = { ...CRYPTO_STAKING_LABELS, ...labelOverrides };
  const id = useId();
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const now = useLiveClock(sectionRef);
  const [vaults, setVaults] = useState(() => [...vaultsProp]);
  const [positions, setPositions] = useState<LivePosition[]>(() =>
    toLivePositions(positionsProp),
  );
  const [filter, setFilter] = useState<VaultFilter>("all");
  const [dialogVault, setDialogVault] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const vaultById = (vaultId: string) =>
    vaults.find((vault) => vault.id === vaultId);
  const rows = positions.flatMap((position) => {
    const vault = vaultById(position.vaultId);
    return vault
      ? [
          {
            vault,
            staked: position.staked,
            rewards: accruedRewards(position, vault, now),
          },
        ]
      : [];
  });
  const shown = vaults.filter((vault) =>
    filter === "all"
      ? true
      : filter === "flexible"
        ? vault.lockDays === 0
        : vault.lockDays > 0,
  );

  const openVault = (vaultId: string) => {
    setDialogVault(vaultId);
    setDialogOpen(true);
  };

  const stake = async (vault: CryptoVault, amount: number) => {
    await (onStake?.({ vaultId: vault.id, amount }) ??
      (demo ? demoConfirm() : undefined));
    if (!demo) return;
    const at = now;
    setPositions((current) => {
      const existing = current.find(
        (position) => position.vaultId === vault.id,
      );
      if (!existing)
        return [
          ...current,
          { vaultId: vault.id, staked: amount, rewards: 0, anchor: at },
        ];
      return current.map((position) =>
        position === existing
          ? {
              ...position,
              rewards: accruedRewards(position, vault, at),
              staked: position.staked + amount,
              anchor: at,
            }
          : position,
      );
    });
    setVaults((current) =>
      current.map((item) =>
        item.id === vault.id
          ? { ...item, available: Math.max(0, item.available - amount) }
          : item,
      ),
    );
  };

  const claim = async (vaultId: string) => {
    const row = rows.find((item) => item.vault.id === vaultId);
    await (onClaim?.({ vaultId, rewards: row?.rewards ?? 0 }) ??
      (demo ? demoConfirm() : undefined));
    if (!demo) return;
    const at = now;
    setPositions((current) =>
      current.map((position) =>
        position.vaultId === vaultId
          ? { ...position, rewards: 0, anchor: at }
          : position,
      ),
    );
  };

  return (
    <section
      ref={sectionRef}
      aria-label={labels.title}
      className={cn(
        "w-full bg-background px-4 py-12 text-foreground sm:px-8 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-3xl">
        <h2 className="text-xl font-medium">{labels.title}</h2>
        <div className="mt-6">
          <CryptoStakingSummary rows={rows} labels={labels} />
        </div>
        <CryptoStakingPositions
          rows={rows}
          labels={labels}
          onClaim={claim}
          onAdd={openVault}
        />

        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-medium">{labels.vaults}</h3>
            <Tabs
              value={filter}
              onValueChange={(value) => setFilter(value as VaultFilter)}
            >
              <TabsList aria-label={labels.vaults}>
                {FILTERS.map((item, index) => (
                  <TabsTrigger
                    key={item}
                    value={item}
                    id={`${id}-filter-${item}`}
                    tabIndex={filter === item ? 0 : -1}
                    className="h-8 px-3 text-xs"
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
                        FILTERS[
                          (index + step + FILTERS.length) % FILTERS.length
                        ];
                      setFilter(next);
                      document.getElementById(`${id}-filter-${next}`)?.focus();
                    }}
                  >
                    {labels[item]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((vault, index) => (
                <motion.li
                  key={vault.id}
                  layout={reduce ? false : "position"}
                  initial={
                    reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }
                  }
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.4, ease: EASE_OUT },
                  }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.15, ease: EASE_IN },
                  }}
                  transition={SPRING_LAYOUT}
                >
                  <CryptoVaultCard
                    vault={vault}
                    labels={labels}
                    index={index}
                    staked={positions.some(
                      (position) => position.vaultId === vault.id,
                    )}
                    onStake={() => openVault(vault.id)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
        {demo ? (
          <p className="mt-6 text-xs text-muted-foreground">
            Demo vaults · Sample yields, balances, and rewards
          </p>
        ) : null}
      </div>

      <CryptoStakeDialog
        vault={dialogVault ? vaultById(dialogVault) : undefined}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onExitComplete={() => setDialogVault(null)}
        labels={labels}
        onStake={stake}
      />
    </section>
  );
}
