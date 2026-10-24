"use client";

import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import type {
  SearchLabels,
  SearchResultType,
  SearchTypeFilter,
} from "./search-data";

/** Pill tabs for "all" plus each result type, each with a rolling count. */
export function SearchTypeTabs({
  value,
  order,
  typeLabels,
  labels,
  countFor,
  onValueChange,
}: {
  value: SearchTypeFilter;
  order: readonly SearchResultType[];
  typeLabels: Record<SearchResultType, string>;
  labels: SearchLabels;
  countFor: (value: SearchTypeFilter) => number;
  onValueChange: (value: SearchTypeFilter) => void;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onValueChange(next as SearchTypeFilter)}
      variant="pill"
      className="mt-8 overflow-x-auto"
    >
      <TabsList aria-label={labels.typeTabs} className="min-w-max">
        {(["all", ...order] as const).map((tab) => (
          <TabsTrigger key={tab} value={tab} className="gap-2">
            {tab === "all" ? labels.allTypes : typeLabels[tab]}
            <DigitSwap
              value={countFor(tab)}
              className="font-mono text-xs tabular-nums opacity-60"
            />
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
