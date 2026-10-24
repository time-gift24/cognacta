"use client";

import { useCallback, useState } from "react";
import {
  type BookingAvailability,
  type BookingDuration,
  type BookingHost,
  type BookingSelection,
  type BookingTimeZone,
  resolveSlots,
} from "./booking-data";
import { addDays, addMonths, monthOf, toUtcISO } from "./booking-time";

/** Delay before focusing the previous slot, so the dialog has closed. */
const RESCHEDULE_FOCUS_MS = 320;

export type UseBookingStateOptions = {
  host: BookingHost;
  durations: readonly BookingDuration[];
  defaultDurationId?: string;
  availability: BookingAvailability;
  timeZones: readonly BookingTimeZone[];
  defaultTimeZone?: string;
  today: string;
  bookingWindowDays: number;
  defaultHour12: boolean;
  onReschedule?: (previous: BookingSelection) => void;
};

/**
 * All booking state: duration, zone, clock format, month paging, day and
 * slot selection, the confirm dialog, and rescheduling.
 */
export function useBookingState({
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
}: UseBookingStateOptions) {
  const [durationId, setDurationId] = useState(
    defaultDurationId ?? durations[Math.min(1, durations.length - 1)]?.id ?? "",
  );
  const duration =
    durations.find((item) => item.id === durationId) ?? durations[0];
  const [timeZoneId, setTimeZoneId] = useState(
    defaultTimeZone ?? host.timeZoneId,
  );
  const timeZone =
    timeZones.find((zone) => zone.id === timeZoneId) ?? timeZones[0];
  const hostOffset =
    timeZones.find((zone) => zone.id === host.timeZoneId)?.offsetMinutes ?? 0;
  const [hour12, setHour12] = useState(defaultHour12);

  const windowEnd = addDays(today, bookingWindowDays);
  const slotsFor = useCallback(
    (date: string) =>
      date < today || date > windowEnd
        ? []
        : resolveSlots(availability, date, duration.minutes),
    [availability, duration.minutes, today, windowEnd],
  );
  const isUnavailable = useCallback(
    (date: string) => slotsFor(date).length === 0,
    [slotsFor],
  );
  const canVisit = useCallback(
    (date: string) =>
      date >= `${monthOf(today)}-01` && monthOf(date) <= monthOf(windowEnd),
    [today, windowEnd],
  );

  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    for (let date = today; date <= windowEnd; date = addDays(date, 1)) {
      if (slotsFor(date).length > 0) return date;
    }
    return null;
  });
  const [activeDate, setActiveDateState] = useState(selectedDate ?? today);
  const [month, setMonth] = useState(monthOf(selectedDate ?? today));
  const [direction, setDirection] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [previous, setPrevious] = useState<BookingSelection | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSelection, setDialogSelection] =
    useState<BookingSelection | null>(null);

  const showMonth = useCallback(
    (next: string) => {
      if (next === month) return;
      setDirection(next > month ? 1 : -1);
      setMonth(next);
    },
    [month],
  );

  const setActiveDate = useCallback(
    (date: string) => {
      setActiveDateState(date);
      showMonth(monthOf(date));
    },
    [showMonth],
  );

  const selectDate = useCallback(
    (date: string) => {
      setSelectedDate(date);
      setActiveDate(date);
      setSelectedSlot(null);
    },
    [setActiveDate],
  );

  function stepMonth(step: -1 | 1) {
    const next = addMonths(month, step);
    showMonth(next);
    let target = `${next}-01`;
    for (let date = target; monthOf(date) === next; date = addDays(date, 1)) {
      if (!isUnavailable(date)) {
        target = date;
        break;
      }
    }
    setActiveDateState(target);
  }

  function openConfirm() {
    if (!selectedDate || selectedSlot === null) return;
    setDialogSelection({
      date: selectedDate,
      startMinutes: selectedSlot,
      durationMinutes: duration.minutes,
      timeZoneId: timeZone.id,
      startUtc: toUtcISO(selectedDate, selectedSlot, hostOffset),
      endUtc: toUtcISO(
        selectedDate,
        selectedSlot + duration.minutes,
        hostOffset,
      ),
    });
    setDialogOpen(true);
  }

  function handleReschedule(booked: BookingSelection) {
    const match = durations.find(
      (item) => item.minutes === booked.durationMinutes,
    );
    if (match) setDurationId(match.id);
    setPrevious(booked);
    selectDate(booked.date);
    setDialogOpen(false);
    onReschedule?.(booked);
    // The Confirm button that opened the dialog is gone; land on the old slot.
    window.setTimeout(() => {
      document
        .querySelector<HTMLButtonElement>("[data-booking-previous]")
        ?.focus();
    }, RESCHEDULE_FOCUS_MS);
  }

  const slots = selectedDate ? slotsFor(selectedDate) : [];
  const previousSlot =
    previous &&
    previous.date === selectedDate &&
    previous.durationMinutes === duration.minutes
      ? previous.startMinutes
      : null;

  return {
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
  };
}
