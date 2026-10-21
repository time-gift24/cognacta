"use client";

import { useInView, useReducedMotion } from "motion/react";
import { type RefObject, useEffect, useState } from "react";
import {
  initialSizes,
  initialTrades,
  levelSize,
  ORDER_BOOK_DEPTH,
  type OrderBookPair,
  type OrderBookTrade,
} from "./order-book-data";

export type OrderBookState = {
  /** Best ask; the best bid sits one tick below. */
  bestAsk: number;
  askSizes: number[];
  bidSizes: number[];
  trades: OrderBookTrade[];
  lastPrice: number;
  lastSide: "buy" | "sell" | null;
};

const initialState = (pair: OrderBookPair): OrderBookState => ({
  bestAsk: pair.price,
  askSizes: initialSizes(11),
  bidSizes: initialSizes(23),
  trades: initialTrades(pair),
  lastPrice: pair.price,
  lastSide: null,
});

function step(state: OrderBookState, tick: number, now: Date): OrderBookState {
  const askSizes = [...state.askSizes];
  const bidSizes = [...state.bidSizes];
  let { bestAsk } = state;

  // Resting liquidity near the top of the book drifts.
  for (let index = 0; index < 8; index++) {
    const sizes = Math.random() > 0.5 ? askSizes : bidSizes;
    const level = Math.floor(Math.random() ** 2 * 40);
    sizes[level] =
      Math.random() > 0.7
        ? levelSize(Math.random)
        : sizes[level] * (0.5 + Math.random());
  }

  if (Math.random() > 0.4) return { ...state, askSizes, bidSizes };

  // A market order hits the best level; an emptied level moves the price.
  const side: "buy" | "sell" = Math.random() > 0.5 ? "buy" : "sell";
  const book = side === "buy" ? askSizes : bidSizes;
  const size = Math.min(book[0], 0.02 + Math.random() * 3);
  const price = side === "buy" ? bestAsk : bestAsk - tick;
  book[0] -= size;
  if (book[0] < 0.01) {
    book.shift();
    book.push(levelSize(Math.random));
    const other = side === "buy" ? bidSizes : askSizes;
    other.unshift(levelSize(Math.random));
    other.length = ORDER_BOOK_DEPTH;
    bestAsk += side === "buy" ? tick : -tick;
  }
  const trade: OrderBookTrade = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    side,
    price,
    size,
    time: now.toLocaleTimeString("en-US", { hour12: false }),
  };
  return {
    bestAsk,
    askSizes,
    bidSizes,
    trades: [trade, ...state.trades].slice(0, 30),
    lastPrice: price,
    lastSide: side,
  };
}

/**
 * Simulated order flow for a pair. Updates every `interval` ms while `ref` is
 * on screen and never with reduced motion. Starts from a deterministic book.
 */
export function useOrderBookFeed(
  pair: OrderBookPair,
  ref: RefObject<Element | null>,
  { live = true, interval = 900 }: { live?: boolean; interval?: number } = {},
) {
  const reduce = useReducedMotion();
  const visible = useInView(ref, { amount: 0.1 });
  const [state, setState] = useState(() => initialState(pair));

  useEffect(() => setState(initialState(pair)), [pair]);

  useEffect(() => {
    if (!live || reduce || !visible) return;
    const timer = setInterval(
      () => setState((current) => step(current, pair.tickSize, new Date())),
      interval,
    );
    return () => clearInterval(timer);
  }, [live, reduce, visible, interval, pair.tickSize]);

  return state;
}
