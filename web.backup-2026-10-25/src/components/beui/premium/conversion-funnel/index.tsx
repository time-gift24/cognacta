"use client";

import { ArrowDown, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import {
  Bar,
  BarChart,
  type BarShapeProps,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

const FUNNEL_COLORS = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa"];

export type FunnelStage = {
  id: string;
  label: string;
  value: number;
  detail: string;
};
export type FunnelPeriod = {
  id: string;
  label: string;
  stages: readonly FunnelStage[];
};
export type ConversionFunnelProps = {
  periods: readonly FunnelPeriod[];
  title?: string;
  className?: string;
};

function FlowStage({
  geometry,
  stages,
  selected,
}: {
  geometry: BarShapeProps;
  stages: readonly FunnelStage[];
  selected: boolean;
}) {
  const reduce = useReducedMotion();
  const { x, width, index, parentViewBox } = geometry;
  const first = Math.max(1, stages[0]?.value ?? 1);
  const ratio = Math.max(0, (stages[index]?.value ?? 0) / first);
  const nextRatio = Math.max(
    0,
    (stages[index + 1]?.value ?? stages[index]?.value ?? 0) / first,
  );
  const center = parentViewBox.y + parentViewBox.height / 2;
  const maxHalf = parentViewBox.height * 0.38;
  const leftHalf = Math.min(1, ratio) * maxHalf;
  const rightHalf = Math.min(1, nextRatio) * maxHalf;
  const end = x + width;
  const bend = x + width * 0.42;
  const control = x + width * 0.74;
  const color = FUNNEL_COLORS[Math.min(index, FUNNEL_COLORS.length - 1)];
  function path(padding: number) {
    return `M ${x},${center - leftHalf - padding} H ${bend} C ${control},${center - leftHalf - padding} ${control},${center - rightHalf - padding} ${end},${center - rightHalf - padding} V ${center + rightHalf + padding} C ${control},${center + rightHalf + padding} ${control},${center + leftHalf + padding} ${bend},${center + leftHalf + padding} H ${x} Z`;
  }
  return (
    <g>
      {[
        { padding: 12, opacity: 0.14 },
        { padding: 6, opacity: 0.24 },
        { padding: 0, opacity: selected ? 1 : 0.85 },
      ].map((layer) => (
        <motion.path
          key={layer.padding}
          initial={false}
          animate={{ d: path(layer.padding), opacity: layer.opacity }}
          transition={{ duration: reduce ? 0 : 0.35, ease: EASE_OUT }}
          fill={color}
        />
      ))}
      <rect
        x={x + width / 2 - 24}
        y={center - 13}
        width={48}
        height={26}
        rx={13}
        fill="var(--background)"
      />
      <text
        x={x + width / 2}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--foreground)"
        className="text-xs font-medium"
        pointerEvents="none"
      >
        {Math.round(ratio * 100)}%
      </text>
    </g>
  );
}

export function ConversionFunnel({
  periods,
  title = "Conversion funnel",
  className,
}: ConversionFunnelProps) {
  const tabsId = useId();
  const [periodId, setPeriodId] = useState(periods[0]?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const period = periods.find((item) => item.id === periodId) ?? periods[0];
  const stages = period?.stages ?? [];
  const first = stages[0]?.value ?? 0;
  const last = stages.at(-1)?.value ?? 0;
  const selected =
    stages.find((item) => item.id === selectedId) ?? stages.at(-1);
  const rate = first > 0 ? (last / first) * 100 : 0;
  const selectedIndex = stages.findIndex((item) => item.id === selected?.id);
  const previous = stages[selectedIndex - 1]?.value;
  const dropoff =
    previous && selected
      ? Math.max(0, ((previous - selected.value) / previous) * 100)
      : 0;
  return (
    <section
      aria-label="Conversion funnel"
      className={cn(
        "w-full max-w-2xl rounded-3xl border border-border bg-background p-5 sm:p-6",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-4xl font-medium">{title}</h2>
        <Tabs
          value={period?.id ?? ""}
          onValueChange={(value) => {
            setPeriodId(value);
            setSelectedId(null);
          }}
          variant="pill"
        >
          <TabsList aria-label="Funnel period" className="gap-0 bg-muted p-1">
            {periods.map((item, index) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                id={`${tabsId}-${index}`}
                aria-controls={`${tabsId}-chart`}
                tabIndex={period?.id === item.id ? 0 : -1}
                indicatorClassName="bg-background"
                className={cn(
                  "h-7 px-3 py-0 text-xs focus-visible:ring-2 focus-visible:ring-ring",
                  period?.id === item.id && "text-foreground",
                )}
                onKeyDown={(event) => {
                  let next = index;
                  if (event.key === "ArrowRight")
                    next = (index + 1) % periods.length;
                  else if (event.key === "ArrowLeft")
                    next = (index - 1 + periods.length) % periods.length;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = periods.length - 1;
                  else return;
                  event.preventDefault();
                  setPeriodId(periods[next].id);
                  setSelectedId(null);
                  document.getElementById(`${tabsId}-${next}`)?.focus();
                }}
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>
      <div className="my-6">
        <p className="mb-1 text-sm text-muted-foreground">
          Visitor to customer
        </p>
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center text-4xl font-medium leading-none tracking-tight">
            <DigitSwap
              value={rate.toFixed(1)}
              className="[&_[data-slot=digit-swap-glyph]:nth-last-child(2)]:w-[0.4ch]"
            />
            <span>%</span>
          </span>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowUpRight className="size-3.5" />
            {last.toLocaleString("en-US")} conversions
          </p>
        </div>
      </div>
      <div
        role="tabpanel"
        id={`${tabsId}-chart`}
        aria-labelledby={`${tabsId}-${periods.findIndex((item) => item.id === period?.id)}`}
        className="h-56 w-full sm:h-64"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={stages.map((item) => ({ ...item }))}
            barCategoryGap={2}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
            accessibilityLayer
          >
            <XAxis dataKey="label" hide />
            <YAxis domain={[0, Math.max(1, first)]} hide />
            <Tooltip
              cursor={false}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="rounded-xl border border-border bg-background px-3 py-2 text-xs">
                    <p className="font-medium">{payload[0].payload.label}</p>
                    <p className="mt-1 text-muted-foreground">
                      {Number(payload[0].value).toLocaleString("en-US")} people
                    </p>
                  </div>
                ) : null
              }
            />
            <Bar
              dataKey="value"
              isAnimationActive={false}
              shape={(props: BarShapeProps) => (
                <FlowStage
                  geometry={props}
                  stages={stages}
                  selected={selected?.id === stages[props.index]?.id}
                />
              )}
              onClick={(_, index) => setSelectedId(stages[index]?.id ?? null)}
              className="cursor-pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {stages.map((item, index) => (
          <Button
            key={item.id}
            variant="ghost"
            aria-pressed={selected?.id === item.id}
            onClick={() => setSelectedId(item.id)}
            className={cn(
              "gap-1.5 px-3 text-xs rounded-full h-9",
              selected?.id === item.id &&
                "bg-muted text-foreground rounded-full h-9",
            )}
          >
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{
                backgroundColor:
                  FUNNEL_COLORS[Math.min(index, FUNNEL_COLORS.length - 1)],
              }}
            />
            {item.label}
          </Button>
        ))}
      </div>
      {selected && (
        <motion.div
          key={`${period?.id}-${selected.id}`}
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="mt-5 border-t border-border pt-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              {selected.label}
              <span className="text-muted-foreground">
                {selected.value.toLocaleString("en-US")}
              </span>
            </p>
            {selectedIndex > 0 && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowDown className="size-3.5" />
                {dropoff.toFixed(1)}% drop-off
              </p>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {selected.detail}
          </p>
        </motion.div>
      )}
    </section>
  );
}
