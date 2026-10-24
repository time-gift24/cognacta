"use client";

import { CalendarDays, Flag } from "lucide-react";
import { BouncyAccordion } from "@/components/beui/motion/bouncy-accordion";
import { Checkbox } from "@/components/beui/motion/checkbox";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { cn } from "@/lib/beui/utils";
import {
  goalHealth,
  goalHealthLabel,
  goalProgress,
  type PlanningGoal,
} from "./goals-dashboard-data";
import { PlanningProgress, planningDate } from "./planning-ui";

export function GoalProgressList({
  goals,
  asOf,
  openId,
  onOpenChange,
  onMilestoneChange,
}: {
  goals: readonly PlanningGoal[];
  asOf: string;
  openId: string | null;
  onOpenChange: (id: string | null) => void;
  onMilestoneChange: (
    goalId: string,
    milestoneId: string,
    done: boolean,
  ) => void;
}) {
  return (
    <div className="@container/goals overflow-hidden rounded-2xl border border-border bg-background">
      {goals.map((goal) => {
        const progress = goalProgress(goal);
        const health = goalHealth(goal, asOf);
        return (
          <BouncyAccordion
            key={goal.id}
            value={openId === goal.id ? goal.id : null}
            onValueChange={onOpenChange}
            classNames={{
              root: "border-b border-border last:border-b-0",
              item: "rounded-2xl! bg-background",
              trigger:
                "items-start gap-3 px-5 py-4 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              icon: "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-border bg-muted text-muted-foreground",
              title: "min-w-0 flex-1",
              chevron: "mt-1",
              content: "[&>div]:px-5 [&>div]:pb-4",
              description: "text-sm leading-6 text-muted-foreground",
            }}
            items={[
              {
                id: goal.id,
                icon: <Flag aria-hidden className="size-3.5" />,
                title: (
                  <span className="grid gap-3 @xl/goals:grid-cols-[minmax(0,1fr)_180px] @xl/goals:items-center">
                    <span className="block min-w-0">
                      <span className="block text-base font-normal">
                        {goal.title}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-normal text-muted-foreground">
                        <span>{goal.owner}</span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays aria-hidden className="size-3" />
                          {planningDate(goal.due)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5",
                            health === "review" && "text-destructive",
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "size-1.5 rounded-full",
                              health === "review"
                                ? "bg-destructive"
                                : "bg-muted-foreground",
                            )}
                          />
                          {goalHealthLabel[health]}
                        </span>
                      </span>
                    </span>
                    <span className="grid gap-2">
                      <span className="flex items-center justify-between gap-3 text-xs font-normal tabular-nums">
                        <span>
                          {goal.actual.toLocaleString()}
                          {goal.unit === "%" ? "%" : ""}
                          <span className="text-muted-foreground">
                            {" "}
                            / {goal.target.toLocaleString()}
                            {goal.unit === "%" ? "%" : ` ${goal.unit}`}
                          </span>
                        </span>
                        <NumberTicker
                          startOnView={false}
                          value={Math.round(progress)}
                          suffix="%"
                          className="shrink-0 text-xs text-muted-foreground"
                        />
                      </span>
                      <PlanningProgress
                        value={progress}
                        label={`${goal.title} progress`}
                      />
                    </span>
                  </span>
                ),
                description: (
                  <div inert={openId !== goal.id}>
                    <div className="border-t border-border pt-4">
                      <p>{goal.description}</p>
                      <h3 className="mt-4 flex items-center justify-between text-xs font-medium text-foreground">
                        <span>Milestones</span>
                        <span className="font-normal tabular-nums text-muted-foreground">
                          {goal.milestones.filter((item) => item.done).length} /{" "}
                          {goal.milestones.length} complete
                        </span>
                      </h3>
                      <ul className="mt-2 divide-y divide-border">
                        {goal.milestones.map((milestone) => (
                          <li
                            key={milestone.id}
                            className="flex items-center justify-between gap-3 py-1.5"
                          >
                            <Checkbox
                              checked={milestone.done}
                              onCheckedChange={(done) =>
                                onMilestoneChange(goal.id, milestone.id, done)
                              }
                              label={milestone.title}
                              className="min-h-10 min-w-0 flex-1"
                            />
                            <span
                              className={cn(
                                "shrink-0 text-xs tabular-nums",
                                !milestone.done && milestone.due < asOf
                                  ? "text-destructive"
                                  : "text-muted-foreground",
                              )}
                            >
                              {milestone.done
                                ? "Done"
                                : planningDate(milestone.due)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs">
                        Milestones track the work. Results update independently.
                      </p>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        );
      })}
    </div>
  );
}
