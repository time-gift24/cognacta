"use client";

import {
  DonutChart,
  DonutChartCenter,
  DonutChartLegend,
  DonutChartPlot,
} from "@/components/beui/charts/donut-chart";
import {
  compactTokens,
  type TokenAllocation,
  type TokenomicsCopy,
} from "./tokenomics-data";

/** `bg-blue-500` → `var(--color-blue-500)`, so the ring matches the area chart. */
const cssColor = (className: string) =>
  `var(--color-${className.replace(/^bg-/, "")})`;

export function TokenomicsDistribution({
  allocations,
  supply,
  symbol,
  copy,
  activeId,
  onActiveChange,
}: {
  allocations: readonly TokenAllocation[];
  supply: number;
  symbol: string;
  copy: TokenomicsCopy;
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
}) {
  const byId = new Map(allocations.map((item) => [item.id, item]));
  return (
    <DonutChart
      segments={allocations.map((allocation) => ({
        id: allocation.id,
        name: allocation.label,
        value: allocation.percent,
        color: cssColor(allocation.color),
      }))}
      activeId={activeId}
      onActiveChange={onActiveChange}
      label={`${copy.distribution} of ${compactTokens(supply)} ${symbol}`}
      formatValue={(percent) => compactTokens((supply * percent) / 100)}
    >
      <div className="grid items-center gap-8 md:grid-cols-[16rem_1fr] lg:gap-12">
        <DonutChartPlot className="max-w-64">
          <DonutChartCenter totalLabel={`${copy.totalSupply} · ${symbol}`} />
        </DonutChartPlot>
        <DonutChartLegend
          className="grid gap-x-4 gap-y-1 space-y-0 sm:grid-cols-2"
          renderDetail={(segment) => {
            const allocation = byId.get(segment.id);
            return allocation ? copy.vesting(allocation) : null;
          }}
          renderValue={(segment) => (
            <>
              <span className="font-medium">{segment.value}%</span>
              <span className="ml-2 text-muted-foreground">
                {compactTokens((supply * segment.value) / 100)}
              </span>
            </>
          )}
        />
      </div>
    </DonutChart>
  );
}
