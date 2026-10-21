"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import {
  bookPrice,
  bookSize,
  ORDER_BOOK_LABELS,
  type OrderBookPair,
} from "@/components/beui/premium/crypto-markets/order-book-data";
import { CryptoTokenIcon } from "@/components/beui/premium/crypto-wallet/crypto-token-icon";
import { SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

const UP = "text-emerald-600 dark:text-emerald-400";
const DOWN = "text-red-600 dark:text-red-400";

/**
 * Pair, rolling last price with a change pill, 24h stats, and a low-to-high
 * range bar whose marker springs to the live price.
 */
export function TerminalHeader({
  pair,
  lastPrice,
  up,
  className,
}: {
  pair: OrderBookPair;
  lastPrice: number;
  /** Direction of the last trade, which colors and rolls the price. */
  up: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const formatPrice = (value: number) => bookPrice(value, pair.tickSize);
  const gaining = pair.change24h >= 0;
  const Trend = gaining ? ArrowUpRight : ArrowDownRight;
  const span = pair.high24h - pair.low24h;
  const position = span
    ? Math.min(100, Math.max(0, ((lastPrice - pair.low24h) / span) * 100))
    : 50;

  return (
    <header
      className={cn(
        className,
        "flex flex-wrap items-center gap-x-6 gap-y-4 px-4 py-3 lg:flex-nowrap",
      )}
    >
      <div className="flex shrink-0 items-center gap-3">
        <span className="flex">
          <CryptoTokenIcon symbol={pair.base} className="size-9" />
          <CryptoTokenIcon
            symbol={pair.quote}
            className="-ml-3 size-9 rounded-full ring-2 ring-background"
          />
        </span>
        <div>
          <h2 className="text-xl font-medium leading-tight">
            {pair.base}
            <span className="text-muted-foreground">/{pair.quote}</span>
          </h2>
          <p className="text-xs text-muted-foreground">Spot</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 lg:border-l lg:border-border lg:pl-6">
        <p
          className={cn(
            "text-2xl font-medium tracking-tight tabular-nums",
            up ? UP : DOWN,
          )}
        >
          <DigitSwap
            value={formatPrice(lastPrice)}
            direction={up ? "up" : "down"}
          />
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs tabular-nums",
            gaining
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
          )}
        >
          <Trend className="size-3" aria-hidden="true" />
          {Math.abs(pair.change24h).toFixed(2)}%
        </span>
      </div>

      <div className="min-w-48 flex-1 lg:max-w-xs">
        <div className="flex justify-between font-mono text-xs text-muted-foreground tabular-nums">
          <span>
            <span className="sr-only">{ORDER_BOOK_LABELS.low} </span>
            {formatPrice(pair.low24h)}
          </span>
          <span className="font-sans">24h range</span>
          <span>
            <span className="sr-only">{ORDER_BOOK_LABELS.high} </span>
            {formatPrice(pair.high24h)}
          </span>
        </div>
        {/* biome-ignore lint/a11y/useSemanticElements: A native meter cannot render the gradient track and moving marker. */}
        <div
          role="meter"
          aria-label="Last price within the 24h range"
          aria-valuemin={pair.low24h}
          aria-valuemax={pair.high24h}
          aria-valuenow={lastPrice}
          aria-valuetext={`${formatPrice(lastPrice)}, between ${formatPrice(pair.low24h)} and ${formatPrice(pair.high24h)}`}
          className="relative mt-1.5 h-1.5 rounded-full bg-gradient-to-r from-red-500/40 via-amber-500/40 to-emerald-500/50"
        >
          {/* Full-width layer so a percent translate maps onto the track. */}
          <motion.div
            className="absolute inset-0"
            initial={false}
            animate={{ x: `${position}%` }}
            transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
          >
            <span className="absolute top-1/2 left-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground" />
          </motion.div>
        </div>
      </div>

      <dl className="flex shrink-0 gap-6 text-xs lg:ml-auto">
        <div>
          <dt className="text-muted-foreground">{ORDER_BOOK_LABELS.volume}</dt>
          <dd className="mt-0.5 font-mono tabular-nums">
            {bookSize(pair.volume24h, 0)} {pair.base}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">24h value</dt>
          <dd className="mt-0.5 font-mono tabular-nums">
            {new Intl.NumberFormat("en-US", {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(pair.volume24h * lastPrice)}{" "}
            {pair.quote}
          </dd>
        </div>
      </dl>
    </header>
  );
}
