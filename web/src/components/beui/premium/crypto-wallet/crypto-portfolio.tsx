"use client";

/*
 * Storyboard
 * 1. Mount: holdings rows blur-rise 45ms apart while their sparklines draw
 *    and the allocation meter grows segment by segment.
 * 2. Scrub: moving across the chart (or arrow keys on it) rolls the total
 *    balance and the change line to that point; leaving restores "now".
 * 3. Range: the pill glides and the curve redraws for the new period.
 * 4. Privacy: the eye toggle rolls every value to a mask.
 * Reduced motion: values swap without rolling, rows and lines appear in place.
 */

import { ArrowDownLeft, ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { cn } from "@/lib/beui/utils";
import { CryptoChange } from "./crypto-change";
import { CryptoHoldings } from "./crypto-holdings";
import { CryptoPriceChart } from "./crypto-price-chart";
import { CryptoRangeTabs } from "./crypto-range-tabs";
import {
  CRYPTO_ASSETS,
  CRYPTO_HISTORY,
  type CryptoAsset,
  type CryptoHistoryPoint,
  cryptoAssetValue,
  cryptoUsd,
} from "./crypto-wallet-data";
import { CryptoWalletHeader } from "./crypto-wallet-header";
import { useCryptoHistory } from "./use-crypto-history";

export type CryptoPortfolioProps = {
  walletName?: string;
  walletAddress?: string;
  onSettings?: () => void;
  assets?: readonly CryptoAsset[];
  history?: Record<string, readonly CryptoHistoryPoint[]>;
  defaultRange?: string;
  demo?: boolean;
  onSend?: () => void;
  onReceive?: () => void;
  /** Makes holdings rows clickable, for example to open asset details. */
  onSelectAsset?: (asset: CryptoAsset) => void;
  className?: string;
};

export function CryptoPortfolio({
  walletName = "Personal wallet",
  walletAddress,
  onSettings,
  assets = CRYPTO_ASSETS,
  history = CRYPTO_HISTORY,
  defaultRange = "1W",
  demo = true,
  onSend,
  onReceive,
  onSelectAsset,
  className,
}: CryptoPortfolioProps) {
  const id = useId();
  const [hidden, setHidden] = useState(false);
  const chart = useCryptoHistory(history, defaultRange);
  const total = assets.reduce((sum, asset) => sum + cryptoAssetValue(asset), 0);
  const headline = chart.value ?? total;

  return (
    <section
      aria-label="Crypto portfolio"
      className={cn(
        "w-full bg-background px-4 py-12 text-foreground sm:px-8 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-lg">
        <CryptoWalletHeader
          walletName={walletName}
          walletAddress={walletAddress}
          demo={demo}
          onReceive={onReceive}
          onSettings={onSettings}
        />

        <div className="mt-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {chart.focusLabel ?? "Total balance"}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setHidden(!hidden)}
              aria-label={hidden ? "Show balances" : "Hide balances"}
              aria-pressed={hidden}
              className="size-8"
            >
              {hidden ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>
          </div>
          <p className="mt-1 text-4xl font-medium tracking-tight tabular-nums sm:text-5xl">
            <DigitSwap value={hidden ? "••••••" : cryptoUsd(headline)} />
          </p>
          <p
            className="mt-3 h-5 text-sm text-muted-foreground"
            aria-live="polite"
          >
            {hidden ? (
              "Balance hidden"
            ) : chart.points.length > 1 ? (
              <>
                <CryptoChange value={chart.change} percent={chart.percent} />
                {chart.focusLabel ? " since start" : ` · ${chart.range}`}
              </>
            ) : (
              "No balance history yet"
            )}
          </p>
          {onSend || onReceive ? (
            <div className="mt-6 flex gap-2">
              {onSend ? (
                <Button
                  variant="outline"
                  onClick={onSend}
                  className="bg-background"
                >
                  <ArrowUpRight className="size-4" />
                  Send
                </Button>
              ) : null}
              {onReceive ? (
                <Button onClick={onReceive}>
                  <ArrowDownLeft className="size-4" />
                  Receive
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div id={`${id}-chart`} role="tabpanel" className="mt-8">
          <CryptoPriceChart
            points={chart.points}
            scrubIndex={chart.scrubIndex}
            onScrub={chart.setScrubIndex}
            trend={chart.trend}
            label={`Portfolio balance, ${chart.range}`}
            formatValue={(value) => (hidden ? "hidden" : cryptoUsd(value))}
            className="h-48 sm:h-56"
          />
        </div>
        {chart.ranges.length > 1 ? (
          <div className="mt-4 flex justify-center">
            <CryptoRangeTabs
              id={id}
              ranges={chart.ranges}
              value={chart.range}
              onValueChange={chart.setRange}
              label="Portfolio period"
              controls={`${id}-chart`}
            />
          </div>
        ) : null}

        <div className="mt-10">
          <CryptoHoldings
            assets={assets}
            hidden={hidden}
            onSelectAsset={onSelectAsset}
          />
        </div>
        {demo ? (
          <p className="mt-6 text-xs text-muted-foreground">
            Demo portfolio · Sample balances and prices
          </p>
        ) : null}
      </div>
    </section>
  );
}
