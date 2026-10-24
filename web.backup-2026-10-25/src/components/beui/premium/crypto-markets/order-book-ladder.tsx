"use client";

import { type ReactNode, useId, useState } from "react";
import {
  OrderBook,
  OrderBookDepthSummary,
  OrderBookHeader,
  OrderBookSide,
  OrderBookSpread,
} from "@/components/beui/charts/order-book";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import {
  bookPrice,
  bookSize,
  groupLevels,
  ORDER_BOOK_GROUPS,
  type OrderBookLabels,
  type OrderBookPair,
} from "./order-book-data";
import type { OrderBookState } from "./use-order-book-feed";

/**
 * Pro composition over the shared OrderBook chart: grouping tabs regroup the
 * live feed into price buckets, and the chart renders depth, the spread, and
 * a summary of the depth up to the hovered level. Pass `onPriceSelect` to
 * make prices clickable, for example to fill an order ticket.
 */
export function OrderBookLadder({
  pair,
  feed,
  labels,
  rows,
  onPriceSelect,
  heading,
}: {
  pair: OrderBookPair;
  feed: OrderBookState;
  labels: OrderBookLabels;
  rows: number;
  onPriceSelect?: (price: number) => void;
  /** Replaces the default title, for example with panel tabs. */
  heading?: ReactNode;
}) {
  const id = useId();
  const [group, setGroup] = useState<number>(ORDER_BOOK_GROUPS[0]);
  const tick = pair.tickSize;
  const toLevels = (side: "ask" | "bid") =>
    groupLevels(
      side === "ask" ? feed.bestAsk : feed.bestAsk - tick,
      side === "ask" ? feed.askSizes : feed.bidSizes,
      side,
      tick,
      group,
      rows,
    ).map(({ price, size }) => ({ price, size }));
  const groupLabel = (ticks: number) =>
    bookPrice(ticks * tick, tick < 1 ? tick : 1);

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
        {heading ?? <h3 className="text-sm font-medium">{labels.book}</h3>}
        <Tabs
          value={String(group)}
          onValueChange={(value) => setGroup(Number(value))}
        >
          <TabsList aria-label={labels.grouping}>
            {ORDER_BOOK_GROUPS.map((ticks, index) => (
              <TabsTrigger
                key={ticks}
                value={String(ticks)}
                id={`${id}-group-${ticks}`}
                tabIndex={group === ticks ? 0 : -1}
                className="h-7 px-2.5 font-mono text-xs"
                onKeyDown={(event) => {
                  const step =
                    event.key === "ArrowRight"
                      ? 1
                      : event.key === "ArrowLeft"
                        ? -1
                        : 0;
                  if (!step) return;
                  event.preventDefault();
                  const next =
                    ORDER_BOOK_GROUPS[
                      (index + step + ORDER_BOOK_GROUPS.length) %
                        ORDER_BOOK_GROUPS.length
                    ];
                  setGroup(next);
                  document.getElementById(`${id}-group-${next}`)?.focus();
                }}
              >
                {groupLabel(ticks)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <OrderBook
        bids={toLevels("bid")}
        asks={toLevels("ask")}
        levels={rows}
        lastPrice={feed.lastPrice}
        baseSymbol={pair.base}
        quoteSymbol={pair.quote}
        formatPrice={(value) => bookPrice(value, tick)}
        formatSize={(value) => bookSize(value, pair.sizeDecimals)}
        onLevelSelect={
          onPriceSelect ? (level) => onPriceSelect(level.price) : undefined
        }
        label={`${labels.book}, ${pair.base}/${pair.quote}`}
        className="max-w-none rounded-none border-0"
      >
        <OrderBookHeader className="whitespace-nowrap tracking-normal normal-case" />
        <OrderBookSide side="ask" />
        <OrderBookSpread />
        <OrderBookSide side="bid" />
        <OrderBookDepthSummary placeholder={labels.hoverHint} />
      </OrderBook>
    </>
  );
}
