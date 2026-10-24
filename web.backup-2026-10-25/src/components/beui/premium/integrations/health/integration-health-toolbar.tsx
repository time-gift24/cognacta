"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import type {
  IntegrationHealthFilter,
  IntegrationHealthLabels,
  IntegrationHealthStatus,
} from "./integration-health-data";

const FILTERS: IntegrationHealthFilter[] = ["all", "attention", "failing"];

/** Status filter tabs and search, stacked on mobile and inline on desktop. */
export function IntegrationHealthToolbar({
  filter,
  onFilterChange,
  query,
  onQueryChange,
  counts,
  total,
  labels,
}: {
  filter: IntegrationHealthFilter;
  onFilterChange: (filter: IntegrationHealthFilter) => void;
  query: string;
  onQueryChange: (query: string) => void;
  counts: Record<IntegrationHealthStatus, number>;
  total: number;
  labels: IntegrationHealthLabels;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Tabs
        value={filter}
        onValueChange={(value) =>
          onFilterChange(value as IntegrationHealthFilter)
        }
      >
        <TabsList
          aria-label={labels.filterLabel}
          className="flex w-full *:flex-1 sm:inline-flex sm:w-auto sm:*:flex-none"
        >
          {FILTERS.map((value) => (
            <TabsTrigger
              key={value}
              value={value}
              className="w-full gap-1.5 px-2.5 sm:px-3.5"
            >
              {value === "all" ? labels.all : labels[value]}
              <span className="text-muted-foreground text-xs tabular-nums">
                {value === "all" ? total : counts[value]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Input
        value={query}
        onChange={onQueryChange}
        placeholder={labels.searchPlaceholder}
        aria-label={labels.searchLabel}
        type="search"
        leftIcon={<Search aria-hidden="true" />}
        rightIcon={
          query ? (
            <Button
              variant="plain"
              aria-label={labels.clearSearch}
              onClick={() => onQueryChange("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X aria-hidden="true" />
            </Button>
          ) : null
        }
        className="w-full sm:w-64"
      />
    </div>
  );
}
