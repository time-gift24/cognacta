"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { Button } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { Input } from "@/components/beui/motion/input";
import { SPRING_LAYOUT, SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { CryptoTokenIcon } from "./crypto-token-icon";
import type { CryptoTradeToken } from "./crypto-trade-data";

export function TradeTokenPill({
  token,
  layoutId,
  onClick,
  label,
}: {
  token: CryptoTradeToken;
  /** Shared id so the pill glides between panels when tokens flip. */
  layoutId?: string;
  onClick?: () => void;
  label: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      layoutId={reduce ? undefined : layoutId}
      transition={SPRING_LAYOUT}
      className="shrink-0"
    >
      <Button
        type="button"
        variant="outline"
        onClick={onClick}
        aria-label={`${label}: ${token.symbol}`}
        className="h-10 gap-2 bg-background pr-3 pl-1 text-sm font-medium"
      >
        <CryptoTokenIcon
          symbol={token.symbol}
          network={token.network}
          className="size-8"
        />
        {token.symbol}
        <ChevronDown
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
      </Button>
    </motion.div>
  );
}

/** One bordered leg of a trade: label, a large amount, a token, and a footer. */
export function TradePanel({
  label,
  amount,
  token,
  footer,
  className,
}: {
  label: ReactNode;
  amount: ReactNode;
  token: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-background px-5 pt-4 pb-4 transition-colors focus-within:border-foreground/30",
        className,
      )}
    >
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-center gap-3">
        <div className="min-w-0 flex-1">{amount}</div>
        {token}
      </div>
      {footer ? (
        <div className="mt-2 flex min-h-6 items-center justify-between gap-3 text-xs text-muted-foreground tabular-nums">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

/** Large borderless numeric field built on the shared Input. */
export function TradeAmountInput({
  value,
  onChange,
  label,
  invalid,
  prefix,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  invalid?: boolean;
  prefix?: string;
}) {
  return (
    <Input
      value={value}
      onChange={onChange}
      inputMode="decimal"
      autoComplete="off"
      placeholder={prefix ? `${prefix}0` : "0"}
      aria-label={label}
      aria-invalid={invalid || undefined}
      classNames={{
        field:
          "h-12 rounded-none border-0 bg-transparent focus-within:border-0",
        input: cn(
          "pl-0 pr-0 text-4xl font-medium tracking-tight tabular-nums",
          invalid && "text-red-600 dark:text-red-400",
        ),
      }}
    />
  );
}

/** Read-only rolling amount for computed values such as a swap quote. */
export function TradeAmountReadout({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <output
      aria-label={label}
      aria-live="polite"
      className={cn(
        "flex h-12 items-center truncate text-4xl font-medium tracking-tight tabular-nums",
        value === "0" && "text-muted-foreground/60",
      )}
    >
      <DigitSwap value={value} />
    </output>
  );
}

export function TradeDetailRow({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{children}</dd>
    </div>
  );
}

export function TradeMaxButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onClick}
      className="relative h-6 px-2.5 text-xs after:absolute after:-inset-2"
    >
      {label}
    </Button>
  );
}

/**
 * Label for a StatefulButton whose text changes while idle. StatefulButton
 * animates its width to the label but only cascades plain strings, so this
 * cross-fades between label kinds (for example "Enter an amount" and
 * "Stake 2 ETH"); within one kind, roll numbers with DigitSwap instead of
 * re-keying.
 */
export function TradeCtaLabel({
  kind,
  children,
}: {
  kind: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-flex">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={kind}
          initial={
            reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(4px)" }
          }
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={
            reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }
          }
          transition={reduce ? { duration: 0.12 } : SPRING_SWAP}
          className="inline-flex items-center gap-[0.3em] whitespace-nowrap"
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
