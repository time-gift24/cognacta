"use client";

/*
 * Storyboard
 * 1. Live: one simulated feed drives everything. Trades print to the tape,
 *    the live candle and last-price line spring to each fill, depth bars
 *    spring, and the header price rolls up or down.
 * 2. Click a book price: the ticket's price field takes it and flashes.
 * 3. Place: the button confirms, the order rises into Open orders (limit) or
 *    History (market), and balances roll. Resting limits fill when the
 *    market trades through them, moving to History with a pulse.
 * 4. Crosshair: pointer or arrow keys on the chart update the OHLC readout.
 * Reduced motion: the feed pauses; values change in place without springs.
 */

import { useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import {
  bookPrice,
  ORDER_BOOK_LABELS,
  ORDER_BOOK_PAIR,
  type OrderBookPair,
} from "@/components/beui/premium/crypto-markets/order-book-data";
import { OrderBookLadder } from "@/components/beui/premium/crypto-markets/order-book-ladder";
import { OrderBookTrades } from "@/components/beui/premium/crypto-markets/order-book-trades";
import { useOrderBookFeed } from "@/components/beui/premium/crypto-markets/use-order-book-feed";
import { demoConfirm } from "@/components/beui/premium/crypto-wallet/use-trade-submit";
import { cn } from "@/lib/beui/utils";
import { OrdersPanel } from "./orders-panel";
import { TerminalAssets } from "./terminal-assets";
import { TerminalChartPanel } from "./terminal-chart-panel";
import { TerminalHeader } from "./terminal-header";
import { TradeTicket } from "./trade-ticket";
import {
  type PlaceOrderRequest,
  TIMEFRAMES,
  TRADING_BALANCES,
  TRADING_LABELS,
  TRADING_ORDERS,
  type TradingBalances,
  type TradingLabels,
  type TradingOrder,
} from "./trading-data";
import { useTerminalCandles } from "./use-terminal-candles";
import { useTerminalOrders } from "./use-terminal-orders";

export type TradingTerminalProps = {
  pair?: OrderBookPair;
  balances?: TradingBalances;
  orders?: readonly TradingOrder[];
  labels?: Partial<TradingLabels>;
  /** Simulate market data. */
  live?: boolean;
  /** Called before the simulated fill; return a promise to hold the button. */
  onPlaceOrder?: (request: PlaceOrderRequest) => unknown;
  className?: string;
};

const PANEL = "rounded-2xl border border-border bg-background";

export function TradingTerminal({
  pair = ORDER_BOOK_PAIR,
  balances = TRADING_BALANCES,
  orders = TRADING_ORDERS,
  labels: labelOverrides,
  live = true,
  onPlaceOrder,
  className,
}: TradingTerminalProps) {
  const labels = { ...TRADING_LABELS, ...labelOverrides };
  const sectionRef = useRef<HTMLElement>(null);
  const feed = useOrderBookFeed(pair, sectionRef, { live });
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[0]);
  const candles = useTerminalCandles(timeframe, feed.trades[0], feed.lastPrice);
  const account = useTerminalOrders(
    pair.base,
    pair.quote,
    balances,
    orders,
    feed.lastPrice,
  );
  const priceDecimals = String(pair.tickSize).split(".")[1]?.length ?? 0;
  const [price, setPrice] = useState(pair.price.toFixed(priceDecimals));
  const [priceFlash, setPriceFlash] = useState(0);
  const [bookPanel, setBookPanel] = useState<"book" | "trades">("book");

  const up = feed.lastSide !== "sell";
  const formatPrice = (value: number) => bookPrice(value, pair.tickSize);

  const place = async (request: PlaceOrderRequest) => {
    await (onPlaceOrder?.(request) ?? demoConfirm());
    account.place(request);
  };

  const bookTabs = (
    <Tabs
      value={bookPanel}
      onValueChange={(value) => setBookPanel(value as "book" | "trades")}
      variant="underline"
    >
      <TabsList aria-label="Market panels">
        <TabsTrigger value="book" className="min-h-9 text-xs">
          {labels.book}
        </TabsTrigger>
        <TabsTrigger value="trades" className="min-h-9 text-xs">
          {labels.trades}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return (
    <section
      ref={sectionRef}
      aria-label={`${pair.base}/${pair.quote} trading terminal`}
      className={cn(
        // A faint tint behind the page lets the panels read as surfaces.
        "w-full bg-muted/40 px-3 py-6 text-foreground sm:px-6 sm:py-8 dark:bg-muted/20",
        className,
      )}
    >
      <div className="mx-auto max-w-7xl">
        <TerminalHeader
          pair={pair}
          lastPrice={feed.lastPrice}
          up={up}
          className={PANEL}
        />

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem_20rem]">
          <div
            className={cn(
              PANEL,
              "order-1 flex min-w-0 flex-col p-4 xl:order-none",
            )}
          >
            <TerminalChartPanel
              pair={pair}
              candles={candles}
              lastPrice={feed.lastPrice}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              formatPrice={formatPrice}
              labels={labels}
            />
          </div>

          <div className={cn(PANEL, "order-3 overflow-clip xl:order-none")}>
            {bookPanel === "book" ? (
              <OrderBookLadder
                pair={pair}
                feed={feed}
                labels={ORDER_BOOK_LABELS}
                rows={9}
                heading={bookTabs}
                onPriceSelect={(selected) => {
                  setPrice(selected.toFixed(priceDecimals));
                  setPriceFlash((count) => count + 1);
                }}
              />
            ) : (
              <>
                <div className="px-4 pt-4 pb-2">{bookTabs}</div>
                <OrderBookTrades
                  trades={feed.trades}
                  pair={pair}
                  labels={ORDER_BOOK_LABELS}
                  rows={22}
                />
              </>
            )}
          </div>

          <div className="order-2 flex flex-col gap-3 xl:order-none">
            <div className={PANEL}>
              <TradeTicket
                base={pair.base}
                quote={pair.quote}
                priceDecimals={priceDecimals}
                sizeDecimals={pair.sizeDecimals}
                bestAsk={feed.bestAsk}
                bestBid={feed.bestAsk - pair.tickSize}
                balances={account.balances}
                labels={labels}
                price={price}
                onPriceChange={setPrice}
                priceFlash={priceFlash}
                onPlace={place}
              />
            </div>
            <div className={cn(PANEL, "flex-1")}>
              <TerminalAssets
                balances={account.balances}
                base={pair.base}
                quote={pair.quote}
                lastPrice={feed.lastPrice}
                sizeDecimals={pair.sizeDecimals}
              />
            </div>
          </div>

          <div
            className={cn(
              PANEL,
              "order-4 min-w-0 lg:col-span-2 xl:order-none xl:col-span-3",
            )}
          >
            <OrdersPanel
              orders={account.orders}
              balances={account.balances}
              base={pair.base}
              quote={pair.quote}
              sizeDecimals={pair.sizeDecimals}
              lastFilled={account.lastFilled}
              labels={labels}
              onCancel={account.cancel}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Simulated market and account for demonstration. Not market data, and
          no real orders are placed.
        </p>
      </div>
    </section>
  );
}
