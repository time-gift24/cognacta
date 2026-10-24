"use client";

import { Check, ExternalLink, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { EASE_OUT, SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type {
  CryptoBridgeLabels,
  CryptoBridgeRequest,
  CryptoBridgeStage,
} from "./crypto-bridge-data";
import { CryptoBridgeJourney } from "./crypto-bridge-journey";
import type { CryptoTradeToken } from "./crypto-trade-data";
import { tradeAmount } from "./crypto-trade-data";

const STAGES: CryptoBridgeStage[] = ["sign", "sent", "relay", "received"];

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

const clock = (ms: number) => {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

function StageMark({ state }: { state: "done" | "running" | "idle" }) {
  return (
    <span className="grid size-5 shrink-0 place-items-center">
      <AnimatePresence mode="popLayout" initial={false}>
        {state === "done" ? (
          <motion.span
            key="done"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={SPRING_SWAP}
            className="grid size-5 place-items-center rounded-full bg-foreground text-background"
          >
            <Check className="size-3" strokeWidth={3} aria-hidden="true" />
          </motion.span>
        ) : state === "running" ? (
          <motion.span
            key="running"
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="size-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground motion-reduce:animate-none"
          />
        ) : (
          <span key="idle" className="size-2 rounded-full bg-border" />
        )}
      </AnimatePresence>
    </span>
  );
}

export function CryptoBridgeTransfer({
  request,
  stage,
  hash,
  failed,
  startedAt,
  from,
  to,
  fromNetwork,
  toNetwork,
  recipient,
  relayMs,
  labels,
  explorerUrl,
  onReset,
}: {
  request: CryptoBridgeRequest;
  stage: CryptoBridgeStage;
  hash?: string;
  failed?: boolean;
  startedAt: Partial<Record<CryptoBridgeStage, number>>;
  from: CryptoTradeToken;
  to: CryptoTradeToken;
  fromNetwork: string;
  toNetwork: string;
  /** Display name for who receives the funds. */
  recipient: string;
  relayMs: number;
  labels: CryptoBridgeLabels;
  explorerUrl?: (hash: string) => string;
  onReset: () => void;
}) {
  const reduce = useReducedMotion();
  const done = stage === "received";
  const now = useNow(!done && !failed);
  const current = STAGES.indexOf(stage);
  const amountIn = `${tradeAmount(request.amountIn, from.precision)} ${from.symbol}`;
  const amountOut = `${tradeAmount(request.amountOut, to.precision)} ${to.symbol}`;
  const remaining = Math.max(
    0,
    Math.ceil((relayMs - (now - (startedAt.relay ?? now))) / 1000),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl border border-border px-3 pt-5 pb-4">
        <CryptoBridgeJourney
          from={from}
          to={to}
          amountIn={amountIn}
          amountOut={amountOut}
          fromNetwork={fromNetwork}
          toNetwork={toNetwork}
          stage={stage}
          relayMs={relayMs}
        />
      </div>

      <ol className="flex flex-col gap-3 px-2" aria-live="polite">
        {STAGES.map((item, index) => {
          const state =
            index < current || (done && index === current)
              ? "done"
              : index === current && !failed
                ? "running"
                : "idle";
          const began = startedAt[item];
          const ended = startedAt[STAGES[index + 1]];
          return (
            <li
              key={item}
              aria-current={state === "running" ? "step" : undefined}
              className="flex items-center gap-3"
            >
              <StageMark state={state} />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium transition-colors duration-300",
                    state === "idle"
                      ? "text-muted-foreground"
                      : "text-foreground",
                  )}
                >
                  {labels.stages[item]}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {labels.stageDetail[item](
                    item === "received" ? toNetwork : fromNetwork,
                  )}
                </p>
              </div>
              <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                {item === "relay" && state === "running" ? (
                  <>
                    <DigitSwap value={`${remaining}s`} /> {labels.timeLeft}
                  </>
                ) : began && item !== "received" ? (
                  clock((ended ?? now) - began)
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>

      <AnimatePresence initial={false}>
        {done || failed ? (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="flex flex-col gap-3"
          >
            <p
              className={cn(
                "px-2 text-sm",
                failed ? "text-destructive" : "text-foreground",
              )}
            >
              {failed
                ? labels.failed
                : labels.received(amountOut, toNetwork, recipient)}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {hash && explorerUrl ? (
                <ButtonLink
                  href={explorerUrl(hash)}
                  target="_blank"
                  rel="noreferrer"
                  variant="outline"
                  className="h-11 gap-1.5"
                >
                  {labels.viewTx}
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </ButtonLink>
              ) : (
                <span />
              )}
              <Button type="button" onClick={onReset} className="h-11 gap-1.5">
                <RotateCcw className="size-3.5" aria-hidden="true" />
                {labels.again}
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
