"use client";

/*
 * Appointment booking — storyboard
 * 1. Month changes slide the grid 28px toward the travel direction with a soft
 *    blur; the outgoing month exits in 150ms.
 * 2. Picking a day glides the primary pill to it (shared layoutId) and the slot
 *    list cascades in 45ms apart. Zone or 12h/24h changes cross-fade labels.
 * 3. Picking a slot squeezes it left while Confirm grows in beside it.
 * 4. Confirm opens the AnimatedModal form; submit rolls the StatefulButton,
 *    then the success view swaps in and draws its check.
 * Reduced motion: slides, rises, and blurs become opacity-only and layout
 * springs resolve instantly.
 */

import { useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { cn } from "@/lib/beui/utils";
import { BookingConfirmDialog } from "./booking-confirm-dialog";
import {
  type BookingAvailability,
  type BookingDetails,
  type BookingDuration,
  type BookingHost,
  type BookingLabels,
  type BookingSelection,
  type BookingTimeZone,
  DEFAULT_DURATIONS,
  DEFAULT_HOST,
  DEFAULT_LABELS,
  DEFAULT_TIME_ZONES,
  DEFAULT_TODAY,
  sampleAvailability,
} from "./booking-data";
import { BookingHostHeader } from "./booking-host-header";
import { BookingMonthGrid } from "./booking-month-grid";
import { BookingSlotList } from "./booking-slot-list";
import { monthOf } from "./booking-time";
import { useBookingState } from "./use-booking-state";

export type AppointmentBookingProps = {
  host?: BookingHost;
  durations?: readonly BookingDuration[];
  defaultDurationId?: string;
  availability?: BookingAvailability;
  timeZones?: readonly BookingTimeZone[];
  defaultTimeZone?: string;
  /** "YYYY-MM-DD". Pass the real date from your app; the default keeps SSR stable. */
  today?: string;
  /** Days after `today` that can be booked. */
  bookingWindowDays?: number;
  defaultHour12?: boolean;
  labels?: Partial<BookingLabels>;
  onBook?: (
    selection: BookingSelection,
    details: BookingDetails,
  ) => Promise<void>;
  onReschedule?: (previous: BookingSelection) => void;
  className?: string;
};

const simulateBooking = () =>
  new Promise<void>((resolve) => window.setTimeout(resolve, 1100));

export function AppointmentBooking({
  host = DEFAULT_HOST,
  durations = DEFAULT_DURATIONS,
  defaultDurationId,
  availability = sampleAvailability,
  timeZones = DEFAULT_TIME_ZONES,
  defaultTimeZone,
  today = DEFAULT_TODAY,
  bookingWindowDays = 60,
  defaultHour12 = true,
  labels: labelOverrides,
  onBook = simulateBooking,
  onReschedule,
  className,
}: AppointmentBookingProps) {
  const reduce = useReducedMotion() ?? false;
  const labels = useMemo(
    () => ({ ...DEFAULT_LABELS, ...labelOverrides }),
    [labelOverrides],
  );
  const booking = useBookingState({
    host,
    durations,
    defaultDurationId,
    availability,
    timeZones,
    defaultTimeZone,
    today,
    bookingWindowDays,
    defaultHour12,
    onReschedule,
  });
  const {
    duration,
    setDurationId,
    timeZone,
    setTimeZoneId,
    hostOffset,
    hour12,
    setHour12,
    windowEnd,
    slotsFor,
    isUnavailable,
    canVisit,
    selectedDate,
    activeDate,
    setActiveDate,
    selectDate,
    month,
    direction,
    stepMonth,
    selectedSlot,
    setSelectedSlot,
    slots,
    previousSlot,
    dialogOpen,
    setDialogOpen,
    dialogSelection,
    openConfirm,
    handleReschedule,
  } = booking;

  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-5xl overflow-clip rounded-3xl border border-border bg-background text-foreground",
        "md:grid-cols-2 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_minmax(0,19rem)]",
        className,
      )}
    >
      <div className="border-border border-b p-5 sm:p-6 md:col-span-2 lg:col-span-1 lg:border-r lg:border-b-0">
        <BookingHostHeader
          host={host}
          durations={durations}
          durationId={duration.id}
          onDurationChange={(id) => {
            setDurationId(id);
            setSelectedSlot(null);
          }}
          labels={labels}
        />
      </div>
      <div className="border-border border-b p-5 sm:p-6 md:border-r md:border-b-0">
        <BookingMonthGrid
          month={month}
          direction={direction}
          today={today}
          selectedDate={selectedDate}
          activeDate={activeDate}
          setActiveDate={setActiveDate}
          onSelectDate={selectDate}
          slotCount={(date) => slotsFor(date).length}
          isUnavailable={isUnavailable}
          canVisit={canVisit}
          canGoPrevious={month > monthOf(today)}
          canGoNext={month < monthOf(windowEnd)}
          onMonthStep={stepMonth}
          labels={labels}
          reduce={reduce}
        />
      </div>
      <div className="p-5 sm:p-6">
        <BookingSlotList
          date={selectedDate}
          slots={slots}
          durationMinutes={duration.minutes}
          hostOffset={hostOffset}
          timeZones={timeZones}
          timeZone={timeZone}
          onTimeZoneChange={setTimeZoneId}
          hour12={hour12}
          onHour12Change={setHour12}
          selectedSlot={selectedSlot}
          previousSlot={previousSlot}
          onSelectSlot={(start) =>
            setSelectedSlot((current) => (current === start ? null : start))
          }
          onConfirm={openConfirm}
          labels={labels}
          reduce={reduce}
        />
      </div>

      <BookingConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        host={host}
        selection={dialogSelection}
        hostOffset={hostOffset}
        timeZone={timeZone}
        hour12={hour12}
        labels={labels}
        reduce={reduce}
        onBook={onBook}
        onBooked={() => setSelectedSlot(null)}
        onReschedule={handleReschedule}
      />
    </div>
  );
}
