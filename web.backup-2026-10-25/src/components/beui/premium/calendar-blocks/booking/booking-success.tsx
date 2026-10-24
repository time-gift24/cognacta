"use client";

import { CalendarPlus, Download, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import {
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";
import {
  googleCalendarUrl,
  icsDataUrl,
  outlookCalendarUrl,
} from "./booking-calendar-links";
import type {
  BookingHost,
  BookingLabels,
  BookingSelection,
  BookingTimeZone,
} from "./booking-data";
import { BookingSummary } from "./booking-summary";

type BookingSuccessProps = {
  host: BookingHost;
  selection: BookingSelection;
  hostOffset: number;
  timeZone: BookingTimeZone;
  hour12: boolean;
  labels: BookingLabels;
  reduce: boolean;
  onReschedule: () => void;
  onDone: () => void;
};

/** Drawn ring, then the check stroke, then the copy settles in. */
function DrawnCheck({ reduce }: { reduce: boolean }) {
  const draw = (delay: number) =>
    reduce
      ? { initial: false as const, animate: { pathLength: 1 } }
      : {
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { duration: 0.45, delay, ease: EASE_OUT },
        };

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="size-12 text-foreground"
    >
      <motion.circle
        cx="24"
        cy="24"
        r="21"
        stroke="currentColor"
        strokeOpacity={0.2}
        strokeWidth={2}
        {...draw(0)}
      />
      <motion.path
        d="M15 24.5l6 6L33 18"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw(0.25)}
      />
    </svg>
  );
}

export function BookingSuccess({
  host,
  selection,
  hostOffset,
  timeZone,
  hour12,
  labels,
  reduce,
  onReschedule,
  onDone,
}: BookingSuccessProps) {
  const external = { target: "_blank", rel: "noreferrer noopener" } as const;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <DrawnCheck reduce={reduce} />
        <div className="flex flex-col gap-1">
          <AnimatedModalTitle className="font-medium text-xl">
            {labels.successTitle}
          </AnimatedModalTitle>
          <AnimatedModalDescription className="text-muted-foreground text-sm">
            {host.meetingTitle} with {host.name}. {labels.successDescription}
          </AnimatedModalDescription>
        </div>
      </div>

      <BookingSummary
        host={host}
        selection={selection}
        hostOffset={hostOffset}
        timeZone={timeZone}
        hour12={hour12}
      />

      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 px-1 font-medium text-muted-foreground text-xs">
          <CalendarPlus aria-hidden className="size-3.5" />
          {labels.addToCalendar}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <ButtonLink
            variant="outline"
            href={googleCalendarUrl(host, selection)}
            {...external}
          >
            {labels.google}
          </ButtonLink>
          <ButtonLink
            variant="outline"
            href={outlookCalendarUrl(host, selection)}
            {...external}
          >
            {labels.outlook}
          </ButtonLink>
          <ButtonLink
            variant="outline"
            href={icsDataUrl(host, selection)}
            download={`${host.meetingTitle.toLowerCase().replace(/\s+/g, "-")}.ics`}
          >
            <Download aria-hidden className="size-4" />
            {labels.ics}
          </ButtonLink>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-border border-t pt-4 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={onReschedule}>
          <RotateCcw aria-hidden className="size-4" />
          {labels.reschedule}
        </Button>
        <Button onClick={onDone}>{labels.done}</Button>
      </div>
    </div>
  );
}
