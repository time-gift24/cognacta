"use client";

import { useEffect, useRef, useState } from "react";
import type { Candle } from "@/components/beui/charts/candlestick-chart";
import type { OrderBookTrade } from "@/components/beui/premium/crypto-markets/order-book-data";
import { clockLabel, sampleCandles, type Timeframe } from "./trading-data";

/** Trades folded into a candle before the demo opens the next one. */
const TRADES_PER_CANDLE = 14;

/**
 * Candles for the selected timeframe. Each new trade updates the live
 * candle's close, high, low, and volume; every few trades a new candle opens
 * at the last close so the chart keeps moving in the demo.
 */
export function useTerminalCandles(
  timeframe: Timeframe,
  latestTrade: OrderBookTrade | undefined,
  lastPrice: number,
) {
  const [candles, setCandles] = useState(() =>
    sampleCandles(timeframe, lastPrice),
  );
  const seenTrade = useRef(latestTrade?.id);
  const tradeCount = useRef(0);
  const priceRef = useRef(lastPrice);
  priceRef.current = lastPrice;

  // A new timeframe starts from a fresh history that ends at the live price.
  useEffect(() => {
    setCandles(sampleCandles(timeframe, priceRef.current));
    tradeCount.current = 0;
  }, [timeframe]);

  useEffect(() => {
    if (!latestTrade || latestTrade.id === seenTrade.current) return;
    seenTrade.current = latestTrade.id;
    tradeCount.current += 1;
    const rollOver = tradeCount.current % TRADES_PER_CANDLE === 0;
    setCandles((current) => {
      const last = current.at(-1);
      if (!last) return current;
      const updated: Candle = {
        ...last,
        close: latestTrade.price,
        high: Math.max(last.high, latestTrade.price),
        low: Math.min(last.low, latestTrade.price),
        volume: last.volume + latestTrade.size,
      };
      const next = [...current.slice(0, -1), updated];
      if (!rollOver) return next;
      const start = Number(last.id.split("-").at(-1)) + timeframe.seconds;
      return [
        ...next.slice(1),
        {
          id: `${timeframe.id}-${start}`,
          label: clockLabel(start),
          open: updated.close,
          high: updated.close,
          low: updated.close,
          close: updated.close,
          volume: 0,
        },
      ];
    });
  }, [latestTrade, timeframe]);

  return candles;
}
