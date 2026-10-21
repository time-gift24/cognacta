"use client";

import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCheck,
  Clock3,
  Gauge,
  HeartHandshake,
  Layers3,
  Users,
} from "lucide-react";
import { useState } from "react";
import { PlanningFilter, PlanningMetrics, PlanningShell } from "./planning-ui";
import { TeamActivityHeatmap } from "./team-activity-heatmap";
import {
  allocatedHours,
  shiftPlanningDate,
  TEAM_CAPACITY_SAMPLE_DATA,
  type TeamCapacityData,
  type TeamMember,
} from "./team-capacity-data";
import { TeamFocusChart } from "./team-focus-chart";
import { TeamWorkloadTable } from "./team-workload-table";

export type TeamCapacityDashboardProps = {
  data?: TeamCapacityData;
  name?: string;
  onTeamChange?: (team: string) => void;
  onDayChange?: (date: string) => void;
  onMemberOpen?: (member: TeamMember) => void;
  className?: string;
};

/** A complete capacity workspace. Historical activity and this week's allocations are distinct data sets. */
export function TeamCapacityDashboard({
  data = TEAM_CAPACITY_SAMPLE_DATA,
  name = "Avery",
  onTeamChange,
  onDayChange,
  onMemberOpen,
  className,
}: TeamCapacityDashboardProps) {
  const [team, setTeam] = useState("all");
  const [weeks, setWeeks] = useState("26");
  const teamNames = [...new Set(data.members.map((member) => member.team))];
  const members = data.members.filter(
    (member) => team === "all" || member.team === team,
  );
  const ids = new Set(members.map((member) => member.id));
  const activity = data.activity.filter(
    (day) => ids.has(day.memberId) && day.date <= data.asOf,
  );
  const recent = activity.filter(
    (day) => day.date >= shiftPlanningDate(data.asOf, -6),
  );
  const booked = members.reduce(
    (sum, member) => sum + allocatedHours(member),
    0,
  );
  const capacity = members.reduce((sum, member) => sum + member.capacity, 0);
  const available = members.reduce(
    (sum, member) =>
      sum + Math.max(0, member.capacity - allocatedHours(member)),
    0,
  );
  return (
    <PlanningShell
      eyebrow="Team planning"
      title="Your team"
      name={name}
      description="Track daily activity, shared workload, and this week’s availability."
      asOf={data.asOf}
      className={className}
      controls={
        <>
          <PlanningFilter
            label="Crew"
            value={team}
            icon={Users}
            onChange={(next) => {
              setTeam(next);
              onTeamChange?.(next);
            }}
            options={[
              { value: "all", label: "All crews", icon: Users },
              ...teamNames.map((name) => ({
                value: name,
                label: name,
                icon:
                  name === "Product"
                    ? Layers3
                    : name === "Customer care"
                      ? HeartHandshake
                      : BriefcaseBusiness,
              })),
            ]}
          />
          <PlanningFilter
            label="Activity window"
            value={weeks}
            onChange={setWeeks}
            icon={CalendarDays}
            options={[
              { value: "12", label: "Last 12 weeks", icon: CalendarDays },
              { value: "26", label: "Last 26 weeks", icon: CalendarDays },
            ]}
          />
        </>
      }
    >
      <PlanningMetrics
        items={[
          {
            label: "Work finished",
            value: recent.reduce((sum, day) => sum + day.completed, 0),
            note: "Across the last 7 days",
            icon: <CheckCheck />,
          },
          {
            label: "Focus time",
            value: recent.reduce((sum, day) => sum + day.focusHours, 0),
            unit: "hours",
            note: "Across the last 7 days",
            icon: <Clock3 />,
          },
          {
            label: "Capacity booked",
            value: capacity ? Math.round((booked / capacity) * 100) : 0,
            unit: "%",
            note: `${booked}h committed of ${capacity}h this week`,
            icon: <Gauge />,
          },
          {
            label: "Hours available",
            value: available,
            unit: "hours",
            note: `Available across ${members.length} teammates`,
            icon: <Users />,
          },
        ]}
      />
      <div className="grid items-start gap-5 @5xl/planning:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
        <TeamActivityHeatmap
          key={`${weeks}:${data.asOf}`}
          activity={activity}
          asOf={data.asOf}
          weeks={Number(weeks)}
          onDayChange={onDayChange}
        />
        <TeamFocusChart
          teamOrder={teamNames}
          activity={activity}
          members={members}
          asOf={data.asOf}
        />
      </div>
      <TeamWorkloadTable
        members={members}
        weekLabel={data.weekLabel}
        onMemberOpen={onMemberOpen}
      />
    </PlanningShell>
  );
}
