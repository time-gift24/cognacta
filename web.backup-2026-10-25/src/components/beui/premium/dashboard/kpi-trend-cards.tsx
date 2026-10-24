"use client";

import { useReducedMotion } from "motion/react";
import { type ReactNode, useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { EASE_OUT_CSS } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { formatReportValue, type ReportValueFormat } from "./format";

export type KpiTrendPoint = { label: string; value: number };

export type KpiTrendMetric = {
  id: string;
  label: string;
  icon: ReactNode;
  value: number;
  format?: ReportValueFormat;
  note?: string;
};

export type KpiTrendCardsProps = {
  featured: KpiTrendMetric & { points: readonly KpiTrendPoint[] };
  metrics: readonly KpiTrendMetric[];
  className?: string;
};

/** Locale-aware rolling values with a quieter fractional part. */
function MetricValue({ metric }: { metric: KpiTrendMetric }) {
  const {
    style = "number",
    currency = "USD",
    decimals = 0,
    locale = "en-US",
  } = metric.format ?? {};
  const parts = new Intl.NumberFormat(locale, {
    style: style === "number" ? "decimal" : style,
    ...(style === "currency" ? { currency } : {}),
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).formatToParts(style === "percent" ? metric.value / 100 : metric.value);
  const decimalIndex = parts.findIndex((part) => part.type === "decimal");
  const whole = (decimalIndex === -1 ? parts : parts.slice(0, decimalIndex))
    .map((part) => part.value)
    .join("");
  const fraction =
    (decimalIndex === -1
      ? ""
      : parts
          .slice(decimalIndex)
          .map((part) => part.value)
          .join("")) + (metric.format?.suffix ?? "");

  return (
    <span className="inline-flex whitespace-nowrap text-3xl font-medium tabular-nums tracking-tight @7xl/metrics:text-4xl">
      <span className="sr-only">
        {formatReportValue(metric.value, metric.format)}
      </span>
      <span aria-hidden="true" className="inline-flex items-center">
        <NumberTicker
          value={metric.value}
          format={() => whole}
          duration={0.6}
          stagger={0.02}
        />
        {fraction && (
          <NumberTicker
            value={metric.value}
            format={() => fraction}
            duration={0.6}
            stagger={0.02}
            className="text-muted-foreground"
          />
        )}
      </span>
    </span>
  );
}

function MetricDetails({ metric }: { metric: KpiTrendMetric }) {
  return (
    <div className="flex min-w-0 flex-col items-start">
      <span
        aria-hidden="true"
        className="mb-6 grid size-11 place-items-center rounded-full border border-border text-foreground [&>svg]:size-5"
      >
        {metric.icon}
      </span>
      <dt className="text-xl font-medium text-foreground">{metric.label}</dt>
      <dd className="mt-3">
        <MetricValue metric={metric} />
      </dd>
      {metric.note && (
        <p className="mt-5 text-sm text-muted-foreground">{metric.note}</p>
      )}
    </div>
  );
}

/** One spacious trend card paired with compact supporting metric cards. */
export function KpiTrendCards({
  featured,
  metrics,
  className,
}: KpiTrendCardsProps) {
  const gradient = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const points = featured.points;
  const tickLabels = [
    points[0]?.label,
    points[Math.floor((points.length - 1) / 2)]?.label,
    points.at(-1)?.label,
  ].filter((label): label is string => label !== undefined);

  return (
    <section
      aria-label="Key performance indicators"
      className={cn("@container/metrics w-full min-w-0", className)}
    >
      <dl className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-4">
        <div className="@container/featured min-w-0 rounded-3xl border border-border bg-background p-6 @2xl:col-span-2">
          <div className="grid items-center gap-6 @md/featured:grid-cols-2">
            <MetricDetails metric={featured} />
            <figure
              aria-label={`${featured.label} history`}
              className="h-48 min-w-0"
            >
              {points.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No history available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart
                    data={[...points]}
                    margin={{ top: 12, right: 8, bottom: 0, left: 8 }}
                    accessibilityLayer
                  >
                    <defs>
                      <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="var(--primary)"
                          stopOpacity={0.14}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--primary)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="var(--border)"
                      strokeDasharray="3 6"
                    />
                    <XAxis
                      dataKey="label"
                      ticks={[...new Set(tickLabels)]}
                      interval="preserveStartEnd"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={12}
                      tick={{
                        fill: "var(--muted-foreground)",
                        className: "text-xs",
                      }}
                      height={32}
                    />
                    <YAxis hide domain={["dataMin", "dataMax"]} tickCount={3} />
                    <Tooltip
                      cursor={{
                        stroke: "var(--border)",
                        strokeDasharray: "3 4",
                      }}
                      content={({ active, payload }) => {
                        const point = payload?.[0]?.payload as
                          | KpiTrendPoint
                          | undefined;
                        if (!active || !point) return null;
                        return (
                          <div className="rounded-xl border border-border bg-background px-3 py-2 text-xs">
                            <p className="text-muted-foreground">
                              {point.label}
                            </p>
                            <p className="mt-1 font-medium tabular-nums text-foreground">
                              {formatReportValue(point.value, featured.format)}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill={`url(#${gradient})`}
                      dot={points.length === 1}
                      activeDot={{
                        r: 4,
                        stroke: "var(--background)",
                        strokeWidth: 2,
                      }}
                      isAnimationActive={!reduce}
                      animationDuration={600}
                      animationEasing={EASE_OUT_CSS}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              <table className="sr-only">
                <caption>{featured.label} history</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((point, index) => (
                    <tr key={`${point.label}-${index}`}>
                      <th scope="row">{point.label}</th>
                      <td>{formatReportValue(point.value, featured.format)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </figure>
          </div>
        </div>
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="flex min-w-0 items-center rounded-3xl border border-border bg-background p-6"
          >
            <MetricDetails metric={metric} />
          </div>
        ))}
      </dl>
    </section>
  );
}
