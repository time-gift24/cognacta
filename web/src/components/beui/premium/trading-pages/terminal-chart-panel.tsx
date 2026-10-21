"use client";

import { useId } from "react";
import type { Candle } from "@/components/beui/charts/candlestick-chart";
import {
  CandlestickChart,
  CandlestickChartLegend,
  CandlestickChartPlot,
} from "@/components/beui/charts/candlestick-chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import type { OrderBookPair } from "@/components/beui/premium/crypto-markets/order-book-data";
import { TIMEFRAMES, type Timeframe, type TradingLabels } from "./trading-data";
import { useElementHeight } from "./use-element-height";

/** Timeframe tabs, OHLC readout, and the live candlestick plot. */
export function TerminalChartPanel({
  pair,
  candles,
  lastPrice,
  timeframe,
  setTimeframe,
  formatPrice,
  labels,
}: {
  pair: OrderBookPair;
  candles: readonly Candle[];
  lastPrice: number;
  timeframe: Timeframe;
  setTimeframe: (timeframe: Timeframe) => void;
  formatPrice: (value: number) => string;
  labels: TradingLabels;
}) {
  const id = useId();
  const [plotRef, plotHeight] = useElementHeight<HTMLDivElement>(360);
  return (
    <CandlestickChart
      candles={candles}
      lastPrice={lastPrice}
      formatPrice={formatPrice}
      label={`${pair.base}/${pair.quote} price, ${timeframe.label} candles`}
      className="flex h-full flex-col"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={timeframe.id}
          onValueChange={(value) =>
            setTimeframe(
              TIMEFRAMES.find((item) => item.id === value) ?? TIMEFRAMES[0],
            )
          }
        >
          <TabsList aria-label={labels.timeframe}>
            {TIMEFRAMES.map((item, index) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                id={`${id}-tf-${item.id}`}
                tabIndex={timeframe.id === item.id ? 0 : -1}
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
                    TIMEFRAMES[
                      (index + step + TIMEFRAMES.length) % TIMEFRAMES.length
                    ];
                  setTimeframe(next);
                  document.getElementById(`${id}-tf-${next.id}`)?.focus();
                }}
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <CandlestickChartLegend />
      </div>
      {/* The plot fills whatever height the panel row gives it. */}
      <div ref={plotRef} className="relative mt-4 min-h-80 flex-1">
        <CandlestickChartPlot
          height={plotHeight}
          className="absolute inset-0"
        />
      </div>
    </CandlestickChart>
  );
}
