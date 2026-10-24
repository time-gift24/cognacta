"use client";

import { ArrowDown, BadgeCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { CryptoTokenIcon } from "../crypto-wallet/crypto-token-icon";
import {
  CRYPTO_TRADE_NETWORK_FEE_USD,
  type CryptoTradeContact,
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

export function CryptoAgentSendCard({
  token,
  amount,
  recipient,
  contact,
  status,
  hash,
  labels,
  explorerUrl,
  onApprove,
  onReject,
}: {
  token: CryptoTradeToken;
  amount: number;
  recipient: string;
  contact?: CryptoTradeContact;
  status: CryptoAgentActionStatus;
  hash?: string;
  labels: CryptoAgentLabels;
  explorerUrl?: (hash: string) => string;
  onApprove: () => void;
  onReject: () => void;
}) {
  const reduce = useReducedMotion();
  // Snapshot at proposal time; the live balance changes once this confirms.
  const [after] = useState(() => token.balance - amount);

  return (
    <CryptoAgentActionCard
      kind="send"
      network={token.network}
      status={status}
      hash={hash}
      labels={labels}
      explorerUrl={explorerUrl}
      onApprove={onApprove}
      onReject={onReject}
    >
      <div className="rounded-2xl border border-border p-3">
        <motion.div
          {...agentRow(reduce, 0)}
          className="flex items-center gap-3"
        >
          <CryptoTokenIcon
            symbol={token.symbol}
            network={token.network}
            className="size-8"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{labels.sending}</p>
            <p className="truncate text-base font-medium text-foreground tabular-nums">
              {tradeAmount(amount, token.precision)} {token.symbol}
            </p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {tradeUsd(amount * token.usdPrice)}
          </span>
        </motion.div>
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
        <motion.div
          {...agentRow(reduce, 2)}
          className="flex items-center gap-3"
        >
          {contact?.avatar ? (
            // biome-ignore lint/performance/noImgElement: Remote sample avatars ship with the installable block.
            <img
              src={contact.avatar}
              alt=""
              className="size-8 shrink-0 rounded-full bg-muted object-cover"
            />
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">
              {recipient.slice(0, 2)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-sm font-medium text-foreground">
              {contact?.name ?? shortAddress(recipient)}
              {contact ? (
                <BadgeCheck
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-label="Saved contact"
                />
              ) : null}
            </p>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {shortAddress(contact?.address ?? recipient)}
            </p>
          </div>
        </motion.div>
      </div>
      <div className="mt-1.5">
        <AgentDetailRow label={labels.networkFee} index={3}>
          {tradeUsd(CRYPTO_TRADE_NETWORK_FEE_USD)}
        </AgentDetailRow>
        <AgentDetailRow label={labels.balanceAfter} index={4}>
          {tradeAmount(Math.max(0, after), token.precision)} {token.symbol}
        </AgentDetailRow>
      </div>
    </CryptoAgentActionCard>
  );
}
