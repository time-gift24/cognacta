"use client";

import { useEffect, useRef, useState } from "react";
import {
  type PlaceOrderRequest,
  TRADING_FEE,
  type TradingBalances,
  type TradingOrder,
} from "./trading-data";

const nowLabel = () =>
  new Date().toLocaleTimeString("en-US", { hour12: false });

/**
 * Simulated account: market orders fill at once, limit orders lock funds and
 * fill when the last price crosses them, and cancelling releases the lock.
 */
export function useTerminalOrders(
  base: string,
  quote: string,
  initialBalances: TradingBalances,
  initialOrders: readonly TradingOrder[],
  lastPrice: number,
) {
  const [balances, setBalances] = useState(() =>
    structuredClone(initialBalances),
  );
  const [orders, setOrders] = useState(() => [...initialOrders]);
  const [lastFilled, setLastFilled] = useState<string | null>(null);
  const counter = useRef(0);

  const move = (asset: string, available: number, locked = 0) =>
    setBalances((current) => {
      const entry = current[asset] ?? { available: 0, locked: 0 };
      return {
        ...current,
        [asset]: {
          available: Math.max(0, entry.available + available),
          locked: Math.max(0, entry.locked + locked),
        },
      };
    });

  const settle = (order: TradingOrder, fromLocked: boolean) => {
    const total = order.price * order.amount;
    if (order.side === "buy") {
      move(quote, fromLocked ? 0 : -total, fromLocked ? -total : 0);
      move(base, order.amount * (1 - TRADING_FEE));
    } else {
      move(
        base,
        fromLocked ? 0 : -order.amount,
        fromLocked ? -order.amount : 0,
      );
      move(quote, total * (1 - TRADING_FEE));
    }
  };

  const place = (request: PlaceOrderRequest) => {
    counter.current += 1;
    const order: TradingOrder = {
      id: `new-${counter.current}`,
      ...request,
      status: request.type === "market" ? "filled" : "open",
      time: nowLabel(),
    };
    if (order.type === "market") settle(order, false);
    else if (order.side === "buy")
      move(quote, -order.price * order.amount, order.price * order.amount);
    else move(base, -order.amount, order.amount);
    setOrders((current) => [order, ...current]);
    if (order.type === "market") setLastFilled(order.id);
  };

  const cancel = (id: string) => {
    const order = orders.find(
      (item) => item.id === id && item.status === "open",
    );
    if (!order) return;
    if (order.side === "buy")
      move(quote, order.price * order.amount, -order.price * order.amount);
    else move(base, order.amount, -order.amount);
    setOrders((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: "cancelled" } : item,
      ),
    );
  };

  // Fill resting limit orders once the market trades through them.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only a new price should trigger fills.
  useEffect(() => {
    const crossed = orders.filter(
      (order) =>
        order.status === "open" &&
        order.type === "limit" &&
        (order.side === "buy"
          ? lastPrice <= order.price
          : lastPrice >= order.price),
    );
    if (!crossed.length) return;
    for (const order of crossed) settle(order, true);
    const ids = new Set(crossed.map((order) => order.id));
    setOrders((current) =>
      current.map((order) =>
        ids.has(order.id) ? { ...order, status: "filled" } : order,
      ),
    );
    setLastFilled(crossed[0].id);
  }, [lastPrice]);

  return { balances, orders, place, cancel, lastFilled };
}
