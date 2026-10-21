"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import { useState } from "react";
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
import { planningDate } from "./planning-ui";

export function FinancePeriodControl({
  range,
  min,
  max,
  onChange,
}: {
  range: DateRange & { to: string };
  min: string;
  max: string;
  onChange: (range: DateRange & { to: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | null>(range);
  const fromLabel = `${planningDate(range.from)}${range.from.slice(0, 4) !== range.to.slice(0, 4) ? `, ${range.from.slice(0, 4)}` : ""}`;
  const periodLabel = `${fromLabel} – ${planningDate(range.to)}, ${range.to.slice(0, 4)}`;
  return (
    <DateRangePicker
      value={draft}
      onValueChange={setDraft}
      min={min}
      max={max}
      defaultMonth={range.to}
      label="Finance period"
      open={open}
      onOpenChange={(next) => {
        setDraft(range);
        setOpen(next);
      }}
      presets={[
        {
          label: "This month",
          value: { from: `${max.slice(0, 7)}-01`, to: max },
        },
        {
          label: "Year to date",
          value: { from: `${max.slice(0, 4)}-01-01`, to: max },
        },
        { label: "All activity", value: { from: min, to: max } },
      ]}
    >
      <DateRangePickerTrigger aria-label={`Finance period: ${periodLabel}`}>
        <CalendarDays aria-hidden className="size-4 text-muted-foreground" />
        <span className="truncate text-sm tabular-nums">{periodLabel}</span>
        <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
      </DateRangePickerTrigger>
      <DateRangePickerContent>
        <DateRangePickerCalendar className="w-full border-0">
          <DateRangePickerHeader />
          <DateRangePickerGrid />
          <DateRangePickerFooter>
            <DateRangePickerSelection />
            <DateRangePickerPresets className="justify-start" />
            <div className="mt-3 flex justify-between border-t border-border pt-3">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!draft?.to}
                onClick={() => {
                  if (draft?.to) {
                    onChange({ from: draft.from, to: draft.to });
                    setOpen(false);
                  }
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
