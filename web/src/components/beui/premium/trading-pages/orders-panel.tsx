"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { CryptoTokenIcon } from "@/components/beui/premium/crypto-wallet/crypto-token-icon";
import { EASE_IN, EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  type TradingBalances,
  type TradingLabels,
  type TradingOrder,
  usd,
} from "./trading-data";

type Panel = "open" | "history" | "balances";

const STATUS_TONE: Record<TradingOrder["status"], string> = {
  open: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  filled:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "border-border bg-muted text-muted-foreground",
};

function Th({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "h-9 px-3 text-left text-xs font-normal text-muted-foreground",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function OrdersPanel({
  orders,
  balances,
  base,
  quote,
  sizeDecimals,
  lastFilled,
  labels,
  onCancel,
}: {
  orders: readonly TradingOrder[];
  balances: TradingBalances;
  base: string;
  quote: string;
  sizeDecimals: number;
  /** Most recently filled order id; its history row flashes. */
  lastFilled: string | null;
  labels: TradingLabels;
  onCancel: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const [panel, setPanel] = useState<Panel>("open");
  const open = orders.filter((order) => order.status === "open");
  const history = orders.filter((order) => order.status !== "open");
  const rows = panel === "open" ? open : history;

  const rowMotion = {
    layout: reduce ? false : ("position" as const),
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: -8 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: EASE_OUT },
    },
    exit: { opacity: 0, transition: { duration: 0.15, ease: EASE_IN } },
    transition: SPRING_LAYOUT,
  };

  return (
    <div>
      <div className="px-3 pt-3">
        <Tabs
          value={panel}
          onValueChange={(value) => setPanel(value as Panel)}
          variant="underline"
        >
          <TabsList aria-label="Account" className="w-full">
            <TabsTrigger value="open" className="min-h-9 gap-1.5 text-xs">
              {labels.openOrders}
              <span className="font-mono text-muted-foreground tabular-nums">
                {open.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="history" className="min-h-9 text-xs">
              {labels.history}
            </TabsTrigger>
            <TabsTrigger value="balances" className="min-h-9 text-xs">
              {labels.balances}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Positioned so absolutely placed children, such as sr-only labels, stay inside the scroller. */}
      <div className="relative overflow-x-auto">
        {panel === "balances" ? (
          <table className="w-full min-w-md border-collapse">
            <thead>
              <tr>
                <Th>{labels.asset}</Th>
                <Th className="text-right">{labels.available}</Th>
                <Th className="text-right">{labels.locked}</Th>
              </tr>
            </thead>
            <tbody>
              {[base, quote].map((asset) => (
                <tr
                  key={asset}
                  className="border-t border-border font-mono text-xs tabular-nums"
                >
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2 font-sans text-sm">
                      <CryptoTokenIcon symbol={asset} className="size-6" />
                      {asset}
                    </span>
                  </td>
                  <td className="px-3 text-right">
                    <DigitSwap
                      value={usd(
                        balances[asset]?.available ?? 0,
                        asset === base ? sizeDecimals : 2,
                      )}
                    />
                  </td>
                  <td className="px-3 text-right text-muted-foreground">
                    <DigitSwap
                      value={usd(
                        balances[asset]?.locked ?? 0,
                        asset === base ? sizeDecimals : 2,
                      )}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-xl border-collapse">
            <thead>
              <tr>
                <Th>{labels.time}</Th>
                <Th>{labels.side}</Th>
                <Th>{labels.type}</Th>
                <Th className="text-right">{labels.price}</Th>
                <Th className="text-right">{labels.amount}</Th>
                <Th className="text-right">{labels.total}</Th>
                <Th className="text-right">
                  {panel === "open" ? (
                    <span className="sr-only">{labels.cancel}</span>
                  ) : (
                    labels.status
                  )}
                </Th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false} mode="popLayout">
                {rows.map((order) => (
                  <motion.tr
                    key={order.id}
                    {...rowMotion}
                    className="relative border-t border-border font-mono text-xs tabular-nums"
                  >
                    <td className="px-3 py-2 text-muted-foreground">
                      {order.time}
                    </td>
                    <td
                      className={cn(
                        "px-3 font-sans",
                        order.side === "buy"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {order.side === "buy" ? labels.buy : labels.sell}
                    </td>
                    <td className="px-3 font-sans">
                      {order.type === "limit" ? labels.limit : labels.market}
                    </td>
                    <td className="px-3 text-right">{usd(order.price)}</td>
                    <td className="px-3 text-right">
                      {usd(order.amount, sizeDecimals)} {base}
                    </td>
                    <td className="px-3 text-right">
                      {usd(order.price * order.amount)} {quote}
                    </td>
                    <td className="px-3 text-right">
                      {order.status === "open" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onCancel(order.id)}
                          aria-label={`${labels.cancel} ${order.side} ${usd(order.amount, sizeDecimals)} ${base} at ${usd(order.price)}`}
                          className="h-7 px-2.5 font-sans text-xs"
                        >
                          {labels.cancel}
                        </Button>
                      ) : (
                        <span className="relative inline-flex">
                          {order.id === lastFilled && !reduce ? (
                            <motion.span
                              aria-hidden="true"
                              className="absolute -inset-1 rounded-full bg-emerald-500/30"
                              initial={{ opacity: 1, scale: 0.8 }}
                              animate={{ opacity: 0, scale: 1.3 }}
                              transition={{ duration: 0.9, ease: EASE_OUT }}
                            />
                          ) : null}
                          <span
                            className={cn(
                              "relative rounded-full border px-2 py-0.5 font-sans",
                              STATUS_TONE[order.status],
                            )}
                          >
                            {order.status === "filled" ? "Filled" : "Cancelled"}
                          </span>
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
        {panel !== "balances" && !rows.length ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {panel === "open" ? labels.noOpenOrders : labels.noHistory}
          </p>
        ) : null}
      </div>
    </div>
  );
}
