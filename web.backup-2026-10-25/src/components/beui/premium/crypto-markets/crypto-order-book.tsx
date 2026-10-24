"use client";

/*
 * Storyboard
 * 1. Live: about once a second resting sizes drift (changed levels flash
 *    once) and depth bars spring to the new totals. Market orders print to
 *    the tape, sliding in at the top; when one empties the best level, the
 *    book shifts a tick and the last price rolls up or down.
 * 2. Group: the pill glides and levels re-bucket.
 * 3. Inspect: hovering a level highlights every level out to it and the
 *    footer shows the average fill price and totals.
 * Reduced motion: the feed pauses; no flashes, springs, or slides.
 */

import { useRef, useState } from "react";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { CryptoTokenIcon } from "@/components/beui/premium/crypto-wallet/crypto-token-icon";
import { cn } from "@/lib/beui/utils";
import {
  bookPrice,
  bookSize,
  ORDER_BOOK_LABELS,
  ORDER_BOOK_PAIR,
  type OrderBookLabels,
  type OrderBookPair,
} from "./order-book-data";
import { OrderBookLadder } from "./order-book-ladder";
import { OrderBookTrades } from "./order-book-trades";
import { useOrderBookFeed } from "./use-order-book-feed";

export type CryptoOrderBookProps = {
  pair?: OrderBookPair;
  labels?: Partial<OrderBookLabels>;
  /** Levels shown on each side. */
  rows?: number;
  /** Simulate order flow. */
  live?: boolean;
  className?: string;
};

export function CryptoOrderBook({
  pair = ORDER_BOOK_PAIR,
  labels: labelOverrides,
  rows = 11,
  live = true,
  className,
}: CryptoOrderBookProps) {
  const labels = { ...ORDER_BOOK_LABELS, ...labelOverrides };
  const sectionRef = useRef<HTMLElement>(null);
  const feed = useOrderBookFeed(pair, sectionRef, { live });
  const [panel, setPanel] = useState<"book" | "trades">("book");
  const tick = pair.tickSize;
  const up = feed.lastSide !== "sell";
  const priceTone = up
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";

  return (
    <section
      ref={sectionRef}
      aria-label={`${pair.base}/${pair.quote} ${labels.book}`}
      className={cn(
        "w-full bg-background px-4 py-12 text-foreground sm:px-8 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 rounded-3xl border border-border bg-background px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="relative flex">
              <CryptoTokenIcon symbol={pair.base} className="size-9" />
              <CryptoTokenIcon
                symbol={pair.quote}
                className="-ml-3 size-9 rounded-full ring-2 ring-background"
              />
            </span>
            <div>
              <h2 className="text-xl font-medium">
                {pair.base}
                <span className="text-muted-foreground">/{pair.quote}</span>
              </h2>
              <p
                className={cn(
                  "text-xs tabular-nums",
                  pair.change24h >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                {pair.change24h >= 0 ? "+" : "−"}
                {Math.abs(pair.change24h).toFixed(2)}% · 24h
              </p>
            </div>
          </div>
          <p
            className={cn(
              "text-3xl font-medium tracking-tight tabular-nums",
              priceTone,
            )}
            aria-live="off"
          >
            <DigitSwap
              value={bookPrice(feed.lastPrice, tick)}
              direction={up ? "up" : "down"}
            />
          </p>
          <dl className="grid grid-cols-3 gap-6 text-xs">
            {[
              [labels.high, bookPrice(pair.high24h, tick)],
              [labels.low, bookPrice(pair.low24h, tick)],
              [labels.volume, `${bookSize(pair.volume24h, 0)} ${pair.base}`],
            ].map(([term, value]) => (
              <div key={term}>
                <dt className="text-muted-foreground">{term}</dt>
                <dd className="mt-1 font-mono tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </header>

        <Tabs
          value={panel}
          onValueChange={(value) => setPanel(value as "book" | "trades")}
          className="mt-4 lg:hidden"
        >
          <TabsList aria-label="Panels" className="flex w-full *:flex-1">
            <TabsTrigger value="book" className="h-8 w-full text-xs">
              {labels.book}
            </TabsTrigger>
            <TabsTrigger value="trades" className="h-8 w-full text-xs">
              {labels.trades}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <div
            className={cn(
              "overflow-clip rounded-3xl border border-border bg-background lg:col-span-3",
              panel !== "book" && "hidden lg:block",
            )}
          >
            <OrderBookLadder
              pair={pair}
              feed={feed}
              labels={labels}
              rows={rows}
            />
          </div>

          <div
            className={cn(
              "overflow-clip rounded-3xl border border-border bg-background pt-4 lg:col-span-2",
              panel !== "trades" && "hidden lg:block",
            )}
          >
            <h3 className="px-4 pb-2 text-sm font-medium">{labels.trades}</h3>
            <OrderBookTrades
              trades={feed.trades}
              pair={pair}
              labels={labels}
              rows={rows * 2 + 2}
            />
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Simulated order flow for demonstration. Not market data.
        </p>
      </div>
    </section>
  );
}
