"use client";

import { ChevronDown, Clock, Zap } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { SPRING_LAYOUT, SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  bridgeEta,
  type CryptoBridgeLabels,
  type CryptoBridgeRoute,
  quoteBridge,
} from "./crypto-bridge-data";
import { tradeAmount, tradeUsd } from "./crypto-trade-data";
import { tradeRevealVariants } from "./crypto-trade-motion";
import { TradeDetailRow } from "./crypto-trade-parts";

/*
 * Route summary: one row with the chosen route, time, and fee. Opening it
 * reveals every route with what it delivers (the selected outline glides
 * between them) and the rate and minimum received.
 */
export function CryptoBridgeRouteSummary({
  routes,
  value,
  from,
  to,
  amountIn,
  labels,
  onChange,
}: {
  routes: CryptoBridgeRoute[];
  value: CryptoBridgeRoute;
  from: Parameters<typeof quoteBridge>[0];
  to: Parameters<typeof quoteBridge>[1];
  amountIn: number;
  labels: CryptoBridgeLabels;
  onChange: (route: string) => void;
}) {
  const reduce = useReducedMotion();
  const id = useId();
  const [open, setOpen] = useState(false);
  const quote = quoteBridge(from, to, value, amountIn);

  return (
    <div className="px-2">
      <Button
        type="button"
        variant="plain"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={`${id}-routes`}
        whileHover={undefined}
        whileTap={undefined}
        className="flex h-10 w-full items-center justify-between gap-3 text-sm text-muted-foreground"
      >
        <span className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-muted text-foreground">
            <Zap className="size-3.5" aria-hidden="true" />
          </span>
          <span className="font-medium text-foreground">{value.name}</span>
          <span className="flex items-center gap-1 tabular-nums">
            <Clock className="size-3.5" aria-hidden="true" />
            {bridgeEta(value.etaSeconds)}
          </span>
        </span>
        <span className="flex items-center gap-1.5 tabular-nums">
          {amountIn > 0 ? <DigitSwap value={tradeUsd(quote.feeUsd)} /> : null}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={reduce ? { duration: 0 } : SPRING_SWAP}
            className="flex"
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </motion.span>
        </span>
      </Button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={`${id}-routes`}
            variants={tradeRevealVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="overflow-hidden"
          >
            <fieldset className="pt-1 pb-2">
              <legend className="sr-only">{labels.routes}</legend>
              <div className="flex flex-col gap-1.5">
                {routes.map((route) => {
                  const selected = route.id === value.id;
                  const option = quoteBridge(from, to, route, amountIn);
                  return (
                    <div
                      key={route.id}
                      className="relative flex items-center gap-3 rounded-2xl border border-border px-3 py-2.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                    >
                      {selected ? (
                        <motion.span
                          layoutId={reduce ? undefined : `${id}-selected`}
                          transition={SPRING_LAYOUT}
                          aria-hidden="true"
                          className="pointer-events-none absolute -inset-px rounded-2xl border border-foreground/50"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                          {route.name}
                          {route.tag ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              {route.tag}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                          {bridgeEta(route.etaSeconds)} · {labels.fee}{" "}
                          {amountIn > 0 ? tradeUsd(option.feeUsd) : "—"}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-right text-sm font-medium tabular-nums transition-colors",
                          selected
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        <DigitSwap
                          value={
                            amountIn > 0
                              ? tradeAmount(option.amountOut, to.precision)
                              : "0"
                          }
                        />{" "}
                        {to.symbol}
                      </span>
                      <Button
                        type="button"
                        variant="plain"
                        aria-pressed={selected}
                        aria-label={`${route.name}, ${bridgeEta(route.etaSeconds)}`}
                        onClick={() => onChange(route.id)}
                        whileHover={undefined}
                        whileTap={undefined}
                        className="absolute inset-0 size-full outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  );
                })}
              </div>
            </fieldset>
            <dl className="pb-1">
              <TradeDetailRow label={labels.rate}>
                1 {from.symbol} = {tradeAmount(quote.rate, to.precision)}{" "}
                {to.symbol}
              </TradeDetailRow>
              <TradeDetailRow label={labels.minimumReceived}>
                {amountIn > 0
                  ? `${tradeAmount(quote.minimumReceived, to.precision)} ${to.symbol}`
                  : "—"}
              </TradeDetailRow>
            </dl>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
