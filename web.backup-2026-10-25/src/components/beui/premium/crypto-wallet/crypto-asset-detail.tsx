"use client";

/*
 * Storyboard
 * 1. Scrub: moving across the chart rolls the price and change line to that
 *    point, labelled with its date; leaving restores the live price.
 * 2. Range: the pill glides, the curve redraws, and the range marker springs
 *    to where the current price sits between the period low and high.
 * 3. Watch: the star pops and fills.
 * Reduced motion: values swap in place and the marker jumps without a spring.
 */

import { ArrowDownLeft, ArrowUpRight, Star } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { SPRING_BOUNCE } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  type CryptoAssetPerformance,
  CryptoAssetPerformanceList,
  CryptoAssetSection,
  type CryptoAssetStat,
  CryptoAssetStats,
  CryptoPriceRange,
} from "./crypto-asset-sections";
import { CryptoChange } from "./crypto-change";
import { CryptoPriceChart } from "./crypto-price-chart";
import { CryptoRangeTabs } from "./crypto-range-tabs";
import { CryptoTokenIcon } from "./crypto-token-icon";
import {
  CRYPTO_ASSETS,
  type CryptoAsset,
  type CryptoHistoryPoint,
  cryptoAmount,
  cryptoAssetValue,
  cryptoSampleHistory,
  cryptoUsd,
} from "./crypto-wallet-data";
import { useCryptoHistory } from "./use-crypto-history";

export type CryptoAssetDetailProps = {
  asset?: CryptoAsset;
  history?: Record<string, readonly CryptoHistoryPoint[]>;
  defaultRange?: string;
  description?: string;
  performance?: CryptoAssetPerformance;
  stats?: readonly CryptoAssetStat[];
  /** Controlled watchlist state. */
  watching?: boolean;
  onWatchingChange?: (watching: boolean) => void;
  demo?: boolean;
  onSend?: () => void;
  onReceive?: () => void;
  className?: string;
};

const ETH_ABOUT =
  "Ethereum is a network for apps, digital assets, and smart contracts. ETH is its native asset, used to pay network fees and help secure the network through staking.";

export function CryptoAssetDetail({
  asset = CRYPTO_ASSETS[0],
  history,
  defaultRange = "1W",
  description,
  stats,
  performance,
  watching: watchingProp,
  onWatchingChange,
  demo = true,
  onSend,
  onReceive,
  className,
}: CryptoAssetDetailProps) {
  const id = useId();
  const reduce = useReducedMotion();
  const [watchingState, setWatchingState] = useState(false);
  const watching = watchingProp ?? watchingState;
  const priceHistory =
    history ?? (demo ? cryptoSampleHistory(asset.usdPrice) : {});
  const chart = useCryptoHistory(priceHistory, defaultRange);
  const values = chart.points.map((point) => point.value);
  const low = values.length ? Math.min(...values) : 0;
  const high = values.length ? Math.max(...values) : 0;
  const about = description ?? (asset.symbol === "ETH" ? ETH_ABOUT : undefined);
  const value = cryptoAssetValue(asset);

  const toggleWatch = () => {
    if (watchingProp === undefined) setWatchingState(!watching);
    onWatchingChange?.(!watching);
  };

  return (
    <section
      aria-label={`${asset.name} asset details`}
      className={cn(
        "w-full bg-background px-4 py-12 text-foreground sm:px-8 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-lg">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <CryptoTokenIcon
              symbol={asset.symbol}
              network={asset.network}
              className="size-11"
            />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-medium">{asset.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {asset.symbol} · {asset.network}
              </p>
            </div>
          </div>
          <Button
            size="icon"
            variant="outline"
            aria-label={watching ? "Remove from watchlist" : "Add to watchlist"}
            aria-pressed={watching}
            onClick={toggleWatch}
            className="bg-background"
          >
            <motion.span
              key={String(watching)}
              initial={reduce || !watching ? false : { scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={SPRING_BOUNCE}
              className={cn(
                "flex",
                watching && "text-amber-500 dark:text-amber-400",
              )}
            >
              <Star
                className="size-4"
                fill={watching ? "currentColor" : "none"}
              />
            </motion.span>
          </Button>
        </header>

        <div className="mt-10">
          <p className="text-sm text-muted-foreground">
            {chart.focusLabel ?? "Current price"}
          </p>
          <p className="mt-1 text-4xl font-medium tracking-tight tabular-nums sm:text-5xl">
            <DigitSwap value={cryptoUsd(chart.value ?? asset.usdPrice)} />
          </p>
          <p
            className="mt-3 h-5 text-sm text-muted-foreground"
            aria-live="polite"
          >
            {chart.points.length > 1 ? (
              <>
                <CryptoChange value={chart.change} percent={chart.percent} />
                {chart.focusLabel ? " since start" : ` · ${chart.range}`}
              </>
            ) : (
              "Price history unavailable"
            )}
          </p>
        </div>

        <div id={`${id}-chart`} role="tabpanel" className="mt-8">
          <CryptoPriceChart
            points={chart.points}
            scrubIndex={chart.scrubIndex}
            onScrub={chart.setScrubIndex}
            trend={chart.trend}
            label={`${asset.name} price, ${chart.range}`}
            formatValue={cryptoUsd}
            className="h-52 sm:h-60"
          />
        </div>
        {chart.ranges.length > 1 ? (
          <div className="mt-4 flex justify-center">
            <CryptoRangeTabs
              id={id}
              ranges={chart.ranges}
              value={chart.range}
              onValueChange={chart.setRange}
              label="Price period"
              controls={`${id}-chart`}
            />
          </div>
        ) : null}

        <CryptoAssetSection title="Your position">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-3xl font-medium tracking-tight tabular-nums">
              <DigitSwap value={cryptoUsd(value)} />
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {cryptoAmount(asset.balance)} {asset.symbol}
            </p>
          </div>
        </CryptoAssetSection>

        {chart.points.length > 1 ? (
          <CryptoAssetSection title="Price range" aside={chart.range}>
            <CryptoPriceRange
              low={low}
              high={high}
              current={asset.usdPrice}
              lowLabel="Low"
              highLabel="High"
            />
          </CryptoAssetSection>
        ) : null}

        {performance ? (
          <CryptoAssetSection title="Performance" aside="All time">
            <CryptoAssetPerformanceList performance={performance} />
          </CryptoAssetSection>
        ) : null}

        <CryptoAssetSection title="Stats">
          <CryptoAssetStats
            stats={
              stats ?? [
                { label: "Network", value: asset.network },
                { label: "Symbol", value: asset.symbol },
              ]
            }
          />
        </CryptoAssetSection>

        {about ? (
          <CryptoAssetSection title={`About ${asset.name}`}>
            <p className="text-sm leading-6 text-muted-foreground">{about}</p>
          </CryptoAssetSection>
        ) : null}

        {demo ? (
          <p className="mt-8 text-xs text-muted-foreground">
            Demo asset · Sample prices and balance
          </p>
        ) : null}
      </div>
      {onSend || onReceive ? (
        <div className="sticky bottom-0 z-10 mx-auto mt-8 flex max-w-lg gap-3 bg-background pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {onSend ? (
            <Button
              variant="outline"
              onClick={onSend}
              className="flex-1 bg-background"
            >
              <ArrowUpRight className="size-4" />
              Send
            </Button>
          ) : null}
          {onReceive ? (
            <Button onClick={onReceive} className="flex-1">
              <ArrowDownLeft className="size-4" />
              Receive
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
