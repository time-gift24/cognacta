"use client";

import { ArrowDown, RotateCw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { CryptoTokenIcon } from "../crypto-wallet/crypto-token-icon";
import {
  CRYPTO_TRADE_NETWORK_FEE_USD,
  type CryptoTradeToken,
  quoteSwap,
  tradeAmount,
  tradeUsd,
} from "../crypto-wallet/crypto-trade-data";
import {
  AgentDetailRow,
  agentRow,
  CryptoAgentActionCard,
} from "./crypto-agent-action-card";
import {
  CRYPTO_AGENT_QUOTE_TTL,
  type CryptoAgentActionStatus,
  type CryptoAgentLabels,
} from "./crypto-agent-data";
import type { CryptoAgentApproval } from "./use-crypto-agent";

/** Small price moves applied on each refresh so the quote visibly re-rolls. */
const DRIFT = [0, 0.0031, -0.0018, 0.0024, -0.0041, 0.0012];

function QuoteTimer({
  seconds,
  labels,
  onRefresh,
}: {
  seconds: number;
  labels: CryptoAgentLabels;
  onRefresh: () => void;
}) {
  const reduce = useReducedMotion();
  if (seconds <= 0)
    return (
      <Button
        type="button"
        variant="outline"
        onClick={onRefresh}
        className="h-8 gap-1.5 px-3 text-xs"
      >
        <RotateCw className="size-3.5" aria-hidden="true" />
        {labels.refreshQuote}
      </Button>
    );
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
      <span className="sr-only">{labels.quoteExpires}</span>
      <svg viewBox="0 0 20 20" className="size-4 -rotate-90" aria-hidden="true">
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          strokeWidth="2.5"
          className="stroke-border"
        />
        <motion.circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="stroke-foreground"
          initial={false}
          animate={{ pathLength: seconds / CRYPTO_AGENT_QUOTE_TTL }}
          transition={{ duration: reduce ? 0 : 1, ease: "linear" }}
        />
      </svg>
      {seconds}s
    </span>
  );
}

function SwapLeg({
  label,
  token,
  amount,
  index,
}: {
  label: string;
  token: CryptoTradeToken;
  amount: number;
  index: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      {...agentRow(reduce, index)}
      className="flex items-center gap-3"
    >
      <CryptoTokenIcon
        symbol={token.symbol}
        network={token.network}
        className="size-8"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-base font-medium text-foreground tabular-nums">
          <DigitSwap value={tradeAmount(amount, token.precision)} />{" "}
          {token.symbol}
        </p>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        <DigitSwap value={tradeUsd(amount * token.usdPrice)} />
      </span>
    </motion.div>
  );
}

export function CryptoAgentSwapCard({
  from,
  to,
  amountIn,
  status,
  hash,
  labels,
  explorerUrl,
  onApprove,
  onReject,
}: {
  from: CryptoTradeToken;
  to: CryptoTradeToken;
  amountIn: number;
  status: CryptoAgentActionStatus;
  hash?: string;
  labels: CryptoAgentLabels;
  explorerUrl?: (hash: string) => string;
  onApprove: (approval: CryptoAgentApproval) => void;
  onReject: () => void;
}) {
  const [refreshes, setRefreshes] = useState(0);
  const [seconds, setSeconds] = useState(CRYPTO_AGENT_QUOTE_TTL);
  const live = status === "pending";

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(
      () => setSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [live]);

  const drift = 1 + DRIFT[refreshes % DRIFT.length];
  const quote = quoteSwap(from, to, amountIn);
  const amountOut = quote.amountOut * drift;
  const reduce = useReducedMotion();

  return (
    <CryptoAgentActionCard
      kind="swap"
      network={from.network}
      status={status}
      hash={hash}
      labels={labels}
      explorerUrl={explorerUrl}
      approveDisabled={seconds <= 0}
      headerAside={
        <QuoteTimer
          seconds={seconds}
          labels={labels}
          onRefresh={() => {
            setRefreshes((count) => count + 1);
            setSeconds(CRYPTO_AGENT_QUOTE_TTL);
          }}
        />
      }
      onApprove={() => onApprove({ amountOut })}
      onReject={onReject}
    >
      <div className="rounded-2xl border border-border p-3">
        <SwapLeg label={labels.pay} token={from} amount={amountIn} index={0} />
        <motion.div
          {...agentRow(reduce, 1)}
          className="my-1.5 flex items-center gap-3"
        >
          <span className="grid size-8 place-items-center">
            <span className="grid size-6 place-items-center rounded-full bg-muted">
              <ArrowDown className="size-3.5" aria-hidden="true" />
            </span>
          </span>
          <span className="h-px flex-1 bg-border" />
        </motion.div>
        <SwapLeg
          label={labels.receive}
          token={to}
          amount={amountOut}
          index={2}
        />
      </div>
      <div className="mt-1.5">
        <AgentDetailRow label={labels.rate} index={3}>
          1 {from.symbol} ={" "}
          <DigitSwap value={tradeAmount(quote.rate * drift, to.precision)} />{" "}
          {to.symbol}
        </AgentDetailRow>
        <AgentDetailRow label={labels.priceImpact} index={4}>
          {(quote.impact * 100).toFixed(2)}%
        </AgentDetailRow>
        <AgentDetailRow label={labels.minimumReceived} index={5}>
          <DigitSwap
            value={tradeAmount(quote.minimumReceived * drift, to.precision)}
          />{" "}
          {to.symbol}
        </AgentDetailRow>
        <AgentDetailRow label={labels.networkFee} index={6}>
          {tradeUsd(CRYPTO_TRADE_NETWORK_FEE_USD)}
        </AgentDetailRow>
      </div>
    </CryptoAgentActionCard>
  );
}
