export type TeamAssignment = { id: string; title: string; hours: number };
export type TeamMember = {
  id: string;
  name: string;
  role: string;
  team: string;
  capacity: number;
  assignments: readonly TeamAssignment[];
};
export type TeamActivityDay = {
  date: string;
  memberId: string;
  completed: number;
  focusHours: number;
};
export type TeamCapacityData = {
  asOf: string;
  weekLabel: string;
  members: readonly TeamMember[];
  activity: readonly TeamActivityDay[];
};

const members: TeamMember[] = [
  {
    id: "milo",
    name: "Milo Grant",
    role: "Operations lead",
    team: "Operations",
    capacity: 40,
    assignments: [
      { id: "m1", title: "Renewal reviews", hours: 18 },
      { id: "m2", title: "Workflow audit", hours: 15 },
      { id: "m3", title: "Team planning", hours: 10 },
    ],
  },
  {
    id: "jules",
    name: "Jules Ortega",
    role: "Customer specialist",
    team: "Customer care",
    capacity: 32,
    assignments: [
      { id: "j1", title: "Inbox coverage", hours: 12 },
      { id: "j2", title: "Help center refresh", hours: 8 },
    ],
  },
  {
    id: "ari",
    name: "Ari Chen",
    role: "Product designer",
    team: "Product",
    capacity: 40,
    assignments: [
      { id: "a1", title: "Setup flow", hours: 24 },
      { id: "a2", title: "Research synthesis", hours: 12 },
    ],
  },
  {
    id: "remy",
    name: "Remy Brooks",
    role: "Operations analyst",
    team: "Operations",
    capacity: 40,
    assignments: [
      { id: "r1", title: "Account reconciliation", hours: 18 },
      { id: "r2", title: "Routing improvements", hours: 12 },
    ],
  },
  {
    id: "noor",
    name: "Noor Ellis",
    role: "Customer specialist",
    team: "Customer care",
    capacity: 32,
    assignments: [
      { id: "n1", title: "Customer follow-ups", hours: 20 },
      { id: "n2", title: "Quality reviews", hours: 8 },
    ],
  },
  {
    id: "sasha",
    name: "Sasha Rao",
    role: "Product engineer",
    team: "Product",
    capacity: 36,
    assignments: [
      { id: "s1", title: "Import reliability", hours: 16 },
      { id: "s2", title: "Accessibility fixes", hours: 6 },
    ],
  },
];

export function allocatedHours(member: TeamMember) {
  return member.assignments.reduce((sum, item) => sum + item.hours, 0);
}
export function shiftPlanningDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const activity: TeamActivityDay[] = [];
for (let index = 0; index < 178; index++) {
  const date = shiftPlanningDate("2026-04-06", index);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  for (let person = 0; person < members.length; person++) {
    const working = weekday !== 0 && weekday !== 6;
    const quiet = (index + person * 7) % 29 < 3;
    activity.push({
      date,
      memberId: members[person].id,
      completed: working && !quiet ? 3 + ((index * 3 + person * 5) % 9) : 0,
      focusHours: working && !quiet ? 2 + ((index + person * 3) % 8) / 2 : 0,
    });
  }
}
export const TEAM_CAPACITY_SAMPLE_DATA: TeamCapacityData = {
  asOf: "2026-09-30",
  weekLabel: "Sep 28 – Oct 4",
  members,
  activity,
};
