"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { Button, StatefulButton } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { Input } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import {
  parseAmount,
  sanitizeAmount,
} from "@/components/beui/premium/crypto-wallet/crypto-trade-data";
import { TradeCtaLabel } from "@/components/beui/premium/crypto-wallet/crypto-trade-parts";
import { useTradeSubmit } from "@/components/beui/premium/crypto-wallet/use-trade-submit";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  type OrderType,
  type PlaceOrderRequest,
  TRADING_FEE,
  type TradeSide,
  type TradingBalances,
  type TradingLabels,
  usd,
} from "./trading-data";

const SIDE_TONE = {
  buy: {
    text: "text-emerald-600 dark:text-emerald-400",
    pill: "bg-emerald-500/15",
  },
  sell: { text: "text-red-600 dark:text-red-400", pill: "bg-red-500/15" },
} as const;

export function TradeTicket({
  base,
  quote,
  priceDecimals,
  sizeDecimals,
  bestAsk,
  bestBid,
  balances,
  labels,
  price,
  onPriceChange,
  priceFlash,
  onPlace,
}: {
  base: string;
  quote: string;
  priceDecimals: number;
  sizeDecimals: number;
  bestAsk: number;
  bestBid: number;
  balances: TradingBalances;
  labels: TradingLabels;
  /** Limit price field, controlled so the order book can fill it. */
  price: string;
  onPriceChange: (price: string) => void;
  /** Changes whenever the price is set from outside, to flash the field. */
  priceFlash: number;
  onPlace: (request: PlaceOrderRequest) => unknown;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  const [side, setSide] = useState<TradeSide>("buy");
  const [type, setType] = useState<OrderType>("limit");
  const [amount, setAmount] = useState("");
  const [state, run] = useTradeSubmit(1200);

  const execution =
    type === "market"
      ? side === "buy"
        ? bestAsk
        : bestBid
      : parseAmount(price);
  const size = parseAmount(amount);
  const total = size * execution;
  const available =
    side === "buy"
      ? (balances[quote]?.available ?? 0)
      : (balances[base]?.available ?? 0);
  const maxSize =
    side === "buy" ? (execution ? available / execution : 0) : available;
  const percent = maxSize ? Math.min(100, (size / maxSize) * 100) : 0;
  const insufficient = side === "buy" ? total > available : size > available;
  const ready = size > 0 && execution > 0 && !insufficient;

  const setFromPercent = (next: number) =>
    setAmount(next <= 0 ? "" : (maxSize * (next / 100)).toFixed(sizeDecimals));

  const submit = () =>
    run(
      () => onPlace({ side, type, price: execution, amount: size }),
      () => setAmount(""),
    );

  return (
    <div className="flex flex-col gap-4 p-4">
      <Tabs value={side} onValueChange={(value) => setSide(value as TradeSide)}>
        <TabsList aria-label={labels.side} className="flex w-full *:flex-1">
          {(["buy", "sell"] as const).map((item) => (
            <TabsTrigger
              key={item}
              value={item}
              indicatorClassName={SIDE_TONE[item].pill}
              className={cn(
                "h-9 w-full text-sm",
                side === item && SIDE_TONE[item].text,
              )}
            >
              {item === "buy" ? labels.buy : labels.sell}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Tabs
        value={type}
        onValueChange={(value) => setType(value as OrderType)}
        variant="underline"
      >
        <TabsList aria-label={labels.type} className="w-full">
          <TabsTrigger value="limit" className="min-h-9 text-xs">
            {labels.limit}
          </TabsTrigger>
          <TabsTrigger value="market" className="min-h-9 text-xs">
            {labels.market}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative">
        <Input
          id={`${id}-price`}
          label={labels.price}
          value={type === "market" ? labels.marketPrice : price}
          onChange={(value) =>
            onPriceChange(sanitizeAmount(value, priceDecimals))
          }
          disabled={type === "market"}
          inputMode="decimal"
          autoComplete="off"
          rightIcon={<span className="text-xs">{quote}</span>}
          classNames={{
            label: "font-normal text-muted-foreground text-xs",
            input: "font-mono",
          }}
        />
        <AnimatePresence initial={false}>
          {priceFlash && !reduce ? (
            <motion.span
              key={priceFlash}
              aria-hidden="true"
              className="pointer-events-none absolute right-0 bottom-0 left-0 h-10 rounded-full ring-2 ring-foreground/40"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: EASE_OUT }}
            />
          ) : null}
        </AnimatePresence>
      </div>

      <Input
        label={labels.amount}
        value={amount}
        onChange={(value) => setAmount(sanitizeAmount(value, sizeDecimals))}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        error={insufficient && size > 0}
        rightIcon={<span className="text-xs">{base}</span>}
        classNames={{
          label: "font-normal text-muted-foreground text-xs",
          input: "font-mono",
        }}
      />

      {/* Quick sizes as a share of what this side can spend. */}
      <fieldset className="grid grid-cols-4 gap-1.5">
        <legend className="sr-only">
          Share of available {side === "buy" ? quote : base}
        </legend>
        {[25, 50, 75, 100].map((share) => {
          const activeShare = Math.abs(percent - share) < 0.5;
          return (
            <Button
              key={share}
              type="button"
              size="sm"
              variant="outline"
              aria-pressed={activeShare}
              disabled={maxSize <= 0}
              onClick={() => setFromPercent(share)}
              className={cn(
                "h-8 bg-background px-0 font-mono text-xs",
                activeShare && "border-foreground/40 bg-muted",
              )}
            >
              {share === 100 ? "Max" : `${share}%`}
            </Button>
          );
        })}
      </fieldset>

      <dl className="space-y-1.5 font-mono text-xs tabular-nums">
        <div className="flex justify-between gap-3">
          <dt className="font-sans text-muted-foreground">
            {labels.available}
          </dt>
          <dd>
            {usd(available, side === "buy" ? 2 : sizeDecimals)}{" "}
            {side === "buy" ? quote : base}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="font-sans text-muted-foreground">{labels.fee}</dt>
          <dd>{(TRADING_FEE * 100).toFixed(2)}%</dd>
        </div>
        <div className="flex justify-between gap-3 text-sm">
          <dt className="font-sans text-muted-foreground">{labels.total}</dt>
          <dd>
            <DigitSwap value={usd(total)} /> {quote}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="font-sans text-muted-foreground">You receive</dt>
          <dd
            className={
              side === "buy" ? SIDE_TONE.buy.text : SIDE_TONE.sell.text
            }
          >
            ≈{" "}
            {side === "buy"
              ? `${usd(size * (1 - TRADING_FEE), sizeDecimals)} ${base}`
              : `${usd(total * (1 - TRADING_FEE))} ${quote}`}
          </dd>
        </div>
      </dl>

      <StatefulButton
        type="button"
        size="lg"
        state={state}
        disabled={!ready && state === "idle"}
        onClick={submit}
        loadingText={labels.placing}
        successText={labels.placed}
        className="h-11 w-full"
      >
        {insufficient && size > 0 ? (
          <TradeCtaLabel kind={`insufficient-${side}`}>
            {labels.insufficient(side === "buy" ? quote : base)}
          </TradeCtaLabel>
        ) : size > 0 ? (
          <TradeCtaLabel kind={`ready-${side}`}>
            {side === "buy" ? labels.buy : labels.sell}
            <DigitSwap value={usd(size, sizeDecimals)} />
            {base}
          </TradeCtaLabel>
        ) : (
          <TradeCtaLabel kind="idle">{labels.enterAmount}</TradeCtaLabel>
        )}
      </StatefulButton>
    </div>
  );
}
