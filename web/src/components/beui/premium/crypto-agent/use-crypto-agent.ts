"use client";

import { useEffect, useRef, useState } from "react";
import {
  type CryptoTradeContact,
  type CryptoTradeToken,
  quoteSwap,
  shortAddress,
  tradeAmount,
} from "../crypto-wallet/crypto-trade-data";
import {
  type CryptoAgentAction,
  type CryptoAgentActionStatus,
  type CryptoAgentContext,
  type CryptoAgentLabels,
  type CryptoAgentMessage,
  type CryptoAgentReply,
  demoDelay,
  demoHash,
  demoRespond,
} from "./crypto-agent-data";

/** Details captured on the card at approval time, such as the quoted output. */
export type CryptoAgentApproval = { amountOut?: number };

export type UseCryptoAgentOptions = {
  initialMessages: CryptoAgentMessage[];
  tokens: CryptoTradeToken[];
  contacts: CryptoTradeContact[];
  labels: CryptoAgentLabels;
  /** Turns a prompt into a reply. Defaults to a local demo parser. */
  respond?: (
    prompt: string,
    context: CryptoAgentContext,
  ) => CryptoAgentReply | Promise<CryptoAgentReply>;
  /** Asks the wallet to sign and broadcast. Resolve with the hash. */
  onSign?: (
    action: CryptoAgentAction,
    approval: CryptoAgentApproval,
  ) => Promise<{ hash: string }>;
  /** Resolves once the transaction is confirmed onchain. */
  waitForReceipt?: (hash: string) => Promise<void>;
  onReject?: (action: CryptoAgentAction) => void;
};

/** Time each tool step spends running before it resolves. */
const STEP_MS = 520;

let sequence = 0;
const nextId = () => {
  sequence += 1;
  return `m${Date.now().toString(36)}${sequence}`;
};

export function useCryptoAgent({
  initialMessages,
  tokens: initialTokens,
  contacts,
  labels,
  respond,
  onSign,
  waitForReceipt,
  onReject,
}: UseCryptoAgentOptions) {
  const [messages, setMessages] = useState(initialMessages);
  const [tokens, setTokens] = useState(initialTokens);
  const [thinking, setThinking] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const push = (message: CryptoAgentMessage) =>
    mounted.current && setMessages((list) => [...list, message]);
  const patch = (id: string, fields: Partial<CryptoAgentMessage>) =>
    mounted.current &&
    setMessages((list) =>
      list.map((item) =>
        item.id === id ? ({ ...item, ...fields } as CryptoAgentMessage) : item,
      ),
    );

  const ask = async (prompt: string) => {
    if (!prompt.trim() || thinking) return;
    push({ id: nextId(), role: "user", text: prompt.trim() });
    const id = nextId();
    push({ id, role: "agent", text: "", working: true, steps: [] });
    setThinking(true);
    try {
      const context = { tokens, contacts };
      const reply = respond
        ? await respond(prompt, context)
        : await demoDelay(500).then(() => demoRespond(prompt, context));
      // Resolve tool steps one at a time so the reasoning reads as it runs.
      const steps = reply.steps ?? [];
      for (let index = 0; index < steps.length; index += 1) {
        const shown = steps.slice(0, index + 1).map((step, at) => ({
          ...step,
          state: at === index ? ("running" as const) : ("done" as const),
        }));
        patch(id, { steps: shown });
        await demoDelay(STEP_MS);
      }
      patch(id, {
        working: false,
        steps: steps.map((step) => ({ ...step, state: "done" as const })),
        text: reply.text,
        action: reply.action,
        status: reply.action ? "pending" : undefined,
      });
    } catch {
      patch(id, { working: false, text: labels.failedReply });
    } finally {
      if (mounted.current) setThinking(false);
    }
  };

  const token = (id: string) => tokens.find((item) => item.id === id);

  /** Plain-language receipt, also used to update demo balances. */
  const settle = (action: CryptoAgentAction, approval: CryptoAgentApproval) => {
    if (action.kind === "swap") {
      const from = token(action.from);
      const to = token(action.to);
      if (!from || !to) return "";
      const out =
        approval.amountOut ?? quoteSwap(from, to, action.amountIn).amountOut;
      setTokens((list) =>
        list.map((item) =>
          item.id === from.id
            ? { ...item, balance: item.balance - action.amountIn }
            : item.id === to.id
              ? { ...item, balance: item.balance + out }
              : item,
        ),
      );
      return `You swapped ${tradeAmount(action.amountIn, from.precision)} ${from.symbol} for ${tradeAmount(out, to.precision)} ${to.symbol}.`;
    }
    const item = token(action.token);
    if (!item) return "";
    if (action.kind === "send") {
      setTokens((list) =>
        list.map((entry) =>
          entry.id === item.id
            ? { ...entry, balance: entry.balance - action.amount }
            : entry,
        ),
      );
      const contact = contacts.find((entry) => entry.id === action.recipient);
      return `${tradeAmount(action.amount, item.precision)} ${item.symbol} is on its way to ${contact?.name ?? shortAddress(action.recipient)}.`;
    }
    return `${action.spenderName} can now spend up to ${tradeAmount(action.amount, item.precision)} ${item.symbol}.`;
  };

  const approve = async (id: string, approval: CryptoAgentApproval = {}) => {
    const message = messages.find((item) => item.id === id);
    if (message?.role !== "agent" || !message.action) return;
    const { action } = message;
    patch(id, { status: "signing" as CryptoAgentActionStatus });
    try {
      const { hash } = onSign
        ? await onSign(action, approval)
        : await demoDelay(1300).then(() => ({ hash: demoHash(id) }));
      patch(id, { status: "submitted", hash });
      await (waitForReceipt ? waitForReceipt(hash) : demoDelay(1800));
      patch(id, { status: "confirmed" });
      const summary = settle(action, approval);
      push({
        id: nextId(),
        role: "agent",
        text: labels.confirmedReply(action, summary),
      });
    } catch {
      patch(id, { status: "failed" });
    }
  };

  const reject = (id: string) => {
    const message = messages.find((item) => item.id === id);
    if (message?.role !== "agent" || !message.action) return;
    patch(id, { status: "rejected" });
    onReject?.(message.action);
    push({ id: nextId(), role: "agent", text: labels.declinedReply });
  };

  return { messages, tokens, thinking, ask, approve, reject };
}
