"use client";

import {
  CompositionChart,
  CompositionChartLegend,
  CompositionChartPlot,
  type CompositionChartSeries,
} from "@/components/beui/charts/composition-chart";
import { planningDate } from "./planning-ui";
import {
  shiftPlanningDate,
  type TeamActivityDay,
  type TeamMember,
} from "./team-capacity-data";

/** Weekly shares use raw focus hours, not capacity utilization. */
export function TeamFocusChart({
  activity,
  members,
  asOf,
  teamOrder,
}: {
  activity: readonly TeamActivityDay[];
  members: readonly TeamMember[];
  asOf: string;
  teamOrder: readonly string[];
}) {
  const lastMonday = shiftPlanningDate(
    asOf,
    -((new Date(`${asOf}T00:00:00Z`).getUTCDay() + 6) % 7),
  );
  const mondays = Array.from({ length: 8 }, (_, index) =>
    shiftPlanningDate(lastMonday, (index - 7) * 7),
  );
  const names = [...new Set(members.map((member) => member.team))];
  const colors = [
    "var(--primary)",
    "var(--muted-foreground)",
    "var(--foreground)",
  ];
  const series: CompositionChartSeries[] = names.map((name) => {
    const ids = new Set(
      members
        .filter((member) => member.team === name)
        .map((member) => member.id),
    );
    return {
      id: name,
      name,
      color: colors[Math.max(0, teamOrder.indexOf(name)) % colors.length],
      values: mondays.map((date) =>
        activity
          .filter(
            (day) =>
              ids.has(day.memberId) &&
              day.date >= date &&
              day.date <= shiftPlanningDate(date, 6) &&
              day.date <= asOf,
          )
          .reduce((sum, day) => sum + day.focusHours, 0),
      ),
    };
  });
  return (
    <section
      aria-label="Focus time by crew"
      className="min-w-0 rounded-2xl border border-border bg-background p-5 @5xl/planning:h-96"
    >
      <h2 className="text-xl font-medium">Workload distribution</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Share of focus hours · Last 8 weeks
      </p>
      <CompositionChart
        series={series}
        periods={mondays.map(planningDate)}
        view="bar"
        formatValue={(value) => `${value.toLocaleString()}h`}
        label="Weekly share of focus hours by crew"
        className="mt-5"
      >
        <CompositionChartPlot className="[&>div:nth-child(2)]:h-40" />
        <CompositionChartLegend className="mt-3 grid-cols-3 [&>button]:min-h-10 [&>button]:rounded-full" />
      </CompositionChart>
    </section>
  );
}
