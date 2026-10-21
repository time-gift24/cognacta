"use client";

import {
  CalendarDays,
  CheckCheck,
  ChevronDown,
  Clock3,
  Download,
  EllipsisVertical,
  Inbox,
  RotateCcw,
  ThumbsUp,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import {
  type DateRange,
  DateRangePicker,
  DateRangePickerCalendar,
  DateRangePickerContent,
  DateRangePickerFooter,
  DateRangePickerGrid,
  DateRangePickerHeader,
  DateRangePickerPresets,
  DateRangePickerSelection,
  DateRangePickerTrigger,
} from "@/components/beui/motion/date-range-picker";
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
  AnimatedDropdownTrigger,
} from "@/components/beui/premium/animated-dropdown";
import {
  KpiSupportCards,
  type KpiSupportMetric,
} from "@/components/beui/premium/dashboard/kpi-support-cards";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { SupportActivityFeed } from "./support-activity-feed";
import {
  downloadSupportCsv,
  SUPPORT_SAMPLE_DATA,
  type SupportDashboardData,
  type SupportDay,
  type SupportTicket,
  supportDate,
} from "./support-dashboard-data";
import { SupportTicketTable } from "./support-ticket-table";
import { SupportVolumeChart } from "./support-volume-chart";

export type SupportDashboardProps = {
  data?: SupportDashboardData;
  name?: string;
  currentUser?: string;
  defaultRange?: DateRange & { to: string };
  onRangeChange?: (range: DateRange & { to: string }) => void;
  onTicketUpdate?: (ticket: SupportTicket) => void;
  onExport?: (tickets: readonly SupportTicket[]) => void;
  className?: string;
};

function summarize(days: readonly SupportDay[]) {
  const totals = days.reduce(
    (sum, day) => ({
      received: sum.received + day.received,
      responses: sum.responses + day.responses,
      replyMinutes: sum.replyMinutes + day.replyMinutes * day.responses,
      onTime: sum.onTime + day.onTime,
      ratingTotal: sum.ratingTotal + day.ratingTotal,
      ratings: sum.ratings + day.ratings,
    }),
    {
      received: 0,
      responses: 0,
      replyMinutes: 0,
      onTime: 0,
      ratingTotal: 0,
      ratings: 0,
    },
  );
  return [
    totals.received,
    totals.responses ? totals.replyMinutes / totals.responses : 0,
    totals.responses ? (totals.onTime / totals.responses) * 100 : 0,
    totals.ratings ? totals.ratingTotal / totals.ratings : 0,
  ];
}

function shiftDate(value: string, offset: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function SupportDateControl({
  range,
  min,
  max,
  onChange,
}: {
  range: DateRange & { to: string };
  min?: string;
  max: string;
  onChange: (range: DateRange & { to: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | null>(range);
  return (
    <DateRangePicker
      value={draft}
      onValueChange={setDraft}
      defaultMonth={range.from}
      min={min}
      max={max}
      label="Dashboard period"
      open={open}
      onOpenChange={(next) => {
        setDraft(range);
        setOpen(next);
      }}
      presets={[
        { label: "Last 7 days", value: { from: shiftDate(max, -6), to: max } },
        {
          label: "This month",
          value: { from: `${max.slice(0, 7)}-01`, to: max },
        },
        {
          label: "Last 30 days",
          value: { from: shiftDate(max, -29), to: max },
        },
      ]}
    >
      <DateRangePickerTrigger
        aria-label={`Dashboard period: ${supportDate(range.from)} – ${supportDate(range.to)}, ${range.to.slice(0, 4)}`}
      >
        <CalendarDays
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="truncate tabular-nums">
          {supportDate(range.from)} – {supportDate(range.to)},{" "}
          {range.to.slice(0, 4)}
        </span>
        <ChevronDown
          aria-hidden
          className="size-3.5 shrink-0 text-muted-foreground"
        />
      </DateRangePickerTrigger>
      <DateRangePickerContent>
        <DateRangePickerCalendar className="w-full border-0">
          <DateRangePickerHeader />
          <DateRangePickerGrid />
          <DateRangePickerFooter>
            <DateRangePickerSelection />
            <DateRangePickerPresets className="justify-start" />
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setDraft(range);
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!draft?.to}
                className="h-9 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  if (!draft?.to) return;
                  onChange({ from: draft.from, to: draft.to });
                  setOpen(false);
                }}
              >
                Apply range
              </Button>
            </div>
          </DateRangePickerFooter>
        </DateRangePickerCalendar>
      </DateRangePickerContent>
    </DateRangePicker>
  );
}

/** A complete support workspace. Dates drive the summaries, chart, feed, and queue. */
export function SupportDashboard({
  data = SUPPORT_SAMPLE_DATA,
  name = "Avery",
  currentUser = "Avery Brooks",
  defaultRange,
  onRangeChange,
  onTicketUpdate,
  onExport,
  className,
}: SupportDashboardProps) {
  const heading = useId();
  const reduce = useReducedMotion();
  const maxDate = data.asOf.slice(0, 10);
  const initialRange = defaultRange ?? {
    from: `${maxDate.slice(0, 7)}-01`,
    to: maxDate,
  };
  const [range, setRange] = useState(initialRange);
  const [changes, setChanges] = useState<Record<string, SupportTicket>>({});
  const [message, setMessage] = useState("");
  const from = range.from;
  const to = range.to;
  const days = data.days.filter((day) => day.date >= from && day.date <= to);
  const length = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  const previousFrom = shiftDate(from, -length);
  const previousTo = shiftDate(from, -1);
  const previousDays = data.days.filter(
    (day) => day.date >= previousFrom && day.date <= previousTo,
  );
  const values = summarize(days);
  const previous = summarize(previousDays);
  const hasComparison = previousDays.length === length;
  const metrics: KpiSupportMetric[] = [
    {
      id: "received",
      label: "New requests",
      icon: <Inbox />,
      value: values[0],
    },
    {
      id: "reply",
      label: "First reply time",
      icon: <Clock3 />,
      value: values[1],
      format: { decimals: 0 },
      unit: "min",
      increaseIsPositive: false,
    },
    {
      id: "sla",
      label: "Reply targets met",
      icon: <CheckCheck />,
      value: values[2],
      format: { style: "percent" as const, decimals: 1 },
    },
    {
      id: "csat",
      label: "Customer rating",
      icon: <ThumbsUp />,
      value: values[3],
      format: { decimals: 1 },
      unit: "/ 5",
    },
  ].map((metric, i) => ({
    ...metric,
    change:
      hasComparison && previous[i] > 0
        ? ((values[i] - previous[i]) / previous[i]) * 100
        : undefined,
  }));
  const tickets = data.tickets
    .map((ticket) => changes[ticket.id] ?? ticket)
    .filter(
      (ticket) =>
        ticket.createdAt.slice(0, 10) >= from &&
        ticket.createdAt.slice(0, 10) <= to,
    );
  const activities = data.activities.filter(
    (activity) =>
      activity.at.slice(0, 10) >= from && activity.at.slice(0, 10) <= to,
  );
  const minDate = [...data.days].sort((a, b) => a.date.localeCompare(b.date))[0]
    ?.date;
  const changeRange = (next: DateRange & { to: string }) => {
    setRange(next);
    setMessage("");
    onRangeChange?.(next);
  };
  const updateTicket = (ticket: SupportTicket) => {
    setChanges((current) => ({ ...current, [ticket.id]: ticket }));
    onTicketUpdate?.(ticket);
    setMessage(`${ticket.id} updated. Changes are reflected in the queue.`);
  };
  const exportTickets = (rows: readonly SupportTicket[]) => {
    if (onExport) onExport(rows);
    else downloadSupportCsv(rows, `support-tickets-${from}-${to}.csv`);
    setMessage(
      `${rows.length} ${rows.length === 1 ? "request" : "requests"} exported.`,
    );
  };
  const reveal = (delay: number) => ({
    initial: reduce ? (false as const) : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduce ? 0 : 0.45,
      ease: EASE_OUT,
      delay: reduce ? 0 : delay,
    },
  });

  return (
    <main
      aria-labelledby={heading}
      className={cn(
        "@container/dashboard min-h-screen w-full bg-muted/20 text-foreground",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-screen-2xl space-y-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <motion.header
          {...reveal(0)}
          className="flex flex-col justify-between gap-5 @5xl/dashboard:flex-row @5xl/dashboard:items-end"
        >
          <div>
            <p className="mb-3 text-xs text-muted-foreground">
              Service desk <span className="mx-2 text-border">/</span> Team
              inbox
            </p>
            <h1
              id={heading}
              className="text-2xl font-normal tracking-tight sm:text-3xl"
            >
              <span className="text-muted-foreground">Your queue,</span> {name}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Track incoming requests, team handoffs, and the next reply.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SupportDateControl
              range={range}
              min={minDate}
              max={maxDate}
              onChange={changeRange}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 rounded-full bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => exportTickets(tickets)}
              disabled={!tickets.length}
            >
              <Download aria-hidden className="size-4 text-muted-foreground" />
              Export
            </Button>
            <AnimatedDropdown>
              <AnimatedDropdownTrigger
                aria-label="Dashboard options"
                className="grid size-9 place-items-center rounded-full border border-border bg-background text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <EllipsisVertical aria-hidden className="size-4" />
              </AnimatedDropdownTrigger>
              <AnimatedDropdownContent align="end">
                <AnimatedDropdownItem
                  onSelect={() => changeRange(initialRange)}
                >
                  <RotateCcw aria-hidden className="size-4" />
                  Reset reporting period
                </AnimatedDropdownItem>
                <AnimatedDropdownItem
                  onSelect={() => {
                    changeRange({ from: shiftDate(maxDate, -6), to: maxDate });
                  }}
                >
                  <ChevronDown aria-hidden className="size-4" />
                  Show the last 7 days
                </AnimatedDropdownItem>
              </AnimatedDropdownContent>
            </AnimatedDropdown>
          </div>
        </motion.header>
        <motion.div {...reveal(0.06)}>
          <KpiSupportCards
            compact
            metrics={days.length ? metrics : []}
            comparisonLabel="from last period"
          />
        </motion.div>
        <motion.div
          {...reveal(0.12)}
          className="grid min-w-0 items-start gap-5 @5xl/dashboard:grid-cols-[minmax(0,2.2fr)_minmax(320px,1fr)]"
        >
          <SupportVolumeChart days={days} />
          <SupportActivityFeed activities={activities} />
        </motion.div>
        <motion.div {...reveal(0.18)}>
          <SupportTicketTable
            tickets={tickets}
            asOf={data.asOf}
            currentUser={currentUser}
            onUpdate={updateTicket}
            onExport={exportTickets}
          />
        </motion.div>
        <footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {data === SUPPORT_SAMPLE_DATA ? "Demo inbox · " : ""}Data as of{" "}
            {supportDate(data.asOf, true)} UTC
          </span>
          <p aria-live="polite" className="min-h-4">
            {message}
          </p>
        </footer>
      </div>
    </main>
  );
}
