"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import {
  SegmentedMeter,
  SegmentedMeterLegend,
  SegmentedMeterTooltip,
  SegmentedMeterTrack,
} from "@/components/beui/charts/segmented-meter";
import { Sparkline } from "@/components/beui/charts/sparkline";
import { Button } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { CryptoChange } from "./crypto-change";
import { CryptoTokenIcon } from "./crypto-token-icon";
import {
  type CryptoAsset,
  cryptoAmount,
  cryptoAssetValue,
  cryptoSeriesChange,
  cryptoUsd,
} from "./crypto-wallet-data";

/** Categorical colors for the allocation meter, in holding order. */
export const CRYPTO_ALLOCATION_COLORS = [
  { color: "bg-blue-500", text: "text-blue-500" },
  { color: "bg-teal-500", text: "text-teal-500" },
  { color: "bg-orange-500", text: "text-orange-500" },
  { color: "bg-amber-500", text: "text-amber-500" },
  { color: "bg-sky-500", text: "text-sky-500" },
  { color: "bg-rose-500", text: "text-rose-500" },
] as const;

const MASK = "••••";

export function CryptoHoldings({
  assets,
  hidden,
  onSelectAsset,
}: {
  assets: readonly CryptoAsset[];
  hidden: boolean;
  onSelectAsset?: (asset: CryptoAsset) => void;
}) {
  const reduce = useReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sorted = [...assets].sort(
    (a, b) => cryptoAssetValue(b) - cryptoAssetValue(a),
  );
  const total = sorted.reduce((sum, asset) => sum + cryptoAssetValue(asset), 0);
  const segments = sorted.map((asset, index) => ({
    id: asset.id,
    label: asset.symbol,
    value: cryptoAssetValue(asset),
    color:
      CRYPTO_ALLOCATION_COLORS[index % CRYPTO_ALLOCATION_COLORS.length].color,
  }));

  if (!sorted.length)
    return (
      <p className="py-8 text-sm text-muted-foreground">
        No assets in this wallet yet.
      </p>
    );

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="text-xl font-medium">Your assets</h3>
        <span className="text-xs text-muted-foreground">
          {sorted.length} assets
        </span>
      </div>
      {total > 0 ? (
        <SegmentedMeter
          segments={segments}
          max={total}
          activeId={activeId}
          onActiveChange={setActiveId}
          formatValue={(value) => `${((value / total) * 100).toFixed(1)}%`}
          label="Portfolio allocation"
          className="mt-4"
        >
          <SegmentedMeterTrack className="mt-12">
            <SegmentedMeterTooltip />
          </SegmentedMeterTrack>
          <SegmentedMeterLegend className="text-xs" />
        </SegmentedMeter>
      ) : null}
      <ul className="mt-4">
        {sorted.map((asset, index) => {
          const change = cryptoSeriesChange(asset.priceHistory);
          const trend = asset.priceHistory?.filter((value) => value > 0) ?? [];
          const row = (
            <>
              <CryptoTokenIcon symbol={asset.symbol} network={asset.network} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {asset.name}
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground tabular-nums">
                  {hidden
                    ? MASK
                    : `${cryptoAmount(asset.balance)} ${asset.symbol}`}
                </span>
              </span>
              {trend.length > 1 ? (
                <Sparkline
                  values={trend}
                  delay={reduce ? 0 : 0.2 + index * 0.05}
                  strokeClassName={
                    (change ?? 0) >= 0 ? "stroke-emerald-500" : "stroke-red-500"
                  }
                  className="hidden h-7 w-16 sm:block"
                />
              ) : null}
              <span className="w-24 shrink-0 text-right tabular-nums">
                <span className="block text-sm font-medium">
                  <DigitSwap
                    value={hidden ? MASK : cryptoUsd(cryptoAssetValue(asset))}
                  />
                </span>
                <span className="mt-1 block text-xs">
                  {change === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <CryptoChange percent={change} />
                  )}
                </span>
              </span>
            </>
          );
          const rowClass = cn(
            "flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left transition-colors",
            activeId === asset.id && "bg-muted",
          );
          return (
            <motion.li
              key={asset.id}
              initial={
                reduce ? false : { opacity: 0, y: 8, filter: "blur(4px)" }
              }
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                duration: 0.45,
                ease: EASE_OUT,
                delay: index * 0.045,
              }}
              onMouseEnter={() => setActiveId(asset.id)}
              onMouseLeave={() => setActiveId(null)}
              className="-mx-2"
            >
              {onSelectAsset ? (
                <Button
                  type="button"
                  variant="plain"
                  onClick={() => onSelectAsset(asset)}
                  onFocus={() => setActiveId(asset.id)}
                  onBlur={() => setActiveId(null)}
                  whileHover={undefined}
                  whileTap={undefined}
                  className={rowClass}
                >
                  {row}
                </Button>
              ) : (
                <div className={rowClass}>{row}</div>
              )}
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
