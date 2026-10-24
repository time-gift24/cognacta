"use client";

import { ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { CryptoTokenIcon } from "../crypto-wallet/crypto-token-icon";
import {
  CRYPTO_TRADE_NETWORK_FEE_USD,
  type CryptoTradeToken,
  shortAddress,
  tradeAmount,
  tradeUsd,
} from "../crypto-wallet/crypto-trade-data";
import {
  AgentDetailRow,
  agentRow,
  CryptoAgentActionCard,
} from "./crypto-agent-action-card";
import type {
  CryptoAgentActionStatus,
  CryptoAgentLabels,
} from "./crypto-agent-data";

export function CryptoAgentApproveCard({
  token,
  amount,
  spender,
  spenderName,
  status,
  hash,
  labels,
  explorerUrl,
  onApprove,
  onReject,
}: {
  token: CryptoTradeToken;
  amount: number;
  spender: string;
  spenderName: string;
  status: CryptoAgentActionStatus;
  hash?: string;
  labels: CryptoAgentLabels;
  explorerUrl?: (hash: string) => string;
  onApprove: () => void;
  onReject: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <CryptoAgentActionCard
      kind="approve"
      network={token.network}
      status={status}
      hash={hash}
      labels={labels}
      explorerUrl={explorerUrl}
      onApprove={onApprove}
      onReject={onReject}
    >
      <motion.div
        {...agentRow(reduce, 0)}
        className="flex items-center gap-3 rounded-2xl border border-border p-3"
      >
        <CryptoTokenIcon
          symbol={token.symbol}
          network={token.network}
          className="size-8"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{labels.allowance}</p>
          <p className="truncate text-base font-medium text-foreground tabular-nums">
            {tradeAmount(amount, token.precision)} {token.symbol}
          </p>
        </div>
      </motion.div>
      <motion.p
        {...agentRow(reduce, 1)}
        className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
        {labels.exactAmount}
      </motion.p>
      <div className="mt-1.5">
        <AgentDetailRow label={labels.spender} index={2}>
          {spenderName}{" "}
          <span className="font-mono font-normal text-muted-foreground">
            {shortAddress(spender)}
          </span>
        </AgentDetailRow>
        <AgentDetailRow label={labels.networkFee} index={3}>
          {tradeUsd(CRYPTO_TRADE_NETWORK_FEE_USD)}
        </AgentDetailRow>
      </div>
    </CryptoAgentActionCard>
  );
}
