"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/beui/motion/button";
import type { DateRange } from "@/components/beui/motion/date-range-picker";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  type FinanceTransaction,
  financeMoney,
  financeTotals,
} from "./finance-dashboard-data";

export function FinanceCashflowChart({
  transactions,
  range,
  currency,
}: {
  transactions: readonly FinanceTransaction[];
  range: DateRange & { to: string };
  currency: string;
}) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState({ incoming: true, outgoing: true });
  const points: {
    month: string;
    label: string;
    incoming: number;
    outgoing: number;
  }[] = [];
  const cursor = new Date(`${range.from.slice(0, 7)}-01T00:00:00Z`);
  while (cursor.toISOString().slice(0, 10) <= range.to) {
    const month = cursor.toISOString().slice(0, 7);
    points.push({
      month,
      label: new Intl.DateTimeFormat("en-US", {
        month: "short",
        timeZone: "UTC",
      }).format(cursor),
      ...financeTotals(transactions.filter((t) => t.at.startsWith(month))),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const totals = financeTotals(transactions);
  return (
    <section
      aria-label="Cash flow"
      className="min-w-0 rounded-2xl border border-border bg-background p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium">Cash flow</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Settled movements across the selected period
          </p>
        </div>
        <div className="flex gap-3">
          {(["incoming", "outgoing"] as const).map((kind) => (
            <Button
              variant="plain"
              key={kind}
              type="button"
              aria-pressed={visible[kind]}
              onClick={() =>
                setVisible((current) =>
                  current[kind] &&
                  !current[kind === "incoming" ? "outgoing" : "incoming"]
                    ? current
                    : { ...current, [kind]: !current[kind] },
                )
              }
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full px-1 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !visible[kind] && "opacity-40",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  kind === "incoming" ? "bg-primary" : "bg-muted-foreground/35",
                )}
              />
              {kind === "incoming" ? "Money in" : "Money out"}
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-baseline gap-3">
        <NumberTicker
          value={totals.incoming - totals.outgoing}
          format={(value) => financeMoney(value, currency)}
          startOnView={false}
          className="text-3xl font-medium tabular-nums tracking-tight"
        />
        <span className="text-xs text-muted-foreground">Net movement</span>
      </div>
      <motion.figure
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.4, ease: EASE_OUT }}
        aria-label="Monthly incoming and outgoing funds"
        className="mt-6 h-64 min-w-0 sm:h-72"
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart
            data={points}
            accessibilityLayer
            margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
            barCategoryGap="22%"
            barGap={4}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="month"
              tickFormatter={(value: string) =>
                points.find((point) => point.month === value)?.label ?? value
              }
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              minTickGap={16}
              tick={{ fill: "var(--muted-foreground)", className: "text-xs" }}
            />
            <YAxis
              width={48}
              axisLine={false}
              tickLine={false}
              tickCount={4}
              tickFormatter={(value: number) =>
                new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency,
                  notation: "compact",
                  maximumFractionDigits: 0,
                }).format(value)
              }
              tick={{ fill: "var(--muted-foreground)", className: "text-xs" }}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", fillOpacity: 0.4 }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as
                  | (typeof points)[number]
                  | undefined;
                if (!active || !point) return null;
                return (
                  <div className="rounded-xl border border-border bg-background p-3 text-xs">
                    <p className="mb-2 text-muted-foreground">
                      {point.label} {point.month.slice(0, 4)}
                    </p>
                    {(["incoming", "outgoing"] as const)
                      .filter((kind) => visible[kind])
                      .map((kind) => (
                        <p
                          key={kind}
                          className="mt-1 flex justify-between gap-6"
                        >
                          <span>
                            {kind === "incoming" ? "Money in" : "Money out"}
                          </span>
                          <span className="font-medium tabular-nums">
                            {financeMoney(point[kind], currency)}
                          </span>
                        </p>
                      ))}
                  </div>
                );
              }}
            />
            {visible.incoming && (
              <Bar
                dataKey="incoming"
                name="Money in"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
                isAnimationActive={false}
              />
            )}
            {visible.outgoing && (
              <Bar
                dataKey="outgoing"
                name="Money out"
                fill="var(--muted-foreground)"
                fillOpacity={0.25}
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
                isAnimationActive={false}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </motion.figure>
      <table className="sr-only">
        <caption>Monthly cash flow in {currency}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Money in</th>
            <th scope="col">Money out</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month}>
              <th scope="row">{point.month}</th>
              <td>{financeMoney(point.incoming, currency)}</td>
              <td>{financeMoney(point.outgoing, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
