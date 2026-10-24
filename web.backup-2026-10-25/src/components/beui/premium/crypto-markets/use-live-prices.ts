"use client";

import { useInView, useReducedMotion } from "motion/react";
import { type RefObject, useEffect, useState } from "react";
import type { MarketCoin } from "./markets-data";

export type LiveCoin = MarketCoin & {
  /** Direction of the latest tick, used for the flash and digit roll. */
  direction: "up" | "down" | null;
  /** Increments on every tick so the price cell can replay its flash. */
  tick: number;
};

const toLive = (coins: readonly MarketCoin[]): LiveCoin[] =>
  coins.map((coin) => ({ ...coin, direction: null, tick: 0 }));

/**
 * Simulated price feed. Every `interval` ms, a few coins take a small random
 * step; price, 24h change, and market cap stay consistent. Ticks run only
 * while `ref` is on screen and never with reduced motion. Pass `live={false}`
 * when real prices are streamed in through `coins`.
 */
export function useLivePrices(
  coins: readonly MarketCoin[],
  ref: RefObject<Element | null>,
  { live = true, interval = 2500 }: { live?: boolean; interval?: number } = {},
) {
  const reduce = useReducedMotion();
  const visible = useInView(ref, { amount: 0.1 });
  const [state, setState] = useState(() => toLive(coins));

  useEffect(() => setState(toLive(coins)), [coins]);

  useEffect(() => {
    if (!live || reduce || !visible) return;
    const timer = setInterval(() => {
      setState((current) => {
        const picks = new Set<number>();
        while (picks.size < Math.min(4, current.length))
          picks.add(Math.floor(Math.random() * current.length));
        return current.map((coin, index) => {
          if (!picks.has(index)) return coin;
          const stable = coin.categories.includes("stablecoins");
          const step = (Math.random() - 0.5) * (stable ? 0.0004 : 0.008);
          const price = coin.price * (1 + step);
          const open = coin.price / (1 + coin.change24h / 100);
          return {
            ...coin,
            price,
            change24h: (price / open - 1) * 100,
            marketCap: coin.marketCap * (1 + step),
            direction: step >= 0 ? "up" : "down",
            tick: coin.tick + 1,
          };
        });
      });
    }, interval);
    return () => clearInterval(timer);
  }, [live, reduce, visible, interval]);

  return state;
}
