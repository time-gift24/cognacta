"use client";

import { ArrowDown, ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { Button, StatefulButton } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { SPRING_SWAP } from "@/lib/beui/ease";
import {
  CRYPTO_TRADE_NETWORK_FEE_USD,
  CRYPTO_TRADE_SLIPPAGE,
  type CryptoSwapRequest,
  type CryptoTradeLabels,
  type CryptoTradeToken,
  parseAmount,
  quoteSwap,
  sanitizeAmount,
  tradeAmount,
  tradeUsd,
} from "./crypto-trade-data";
import { tradeRevealVariants } from "./crypto-trade-motion";
import {
  TradeAmountInput,
  TradeAmountReadout,
  TradeCtaLabel,
  TradeDetailRow,
  TradeMaxButton,
  TradePanel,
  TradeTokenPill,
} from "./crypto-trade-parts";
import { useTradeSubmit } from "./use-trade-submit";

export function CryptoTradeSwap({
  from,
  to,
  labels,
  onFlip,
  onPickToken,
  onSwap,
}: {
  from: CryptoTradeToken;
  to: CryptoTradeToken;
  labels: CryptoTradeLabels;
  onFlip: () => void;
  onPickToken: (side: "from" | "to") => void;
  onSwap: (request: CryptoSwapRequest) => unknown;
}) {
  const reduce = useReducedMotion();
  const id = useId();
  const [amount, setAmount] = useState("");
  const [flips, setFlips] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [state, run] = useTradeSubmit();

  const amountIn = parseAmount(amount);
  const quote = quoteSwap(from, to, amountIn);
  const insufficient = amountIn > from.balance;
  const ready = amountIn > 0 && !insufficient;
  const outText =
    amountIn > 0 ? tradeAmount(quote.amountOut, to.precision) : "0";

  const flip = () => {
    setFlips((count) => count + 1);
    // Carry the quoted output over so the new "pay" side keeps its value.
    // toFixed avoids exponent notation for tiny amounts; trim trailing zeros.
    const next =
      amountIn > 0
        ? quote.amountOut.toFixed(to.precision).replace(/\.?0+$/, "")
        : "";
    setAmount(next && next !== "0" ? sanitizeAmount(next, to.precision) : "");
    onFlip();
  };

  const submit = () =>
    run(
      () =>
        onSwap({
          from: from.id,
          to: to.id,
          amountIn,
          amountOut: quote.amountOut,
          minimumReceived: quote.minimumReceived,
        }),
      () => setAmount(""),
    );

  return (
    <div>
      <div className="relative flex flex-col gap-1.5">
        <TradePanel
          label={labels.sell}
          amount={
            <TradeAmountInput
              value={amount}
              onChange={(value) =>
                setAmount(sanitizeAmount(value, from.precision))
              }
              label={`${labels.sell} (${from.symbol})`}
              invalid={insufficient}
            />
          }
          token={
            <TradeTokenPill
              token={from}
              layoutId={`${id}-${from.id}`}
              label={labels.chooseToken}
              onClick={() => onPickToken("from")}
            />
          }
          footer={
            <>
              <DigitSwap value={tradeUsd(amountIn * from.usdPrice)} />
              <span className="flex items-center gap-2">
                {tradeAmount(from.balance, from.precision)} {from.symbol}
                <TradeMaxButton
                  label={labels.max}
                  onClick={() => setAmount(String(from.balance))}
                />
              </span>
            </>
          }
        />
        <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={flip}
            aria-label={labels.flip}
            className="size-11 border-4 border-background bg-muted text-foreground hover:bg-muted"
          >
            <motion.span
              animate={{ rotate: reduce ? 0 : flips * 180 }}
              transition={SPRING_SWAP}
              className="flex"
            >
              <ArrowDown className="size-4" aria-hidden="true" />
            </motion.span>
          </Button>
        </div>
        <TradePanel
          label={labels.receive}
          amount={<TradeAmountReadout value={outText} label={labels.receive} />}
          token={
            <TradeTokenPill
              token={to}
              layoutId={`${id}-${to.id}`}
              label={labels.chooseToken}
              onClick={() => onPickToken("to")}
            />
          }
          footer={
            <>
              <DigitSwap value={tradeUsd(amountIn > 0 ? quote.usdOut : 0)} />
              <span>
                {tradeAmount(to.balance, to.precision)} {to.symbol}
              </span>
            </>
          }
        />
      </div>

      <div className="mt-3 px-2">
        <Button
          type="button"
          variant="plain"
          onClick={() => setDetailsOpen((open) => !open)}
          aria-expanded={detailsOpen}
          aria-controls={`${id}-details`}
          className="flex h-10 w-full items-center justify-between gap-3 text-sm text-muted-foreground"
          whileHover={undefined}
          whileTap={undefined}
        >
          <span className="tabular-nums">
            1 {from.symbol} = {tradeAmount(quote.rate, to.precision)}{" "}
            {to.symbol}
          </span>
          <span className="flex items-center gap-1.5">
            {tradeUsd(CRYPTO_TRADE_NETWORK_FEE_USD)}
            <motion.span
              animate={{ rotate: detailsOpen ? 180 : 0 }}
              transition={reduce ? { duration: 0 } : SPRING_SWAP}
              className="flex"
            >
              <ChevronDown className="size-4" aria-hidden="true" />
            </motion.span>
          </span>
        </Button>
        <AnimatePresence initial={false}>
          {detailsOpen ? (
            <motion.dl
              id={`${id}-details`}
              variants={tradeRevealVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="overflow-hidden"
            >
              <TradeDetailRow label={labels.priceImpact}>
                {amountIn > 0 ? `${(quote.impact * 100).toFixed(2)}%` : "—"}
              </TradeDetailRow>
              <TradeDetailRow label={labels.minimumReceived}>
                {amountIn > 0
                  ? `${tradeAmount(quote.minimumReceived, to.precision)} ${to.symbol}`
                  : "—"}
              </TradeDetailRow>
              <TradeDetailRow label={labels.slippage}>
                {(CRYPTO_TRADE_SLIPPAGE * 100).toFixed(1)}%
              </TradeDetailRow>
              <TradeDetailRow label={labels.networkFee}>
                {tradeUsd(CRYPTO_TRADE_NETWORK_FEE_USD)}
              </TradeDetailRow>
            </motion.dl>
          ) : null}
        </AnimatePresence>
      </div>

      <StatefulButton
        type="button"
        size="lg"
        state={state}
        disabled={!ready && state === "idle"}
        onClick={submit}
        loadingText={labels.confirming}
        successText={labels.done}
        className="mt-3 h-12 w-full text-base"
      >
        {insufficient ? (
          <TradeCtaLabel kind={`insufficient-${from.id}`}>
            {labels.insufficient(from.symbol)}
          </TradeCtaLabel>
        ) : amountIn > 0 ? (
          <TradeCtaLabel kind={`ready-${from.id}-${to.id}`}>
            {`${labels.swap} ${from.symbol} for ${to.symbol}`}
          </TradeCtaLabel>
        ) : (
          <TradeCtaLabel kind="idle">{labels.enterAmount}</TradeCtaLabel>
        )}
      </StatefulButton>
    </div>
  );
}
