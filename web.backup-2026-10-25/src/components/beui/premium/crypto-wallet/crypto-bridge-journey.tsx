"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_IN_OUT, EASE_OUT, SPRING_BOUNCE } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type { CryptoBridgeStage } from "./crypto-bridge-data";
import { CryptoTokenIcon } from "./crypto-token-icon";
import type { CryptoTradeToken } from "./crypto-trade-data";

const FILL: Record<CryptoBridgeStage, number> = {
  sign: 0,
  sent: 0.2,
  relay: 0.88,
  received: 1,
};

function TokenNode({
  token,
  amount,
  network,
  live,
  done,
}: {
  token: CryptoTradeToken;
  amount: string;
  network: string;
  live: boolean;
  done?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="flex w-28 shrink-0 flex-col items-center text-center">
      <span className="relative grid size-14 place-items-center">
        {live && !reduce ? (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-foreground/10"
            animate={{ scale: [1, 1.35], opacity: [0.9, 0] }}
            transition={{
              duration: 1.4,
              ease: EASE_OUT,
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        ) : null}
        <CryptoTokenIcon
          symbol={token.symbol}
          network={token.network}
          className="size-12"
        />
        <AnimatePresence>
          {done ? (
            <motion.span
              initial={reduce ? { opacity: 0 } : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={SPRING_BOUNCE}
              className="absolute -top-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-foreground text-background ring-2 ring-background"
            >
              <Check className="size-3" strokeWidth={3} aria-hidden="true" />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </span>
      <span className="mt-2 whitespace-nowrap text-sm font-medium text-foreground tabular-nums">
        {amount}
      </span>
      <span className="text-xs text-muted-foreground">{network}</span>
    </div>
  );
}

/*
 * Source and destination tokens joined by a connector. The connector fills
 * as each stage lands; while the solver relays, light trails stream across
 * and the active side pulses.
 */
export function CryptoBridgeJourney({
  from,
  to,
  amountIn,
  amountOut,
  fromNetwork,
  toNetwork,
  stage,
  relayMs,
}: {
  from: CryptoTradeToken;
  to: CryptoTradeToken;
  amountIn: string;
  amountOut: string;
  fromNetwork: string;
  toNetwork: string;
  stage: CryptoBridgeStage;
  relayMs: number;
}) {
  const reduce = useReducedMotion();
  const relaying = stage === "relay";
  const done = stage === "received";
  return (
    <div className="flex items-start">
      <TokenNode
        token={from}
        amount={`−${amountIn}`}
        network={fromNetwork}
        live={stage === "sign" || stage === "sent"}
      />
      <div className="relative mt-7 h-0.5 flex-1 overflow-hidden rounded-full bg-border">
        <motion.span
          initial={false}
          animate={{ scaleX: FILL[stage] }}
          transition={
            reduce
              ? { duration: 0 }
              : relaying
                ? { duration: relayMs / 1000, ease: "linear" }
                : { duration: 0.6, ease: EASE_OUT }
          }
          className={cn(
            "absolute inset-0 origin-left rounded-full transition-colors duration-500",
            done ? "bg-foreground" : "bg-foreground/35",
          )}
        />
        {relaying && !reduce
          ? [0, 1].map((trail) => (
              <motion.span
                key={trail}
                aria-hidden="true"
                className="absolute inset-0"
                initial={{ x: "-30%" }}
                animate={{ x: "100%" }}
                transition={{
                  duration: 1.2,
                  ease: EASE_IN_OUT,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: trail * 0.6,
                }}
              >
                <span className="absolute top-0 left-0 h-full w-1/4 rounded-full bg-gradient-to-r from-transparent via-foreground to-transparent" />
              </motion.span>
            ))
          : null}
      </div>
      <TokenNode
        token={to}
        amount={`${done ? "+" : ""}${amountOut}`}
        network={toNetwork}
        live={relaying}
        done={done}
      />
    </div>
  );
}
