"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import {
  CRYPTO_STATUS_LABELS,
  CRYPTO_STATUS_TONES,
  cryptoTransactionTime,
  cryptoTransactionTitle,
} from "./crypto-activity-utils";
import { CryptoTokenIcon } from "./crypto-token-icon";
import {
  type CryptoTransaction,
  cryptoAmount,
  cryptoUsd,
  shortCryptoAddress,
} from "./crypto-wallet-data";

/** Token mark for a transaction: an overlapping pair for swaps. */
export function CryptoTransactionMark({
  transaction,
  className,
}: {
  transaction: CryptoTransaction;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (transaction.kind === "swap" && transaction.toSymbol)
    return (
      <span className={cn("relative block size-10 shrink-0", className)}>
        <CryptoTokenIcon
          symbol={transaction.symbol}
          className="absolute top-0 left-0 size-7"
        />
        <CryptoTokenIcon
          symbol={transaction.toSymbol}
          className="absolute right-0 bottom-0 size-7 rounded-full ring-2 ring-background"
        />
      </span>
    );
  const Icon = transaction.kind === "receive" ? ArrowDownLeft : ArrowUpRight;
  return (
    <span className={cn("relative block size-10 shrink-0", className)}>
      <CryptoTokenIcon symbol={transaction.symbol} className="size-10" />
      <span className="absolute -right-0.5 -bottom-0.5 flex size-4.5 items-center justify-center rounded-full bg-background">
        <span className="flex size-3.5 items-center justify-center rounded-full bg-foreground text-background">
          <Icon className="size-2.5" aria-hidden="true" />
        </span>
        {transaction.status === "pending" && !reduce ? (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-2 border-amber-500 border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1.1,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        ) : null}
      </span>
    </span>
  );
}

export function CryptoActivityRow({
  transaction,
  onOpen,
}: {
  transaction: CryptoTransaction;
  onOpen: () => void;
}) {
  const incoming = transaction.kind === "receive";
  const failed = transaction.status === "failed";
  const counterparty =
    transaction.kind === "swap"
      ? transaction.network
      : `${incoming ? "From" : "To"} ${shortCryptoAddress(transaction.address)}`;
  const primary =
    transaction.kind === "swap" && transaction.toAmount && transaction.toSymbol
      ? `+${cryptoAmount(transaction.toAmount)} ${transaction.toSymbol}`
      : `${incoming ? "+" : "−"}${cryptoAmount(transaction.amount)} ${transaction.symbol}`;
  const secondary =
    transaction.kind === "swap"
      ? `−${cryptoAmount(transaction.amount)} ${transaction.symbol}`
      : transaction.usdValue !== undefined
        ? cryptoUsd(transaction.usdValue)
        : "";

  return (
    <div className="relative flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left transition-colors hover:bg-muted has-[:focus-visible]:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background">
      <CryptoTransactionMark transaction={transaction} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {cryptoTransactionTitle(transaction)}
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate">{counterparty}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">
            {cryptoTransactionTime(transaction.date)}
          </span>
        </span>
      </span>
      <span className="shrink-0 text-right tabular-nums">
        <span
          className={cn(
            "block text-sm font-medium",
            (incoming || transaction.kind === "swap") &&
              transaction.status === "confirmed" &&
              "text-emerald-600 dark:text-emerald-400",
            failed && "text-muted-foreground line-through",
          )}
        >
          {primary}
        </span>
        <span className="mt-1 flex justify-end">
          {transaction.status === "confirmed" ? (
            <span className="text-xs text-muted-foreground">{secondary}</span>
          ) : (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs",
                CRYPTO_STATUS_TONES[transaction.status],
              )}
            >
              {CRYPTO_STATUS_LABELS[transaction.status]}
            </span>
          )}
        </span>
      </span>
      {/* Full-row control; the shared Button is always pill-shaped, so the
          row keeps its own radius and this sits on top. */}
      <Button
        type="button"
        variant="plain"
        aria-label={`${cryptoTransactionTitle(transaction)}, ${primary}, ${CRYPTO_STATUS_LABELS[transaction.status]}`}
        onClick={onOpen}
        whileHover={undefined}
        whileTap={undefined}
        className="absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
}
