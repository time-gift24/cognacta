"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button, StatefulButton } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { RangeSlider } from "@/components/beui/motion/range-slider";
import { CryptoStakeProjection } from "./crypto-stake-projection";
import {
  type CryptoStakingLabels,
  type CryptoVault,
  stakeAmount,
  stakeUsd,
  vaultLockLabel,
} from "./crypto-staking-data";
import { CryptoTokenIcon } from "./crypto-token-icon";
import { parseAmount, sanitizeAmount } from "./crypto-trade-data";
import {
  TradeAmountInput,
  TradeCtaLabel,
  TradeDetailRow,
  TradeMaxButton,
  TradePanel,
} from "./crypto-trade-parts";
import { useTradeSubmit } from "./use-trade-submit";

export function CryptoStakeDialog({
  vault,
  open,
  onOpenChange,
  onExitComplete,
  labels,
  onStake,
}: {
  vault?: CryptoVault;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExitComplete: () => void;
  labels: CryptoStakingLabels;
  onStake: (vault: CryptoVault, amount: number) => unknown;
}) {
  const [amount, setAmount] = useState("");
  const [horizon, setHorizon] = useState("1y");
  const [state, run] = useTradeSubmit(900);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  if (!vault) return null;
  const value = parseAmount(amount);
  const available = vault.available;
  const insufficient = value > available;
  const percent = available > 0 ? Math.min(100, (value / available) * 100) : 0;
  const ready = value > 0 && !insufficient;

  const setFromPercent = (next: number) => {
    const raw = (available * next) / 100;
    setAmount(next <= 0 ? "" : String(Number(raw.toFixed(vault.precision))));
  };

  const submit = () =>
    run(
      () => onStake(vault, value),
      () => {
        closeTimer.current = setTimeout(() => onOpenChange(false), 700);
      },
    );

  return (
    <AnimatedModal
      open={open}
      onOpenChange={onOpenChange}
      onExitComplete={() => {
        setAmount("");
        setHorizon("1y");
        onExitComplete();
      }}
      panelClassName="max-h-dvh max-w-md overflow-y-auto rounded-3xl p-5"
    >
      <div className="flex items-start gap-3">
        <CryptoTokenIcon symbol={vault.symbol} network={vault.network} />
        <div className="min-w-0 flex-1">
          <AnimatedModalTitle className="truncate text-xl font-medium">
            {labels.stake} {vault.symbol}
          </AnimatedModalTitle>
          <AnimatedModalDescription className="mt-0.5 truncate text-sm text-muted-foreground">
            {vault.name} · {vault.apy.toFixed(2)}% {labels.apy}
          </AnimatedModalDescription>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          className="-mt-1 shrink-0"
        >
          <X className="size-4" />
        </Button>
      </div>

      <TradePanel
        className="mt-5"
        label={labels.amount}
        amount={
          <TradeAmountInput
            value={amount}
            onChange={(next) =>
              setAmount(sanitizeAmount(next, vault.precision))
            }
            label={`${labels.amount} (${vault.symbol})`}
            invalid={insufficient}
          />
        }
        token={
          <span className="shrink-0 text-sm font-medium text-muted-foreground">
            {vault.symbol}
          </span>
        }
        footer={
          <>
            <DigitSwap value={stakeUsd(value * vault.usdPrice)} />
            <span className="flex items-center gap-2">
              {labels.available} {stakeAmount(available, 4)}
              {available > 0 ? (
                <TradeMaxButton
                  label="Max"
                  onClick={() => setFromPercent(100)}
                />
              ) : null}
            </span>
          </>
        }
      />

      <div className="mt-3 flex items-center gap-3">
        <RangeSlider
          value={Math.round(percent)}
          onValueChange={setFromPercent}
          min={0}
          max={100}
          step={1}
          showTicks={false}
          disabled={available <= 0}
          aria-label={`Share of available ${vault.symbol}`}
          formatValueText={(next) => `${next}%`}
          className="h-9 min-w-0 flex-1"
        />
        <span className="w-12 shrink-0 text-right text-sm tabular-nums">
          <DigitSwap value={`${Math.round(percent)}%`} />
        </span>
      </div>

      <div className="mt-4">
        <CryptoStakeProjection
          vault={vault}
          amount={insufficient ? available : value}
          horizon={horizon}
          onHorizonChange={setHorizon}
          labels={labels}
        />
      </div>

      <dl className="mt-3 px-2">
        <TradeDetailRow label={labels.apy}>
          {vault.apy.toFixed(2)}%
        </TradeDetailRow>
        <TradeDetailRow label={labels.unlock}>
          {vaultLockLabel(vault.lockDays, labels.flexible)}
        </TradeDetailRow>
      </dl>

      <StatefulButton
        type="button"
        size="lg"
        state={state}
        disabled={!ready && state === "idle"}
        onClick={submit}
        loadingText={labels.confirming}
        successText={labels.staked}
        className="mt-4 h-12 w-full text-base"
      >
        {available <= 0 ? (
          <TradeCtaLabel kind="empty">
            {labels.nothingAvailable(vault.symbol)}
          </TradeCtaLabel>
        ) : insufficient ? (
          <TradeCtaLabel kind="insufficient">
            {labels.insufficient(vault.symbol)}
          </TradeCtaLabel>
        ) : ready ? (
          <TradeCtaLabel kind="ready">
            {labels.stake}
            <DigitSwap value={stakeAmount(value, 6)} />
            {vault.symbol}
          </TradeCtaLabel>
        ) : (
          <TradeCtaLabel kind="idle">{labels.enterAmount}</TradeCtaLabel>
        )}
      </StatefulButton>
    </AnimatedModal>
  );
}
