"use client";

import { ChartColumn } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { EASE_OUT_CSS } from "@/lib/beui/ease";
import { type SupportDay, supportDate } from "./support-dashboard-data";

type VolumeBucket = {
  date: string;
  to: string;
  received: number;
  resolved: number;
};

export function SupportVolumeChart({ days }: { days: readonly SupportDay[] }) {
  const heading = useId();
  const reduce = useReducedMotion();
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const stride = Math.max(1, Math.ceil(sorted.length / 10));
  const buckets: VolumeBucket[] = [];
  for (let i = 0; i < sorted.length; i += stride) {
    const group = sorted.slice(i, i + stride);
    buckets.push({
      date: group[0].date,
      to: group[group.length - 1].date,
      received: group.reduce((sum, d) => sum + d.received, 0),
      resolved: group.reduce((sum, d) => sum + d.resolved, 0),
    });
  }
  const total = sorted.reduce((sum, day) => sum + day.received, 0);
  const resolved = sorted.reduce((sum, day) => sum + day.resolved, 0);

  return (
    <section
      aria-labelledby={heading}
      className="flex min-w-0 flex-col rounded-2xl border border-border bg-background p-5 sm:p-6 @5xl/dashboard:h-128"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id={heading}
            className="flex items-center gap-2 text-xl font-medium"
          >
            <ChartColumn aria-hidden className="size-4 text-muted-foreground" />
            Request flow
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Opened and closed conversations over time
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {sorted.length
            ? `${supportDate(sorted[0].date)} – ${supportDate(sorted[sorted.length - 1].date)}`
            : "No activity"}
        </span>
      </div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <NumberTicker
            value={total}
            format={(v) => v.toLocaleString("en-US")}
            duration={0.6}
            className="text-3xl font-medium tracking-tight tabular-nums"
          />
          <span className="text-xs text-muted-foreground">
            {resolved.toLocaleString("en-US")} closed
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            Opened
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-muted-foreground/35" />
            Closed
          </span>
        </div>
      </div>
      {buckets.length ? (
        <figure
          aria-label={`${total.toLocaleString("en-US")} conversations opened and ${resolved.toLocaleString("en-US")} closed. Bars group ${stride} ${stride === 1 ? "day" : "days"} at a time.`}
          className="mt-6 h-64 min-h-64 min-w-0 grow"
        >
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={buckets}
              accessibilityLayer
              margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
              barCategoryGap="24%"
              barGap={4}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 4"
                strokeOpacity={0.7}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => supportDate(value)}
                axisLine={false}
                tickLine={false}
                tickMargin={12}
                minTickGap={28}
                tick={{ fill: "var(--muted-foreground)", className: "text-xs" }}
              />
              <YAxis
                width={34}
                axisLine={false}
                tickLine={false}
                tickCount={4}
                tick={{ fill: "var(--muted-foreground)", className: "text-xs" }}
                tickFormatter={(v: number) =>
                  Intl.NumberFormat("en-US", { notation: "compact" }).format(v)
                }
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
                content={({ active, payload }) => {
                  const bucket = payload?.[0]?.payload as
                    | VolumeBucket
                    | undefined;
                  if (!active || !bucket) return null;
                  return (
                    <div className="rounded-xl border border-border bg-background p-3 text-xs">
                      <p className="mb-2 font-medium">
                        {supportDate(bucket.date)}
                        {bucket.date !== bucket.to
                          ? ` – ${supportDate(bucket.to)}`
                          : ""}
                      </p>
                      <p className="flex justify-between gap-8 text-muted-foreground">
                        Opened
                        <span className="text-foreground tabular-nums">
                          {bucket.received}
                        </span>
                      </p>
                      <p className="mt-1.5 flex justify-between gap-8 text-muted-foreground">
                        Closed
                        <span className="text-foreground tabular-nums">
                          {bucket.resolved}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="received"
                name="Opened"
                fill="var(--primary)"
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
                isAnimationActive={!reduce}
                animationDuration={500}
                animationEasing={EASE_OUT_CSS}
              />
              <Bar
                dataKey="resolved"
                name="Closed"
                fill="var(--muted-foreground)"
                fillOpacity={0.35}
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
                isAnimationActive={!reduce}
                animationDuration={500}
                animationEasing={EASE_OUT_CSS}
              />
            </BarChart>
          </ResponsiveContainer>
        </figure>
      ) : (
        <p className="grid min-h-64 flex-1 place-items-center text-sm text-muted-foreground">
          No conversations in this period.
        </p>
      )}
    </section>
  );
}
