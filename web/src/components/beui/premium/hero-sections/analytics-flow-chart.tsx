"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import {
  type AnalyticsFlowReport,
  formatReportValue,
  REPORT_DATES,
} from "./analytics-flow-data";

export function AnalyticsFlowChart({
  report,
  animate,
}: {
  report: AnalyticsFlowReport;
  animate: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const data = REPORT_DATES.map((date, index) => ({
    date,
    current: report.values[index],
    previous: report.previous[index],
  }));
  return (
    <div className="h-52 min-w-0 sm:h-64">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={data}
          margin={{ top: 12, right: 8, bottom: 0, left: -16 }}
          accessibilityLayer
        >
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--primary)" stopOpacity={0.16} />
              <stop offset="1" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            minTickGap={42}
            tickMargin={12}
            tick={{
              fill: "var(--muted-foreground)",
              fontSize: "var(--text-xs)",
            }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickCount={4}
            tick={{
              fill: "var(--muted-foreground)",
              fontSize: "var(--text-xs)",
            }}
            tickFormatter={(value: number) =>
              value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`
            }
          />
          <Tooltip
            content={(props) => <ReportTooltip {...props} report={report} />}
            cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
          />
          <Area
            type="monotone"
            dataKey="current"
            name="This period"
            stroke="var(--primary)"
            strokeWidth={2}
            fill={`url(#${id}-fill)`}
            isAnimationActive={animate}
            animationDuration={650}
            animationEasing="ease-out"
            activeDot={{ r: 4, stroke: "var(--background)", strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="previous"
            name="Previous period"
            stroke="var(--muted-foreground)"
            strokeOpacity={0.55}
            strokeDasharray="4 5"
            strokeWidth={1.5}
            dot={false}
            activeDot={false}
            isAnimationActive={animate}
            animationDuration={650}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReportTooltip({
  active,
  payload,
  label,
  report,
}: Pick<TooltipContentProps<number, string>, "active" | "payload" | "label"> & {
  report: AnalyticsFlowReport;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground">
      <p className="mb-2 font-medium">{label}</p>
      {payload.map((item) => (
        <div
          key={String(item.dataKey)}
          className="mt-1.5 flex items-center justify-between gap-5"
        >
          <span className="text-muted-foreground">{item.name}</span>
          <span className="font-medium tabular-nums">
            {formatReportValue(report, Number(item.value))}
          </span>
        </div>
      ))}
    </div>
  );
}
