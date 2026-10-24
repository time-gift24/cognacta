export type GoalMilestone = {
  id: string;
  title: string;
  due: string;
  done: boolean;
};
export type PlanningGoal = {
  id: string;
  title: string;
  description: string;
  owner: string;
  team: string;
  cycle: string;
  actual: number;
  target: number;
  baseline?: number;
  unit: string;
  start: string;
  due: string;
  milestones: readonly GoalMilestone[];
};
export type GoalsDashboardData = {
  asOf: string;
  cycles: readonly { id: string; label: string }[];
  goals: readonly PlanningGoal[];
};

export function goalProgress(goal: PlanningGoal) {
  const raw =
    goal.baseline !== undefined
      ? (goal.baseline - goal.actual) / (goal.baseline - goal.target)
      : goal.target === 0
        ? 0
        : goal.actual / goal.target;
  return Math.max(0, Math.min(100, Number.isFinite(raw) ? raw * 100 : 0));
}
export function goalHealth(
  goal: PlanningGoal,
  asOf: string,
): "finished" | "review" | "on-track" {
  const progress = goalProgress(goal);
  if (progress >= 100) return "finished";
  const start = Date.parse(goal.start);
  const end = Date.parse(goal.due);
  const elapsed = Math.max(
    0,
    Math.min(1, (Date.parse(asOf) - start) / Math.max(1, end - start)),
  );
  return progress + 10 < elapsed * 100 || asOf > goal.due
    ? "review"
    : "on-track";
}
export const goalHealthLabel = {
  finished: "Finished",
  review: "Needs a check-in",
  "on-track": "On track",
};
export const GOALS_SAMPLE_DATA: GoalsDashboardData = {
  asOf: "2026-09-30",
  cycles: [
    { id: "fall", label: "Fall priorities" },
    { id: "winter", label: "Winter priorities" },
  ],
  goals: [
    {
      id: "handoffs",
      title: "Make handoffs easier",
      description:
        "Give every new teammate the context they need without another meeting. Measure completion of the new handoff training.",
      owner: "Milo Grant",
      team: "Operations",
      cycle: "fall",
      actual: 24,
      target: 32,
      unit: "teammates",
      start: "2026-08-01",
      due: "2026-10-30",
      milestones: [
        {
          id: "h1",
          title: "Map the moments where context gets lost",
          due: "2026-08-14",
          done: true,
        },
        {
          id: "h2",
          title: "Publish a shared handoff checklist",
          due: "2026-09-11",
          done: true,
        },
        {
          id: "h3",
          title: "Run the final training session",
          due: "2026-10-16",
          done: false,
        },
      ],
    },
    {
      id: "arrivals",
      title: "Give every arrival a clear next step",
      description:
        "Increase the share of new accounts that complete their first meaningful action within a week. The starting rate was 62%.",
      owner: "Ari Chen",
      team: "Product",
      cycle: "fall",
      baseline: 62,
      actual: 86,
      target: 90,
      unit: "%",
      start: "2026-08-01",
      due: "2026-10-30",
      milestones: [
        {
          id: "a1",
          title: "Interview five recent signups",
          due: "2026-08-21",
          done: true,
        },
        {
          id: "a2",
          title: "Ship the guided first-run flow",
          due: "2026-09-18",
          done: true,
        },
        {
          id: "a3",
          title: "Review the first full cohort",
          due: "2026-10-09",
          done: false,
        },
      ],
    },
    {
      id: "setup",
      title: "Spend less time on setup",
      description:
        "Reduce the average hands-on setup time per account, from 14.8 hours to 8 hours, while maintaining our quality checks.",
      owner: "Remy Brooks",
      team: "Operations",
      cycle: "fall",
      baseline: 14.8,
      actual: 9.2,
      target: 8,
      unit: "hours",
      start: "2026-08-01",
      due: "2026-10-30",
      milestones: [
        {
          id: "s1",
          title: "Measure the current setup journey",
          due: "2026-08-14",
          done: true,
        },
        {
          id: "s2",
          title: "Automate the repeated configuration steps",
          due: "2026-09-25",
          done: true,
        },
        {
          id: "s3",
          title: "Compare setup time across ten accounts",
          due: "2026-10-23",
          done: false,
        },
      ],
    },
    {
      id: "coverage",
      title: "Keep helpful answers close",
      description:
        "Publish practical guides for our thirty most common customer questions.",
      owner: "Jules Ortega",
      team: "Customer care",
      cycle: "fall",
      actual: 9,
      target: 30,
      unit: "guides",
      start: "2026-08-01",
      due: "2026-10-09",
      milestones: [
        {
          id: "c1",
          title: "Choose the thirty most useful topics",
          due: "2026-08-21",
          done: true,
        },
        {
          id: "c2",
          title: "Review the first fifteen drafts",
          due: "2026-09-25",
          done: false,
        },
        {
          id: "c3",
          title: "Publish the complete collection",
          due: "2026-10-09",
          done: false,
        },
      ],
    },
    {
      id: "quality",
      title: "Close the loop on quality",
      description:
        "Review one hundred recent customer conversations and share actionable coaching notes.",
      owner: "Noor Ellis",
      team: "Customer care",
      cycle: "fall",
      actual: 100,
      target: 100,
      unit: "reviews",
      start: "2026-08-01",
      due: "2026-09-30",
      milestones: [
        {
          id: "q1",
          title: "Agree on the review rubric",
          due: "2026-08-14",
          done: true,
        },
        {
          id: "q2",
          title: "Complete the conversation reviews",
          due: "2026-09-18",
          done: true,
        },
        {
          id: "q3",
          title: "Share coaching notes with the team",
          due: "2026-09-25",
          done: true,
        },
      ],
    },
    {
      id: "imports",
      title: "Make imports feel effortless",
      description:
        "Validate the new import experience with twenty-five customer accounts before the wider rollout.",
      owner: "Sasha Rao",
      team: "Product",
      cycle: "winter",
      actual: 0,
      target: 25,
      unit: "accounts",
      start: "2026-11-02",
      due: "2026-12-18",
      milestones: [
        {
          id: "i1",
          title: "Recruit the first pilot accounts",
          due: "2026-11-06",
          done: false,
        },
        {
          id: "i2",
          title: "Complete the pilot and review feedback",
          due: "2026-12-11",
          done: false,
        },
      ],
    },
    {
      id: "routing",
      title: "Bring requests to the right person",
      description:
        "Route ninety-five percent of incoming requests to the right crew on their first assignment. The starting rate was 72%.",
      owner: "Milo Grant",
      team: "Operations",
      cycle: "winter",
      baseline: 72,
      actual: 72,
      target: 95,
      unit: "%",
      start: "2026-11-02",
      due: "2026-12-18",
      milestones: [
        {
          id: "r1",
          title: "Agree on the routing categories",
          due: "2026-11-13",
          done: false,
        },
        {
          id: "r2",
          title: "Review the first month of assignments",
          due: "2026-12-04",
          done: false,
        },
      ],
    },
  ],
};
