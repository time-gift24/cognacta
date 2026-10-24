"use client";

import { useState } from "react";
import { Button, StatefulButton } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import {
  type CryptoBuyRequest,
  type CryptoTradeLabels,
  type CryptoTradePaymentMethod,
  type CryptoTradeToken,
  parseAmount,
  sanitizeAmount,
  tradeAmount,
  tradeUsd,
} from "./crypto-trade-data";
import {
  TradeAmountInput,
  TradeAmountReadout,
  TradeCtaLabel,
  TradePanel,
  TradeTokenPill,
} from "./crypto-trade-parts";
import { TradePaymentMethods } from "./crypto-trade-payment-methods";
import { useTradeSubmit } from "./use-trade-submit";

export function CryptoTradeBuy({
  token,
  presets,
  paymentMethods,
  labels,
  onPickToken,
  onBuy,
}: {
  token: CryptoTradeToken;
  presets: readonly number[];
  paymentMethods: readonly CryptoTradePaymentMethod[];
  labels: CryptoTradeLabels;
  onPickToken: () => void;
  onBuy: (request: CryptoBuyRequest) => unknown;
}) {
  const [usd, setUsd] = useState(String(presets[1] ?? presets[0] ?? ""));
  const [methodId, setMethodId] = useState(paymentMethods[0]?.id ?? "");
  const [state, run] = useTradeSubmit();

  const method = paymentMethods.find((item) => item.id === methodId);
  const usdAmount = parseAmount(usd);
  const fee = usdAmount * ((method?.feePercent ?? 0) / 100);
  const amountOut = Math.max(0, usdAmount - fee) / token.usdPrice;
  const ready = usdAmount > 0 && Boolean(method);

  const submit = () =>
    run(() =>
      onBuy({
        token: token.id,
        usdAmount,
        amountOut,
        paymentMethod: methodId,
      }),
    );

  return (
    <div>
      <TradePanel
        label={labels.buy}
        amount={
          <div className="flex items-center">
            <span
              aria-hidden="true"
              className={cn(
                "text-4xl font-medium tracking-tight",
                usdAmount ? "text-foreground" : "text-muted-foreground/60",
              )}
            >
              $
            </span>
            <TradeAmountInput
              value={usd}
              onChange={(value) => setUsd(sanitizeAmount(value, 2))}
              label={`${labels.buy} amount in USD`}
            />
          </div>
        }
        token={
          <TradeTokenPill
            token={token}
            label={labels.chooseToken}
            onClick={onPickToken}
          />
        }
        footer={
          <ul className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const active = usdAmount === preset;
              return (
                <li key={preset}>
                  <Button
                    type="button"
                    variant="outline"
                    aria-pressed={active}
                    onClick={() => setUsd(String(preset))}
                    className={cn(
                      "relative h-7 bg-background px-3 text-xs after:absolute after:-inset-1.5",
                      active && "border-foreground/40 bg-muted text-foreground",
                    )}
                  >
                    {tradeUsd(preset).replace(".00", "")}
                  </Button>
                </li>
              );
            })}
          </ul>
        }
      />

      <TradePanel
        className="mt-1.5"
        label={labels.youGet}
        amount={
          <TradeAmountReadout
            value={
              usdAmount > 0 ? tradeAmount(amountOut, token.precision) : "0"
            }
            label={`${labels.youGet} (${token.symbol})`}
          />
        }
        token={
          <span className="text-sm font-medium text-muted-foreground">
            {token.symbol}
          </span>
        }
        footer={
          <span>
            1 {token.symbol} = {tradeUsd(token.usdPrice)}
          </span>
        }
      />

      <TradePaymentMethods
        methods={paymentMethods}
        value={methodId}
        onValueChange={setMethodId}
        usdAmount={usdAmount}
        label={labels.payWith}
        feeLabel={labels.fee}
      />

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
        {ready ? (
          <TradeCtaLabel kind={`ready-${token.id}`}>
            {`${labels.buy} ${token.symbol}`}
          </TradeCtaLabel>
        ) : (
          <TradeCtaLabel kind="idle">{labels.enterAmount}</TradeCtaLabel>
        )}
      </StatefulButton>
    </div>
  );
}
