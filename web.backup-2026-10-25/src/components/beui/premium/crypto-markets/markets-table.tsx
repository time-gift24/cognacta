"use client";

import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import type { MarketSort, MarketSortKey, MarketsLabels } from "./markets-data";
import { MarketsRow } from "./markets-row";
import type { LiveCoin } from "./use-live-prices";

type Column = {
  key: MarketSortKey | "watch" | "sparkline";
  label: string;
  /** Visibility and alignment classes for the header cell. */
  className: string;
  sortable: boolean;
};

function SortButton({
  column,
  sort,
  onSort,
}: {
  column: Column & { key: MarketSortKey };
  sort: MarketSort;
  onSort: (key: MarketSortKey) => void;
}) {
  const active = sort.key === column.key;
  const Icon = !active
    ? ChevronsUpDown
    : sort.direction === "asc"
      ? ChevronUp
      : ChevronDown;
  return (
    <Button
      type="button"
      variant="plain"
      onClick={() => onSort(column.key)}
      whileHover={undefined}
      whileTap={undefined}
      className={cn(
        "inline-flex items-center gap-1 text-xs hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {column.label}
      <Icon
        className={cn("size-3.5", !active && "opacity-50")}
        aria-hidden="true"
      />
    </Button>
  );
}

export function MarketsTable({
  coins,
  ranks,
  sort,
  onSort,
  watchlist,
  onToggleWatch,
  onSelect,
  cascade,
  labels,
  empty,
}: {
  coins: readonly LiveCoin[];
  /** Market-cap rank per coin id, independent of the current sort. */
  ranks: ReadonlyMap<string, number>;
  sort: MarketSort;
  onSort: (key: MarketSortKey) => void;
  watchlist: ReadonlySet<string>;
  onToggleWatch: (id: string) => void;
  onSelect?: (coin: LiveCoin) => void;
  cascade: boolean;
  labels: MarketsLabels;
  empty: string;
}) {
  const columns: Column[] = [
    { key: "watch", label: "", className: "w-10", sortable: false },
    {
      key: "rank",
      label: labels.rank,
      className: "hidden w-10 sm:table-cell",
      sortable: true,
    },
    { key: "name", label: labels.name, className: "text-left", sortable: true },
    {
      key: "price",
      label: labels.price,
      className: "w-32 text-right sm:w-36",
      sortable: true,
    },
    {
      key: "change24h",
      label: labels.change24h,
      className: "hidden w-24 text-right md:table-cell",
      sortable: true,
    },
    {
      key: "sparkline",
      label: labels.last7Days,
      className: "hidden w-36 text-right lg:table-cell",
      sortable: false,
    },
    {
      key: "marketCap",
      label: labels.marketCap,
      className: "hidden w-28 text-right md:table-cell",
      sortable: true,
    },
    {
      key: "volume24h",
      label: labels.volume24h,
      className: "hidden w-28 text-right xl:table-cell",
      sortable: true,
    },
  ];

  return (
    <div className="overflow-clip rounded-3xl border border-border bg-background">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={
                  column.sortable && sort.key === column.key
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
                className={cn(
                  "py-3 pr-3 text-xs font-normal text-muted-foreground",
                  column.key === "watch" && "pr-1 pl-2",
                  column.className,
                )}
              >
                {column.sortable ? (
                  <SortButton
                    column={column as Column & { key: MarketSortKey }}
                    sort={sort}
                    onSort={onSort}
                  />
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={cascade} mode="popLayout">
            {coins.map((coin, index) => (
              <MarketsRow
                key={coin.id}
                coin={coin}
                rank={ranks.get(coin.id) ?? index + 1}
                index={index}
                cascade={cascade}
                watched={watchlist.has(coin.id)}
                labels={labels}
                onToggleWatch={() => onToggleWatch(coin.id)}
                onSelect={onSelect ? () => onSelect(coin) : undefined}
              />
            ))}
          </AnimatePresence>
        </tbody>
      </table>
      {!coins.length ? (
        <p className="px-6 py-14 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : null}
    </div>
  );
}
