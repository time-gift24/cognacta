"use client";

import { motion, useReducedMotion } from "motion/react";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { CryptoTokenIcon } from "@/components/beui/premium/crypto-wallet/crypto-token-icon";
import { SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { type TradingBalances, usd } from "./trading-data";

/**
 * Account value in the quote asset, with each holding's amount, value, and
 * share held in open orders. Values roll as fills and price ticks land.
 */
export function TerminalAssets({
  balances,
  base,
  quote,
  lastPrice,
  sizeDecimals,
  className,
}: {
  balances: TradingBalances;
  base: string;
  quote: string;
  lastPrice: number;
  sizeDecimals: number;
  className?: string;
}) {
  const holdings = [base, quote].map((asset) => {
    const entry = balances[asset] ?? { available: 0, locked: 0 };
    const amount = entry.available + entry.locked;
    const price = asset === base ? lastPrice : 1;
    return { asset, ...entry, amount, value: amount * price };
  });
  const total = holdings.reduce((sum, item) => sum + item.value, 0);
  const reduce = useReducedMotion();

  return (
    <div className={cn("p-4", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">Assets</h3>
        <span className="text-xs text-muted-foreground">Account value</span>
      </div>
      <p className="mt-2 text-2xl font-medium tracking-tight tabular-nums">
        <DigitSwap value={usd(total)} />{" "}
        <span className="text-sm text-muted-foreground">{quote}</span>
      </p>
      {/* Share of account value: base in blue over a quote-colored track. */}
      <div
        aria-hidden="true"
        className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-teal-500"
      >
        <motion.span
          className="absolute inset-0 origin-left bg-blue-500"
          initial={false}
          animate={{ scaleX: total ? holdings[0].value / total : 0.5 }}
          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
        />
      </div>
      <ul className="mt-4 space-y-3">
        {holdings.map((item, index) => (
          <li key={item.asset} className="flex items-center gap-3">
            <CryptoTokenIcon symbol={item.asset} className="size-8" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 rounded-full",
                    index === 0 ? "bg-blue-500" : "bg-teal-500",
                  )}
                />
                {item.asset}
              </p>
              <p className="font-mono text-xs text-muted-foreground tabular-nums">
                {item.locked > 0
                  ? `${usd(item.locked, item.asset === base ? sizeDecimals : 2)} in orders`
                  : "Nothing in orders"}
              </p>
            </div>
            <div className="text-right font-mono text-xs tabular-nums">
              <p className="text-sm text-foreground">
                <DigitSwap
                  value={usd(
                    item.amount,
                    item.asset === base ? sizeDecimals : 2,
                  )}
                />
              </p>
              <p className="text-muted-foreground">
                {total ? ((item.value / total) * 100).toFixed(1) : "0.0"}%
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
