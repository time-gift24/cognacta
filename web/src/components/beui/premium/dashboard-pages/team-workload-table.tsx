"use client";

import { ArrowUpRight, CalendarDays, X } from "lucide-react";
import { useState } from "react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/beui/premium/data-table";
import { PlanningProgress } from "./planning-ui";
import { allocatedHours, type TeamMember } from "./team-capacity-data";

export function TeamWorkloadTable({
  members,
  weekLabel,
  onMemberOpen,
}: {
  members: readonly TeamMember[];
  weekLabel: string;
  onMemberOpen?: (member: TeamMember) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = members.find((member) => member.id === selectedId);
  const columns: DataTableColumn<TeamMember>[] = [
    {
      key: "name",
      header: "Teammate",
      sortable: true,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-muted text-xs text-muted-foreground"
          >
            {member.name
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </span>
          <div>
            <p className="text-sm">{member.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {member.role}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "team",
      header: "Crew",
      width: "160px",
      sortable: true,
      cell: (member) => (
        <span className="text-sm text-muted-foreground">{member.team}</span>
      ),
    },
    {
      key: "allocation",
      header: "Weekly allocation",
      width: "240px",
      sortable: true,
      sortValue: allocatedHours,
      cell: (member) => (
        <div className="w-full max-w-48 space-y-2">
          <p className="text-xs tabular-nums">
            <span>{allocatedHours(member)}h</span>
            <span className="text-muted-foreground"> / {member.capacity}h</span>
          </p>
          <PlanningProgress
            value={
              member.capacity > 0
                ? (allocatedHours(member) / member.capacity) * 100
                : 0
            }
            label={`${member.name} allocation`}
          />
        </div>
      ),
    },
    {
      key: "available",
      header: "Availability",
      width: "190px",
      sortable: true,
      sortValue: (member) => member.capacity - allocatedHours(member),
      cell: (member) => {
        const available = member.capacity - allocatedHours(member);
        return (
          <span
            className={
              available < 0
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {available < 0
              ? `${-available}h over capacity`
              : available === 0
                ? "Fully allocated"
                : `${available}h available`}
          </span>
        );
      },
    },
    {
      key: "details",
      header: <span className="sr-only">Allocation details</span>,
      width: "72px",
      align: "right",
      cell: (member) => (
        <Button
          variant="ghost"
          className="ml-auto size-9 rounded-full p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`View allocation for ${member.name}`}
          onClick={() => {
            setSelectedId(member.id);
            onMemberOpen?.(member);
          }}
        >
          <ArrowUpRight aria-hidden className="size-4" />
        </Button>
      ),
    },
  ];
  return (
    <>
      <section
        aria-label="Team allocations"
        className="overflow-hidden rounded-2xl border border-border bg-background"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
          <div>
            <h2 className="text-xl font-medium">Team workload</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Planned hours and remaining capacity for each teammate.
            </p>
          </div>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays aria-hidden className="size-4" />
            {weekLabel}
          </span>
        </div>
        <DataTable
          data={[...members]}
          columns={columns}
          getRowId={(member) => member.id}
          rowHeight={64}
          height={members.length * 64 + 44}
          className="border-0 border-t border-border [&_table]:min-w-4xl"
          emptyState={
            <p className="p-6 text-sm text-muted-foreground">
              No teammates in this crew.
            </p>
          }
        />
      </section>
      <AnimatedModal
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        panelClassName="max-w-lg rounded-2xl border border-border p-6"
      >
        {selected && (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <AnimatedModalTitle className="text-xl font-medium">
                  {selected.name}’s week
                </AnimatedModalTitle>
                <AnimatedModalDescription className="mt-1 text-sm text-muted-foreground">
                  {weekLabel} · {selected.team}
                </AnimatedModalDescription>
              </div>
              <Button
                variant="ghost"
                className="size-9 rounded-full p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close allocation details"
                onClick={() => setSelectedId(null)}
              >
                <X aria-hidden className="size-4" />
              </Button>
            </div>
            <ul className="mt-6 divide-y divide-border">
              {selected.assignments.map((assignment) => (
                <li
                  key={assignment.id}
                  className="flex items-center justify-between gap-4 py-4 text-sm"
                >
                  <span>{assignment.title}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {assignment.hours}h
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-border pt-4 text-sm">
              <span>Total commitment</span>
              <span className="tabular-nums">
                {allocatedHours(selected)}h / {selected.capacity}h
              </span>
            </div>
          </>
        )}
      </AnimatedModal>
    </>
  );
}
