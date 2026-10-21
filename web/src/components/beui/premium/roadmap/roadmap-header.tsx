"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import type {
  RoadmapFilter,
  RoadmapItem,
  RoadmapLabels,
  RoadmapStatus,
  RoadmapStatusLabels,
} from "./roadmap-data";

const STATUS_ORDER: readonly RoadmapStatus[] = [
  "shipped",
  "progress",
  "planned",
];

export type RoadmapHeaderProps = {
  titleId: string;
  items: readonly RoadmapItem[];
  filter: RoadmapFilter;
  onFilterChange: (filter: RoadmapFilter) => void;
  labels: RoadmapLabels;
  statusLabels: RoadmapStatusLabels;
};

/** Eyebrow, title, and description beside the status filter tabs. */
export function RoadmapHeader({
  titleId,
  items,
  filter,
  onFilterChange,
  labels,
  statusLabels,
}: RoadmapHeaderProps) {
  const filters: readonly { value: RoadmapFilter; label: string }[] = [
    { value: "all", label: labels.filterAll },
    ...STATUS_ORDER.map((status) => ({
      value: status,
      label: statusLabels[status],
    })),
  ];

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-xl">
        <p className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
          {labels.eyebrow}
        </p>
        <h2
          id={titleId}
          className="mt-4 text-balance font-medium text-4xl tracking-tight"
        >
          {labels.title}
        </h2>
        <p className="mt-4 text-pretty text-muted-foreground leading-7">
          {labels.description}
        </p>
      </div>

      <Tabs
        value={filter}
        onValueChange={(value) => onFilterChange(value as RoadmapFilter)}
        variant="pill"
        className="overflow-x-auto"
      >
        <TabsList aria-label={labels.filterAriaLabel} className="min-w-max">
          {filters.map((item) => {
            const count =
              item.value === "all"
                ? items.length
                : items.filter((entry) => entry.status === item.value).length;
            return (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="gap-2"
              >
                {item.label}
                <span className="hidden font-mono text-xs tabular-nums opacity-60 sm:inline">
                  {count}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
