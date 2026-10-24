"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  bookPrice,
  bookSize,
  type OrderBookLabels,
  type OrderBookPair,
  type OrderBookTrade,
} from "./order-book-data";

/** Recent fills, newest first. New trades slide in at the top and nudge the rest down. */
export function OrderBookTrades({
  trades,
  pair,
  labels,
  rows = 24,
}: {
  trades: readonly OrderBookTrade[];
  pair: OrderBookPair;
  labels: OrderBookLabels;
  rows?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <table className="w-full table-fixed border-collapse">
      <caption className="sr-only">{labels.trades}</caption>
      <thead>
        <tr className="h-8 text-xs text-muted-foreground">
          <th scope="col" className="pl-4 text-left font-normal">
            {labels.price(pair.quote)}
          </th>
          <th scope="col" className="text-right font-normal">
            {labels.size(pair.base)}
          </th>
          <th scope="col" className="pr-4 text-right font-normal">
            {labels.time}
          </th>
        </tr>
      </thead>
      <tbody>
        <AnimatePresence initial={false} mode="popLayout">
          {trades.slice(0, rows).map((trade) => (
            <motion.tr
              key={trade.id}
              layout={reduce ? false : "position"}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.3, ease: EASE_OUT },
              }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={SPRING_LAYOUT}
              className="h-7 font-mono text-xs tabular-nums"
            >
              <td
                className={cn(
                  "pl-4",
                  trade.side === "buy"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                {bookPrice(trade.price, pair.tickSize)}
              </td>
              <td className="text-right">
                {bookSize(trade.size, pair.sizeDecimals)}
              </td>
              <td className="pr-4 text-right text-muted-foreground">
                {trade.time}
              </td>
            </motion.tr>
          ))}
        </AnimatePresence>
      </tbody>
    </table>
  );
}
