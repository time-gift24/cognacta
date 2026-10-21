"use client";

/*
 * Storyboard
 * 1. Empty: the greeting rises in and three starter cards cascade.
 * 2. Ask: the user's bubble rises; the agent's tool steps appear one by one,
 *    each spinner popping to a check.
 * 3. Reply: the text streams in word by word, then the transaction card
 *    blur-rises with its rows staggering in.
 * 4. Approve: the card signs, tracks Sign → Submitted → Confirmed, and the
 *    agent follows up with a receipt while the wallet balance rolls.
 * 5. Decline: the card collapses to a Declined chip and the agent confirms
 *    nothing was signed.
 * Reduced motion: everything fades in place without streaming.
 */

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { AgentChatPill } from "@/components/beui/premium/agent-chat-input/agent-chat-pill";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { CryptoNetworkIcon } from "../crypto-wallet/crypto-token-icon";
import { shortAddress, tradeUsd } from "../crypto-wallet/crypto-trade-data";
import { CryptoAgentAction } from "./crypto-agent-action";
import {
  CRYPTO_AGENT_CONTACTS,
  CRYPTO_AGENT_INITIAL_MESSAGES,
  CRYPTO_AGENT_LABELS,
  CRYPTO_AGENT_SUGGESTIONS,
  CRYPTO_AGENT_TOKENS,
  type CryptoAgentLabels,
  type CryptoAgentSuggestion,
} from "./crypto-agent-data";
import {
  CryptoAgentAvatar,
  CryptoAgentReplyRow,
  CryptoAgentUserBubble,
} from "./crypto-agent-message";
import { CryptoAgentWelcome } from "./crypto-agent-welcome";
import { type UseCryptoAgentOptions, useCryptoAgent } from "./use-crypto-agent";
import { useFollowScroll } from "./use-follow-scroll";

export type CryptoAgentChatProps = Partial<
  Pick<
    UseCryptoAgentOptions,
    | "initialMessages"
    | "tokens"
    | "contacts"
    | "respond"
    | "onSign"
    | "waitForReceipt"
    | "onReject"
  >
> & {
  labels?: Partial<CryptoAgentLabels>;
  suggestions?: CryptoAgentSuggestion[];
  /** Connected wallet shown in the header. */
  walletAddress?: string;
  network?: string;
  /** Builds the block explorer link for a transaction hash. */
  explorerUrl?: (hash: string) => string;
  className?: string;
};

export function CryptoAgentChat({
  initialMessages = CRYPTO_AGENT_INITIAL_MESSAGES,
  tokens: tokenList = CRYPTO_AGENT_TOKENS,
  contacts = CRYPTO_AGENT_CONTACTS,
  labels: labelOverrides,
  suggestions = CRYPTO_AGENT_SUGGESTIONS,
  walletAddress = "0x7a3d9e1fb2c4a5d6e7f8091a2b3c4d5e6f70b41c",
  network = "ethereum",
  explorerUrl = (hash) => `https://etherscan.io/tx/${hash}`,
  respond,
  onSign,
  waitForReceipt,
  onReject,
  className,
}: CryptoAgentChatProps) {
  const labels = { ...CRYPTO_AGENT_LABELS, ...labelOverrides };
  const reduce = useReducedMotion() ?? false;
  const { messages, tokens, thinking, ask, approve, reject } = useCryptoAgent({
    initialMessages,
    tokens: tokenList,
    contacts,
    labels,
    respond,
    onSign,
    waitForReceipt,
    onReject,
  });
  // Only replies that arrive after mount stream in.
  const [seeded] = useState(
    () => new Set(initialMessages.map((item) => item.id)),
  );
  const total = tokens.reduce(
    (sum, item) => sum + item.balance * item.usdPrice,
    0,
  );
  const { scroller, content, pin } = useFollowScroll<
    HTMLDivElement,
    HTMLDivElement
  >(reduce);
  const send = (prompt: string) => {
    pin();
    ask(prompt);
  };
  const empty = messages.length === 0;

  return (
    <div className={cn("flex h-dvh w-full flex-col bg-background", className)}>
      <header className="flex h-16 shrink-0 items-center gap-3 px-4 sm:px-6">
        <CryptoAgentAvatar className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {labels.agentName}
          </p>
          <p className="text-xs text-muted-foreground">{labels.agentStatus}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-muted py-1 pr-3 pl-1 text-sm">
          <CryptoNetworkIcon network={network} className="size-6" />
          <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
            {shortAddress(walletAddress)}
          </span>
          <span className="font-medium text-foreground tabular-nums">
            <DigitSwap value={tradeUsd(total)} />
          </span>
        </div>
      </header>

      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
      >
        <div
          ref={content}
          role="log"
          aria-live="polite"
          className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 sm:px-8"
        >
          <AnimatePresence mode="wait" initial={false}>
            {empty ? (
              <motion.div
                key="welcome"
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="flex flex-1 flex-col"
              >
                <CryptoAgentWelcome
                  labels={labels}
                  suggestions={suggestions}
                  disabled={thinking}
                  onPick={send}
                />
              </motion.div>
            ) : (
              <motion.div
                key="thread"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="flex flex-col gap-6 py-8"
              >
                {messages.map((message) =>
                  message.role === "user" ? (
                    <CryptoAgentUserBubble
                      key={message.id}
                      text={message.text}
                    />
                  ) : (
                    <CryptoAgentReplyRow
                      key={message.id}
                      message={message}
                      stream={!seeded.has(message.id)}
                      thinkingLabel={labels.thinking}
                      card={
                        message.action ? (
                          <CryptoAgentAction
                            message={message}
                            tokens={tokens}
                            contacts={contacts}
                            labels={labels}
                            explorerUrl={explorerUrl}
                            onApprove={(approval) =>
                              approve(message.id, approval)
                            }
                            onReject={() => reject(message.id)}
                          />
                        ) : undefined
                      }
                    />
                  ),
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-2 sm:px-8 sm:pb-3">
        <AgentChatPill
          models={[]}
          showOptions={false}
          allowFileUpload={false}
          placeholder={labels.placeholder}
          status={thinking ? "streaming" : "ready"}
          onSubmit={({ text }) => send(text)}
          className="max-w-none"
        />
      </div>
    </div>
  );
}
