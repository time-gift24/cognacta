"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useDeferredValue, useMemo, useState } from "react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { EASE_OUT } from "@/lib/beui/ease";
import { useOnOpen } from "@/lib/beui/hooks/use-on-open";
import { cn } from "@/lib/beui/utils";

export type CalendarEventCategory =
  | "meeting"
  | "focus"
  | "personal"
  | "deadline";

export type CalendarEventTone = "primary" | "accent" | "success" | "warning";

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  category: CalendarEventCategory;
  tone?: CalendarEventTone;
  location?: string;
  attendees?: number;
};

export type CalendarPlannerProps = {
  events?: readonly CalendarEvent[];
  initialDate?: Date;
  onEventSelect?: (event: CalendarEvent) => void;
  onCreateEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (event: CalendarEvent) => void;
  className?: string;
};

type CalendarView = "month" | "week";
type CalendarFilter = "all" | CalendarEventCategory;

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const longDateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "long" });
const shortMonthFormatter = new Intl.DateTimeFormat("en", { month: "short" });
const shortMonthYearFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
});
const hourHeight = 56;
const calendarStartHour = 8;
const calendarEndHour = 18;

const toneClasses: Record<CalendarEventTone, string> = {
  primary: "border-primary/15 bg-primary/10 text-foreground",
  accent: "border-accent/20 bg-accent/25 text-foreground",
  success: "border-success/20 bg-success/10 text-foreground",
  warning: "border-warning/20 bg-warning/10 text-foreground",
};

const categoryLabels: Record<CalendarEventCategory, string> = {
  meeting: "Meetings",
  focus: "Focus",
  personal: "Personal",
  deadline: "Deadlines",
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const weekday = next.getDay();
  next.setDate(next.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  return next;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatWeekRange(days: readonly Date[]) {
  const first = days[0];
  const last = days[days.length - 1];
  const firstMonth = new Intl.DateTimeFormat("en", { month: "short" }).format(
    first,
  );
  const lastMonth = new Intl.DateTimeFormat("en", { month: "short" }).format(
    last,
  );
  if (
    first.getFullYear() === last.getFullYear() &&
    first.getMonth() === last.getMonth()
  ) {
    return `${firstMonth} ${first.getDate()}–${last.getDate()}, ${last.getFullYear()}`;
  }
  if (first.getFullYear() === last.getFullYear()) {
    return `${firstMonth} ${first.getDate()} – ${lastMonth} ${last.getDate()}, ${last.getFullYear()}`;
  }
  return `${firstMonth} ${first.getDate()}, ${first.getFullYear()} – ${lastMonth} ${last.getDate()}, ${last.getFullYear()}`;
}

function formatCompactWeekRange(days: readonly Date[]) {
  const first = days[0];
  const last = days[days.length - 1];
  const firstMonth = shortMonthFormatter.format(first);
  const lastMonth = shortMonthFormatter.format(last);

  if (
    first.getFullYear() === last.getFullYear() &&
    first.getMonth() === last.getMonth()
  ) {
    return `${firstMonth} ${first.getDate()}–${last.getDate()}`;
  }

  return `${firstMonth} ${first.getDate()}–${lastMonth} ${last.getDate()}`;
}

function monthDays(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function monthDate(date: Date, day: number) {
  return new Date(date.getFullYear(), date.getMonth(), day);
}

function isSameDay(left: Date, right: Date) {
  return formatDateKey(left) === formatDateKey(right);
}

function timeToMinutes(time: string) {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function displayTime(time: string) {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function createDemoEvents(baseDate: Date): CalendarEvent[] {
  const at = (day: number) => formatDateKey(monthDate(baseDate, day));
  return [
    {
      id: "planning-kickoff",
      title: "Planning kickoff",
      date: at(2),
      start: "09:00",
      end: "10:00",
      category: "meeting",
      tone: "primary",
      location: "Studio room",
      attendees: 6,
    },
    {
      id: "research-block",
      title: "Research block",
      date: at(3),
      start: "10:30",
      end: "12:00",
      category: "focus",
      tone: "accent",
    },
    {
      id: "team-standup",
      title: "Team standup",
      date: at(4),
      start: "09:30",
      end: "10:00",
      category: "meeting",
      tone: "primary",
      attendees: 8,
    },
    {
      id: "design-review",
      title: "Design review",
      date: at(7),
      start: "11:00",
      end: "12:00",
      category: "meeting",
      tone: "warning",
      location: "Video call",
      attendees: 4,
    },
    {
      id: "deep-work",
      title: "Deep work",
      date: at(8),
      start: "09:00",
      end: "11:30",
      category: "focus",
      tone: "accent",
    },
    {
      id: "product-sync",
      title: "Product sync",
      date: at(8),
      start: "13:30",
      end: "14:30",
      category: "meeting",
      tone: "primary",
      attendees: 7,
    },
    {
      id: "dentist",
      title: "Dentist",
      date: at(9),
      start: "15:00",
      end: "16:00",
      category: "personal",
      tone: "success",
      location: "West clinic",
    },
    {
      id: "launch-copy",
      title: "Launch copy due",
      date: at(10),
      start: "16:00",
      end: "17:00",
      category: "deadline",
      tone: "warning",
    },
    {
      id: "client-call",
      title: "Client call",
      date: at(11),
      start: "10:00",
      end: "11:00",
      category: "meeting",
      tone: "primary",
      location: "Video call",
      attendees: 3,
    },
    {
      id: "lunch-zahir",
      title: "Lunch with Zahir",
      date: at(12),
      start: "12:30",
      end: "13:30",
      category: "personal",
      tone: "success",
      location: "Cafe Linden",
    },
    {
      id: "content-plan",
      title: "Content planning",
      date: at(15),
      start: "09:30",
      end: "10:30",
      category: "focus",
      tone: "accent",
    },
    {
      id: "hiring-loop",
      title: "Hiring loop",
      date: at(17),
      start: "11:00",
      end: "13:00",
      category: "meeting",
      tone: "primary",
      attendees: 5,
    },
    {
      id: "design-critique",
      title: "Design critique",
      date: at(18),
      start: "09:00",
      end: "10:30",
      category: "meeting",
      tone: "accent",
      location: "Design studio",
      attendees: 4,
    },
    {
      id: "invoice-due",
      title: "Invoices due",
      date: at(18),
      start: "15:30",
      end: "16:00",
      category: "deadline",
      tone: "warning",
    },
    {
      id: "prototype-review",
      title: "Prototype review",
      date: at(19),
      start: "10:00",
      end: "11:00",
      category: "meeting",
      tone: "primary",
      attendees: 6,
    },
    {
      id: "team-lunch",
      title: "Team lunch",
      date: at(20),
      start: "12:00",
      end: "13:00",
      category: "personal",
      tone: "success",
      location: "Atrium",
    },
    {
      id: "quarterly-review",
      title: "Quarterly review",
      date: at(21),
      start: "10:00",
      end: "11:30",
      category: "meeting",
      tone: "primary",
      location: "Board room",
      attendees: 9,
    },
    {
      id: "release-checklist",
      title: "Release checklist",
      date: at(22),
      start: "09:30",
      end: "11:00",
      category: "deadline",
      tone: "warning",
    },
    {
      id: "strategy-notes",
      title: "Strategy notes",
      date: at(23),
      start: "09:00",
      end: "11:00",
      category: "focus",
      tone: "accent",
    },
    {
      id: "roadmap-lock",
      title: "Roadmap lock",
      date: at(24),
      start: "14:00",
      end: "15:00",
      category: "deadline",
      tone: "warning",
    },
    {
      id: "studio-retro",
      title: "Studio retro",
      date: at(28),
      start: "10:00",
      end: "11:00",
      category: "meeting",
      tone: "success",
      attendees: 6,
    },
    {
      id: "writing-session",
      title: "Writing session",
      date: at(29),
      start: "13:00",
      end: "15:30",
      category: "focus",
      tone: "accent",
    },
    {
      id: "month-close",
      title: "Month close",
      date: at(30),
      start: "16:00",
      end: "17:00",
      category: "deadline",
      tone: "warning",
    },
  ];
}

function CalendarEventButton({
  event,
  compact = false,
  onSelect,
}: {
  event: CalendarEvent;
  compact?: boolean;
  onSelect: (event: CalendarEvent) => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex w-full min-w-0 items-center rounded-md border text-left transition-[border-color,background-color] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
        compact ? "h-6 gap-1 px-1.5 text-xs" : "gap-2 px-2.5 py-2",
        toneClasses[event.tone ?? "primary"],
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current opacity-55" />
      <span className="min-w-0 flex-1 truncate font-medium">{event.title}</span>
      <time className="shrink-0 font-mono text-xs opacity-65">
        {displayTime(event.start)}
      </time>
      {/* Full-chip control; the shared Button is always pill-shaped, so the
          chip keeps its own radius and this sits on top. */}
      <Button
        variant="plain"
        type="button"
        onClick={() => onSelect(event)}
        aria-label={`${event.title}, ${displayTime(event.start)} to ${displayTime(event.end)}`}
        whileHover={undefined}
        whileTap={undefined}
        className="absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
}

function MonthCalendar({
  visibleDate,
  events,
  direction,
  onEventSelect,
  onAddEvent,
  onShowDay,
}: {
  visibleDate: Date;
  events: readonly CalendarEvent[];
  direction: -1 | 1;
  onEventSelect: (event: CalendarEvent) => void;
  onAddEvent: (date: Date) => void;
  onShowDay: (date: Date) => void;
}) {
  const reduce = useReducedMotion();
  const days = useMemo(() => monthDays(visibleDate), [visibleDate]);
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const current = grouped.get(event.date) ?? [];
      current.push(event);
      grouped.set(event.date, current);
    }
    return grouped;
  }, [events]);
  const today = startOfDay(new Date());

  return (
    <div className="min-w-[840px]">
      <div className="grid grid-cols-7 border-border border-b bg-muted/25">
        {weekdays.map((day) => (
          <div
            key={day}
            className="px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-[0.12em]"
          >
            {day}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${visibleDate.getFullYear()}-${visibleDate.getMonth()}`}
          initial={
            reduce
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  transform: `translateX(${direction * 6}px)`,
                }
          }
          animate={{ opacity: 1, transform: "translateX(0px)" }}
          exit={
            reduce
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  transform: `translateX(${direction * -6}px)`,
                }
          }
          transition={{ duration: reduce ? 0.1 : 0.18, ease: EASE_OUT }}
          className="grid grid-cols-7"
        >
          {days.map((day) => {
            const dateKey = formatDateKey(day);
            const dayEvents = eventsByDate.get(dateKey) ?? [];
            const outside = day.getMonth() !== visibleDate.getMonth();
            const current = isSameDay(day, today);
            return (
              <div
                key={dateKey}
                className={cn(
                  "relative isolate min-h-28 border-border border-r border-b p-2 last:border-r-0",
                  outside && "bg-muted/15",
                )}
              >
                <Button
                  variant="plain"
                  type="button"
                  onClick={() => onAddEvent(day)}
                  aria-label={`Add event on ${longDateFormatter.format(day)}`}
                  className="absolute inset-0 z-0 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                />

                <div className="pointer-events-none relative z-10 mb-1 flex h-10 items-center justify-between">
                  <time
                    dateTime={dateKey}
                    className={cn(
                      "grid size-6 place-items-center rounded-full font-mono text-xs",
                      current
                        ? "bg-foreground text-background"
                        : outside
                          ? "text-muted-foreground/55"
                          : "text-muted-foreground",
                    )}
                  >
                    {day.getDate()}
                  </time>
                </div>

                <div className="relative z-10 space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <CalendarEventButton
                      key={event.id}
                      event={event}
                      compact
                      onSelect={onEventSelect}
                    />
                  ))}
                  {dayEvents.length > 3 ? (
                    <Button
                      variant="plain"
                      type="button"
                      onClick={() => onShowDay(day)}
                      className="h-6 px-1.5 text-left font-medium text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      +{dayEvents.length - 3} more
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function WeekCalendar({
  visibleDate,
  events,
  direction,
  onEventSelect,
}: {
  visibleDate: Date;
  events: readonly CalendarEvent[];
  direction: -1 | 1;
  onEventSelect: (event: CalendarEvent) => void;
}) {
  const reduce = useReducedMotion();
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        addDays(startOfWeek(visibleDate), index),
      ),
    [visibleDate],
  );
  const hours = Array.from(
    { length: calendarEndHour - calendarStartHour + 1 },
    (_, index) => calendarStartHour + index,
  );
  const totalHeight = (calendarEndHour - calendarStartHour) * hourHeight;
  const today = startOfDay(new Date());

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={formatDateKey(days[0])}
        initial={
          reduce
            ? { opacity: 0 }
            : {
                opacity: 0,
                transform: `translateX(${direction * 6}px)`,
              }
        }
        animate={{ opacity: 1, transform: "translateX(0px)" }}
        exit={
          reduce
            ? { opacity: 0 }
            : {
                opacity: 0,
                transform: `translateX(${direction * -6}px)`,
              }
        }
        transition={{ duration: reduce ? 0.1 : 0.18, ease: EASE_OUT }}
        className="min-w-[920px]"
      >
        <div className="grid grid-cols-[72px_repeat(7,minmax(120px,1fr))] border-border/70 border-b bg-muted/20">
          <div aria-hidden="true" className="bg-muted/10" />
          {days.map((day, index) => (
            <div
              key={formatDateKey(day)}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 border-border/70 border-l px-2 py-2",
                index >= 5 && "bg-muted/10",
                isSameDay(day, today) && "bg-primary/[0.045]",
              )}
            >
              <span className="font-medium text-xs text-muted-foreground uppercase tracking-[0.14em]">
                {weekdays[index]}
              </span>
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full font-mono text-xs tabular-nums",
                  isSameDay(day, today)
                    ? "bg-foreground text-background"
                    : "text-foreground",
                )}
              >
                {day.getDate()}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[72px_repeat(7,minmax(120px,1fr))]">
          <div
            className="relative border-border/70 border-r bg-muted/[0.06]"
            style={{ height: totalHeight }}
          >
            {hours.slice(0, -1).map((hour, index) => (
              <time
                key={hour}
                className="absolute right-3 font-mono text-xs text-muted-foreground tabular-nums"
                style={{ top: index * hourHeight + 8 }}
              >
                {displayTime(`${String(hour).padStart(2, "0")}:00`)}
              </time>
            ))}
          </div>

          {days.map((day, dayIndex) => {
            const dateKey = formatDateKey(day);
            const dayEvents = events.filter((event) => event.date === dateKey);
            return (
              <div
                key={dateKey}
                className={cn(
                  "relative border-border/70 border-r last:border-r-0",
                  dayIndex >= 5 && "bg-muted/[0.045]",
                  isSameDay(day, today) && "bg-primary/[0.035]",
                )}
                style={{ height: totalHeight }}
              >
                {hours.map((hour, index) => (
                  <span
                    key={hour}
                    aria-hidden="true"
                    className="absolute right-0 left-0 border-border/60 border-t"
                    style={{ top: index * hourHeight }}
                  />
                ))}

                {dayEvents.map((event) => {
                  const start = Math.max(
                    timeToMinutes(event.start),
                    calendarStartHour * 60,
                  );
                  const end = Math.min(
                    timeToMinutes(event.end),
                    calendarEndHour * 60,
                  );
                  if (end <= start) return null;
                  const top =
                    ((start - calendarStartHour * 60) / 60) * hourHeight;
                  const height = Math.max(
                    32,
                    ((end - start) / 60) * hourHeight - 4,
                  );
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "absolute right-1.5 left-1.5 z-10 overflow-hidden rounded-lg border px-2 py-1.5 text-left backdrop-blur-md transition-[box-shadow,border-color,background-color,transform] active:scale-[0.96] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                        toneClasses[event.tone ?? "primary"],
                      )}
                      style={{ top: top + 2, height }}
                    >
                      <time className="block font-mono text-xs opacity-65">
                        {displayTime(event.start)} – {displayTime(event.end)}
                      </time>
                      <span className="mt-0.5 block line-clamp-2 font-medium text-xs leading-4">
                        {event.title}
                      </span>
                      {/* Full-block control; the shared Button is always pill-shaped, so the
                          block keeps its own radius and this sits on top. */}
                      <Button
                        variant="plain"
                        type="button"
                        onClick={() => onEventSelect(event)}
                        aria-label={`${event.title}, ${displayTime(event.start)} to ${displayTime(event.end)}`}
                        whileHover={undefined}
                        whileTap={undefined}
                        className="absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function EventDetails({
  event,
  open,
  onOpenChange,
  onDelete,
}: {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (event: CalendarEvent) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  useOnOpen(open, () => setConfirmingDelete(false));

  return (
    <AnimatedModal
      open={open}
      onOpenChange={onOpenChange}
      panelClassName="max-w-md rounded-2xl border border-border p-0"
    >
      {event ? (
        <div>
          <div className="flex items-start gap-3 border-border border-b p-5">
            <span
              className={cn(
                "mt-1 size-3 shrink-0 rounded-full border",
                toneClasses[event.tone ?? "primary"],
              )}
            />
            <div className="min-w-0 flex-1">
              <AnimatedModalTitle className="font-semibold text-lg tracking-tight">
                {event.title}
              </AnimatedModalTitle>
              <AnimatedModalDescription className="mt-1 text-muted-foreground text-sm">
                {categoryLabels[event.category]}
              </AnimatedModalDescription>
            </div>
            <Button
              variant="plain"
              type="button"
              aria-label="Close event details"
              onClick={() => onOpenChange(false)}
              className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </div>

          <div className="space-y-4 p-5 text-sm">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 size-4 text-muted-foreground" />
              <span>
                {new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(
                  new Date(`${event.date}T12:00:00`),
                )}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 size-4 text-muted-foreground" />
              <span>
                {displayTime(event.start)} – {displayTime(event.end)}
              </span>
            </div>
            {event.location ? (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                <span>{event.location}</span>
              </div>
            ) : null}
            {event.attendees ? (
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 size-4 text-muted-foreground" />
                <span>{event.attendees} attendees</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-border border-t p-4">
            {confirmingDelete ? (
              <>
                <p className="text-muted-foreground text-sm">
                  Delete this event?
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(event)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-full h-9"
                  >
                    Delete
                  </Button>
                </div>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingDelete(true)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-full h-9"
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                Delete event
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </AnimatedModal>
  );
}

function CreateEventModal({
  open,
  date,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  date: Date;
  onOpenChange: (open: boolean) => void;
  onCreate: (event: CalendarEvent) => void;
}) {
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(formatDateKey(date));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  useOnOpen(open, () => {
    setTitle("");
    setEventDate(formatDateKey(date));
    setStart("09:00");
    setEnd("10:00");
  });

  const submit = (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    const formData = new FormData(submitEvent.currentTarget);
    const trimmedTitle = String(formData.get("title") ?? "").trim();
    const submittedDate = String(formData.get("date") ?? "");
    const submittedStart = String(formData.get("start") ?? "");
    const submittedEnd = String(formData.get("end") ?? "");
    if (!trimmedTitle) return;
    onCreate({
      id: `created-${Date.now()}`,
      title: trimmedTitle,
      date: submittedDate,
      start: submittedStart,
      end: submittedEnd,
      category: "meeting",
      tone: "primary",
    });
    setTitle("");
    onOpenChange(false);
  };

  return (
    <AnimatedModal
      open={open}
      onOpenChange={onOpenChange}
      panelClassName="max-w-md rounded-2xl border border-border p-0"
    >
      <form onSubmit={submit}>
        <div className="flex items-start gap-3 border-border border-b p-5">
          <div className="min-w-0 flex-1">
            <AnimatedModalTitle className="font-semibold text-lg tracking-tight">
              Add event
            </AnimatedModalTitle>
            <AnimatedModalDescription className="mt-1 text-muted-foreground text-sm">
              Create a calendar event without leaving the current view.
            </AnimatedModalDescription>
          </div>
          <Button
            variant="plain"
            type="button"
            aria-label="Close add event dialog"
            onClick={() => onOpenChange(false)}
            className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          <Input
            label="Title"
            data-autofocus
            name="title"
            required
            value={title}
            onChange={(event) => setTitle(event)}
            placeholder="Event title"
            className="w-full"
            classNames={{
              input:
                "px-3 text-base placeholder:text-muted-foreground sm:text-sm",
            }}
          />

          <Input
            label="Date"
            required
            name="date"
            type="date"
            value={eventDate}
            onChange={(event) => setEventDate(event)}
            className="w-full"
            classNames={{ input: "px-3 text-sm" }}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Starts"
              required
              name="start"
              type="time"
              value={start}
              onChange={(event) => setStart(event)}
              className="w-full"
              classNames={{ input: "px-3 text-sm" }}
            />
            <Input
              label="Ends"
              required
              name="end"
              type="time"
              min={start}
              value={end}
              onChange={(event) => setEnd(event)}
              className="w-full"
              classNames={{ input: "px-3 text-sm" }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-border border-t p-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit">Create event</Button>
        </div>
      </form>
    </AnimatedModal>
  );
}

export function CalendarPlanner({
  events,
  initialDate,
  onEventSelect,
  onCreateEvent,
  onDeleteEvent,
  className,
}: CalendarPlannerProps) {
  const [visibleDate, setVisibleDate] = useState(() =>
    startOfDay(initialDate ?? new Date()),
  );
  const [demoEvents] = useState(() =>
    createDemoEvents(initialDate ?? new Date()),
  );
  const [createdEvents, setCreatedEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<CalendarView>("month");
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [direction, setDirection] = useState<-1 | 1>(1);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState(visibleDate);
  const [deletedEventIds, setDeletedEventIds] = useState<string[]>([]);
  const allEvents = useMemo(
    () =>
      [...(events ?? demoEvents), ...createdEvents].filter(
        (event) => !deletedEventIds.includes(event.id),
      ),
    [createdEvents, deletedEventIds, demoEvents, events],
  );
  const filteredEvents = useMemo(
    () =>
      allEvents.filter(
        (event) =>
          (filter === "all" || event.category === filter) &&
          (!deferredQuery ||
            `${event.title} ${event.location ?? ""}`
              .toLowerCase()
              .includes(deferredQuery)),
      ),
    [allEvents, deferredQuery, filter],
  );
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        addDays(startOfWeek(visibleDate), index),
      ),
    [visibleDate],
  );
  const today = startOfDay(new Date());
  const showingCurrentPeriod =
    view === "month"
      ? visibleDate.getFullYear() === today.getFullYear() &&
        visibleDate.getMonth() === today.getMonth()
      : isSameDay(startOfWeek(visibleDate), startOfWeek(today));
  const navigationLabel = showingCurrentPeriod
    ? "Today"
    : view === "month"
      ? shortMonthYearFormatter.format(visibleDate)
      : formatCompactWeekRange(weekDays);

  const openEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    onEventSelect?.(event);
  };

  const move = (nextDirection: -1 | 1) => {
    setDirection(nextDirection);
    setVisibleDate((current) => {
      if (view === "week") return addDays(current, nextDirection * 7);
      return new Date(
        current.getFullYear(),
        current.getMonth() + nextDirection,
        1,
      );
    });
  };

  const showToday = () => {
    const today = startOfDay(new Date());
    setDirection(today < visibleDate ? -1 : 1);
    setVisibleDate(today);
  };

  const createEvent = (event: CalendarEvent) => {
    setCreatedEvents((current) => [...current, event]);
    setVisibleDate(new Date(`${event.date}T12:00:00`));
    onCreateEvent?.(event);
  };

  const deleteEvent = (event: CalendarEvent) => {
    setCreatedEvents((current) =>
      current.filter((currentEvent) => currentEvent.id !== event.id),
    );
    setDeletedEventIds((current) =>
      current.includes(event.id) ? current : [...current, event.id],
    );
    setSelectedEvent(null);
    onDeleteEvent?.(event);
  };

  return (
    <section
      aria-labelledby="calendar-planner-title"
      className={cn("w-full bg-background px-3 py-6 sm:px-6", className)}
    >
      <div className="mx-auto w-full max-w-[1500px]">
        <header className="flex flex-col gap-5 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-[0.16em]">
              Workspace
            </p>
            <h2
              id="calendar-planner-title"
              className="mt-1 text-foreground tracking-tight text-xl font-medium"
            >
              Calendar
            </h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Plan meetings, focus time, and deadlines in one view.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              leftIcon={<Search aria-hidden className="size-4" />}
              aria-label="Search calendar events"
              type="search"
              value={query}
              onChange={(event) => setQuery(event)}
              placeholder="Search events"
              className="w-full flex-1 min-w-0 sm:w-64"
              classNames={{
                input: "text-base placeholder:text-muted-foreground sm:text-sm",
              }}
            />
            <Button
              onClick={() => {
                setCreateDate(visibleDate);
                setCreateOpen(true);
              }}
              className="px-4 rounded-full h-9"
            >
              <Plus aria-hidden="true" className="size-4" />
              Add event
            </Button>
          </div>
        </header>

        <div className="mb-4 overflow-x-auto pb-px">
          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(value as CalendarFilter)}
            variant="underline"
          >
            <TabsList className="min-w-max">
              <TabsTrigger value="all">All events</TabsTrigger>
              <TabsTrigger value="meeting">Meetings</TabsTrigger>
              <TabsTrigger value="focus">Focus</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="deadline">Deadlines</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <div className="flex flex-col gap-4 border-border border-b p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-muted/35">
                <span className="font-mono text-xs text-muted-foreground uppercase">
                  {shortMonthFormatter.format(visibleDate)}
                </span>
                <span className="-mt-1 font-semibold text-sm">
                  {visibleDate.getDate()}
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="truncate tracking-tight text-xl font-medium">
                  {view === "month"
                    ? formatMonth(visibleDate)
                    : formatWeekRange(weekDays)}
                </h3>
                <p className="mt-0.5 text-muted-foreground text-xs">
                  {filteredEvents.length} visible events
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-full border border-border p-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={
                    view === "month" ? "Previous month" : "Previous week"
                  }
                  onClick={() => move(-1)}
                  className="size-9 rounded-full h-9"
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  variant="plain"
                  type="button"
                  onClick={showToday}
                  aria-label={`Go to today. Viewing ${navigationLabel}`}
                  className="h-8 min-w-16 px-3 font-medium text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {navigationLabel}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={view === "month" ? "Next month" : "Next week"}
                  onClick={() => move(1)}
                  className="size-9 rounded-full h-9"
                >
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Button>
              </div>

              <Tabs
                value={view}
                onValueChange={(value) => setView(value as CalendarView)}
                variant="pill"
              >
                <TabsList>
                  <TabsTrigger value="month" className="h-8 py-0 text-xs">
                    Month
                  </TabsTrigger>
                  <TabsTrigger value="week" className="h-8 py-0 text-xs">
                    Week
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="overflow-x-auto">
            {view === "month" ? (
              <MonthCalendar
                visibleDate={visibleDate}
                events={filteredEvents}
                direction={direction}
                onEventSelect={openEvent}
                onAddEvent={(day) => {
                  setCreateDate(day);
                  setCreateOpen(true);
                }}
                onShowDay={(day) => {
                  setVisibleDate(day);
                  setView("week");
                }}
              />
            ) : (
              <WeekCalendar
                visibleDate={visibleDate}
                events={filteredEvents}
                direction={direction}
                onEventSelect={openEvent}
              />
            )}
          </div>
        </div>
      </div>

      <EventDetails
        event={selectedEvent}
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
        onDelete={deleteEvent}
      />
      <CreateEventModal
        open={createOpen}
        date={createDate}
        onOpenChange={setCreateOpen}
        onCreate={createEvent}
      />
    </section>
  );
}
