"use client";

import { ArrowDown, Check, Copy, ExternalLink, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { ActionSwapIcon } from "@/components/beui/motion/action-swap";
import {
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  CRYPTO_STATUS_LABELS,
  CRYPTO_STATUS_TONES,
  cryptoExplorerLink,
  cryptoTransactionDate,
  cryptoTransactionTitle,
} from "./crypto-activity-utils";
import { CryptoNetworkIcon, CryptoTokenIcon } from "./crypto-token-icon";
import { type CryptoTransaction, cryptoAmount } from "./crypto-wallet-data";

function CopyValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className="size-8 shrink-0"
    >
      <ActionSwapIcon
        value={copied ? "copied" : "copy"}
        animation="cascade"
        className="size-3.5"
      >
        {copied ? (
          <Check className="size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </ActionSwapIcon>
    </Button>
  );
}

/** Submitted → confirming → final step, with the live step pulsing. */
function StatusTimeline({ transaction }: { transaction: CryptoTransaction }) {
  const reduce = useReducedMotion();
  const steps = [
    { label: "Submitted", state: "done" },
    {
      label: transaction.status === "pending" ? "Confirming" : "Processed",
      state: transaction.status === "pending" ? "active" : "done",
    },
    {
      label: transaction.status === "failed" ? "Failed" : "Confirmed",
      state:
        transaction.status === "pending"
          ? "upcoming"
          : transaction.status === "failed"
            ? "failed"
            : "done",
    },
  ] as const;
  return (
    <ol className="grid grid-cols-3 gap-2">
      {steps.map((step, index) => (
        <motion.li
          key={step.label}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.35,
            ease: EASE_OUT,
            delay: 0.1 + index * 0.08,
          }}
          aria-current={step.state === "active" ? "step" : undefined}
        >
          <span
            className={cn(
              "block h-1 rounded-full",
              step.state === "done" && "bg-foreground",
              step.state === "active" && "overflow-hidden bg-amber-500/25",
              step.state === "upcoming" && "bg-muted",
              step.state === "failed" && "bg-rose-500",
            )}
          >
            {step.state === "active" ? (
              <motion.span
                className="block h-full w-1/2 rounded-full bg-amber-500"
                animate={reduce ? undefined : { x: ["-100%", "200%"] }}
                transition={{
                  duration: 1.4,
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                }}
              />
            ) : null}
          </span>
          <span
            className={cn(
              "mt-2 block text-xs",
              step.state === "upcoming"
                ? "text-muted-foreground"
                : "text-foreground",
            )}
          >
            {step.label}
          </span>
        </motion.li>
      ))}
    </ol>
  );
}

function Leg({
  label,
  amount,
  symbol,
}: {
  label: string;
  amount: string;
  symbol: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <CryptoTokenIcon symbol={symbol} className="size-9" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-lg font-medium tabular-nums">
          {cryptoAmount(amount)} {symbol}
        </p>
      </div>
    </div>
  );
}

export function CryptoActivityDetail({
  transaction,
  demo,
  onClose,
}: {
  transaction: CryptoTransaction;
  demo: boolean;
  onClose: () => void;
}) {
  const explorer = cryptoExplorerLink(transaction.explorerUrl);
  const isAddress = transaction.address.startsWith("0x");
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span
            className={cn(
              "inline-flex rounded-full border px-2 py-0.5 text-xs",
              CRYPTO_STATUS_TONES[transaction.status],
            )}
          >
            {CRYPTO_STATUS_LABELS[transaction.status]}
          </span>
          <AnimatedModalTitle className="mt-3 text-xl font-medium">
            {cryptoTransactionTitle(transaction)}
          </AnimatedModalTitle>
          <AnimatedModalDescription className="mt-1 text-sm text-muted-foreground">
            {cryptoTransactionDate(transaction.date)}
          </AnimatedModalDescription>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Close transaction details"
          onClick={onClose}
          className="shrink-0"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-background p-5">
        {transaction.kind === "swap" &&
        transaction.toSymbol &&
        transaction.toAmount ? (
          <div className="space-y-3">
            <Leg
              label="You paid"
              amount={transaction.amount}
              symbol={transaction.symbol}
            />
            <span className="ml-2.5 flex size-4 items-center justify-center text-muted-foreground">
              <ArrowDown className="size-4" aria-hidden="true" />
            </span>
            <Leg
              label={
                transaction.status === "failed" ? "Not received" : "You receive"
              }
              amount={transaction.toAmount}
              symbol={transaction.toSymbol}
            />
          </div>
        ) : (
          <Leg
            label={transaction.kind === "receive" ? "You received" : "You sent"}
            amount={transaction.amount}
            symbol={transaction.symbol}
          />
        )}
        <div className="mt-5 border-t border-border pt-4">
          <StatusTimeline transaction={transaction} />
        </div>
      </div>

      <dl className="mt-6 divide-y divide-border text-sm">
        <div className="flex items-center justify-between gap-4 py-3">
          <dt className="text-muted-foreground">Network</dt>
          <dd className="flex items-center gap-2">
            <CryptoNetworkIcon network={transaction.network} />
            {transaction.network}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-2">
          <dt className="shrink-0 text-muted-foreground">
            {transaction.kind === "receive"
              ? "From"
              : transaction.kind === "send"
                ? "To"
                : "Router"}
          </dt>
          <dd className="flex min-w-0 items-center gap-1">
            <span className={cn("truncate", isAddress && "font-mono text-xs")}>
              {transaction.address}
            </span>
            {isAddress ? (
              <CopyValue value={transaction.address} label="address" />
            ) : null}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <dt className="text-muted-foreground">Network fee</dt>
          <dd className="tabular-nums">{transaction.fee}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-2">
          <dt className="shrink-0 text-muted-foreground">Transaction hash</dt>
          <dd className="flex min-w-0 items-center gap-1">
            <span className="truncate font-mono text-xs">
              {transaction.hash ??
                (demo ? "Sample, no onchain hash" : "Not available yet")}
            </span>
            {transaction.hash ? (
              <CopyValue value={transaction.hash} label="hash" />
            ) : null}
          </dd>
        </div>
      </dl>

      {explorer ? (
        <ButtonLink
          href={explorer}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          className="mt-6 w-full"
        >
          View on explorer
          <ExternalLink className="size-4" />
        </ButtonLink>
      ) : null}
      {demo ? (
        <p className="mt-6 text-xs text-muted-foreground">
          This is an illustrative transaction.
        </p>
      ) : null}
    </>
  );
}
