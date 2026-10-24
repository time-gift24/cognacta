import { CalendarDays, Clock3, Globe2, Video } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/beui/utils";
import type {
  BookingHost,
  BookingSelection,
  BookingTimeZone,
} from "./booking-data";
import {
  addDays,
  formatLongDate,
  formatTime,
  shiftToZone,
} from "./booking-time";

type BookingSummaryProps = {
  host: BookingHost;
  selection: BookingSelection;
  hostOffset: number;
  timeZone: BookingTimeZone;
  hour12: boolean;
  className?: string;
};

/** Date and time range as the viewer reads them in their chosen zone. */
export function describeSelection(
  selection: BookingSelection,
  hostOffset: number,
  timeZone: BookingTimeZone,
  hour12: boolean,
) {
  const start = shiftToZone(
    selection.startMinutes,
    hostOffset,
    timeZone.offsetMinutes,
  );
  const end = start.minutes + selection.durationMinutes;
  return {
    date: formatLongDate(addDays(selection.date, start.dayShift)),
    time: `${formatTime(start.minutes, hour12)} – ${formatTime(end, hour12)}`,
  };
}

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:size-3.5">
        {icon}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

export function BookingSummary({
  host,
  selection,
  hostOffset,
  timeZone,
  hour12,
  className,
}: BookingSummaryProps) {
  const { date, time } = describeSelection(
    selection,
    hostOffset,
    timeZone,
    hour12,
  );

  return (
    <ul
      className={cn(
        "flex flex-col gap-2.5 rounded-2xl border border-border p-4",
        className,
      )}
    >
      <Row icon={<CalendarDays aria-hidden />}>{date}</Row>
      <Row icon={<Clock3 aria-hidden />}>
        <span className="tabular-nums">{time}</span>
        <span className="text-muted-foreground">
          {" "}
          · {selection.durationMinutes} min
        </span>
      </Row>
      <Row icon={<Globe2 aria-hidden />}>
        <span className="text-muted-foreground">{timeZone.label}</span>
      </Row>
      <Row icon={<Video aria-hidden />}>
        {host.location}
        {host.locationDetail ? (
          <span className="text-muted-foreground">
            {" "}
            · {host.locationDetail}
          </span>
        ) : null}
      </Row>
    </ul>
  );
}
