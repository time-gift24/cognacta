"use client";

import {
  CalendarDays,
  CircleCheck,
  Layers3,
  ListChecks,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { KpiGaugeCards } from "@/components/beui/premium/dashboard/kpi-gauge-cards";
import { cn } from "@/lib/beui/utils";
import { GoalProgressList } from "./goal-progress-list";
import {
  GOALS_SAMPLE_DATA,
  type GoalsDashboardData,
  goalHealth,
  goalProgress,
} from "./goals-dashboard-data";
import {
  PlanningFilter,
  PlanningProgress,
  PlanningShell,
  PlanningTabs,
  planningDate,
} from "./planning-ui";

export type GoalsDashboardProps = {
  data?: GoalsDashboardData;
  name?: string;
  onCycleChange?: (cycle: string) => void;
  onMilestoneChange?: (
    goalId: string,
    milestoneId: string,
    done: boolean,
  ) => void;
  className?: string;
};

/** A complete goals workspace with measured outcomes, pace checks, and independent milestone tracking. */
export function GoalsDashboard({
  data = GOALS_SAMPLE_DATA,
  name = "Avery",
  onCycleChange,
  onMilestoneChange,
  className,
}: GoalsDashboardProps) {
  const [cycle, setCycle] = useState(data.cycles[0]?.id ?? "");
  const [owner, setOwner] = useState("all");
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const cycleGoals = data.goals.filter((goal) => goal.cycle === cycle);
  const owners = [...new Set(cycleGoals.map((goal) => goal.owner))];
  const goals = cycleGoals
    .filter((goal) => owner === "all" || goal.owner === owner)
    .map((goal) => ({
      ...goal,
      milestones: goal.milestones.map((milestone) => ({
        ...milestone,
        done: overrides[`${goal.id}:${milestone.id}`] ?? milestone.done,
      })),
    }));
  const visible = goals.filter(
    (goal) => filter === "all" || goalHealth(goal, data.asOf) === filter,
  );
  const milestones = goals.flatMap((goal) =>
    goal.milestones.map((milestone) => ({
      ...milestone,
      goalId: goal.id,
      goalTitle: goal.title,
    })),
  );
  const doneCount = milestones.filter((milestone) => milestone.done).length;
  const next = milestones
    .filter((milestone) => !milestone.done)
    .sort((a, b) => a.due.localeCompare(b.due));
  const reviewCount = goals.filter(
    (goal) => goalHealth(goal, data.asOf) === "review",
  ).length;
  const openCount = goals.filter(
    (goal) => goalHealth(goal, data.asOf) !== "finished",
  ).length;
  const average = goals.length
    ? Math.round(
        goals.reduce((sum, goal) => sum + goalProgress(goal), 0) / goals.length,
      )
    : 0;
  const updateMilestone = (
    goalId: string,
    milestoneId: string,
    done: boolean,
  ) => {
    setOverrides((previous) => ({
      ...previous,
      [`${goalId}:${milestoneId}`]: done,
    }));
    onMilestoneChange?.(goalId, milestoneId, done);
  };
  return (
    <PlanningShell
      eyebrow="Goals & outcomes"
      title="Your goals"
      name={name}
      description="Track targets, review progress, and keep the next milestone in view."
      asOf={data.asOf}
      className={className}
      controls={
        <>
          <PlanningFilter
            label="Planning cycle"
            value={cycle}
            icon={CalendarDays}
            options={data.cycles.map((item) => ({
              value: item.id,
              label: item.label,
              icon: CalendarDays,
            }))}
            onChange={(value) => {
              setCycle(value);
              setOwner("all");
              setFilter("all");
              setOpenId(null);
              onCycleChange?.(value);
            }}
          />
          <PlanningFilter
            label="Goal owner"
            value={owner}
            icon={Users}
            options={[
              { value: "all", label: "Everyone", icon: Users },
              ...owners.map((name) => ({
                value: name,
                label: name,
                icon: Users,
              })),
            ]}
            onChange={(value) => {
              setOwner(value);
              setOpenId(null);
            }}
          />
        </>
      }
    >
      <KpiGaugeCards
        compact
        metrics={[
          {
            id: "open-goals",
            label: "Open goals",
            value: openCount,
            note: `Across ${new Set(goals.map((goal) => goal.team)).size} crews`,
            gauge: {
              value: goals.length ? (openCount / goals.length) * 100 : 0,
              label: "Share of goals still open",
              tone: "neutral",
            },
          },
          {
            id: "target-progress",
            label: "Target progress",
            value: average,
            format: { style: "percent" },
            note: "Average progress toward each target",
            gauge: { value: average, label: "Average target progress" },
          },
          {
            id: "milestones",
            label: "Milestones",
            value: doneCount,
            unit: `/ ${milestones.length}`,
            note: "Steps finished along the way",
            gauge: {
              value: milestones.length
                ? (doneCount / milestones.length) * 100
                : 0,
              label: "Share of milestones finished",
            },
          },
          {
            id: "needs-attention",
            label: "Needs attention",
            value: reviewCount,
            note: "Behind expected pace or past due",
            gauge: {
              value: goals.length ? (reviewCount / goals.length) * 100 : 0,
              label: "Share of goals needing attention",
              tone: "neutral",
            },
          },
        ]}
      />
      <div className="grid items-start gap-5 @5xl/planning:grid-cols-[minmax(0,2.2fr)_minmax(320px,1fr)]">
        <section aria-label="Priority progress" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-medium">Goals</h2>
            <PlanningTabs
              label="Goal status"
              value={filter}
              onChange={(value) => {
                setFilter(value);
                setOpenId(null);
              }}
              options={[
                { value: "all", label: "All" },
                { value: "on-track", label: "On track" },
                { value: "review", label: "Check-in" },
                { value: "finished", label: "Finished" },
              ]}
            />
          </div>
          {visible.length ? (
            <GoalProgressList
              goals={visible}
              asOf={data.asOf}
              openId={openId}
              onOpenChange={setOpenId}
              onMilestoneChange={updateMilestone}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-12 text-center">
              <CircleCheck
                aria-hidden
                className="mx-auto size-6 text-muted-foreground"
              />
              <p className="mt-3 text-sm">No priorities in this view.</p>
              <Button
                variant="outline"
                className="mt-4 h-9 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setFilter("all");
                  setOwner("all");
                }}
              >
                Show all priorities
              </Button>
            </div>
          )}
        </section>
        <aside className="space-y-5">
          <section
            aria-label="Checkpoint summary"
            className="rounded-2xl border border-border bg-background p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-medium">Milestone progress</h2>
              <span className="grid size-9 place-items-center rounded-full border border-border bg-muted">
                <ListChecks
                  aria-hidden
                  className="size-4 text-muted-foreground"
                />
              </span>
            </div>
            <p className="mt-4 text-3xl font-medium tabular-nums">
              {doneCount}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                of {milestones.length}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Milestones reached this cycle
            </p>
            <PlanningProgress
              value={
                milestones.length ? (doneCount / milestones.length) * 100 : 0
              }
              label="Cycle checkpoints completed"
              className="mt-4"
            />
            <p className="mt-4 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
              Progress is based on each outcome’s starting point and target.
              Pace is compared with its timeline.
            </p>
          </section>
          <section
            aria-label="Upcoming checkpoints"
            className="overflow-hidden rounded-2xl border border-border bg-background"
          >
            <div className="flex items-center justify-between gap-3 p-5 sm:p-6">
              <h2 className="text-xl font-medium">Upcoming milestones</h2>
              <Layers3 aria-hidden className="size-4 text-muted-foreground" />
            </div>
            <ul className="max-h-80 overflow-y-auto px-5 pb-2 sm:px-6">
              {next.slice(0, 5).map((milestone) => (
                <li
                  key={`${milestone.goalId}:${milestone.id}`}
                  className="border-t border-border py-4"
                >
                  <p className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{milestone.goalTitle}</span>
                    <span
                      className={cn(
                        "shrink-0",
                        milestone.due < data.asOf && "text-destructive",
                      )}
                    >
                      {milestone.due < data.asOf
                        ? "Overdue"
                        : planningDate(milestone.due)}
                    </span>
                  </p>
                  <p className="mt-1.5 text-sm leading-5">{milestone.title}</p>
                </li>
              ))}
              {next.length === 0 && (
                <li className="pb-5 text-sm text-muted-foreground">
                  Every checkpoint is complete. Take a moment to review the
                  results.
                </li>
              )}
            </ul>
          </section>
        </aside>
      </div>
      <output className="sr-only">
        {doneCount} of {milestones.length} checkpoints complete.
      </output>
    </PlanningShell>
  );
}
