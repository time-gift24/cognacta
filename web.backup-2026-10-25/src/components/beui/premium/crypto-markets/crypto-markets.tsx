"use client";

/*
 * Storyboard
 * 1. View: rows rise 30ms apart and their seven-day sparklines draw in.
 * 2. Live: every few seconds a handful of prices tick. The price rolls up or
 *    down and its cell flashes green or red, then fades (1.2s). Totals and
 *    the top gainer roll with it. Ticks pause offscreen.
 * 3. Sort and filter: the tab pill glides, rows glide to their new order,
 *    new rows rise in, and removed rows fade out in 150ms.
 * 4. Watch: the star pops in with a slight turn.
 * Reduced motion: no ticking, flashes, or glides; values change in place.
 */

import { Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { cn } from "@/lib/beui/utils";
import {
  MARKET_CATEGORIES,
  MARKET_COINS,
  MARKETS_LABELS,
  type MarketCategory,
  type MarketCoin,
  type MarketSort,
  type MarketSortKey,
  type MarketsLabels,
} from "./markets-data";
import { MarketsSummary } from "./markets-summary";
import { MarketsTable } from "./markets-table";
import { type LiveCoin, useLivePrices } from "./use-live-prices";

const WATCHLIST = "watchlist";
const ALL = "all";

export type CryptoMarketsProps = {
  coins?: readonly MarketCoin[];
  categories?: readonly MarketCategory[];
  labels?: Partial<MarketsLabels>;
  /** Simulate a live price feed. Turn off when streaming real prices into `coins`. */
  live?: boolean;
  defaultWatchlist?: readonly string[];
  onWatchlistChange?: (ids: string[]) => void;
  /** Makes coin names clickable, for example to open a detail page. */
  onSelectCoin?: (coin: MarketCoin) => void;
  className?: string;
};

function sortValue(
  coin: LiveCoin,
  key: MarketSortKey,
  ranks: ReadonlyMap<string, number>,
) {
  if (key === "rank") return ranks.get(coin.id) ?? 0;
  if (key === "name") return coin.name.toLowerCase();
  return coin[key];
}

export function CryptoMarkets({
  coins: coinsProp = MARKET_COINS,
  categories = MARKET_CATEGORIES,
  labels: labelOverrides,
  live = true,
  defaultWatchlist = ["btc", "eth", "sol"],
  onWatchlistChange,
  onSelectCoin,
  className,
}: CryptoMarketsProps) {
  const labels = { ...MARKETS_LABELS, ...labelOverrides };
  const id = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const coins = useLivePrices(coinsProp, sectionRef, { live });
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState(ALL);
  const [sort, setSort] = useState<MarketSort>({
    key: "rank",
    direction: "asc",
  });
  const [watchlist, setWatchlist] = useState(() => new Set(defaultWatchlist));
  const [cascade, setCascade] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => setCascade(false), 900);
    return () => clearTimeout(timeout);
  }, []);

  // Rank by the provided order of market cap, so live ticks never reshuffle it.
  const ranks = new Map(
    [...coinsProp]
      .sort((a, b) => b.marketCap - a.marketCap)
      .map((coin, index) => [coin.id, index + 1]),
  );
  const term = query.trim().toLowerCase();
  const filtered = coins
    .filter((coin) =>
      tab === WATCHLIST
        ? watchlist.has(coin.id)
        : tab === ALL || coin.categories.includes(tab),
    )
    .filter(
      (coin) =>
        !term ||
        coin.name.toLowerCase().includes(term) ||
        coin.symbol.toLowerCase().includes(term),
    )
    .sort((a, b) => {
      const left = sortValue(a, sort.key, ranks);
      const right = sortValue(b, sort.key, ranks);
      const result =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right));
      return sort.direction === "asc" ? result : -result;
    });

  const tabs = [
    { id: ALL, label: labels.all },
    { id: WATCHLIST, label: `${labels.watchlist} ${watchlist.size}` },
    ...categories,
  ];

  const toggleWatch = (coinId: string) => {
    const next = new Set(watchlist);
    if (next.has(coinId)) next.delete(coinId);
    else next.add(coinId);
    setWatchlist(next);
    onWatchlistChange?.([...next]);
  };

  const onSort = (key: MarketSortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "name" || key === "rank" ? "asc" : "desc" },
    );

  return (
    <section
      ref={sectionRef}
      aria-label={labels.title}
      className={cn(
        "w-full bg-background px-4 py-12 text-foreground sm:px-8 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-medium">{labels.title}</h2>
            {live ? (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {labels.live}
              </span>
            ) : null}
          </div>
          <Input
            value={query}
            onChange={setQuery}
            leftIcon={<Search />}
            placeholder={labels.search}
            aria-label={labels.search}
            className="w-full sm:w-72"
          />
        </div>

        <div className="mt-6">
          <MarketsSummary coins={coins} labels={labels} />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList
            aria-label="Market categories"
            className="flex max-w-full overflow-x-auto [scrollbar-width:none] sm:inline-flex"
          >
            {tabs.map((item, index) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                id={`${id}-tab-${item.id}`}
                tabIndex={tab === item.id ? 0 : -1}
                className="h-8 px-3 text-xs"
                onKeyDown={(event) => {
                  const step =
                    event.key === "ArrowRight"
                      ? 1
                      : event.key === "ArrowLeft"
                        ? -1
                        : 0;
                  if (!step) return;
                  event.preventDefault();
                  const next = tabs[(index + step + tabs.length) % tabs.length];
                  setTab(next.id);
                  document.getElementById(`${id}-tab-${next.id}`)?.focus();
                }}
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="mt-4">
          <MarketsTable
            coins={filtered}
            ranks={ranks}
            sort={sort}
            onSort={onSort}
            watchlist={watchlist}
            onToggleWatch={toggleWatch}
            onSelect={onSelectCoin}
            cascade={cascade}
            labels={labels}
            empty={
              tab === WATCHLIST && !term
                ? labels.emptyWatchlist
                : labels.emptySearch
            }
          />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Sample prices{live ? " with a simulated live feed" : ""}. Not market
          data.
        </p>
      </div>
    </section>
  );
}
