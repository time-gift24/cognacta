"use client";

import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { CryptoTokenIcon } from "@/components/beui/premium/crypto-wallet/crypto-token-icon";
import {
  type MarketsLabels,
  marketCompact,
  marketPercent,
} from "./markets-data";
import type { LiveCoin } from "./use-live-prices";

export function MarketsSummary({
  coins,
  labels,
}: {
  coins: readonly LiveCoin[];
  labels: MarketsLabels;
}) {
  const marketCap = coins.reduce((sum, coin) => sum + coin.marketCap, 0);
  const volume = coins.reduce((sum, coin) => sum + coin.volume24h, 0);
  const gainer = coins.reduce<LiveCoin | null>(
    (best, coin) => (!best || coin.change24h > best.change24h ? coin : best),
    null,
  );
  return (
    <dl className="grid divide-y divide-border rounded-3xl border border-border bg-background sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div className="px-5 py-4">
        <dt className="text-xs text-muted-foreground">
          {labels.totalMarketCap}
        </dt>
        <dd className="mt-1.5 text-2xl font-medium tracking-tight tabular-nums">
          <DigitSwap value={marketCompact(marketCap)} />
        </dd>
      </div>
      <div className="px-5 py-4">
        <dt className="text-xs text-muted-foreground">{labels.totalVolume}</dt>
        <dd className="mt-1.5 text-2xl font-medium tracking-tight tabular-nums">
          <DigitSwap value={marketCompact(volume)} />
        </dd>
      </div>
      <div className="px-5 py-4">
        <dt className="text-xs text-muted-foreground">{labels.topGainer}</dt>
        <dd className="mt-1.5 flex items-center gap-2 text-2xl font-medium tracking-tight">
          {gainer ? (
            <>
              <CryptoTokenIcon symbol={gainer.symbol} className="size-7" />
              {gainer.symbol}
              <span className="text-base text-emerald-600 tabular-nums dark:text-emerald-400">
                <DigitSwap value={marketPercent(gainer.change24h)} />
              </span>
            </>
          ) : (
            "—"
          )}
        </dd>
      </div>
    </dl>
  );
}
