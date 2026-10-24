"use client";

import {
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  ClipboardCheck,
  Clock3,
  Search,
  Users,
} from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import {
  PlanningFilter,
  PlanningProgress,
} from "@/components/beui/premium/dashboard-pages/planning-ui";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/beui/premium/data-table";
import { cn } from "@/lib/beui/utils";
import { formatReportValue } from "./format";
import { KpiSupportCards } from "./kpi-support-cards";
import {
  comparisonRangeLabel,
  shiftComparisonDate,
} from "./period-comparison-model";
import { TeamPerformanceDetails } from "./team-performance-details";
import {
  buildTeamPerformance,
  type PerformanceMember,
  type TeamPerformanceRecord,
  type TeamPerformanceRow,
} from "./team-performance-model";

export type TeamPerformanceProps = {
  members: readonly PerformanceMember[];
  records: readonly TeamPerformanceRecord[];
  /** Last complete UTC date in the data snapshot. */
  asOf: string;
  title?: string;
  onFiltersChange?: (filters: { team: string; days: number }) => void;
  onMemberOpen?: (member: PerformanceMember) => void;
  className?: string;
};

/** Delivery rankings and weighted service metrics, composed with our DataTable. */
export function TeamPerformance({
  members,
  records,
  asOf,
  title = "Team performance",
  onFiltersChange,
  onMemberOpen,
  className,
}: TeamPerformanceProps) {
  const heading = useId();
  const [team, setTeam] = useState("all");
  const [days, setDays] = useState(28);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const teams = Array.from(
    new Set(members.map((member) => member.team)),
  ).sort();
  const scope = members.filter(
    (member) => team === "all" || member.team === team,
  );
  const range = { from: shiftComparisonDate(asOf, 1 - days), to: asOf };
  const report = buildTeamPerformance(scope, records, range);
  const rows = report.rows.filter((member) =>
    `${member.name} ${member.role} ${member.team}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const active = report.rows.find((member) => member.id === activeId);
  const percent = (value: number | null) =>
    value === null
      ? "—"
      : formatReportValue(value, { style: "percent", decimals: 1 });
  const openMember = (member: TeamPerformanceRow) => {
    setActiveId(member.id);
    onMemberOpen?.(member);
  };
  const columns: DataTableColumn<TeamPerformanceRow>[] = [
    {
      key: "rank",
      header: <span className="sr-only">Delivery rank</span>,
      width: "56px",
      cell: (member) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {member.currentRecords.length
            ? String(member.rank).padStart(2, "0")
            : "—"}
        </span>
      ),
    },
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
          <div className="min-w-0">
            <p className="truncate text-sm">{member.name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {member.team} · {member.role}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "delivered",
      header: "Delivered",
      width: "135px",
      sortable: true,
      cell: (member) => (
        <div className="space-y-1">
          <p className="text-sm tabular-nums">
            {member.currentRecords.length
              ? formatReportValue(member.delivered)
              : "—"}
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {member.change === null
              ? "No baseline"
              : `${member.change > 0 ? "+" : ""}${formatReportValue(member.change, { decimals: 1 })}%`}
          </p>
        </div>
      ),
    },
    {
      key: "replyTime",
      header: "First reply",
      width: "140px",
      sortable: true,
      sortValue: (member) => member.replyTime ?? -1,
      cell: (member) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {member.replyTime === null
            ? "—"
            : `${formatReportValue(member.replyTime, { decimals: 1 })} min`}
        </span>
      ),
    },
    {
      key: "onTime",
      header: "On-time replies",
      width: "170px",
      sortable: true,
      sortValue: (member) => member.onTime ?? -1,
      cell: (member) => (
        <div className="w-full max-w-32 space-y-2">
          <p className="text-xs tabular-nums">{percent(member.onTime)}</p>
          {member.onTime !== null && (
            <PlanningProgress
              label={`${member.name} replies on time`}
              value={member.onTime}
            />
          )}
        </div>
      ),
    },
    {
      key: "quality",
      header: "Reviews passed",
      width: "180px",
      sortable: true,
      sortValue: (member) => member.quality ?? -1,
      cell: (member) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {percent(member.quality)}
        </span>
      ),
    },
    {
      key: "details",
      header: <span className="sr-only">Teammate details</span>,
      width: "80px",
      align: "right",
      cell: (member) => (
        <Button
          variant="ghost"
          className="ml-auto size-9 rounded-full p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`View performance for ${member.name}`}
          onClick={(event) => {
            event.stopPropagation();
            openMember(member);
          }}
        >
          <ArrowUpRight aria-hidden className="size-4" />
        </Button>
      ),
    },
  ];
  return (
    <section
      aria-labelledby={heading}
      className={cn("@container w-full min-w-0 space-y-5", className)}
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            id={heading}
            className="text-2xl font-normal tracking-tight text-muted-foreground"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A shared view of delivery, response, and review quality.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PlanningFilter
            label="Performance team"
            value={team}
            onChange={(next) => {
              setTeam(next);
              setActiveId(null);
              onFiltersChange?.({ team: next, days });
            }}
            icon={Users}
            options={[
              { value: "all", label: "All teams", icon: Users },
              ...teams.map((name) => ({
                value: name,
                label: name,
                icon: Users,
              })),
            ]}
          />
          <PlanningFilter
            label="Performance window"
            value={String(days)}
            onChange={(next) => {
              setDays(Number(next));
              setActiveId(null);
              onFiltersChange?.({ team, days: Number(next) });
            }}
            icon={CalendarDays}
            options={[
              { value: "7", label: "Last 7 days", icon: CalendarDays },
              { value: "28", label: "Last 28 days", icon: CalendarDays },
            ]}
          />
        </div>
      </header>
      {report.rows.some((member) => member.currentRecords.length > 0) ? (
        <KpiSupportCards
          compact
          className="@lg:[&>section>dl>div]:min-w-48"
          comparisonLabel="vs. previous period"
          metrics={[
            {
              id: "delivered",
              label: "Work delivered",
              icon: <CheckCheck />,
              value: report.current.delivered,
              change: report.change ?? undefined,
              note:
                report.current.delivered === 0
                  ? "No delivered work in this period"
                  : "Comparison unavailable",
            },
            {
              id: "on-time",
              label: "Replies on time",
              icon: <Clock3 />,
              value: report.current.onTimeReplies,
              note:
                report.current.onTime === null
                  ? "No first replies recorded"
                  : `${percent(report.current.onTime)} of ${formatReportValue(report.current.firstReplies)} replies`,
            },
            {
              id: "reviewed",
              label: "Reviews passed",
              icon: <ClipboardCheck />,
              value: report.current.passedReviews,
              note:
                report.current.quality === null
                  ? "No reviews recorded"
                  : `${percent(report.current.quality)} of ${formatReportValue(report.current.reviewed)} reviews`,
            },
          ]}
        />
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No observations for this team and period.
        </p>
      )}
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h3 className="text-base font-normal text-muted-foreground">
              Delivery leaderboard
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {comparisonRangeLabel(range)} · {scope.length} teammates
            </p>
          </div>
          <Input
            leftIcon={<Search aria-hidden className="size-4" />}
            aria-label="Find a teammate"
            type="search"
            value={query}
            onChange={(event) => setQuery(event)}
            placeholder="Find a teammate…"
            className="w-full max-w-64"
            classNames={{
              input: "pl-9 pr-4 text-sm placeholder:text-muted-foreground",
            }}
          />
        </div>
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(member) => member.id}
          defaultSort={{ key: "delivered", direction: "desc" }}
          rowHeight={64}
          height={448}
          onRowClick={openMember}
          className="border-0 border-t border-border [&_table]:min-w-5xl"
          emptyState={
            <p className="p-6 text-sm text-muted-foreground">
              {scope.length
                ? "No teammates match your search."
                : "No teammates in this team."}
            </p>
          }
        />
        <footer className="flex flex-wrap justify-between gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <span>
            Rank is based on delivered work. Reply and review rates use their
            own sample counts.
          </span>
          <span>{rows.length} shown</span>
        </footer>
      </div>
      <p className="text-xs text-muted-foreground">
        Delivery changes compare with {comparisonRangeLabel(report.prior)}.
        Missing days have no percentage baseline.
      </p>
      <TeamPerformanceDetails
        member={active}
        range={range}
        onClose={() => setActiveId(null)}
      />
    </section>
  );
}
