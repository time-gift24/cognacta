"use client";

import { CalendarX2, Globe2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { Select } from "@/components/beui/premium/select";
import type { BookingLabels, BookingTimeZone } from "./booking-data";
import { panelSwap, slotList } from "./booking-motion";
import { BookingSlotButton } from "./booking-slot-button";
import { formatLongDate, formatTime, shiftToZone } from "./booking-time";

type BookingSlotListProps = {
  date: string | null;
  slots: readonly number[];
  durationMinutes: number;
  hostOffset: number;
  timeZones: readonly BookingTimeZone[];
  timeZone: BookingTimeZone;
  onTimeZoneChange: (id: string) => void;
  hour12: boolean;
  onHour12Change: (value: boolean) => void;
  selectedSlot: number | null;
  previousSlot: number | null;
  onSelectSlot: (start: number) => void;
  onConfirm: () => void;
  labels: BookingLabels;
  reduce: boolean;
};

export function BookingSlotList({
  date,
  slots,
  durationMinutes,
  hostOffset,
  timeZones,
  timeZone,
  onTimeZoneChange,
  hour12,
  onHour12Change,
  selectedSlot,
  previousSlot,
  onSelectSlot,
  onConfirm,
  labels,
  reduce,
}: BookingSlotListProps) {
  const listKey = `${date ?? "none"}-${durationMinutes}`;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="truncate font-medium text-sm">
          {date ? formatLongDate(date) : labels.calendarLabel}
        </h3>
        {date ? (
          <p
            aria-live="polite"
            className="flex shrink-0 items-center gap-1 font-mono text-muted-foreground text-xs"
          >
            <DigitSwap value={slots.length} />
            {labels.openSlots}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Globe2
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
          />
          <Select
            label={labels.timeZoneLabel}
            options={timeZones.map((zone) => ({
              id: zone.id,
              label: zone.label,
            }))}
            value={timeZone.id}
            onValueChange={onTimeZoneChange}
            portal
            className="min-w-0 flex-1"
            buttonClassName="w-full min-w-0"
            optionsClassName="min-w-56"
          />
        </div>
        <Tabs
          value={hour12 ? "12h" : "24h"}
          onValueChange={(value) => onHour12Change(value === "12h")}
        >
          <TabsList aria-label={labels.clockLabel}>
            <TabsTrigger value="12h" className="font-mono text-xs">
              12h
            </TabsTrigger>
            <TabsTrigger value="24h" className="font-mono text-xs">
              24h
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="relative min-h-72">
        <AnimatePresence mode="wait" initial={false}>
          {date && slots.length > 0 ? (
            <motion.ul
              key={listKey}
              variants={slotList}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              aria-label={formatLongDate(date)}
              className="flex max-h-96 flex-col gap-2 overflow-y-auto overscroll-contain p-1"
            >
              {slots.map((start) => {
                const shifted = shiftToZone(
                  start,
                  hostOffset,
                  timeZone.offsetMinutes,
                );
                const dayHint =
                  shifted.dayShift === 0
                    ? null
                    : shifted.dayShift > 0
                      ? "+1d"
                      : "-1d";
                return (
                  <BookingSlotButton
                    key={start}
                    label={formatTime(shifted.minutes, hour12)}
                    dayHint={dayHint}
                    selected={selectedSlot === start}
                    previous={previousSlot === start}
                    previousLabel={labels.previousSlot}
                    confirmLabel={labels.confirm}
                    reduce={reduce}
                    onSelect={() => onSelectSlot(start)}
                    onConfirm={onConfirm}
                  />
                );
              })}
            </motion.ul>
          ) : (
            <motion.div
              key={`empty-${listKey}`}
              custom={{ reduce }}
              variants={panelSwap}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-border border-dashed p-6 text-center"
            >
              <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <CalendarX2 aria-hidden className="size-4" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="font-medium text-sm">
                  {date ? labels.noSlots : labels.calendarLabel}
                </p>
                <p className="text-muted-foreground text-xs">
                  {date ? labels.noSlotsHint : labels.pickDay}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
