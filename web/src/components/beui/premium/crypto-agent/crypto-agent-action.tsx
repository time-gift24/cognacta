"use client";

import type {
  CryptoTradeContact,
  CryptoTradeToken,
} from "../crypto-wallet/crypto-trade-data";
import { CryptoAgentApproveCard } from "./crypto-agent-approve-card";
import type {
  CryptoAgentLabels,
  CryptoAgentMessage,
} from "./crypto-agent-data";
import { CryptoAgentSendCard } from "./crypto-agent-send-card";
import { CryptoAgentSwapCard } from "./crypto-agent-swap-card";
import type { CryptoAgentApproval } from "./use-crypto-agent";

/** Picks the generative UI card for an agent tool call. */
export function CryptoAgentAction({
  message,
  tokens,
  contacts,
  labels,
  explorerUrl,
  onApprove,
  onReject,
}: {
  message: Extract<CryptoAgentMessage, { role: "agent" }>;
  tokens: CryptoTradeToken[];
  contacts: CryptoTradeContact[];
  labels: CryptoAgentLabels;
  explorerUrl?: (hash: string) => string;
  onApprove: (approval?: CryptoAgentApproval) => void;
  onReject: () => void;
}) {
  const { action, status = "pending", hash } = message;
  if (!action) return null;
  const token = (id: string) => tokens.find((item) => item.id === id);
  const shared = { status, hash, labels, explorerUrl, onReject };

  if (action.kind === "swap") {
    const from = token(action.from);
    const to = token(action.to);
    if (!from || !to) return null;
    return (
      <CryptoAgentSwapCard
        {...shared}
        from={from}
        to={to}
        amountIn={action.amountIn}
        onApprove={onApprove}
      />
    );
  }
  const item = token(action.token);
  if (!item) return null;
  if (action.kind === "send")
    return (
      <CryptoAgentSendCard
        {...shared}
        token={item}
        amount={action.amount}
        recipient={action.recipient}
        contact={contacts.find((entry) => entry.id === action.recipient)}
        onApprove={() => onApprove()}
      />
    );
  return (
    <CryptoAgentApproveCard
      {...shared}
      token={item}
      amount={action.amount}
      spender={action.spender}
      spenderName={action.spenderName}
      onApprove={() => onApprove()}
    />
  );
}
