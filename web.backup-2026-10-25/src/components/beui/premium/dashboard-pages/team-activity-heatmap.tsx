"use client";

import { CalendarDays, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  HeatCalendar,
  HeatCalendarGrid,
  HeatCalendarLegend,
  type HeatCalendarSelection,
  HeatCalendarTooltip,
} from "@/components/beui/charts/heat-calendar";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import { planningDate } from "./planning-ui";
import { shiftPlanningDate, type TeamActivityDay } from "./team-capacity-data";

export function TeamActivityHeatmap({
  activity,
  asOf,
  weeks,
  onDayChange,
}: {
  activity: readonly TeamActivityDay[];
  asOf: string;
  weeks: number;
  onDayChange?: (date: string) => void;
}) {
  const [selection, setSelection] = useState<HeatCalendarSelection | null>(
    null,
  );
  const grid = useRef<HTMLDivElement>(null);
  const monday = shiftPlanningDate(
    asOf,
    -((new Date(`${asOf}T00:00:00Z`).getUTCDay() + 6) % 7),
  );
  const start = shiftPlanningDate(monday, -(weeks - 1) * 7);
  const totals = new Map<string, number>();
  for (const day of activity)
    totals.set(day.date, (totals.get(day.date) ?? 0) + day.completed);
  const max = Math.max(
    1,
    ...[...totals.entries()]
      .filter(([date]) => date >= start && date <= asOf)
      .map(([, count]) => count),
  );
  const values = Array.from({ length: weeks }, (_, w) =>
    Array.from(
      { length: 7 },
      (_, d) => (totals.get(shiftPlanningDate(start, w * 7 + d)) ?? 0) / max,
    ),
  );
  const select = (next: HeatCalendarSelection | null) => {
    setSelection(next);
    if (next)
      onDayChange?.(
        shiftPlanningDate(
          start,
          (next.end ?? next.start).w * 7 + (next.end ?? next.start).d,
        ),
      );
  };
  const valid =
    selection &&
    selection.start.w < weeks &&
    (!selection.end || selection.end.w < weeks)
      ? selection
      : null;
  const selectedStart = valid
    ? Math.min(
        valid.start.w * 7 + valid.start.d,
        (valid.end ?? valid.start).w * 7 + (valid.end ?? valid.start).d,
      )
    : 0;
  const selectedEnd = valid
    ? Math.max(
        valid.start.w * 7 + valid.start.d,
        (valid.end ?? valid.start).w * 7 + (valid.end ?? valid.start).d,
      )
    : weeks * 7 - 1;
  const count = Array.from(
    { length: selectedEnd - selectedStart + 1 },
    (_, i) => totals.get(shiftPlanningDate(start, selectedStart + i)) ?? 0,
  ).reduce((sum, value) => sum + value, 0);
  useEffect(() => {
    const cells =
      grid.current?.querySelectorAll<HTMLButtonElement>("[data-heat-cell]");
    const lastIndex =
      (weeks - 1) * 7 + ((new Date(`${asOf}T00:00:00Z`).getUTCDay() + 6) % 7);
    cells?.forEach((cell, index) => {
      cell.tabIndex = index === lastIndex ? 0 : -1;
    });
  }, [weeks, asOf]);
  return (
    <section
      aria-label="Daily activity"
      className="flex min-w-0 flex-col rounded-2xl border border-border bg-background p-5 @5xl/planning:min-h-96"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium">Daily activity</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Work finished across the selected crew.
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays aria-hidden className="size-3.5" />
          {weeks} weeks
        </span>
      </div>
      <div
        className="my-2 min-w-0 flex-1 overflow-x-auto"
        ref={grid}
        onKeyDownCapture={(event) => {
          const target = event.target as HTMLButtonElement;
          const cell = target.dataset.heatCell;
          if (!cell) return;
          const [w, d] = cell.split("-").map(Number);
          const offset: Record<string, number> = {
            ArrowLeft: -7,
            ArrowRight: 7,
            ArrowUp: -1,
            ArrowDown: 1,
          };
          if (!(event.key in offset)) return;
          event.preventDefault();
          const cells =
            grid.current?.querySelectorAll<HTMLButtonElement>(
              "[data-heat-cell]",
            );
          if (!cells) return;
          const next = Math.max(
            0,
            Math.min(cells.length - 1, w * 7 + d + offset[event.key]),
          );
          cells.forEach((button, index) => {
            button.tabIndex = index === next ? 0 : -1;
          });
          cells[next]?.focus();
        }}
      >
        <HeatCalendar
          weeks={weeks}
          values={values}
          maxCount={max}
          unit="items finished"
          color="var(--primary)"
          endDate={new Date(`${asOf}T00:00:00Z`)}
          selection={valid}
          onSelectionChange={select}
          className={cn("w-full", weeks === 26 ? "min-w-lg" : "min-w-64")}
        >
          <HeatCalendarGrid
            className={cn(
              "w-full!",
              weeks === 26
                ? "[&>.aspect-square]:max-h-6"
                : "[&>.aspect-square]:max-h-5",
            )}
          >
            <HeatCalendarTooltip />
          </HeatCalendarGrid>
          <HeatCalendarLegend className="mt-5" />
        </HeatCalendar>
      </div>
      <div className="flex min-h-10 items-center justify-between gap-3 border-t border-border pt-3">
        <div className="text-xs text-muted-foreground">
          <span className="mr-2 text-base font-medium tabular-nums text-foreground">
            {count.toLocaleString()}
          </span>
          {valid
            ? `finished · ${planningDate(shiftPlanningDate(start, selectedStart))}${selectedEnd !== selectedStart ? ` – ${planningDate(shiftPlanningDate(start, selectedEnd))}` : ""}`
            : "items finished in this window"}
        </div>
        <Button
          variant="ghost"
          disabled={!valid}
          className="h-9 gap-1.5 rounded-full px-3 text-xs focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setSelection(null)}
        >
          <RotateCcw aria-hidden className="size-3.5" />
          Clear
        </Button>
      </div>
    </section>
  );
}
