"use client";

import {
  CalendarDays,
  CalendarRange,
  ChevronDown,
  CopyMinus,
  History,
} from "lucide-react";
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
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownRadioGroup,
  AnimatedDropdownRadioItem,
  AnimatedDropdownTrigger,
} from "@/components/beui/premium/animated-dropdown";
import {
  type ComparisonMode,
  type ComparisonRange,
  comparisonRangeLabel,
  shiftComparisonDate,
} from "./period-comparison-model";

const modes = [
  { value: "previous", label: "Previous period", icon: History },
  { value: "year", label: "Year over year", icon: CalendarRange },
  { value: "none", label: "No comparison", icon: CopyMinus },
] as const;

export function PeriodComparisonControls({
  range,
  mode,
  minDate,
  asOf,
  onRangeChange,
  onModeChange,
}: {
  range: ComparisonRange;
  mode: ComparisonMode;
  minDate?: string;
  asOf: string;
  onRangeChange: (range: ComparisonRange) => void;
  onModeChange: (mode: ComparisonMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | null>(range);
  return (
    <fieldset
      aria-label="Comparison filters"
      className="flex min-w-0 flex-wrap gap-2"
    >
      <DateRangePicker
        value={draft}
        onValueChange={setDraft}
        defaultMonth={range.to}
        min={minDate}
        max={asOf}
        label="Current period"
        open={open}
        onOpenChange={(next) => {
          setDraft(range);
          setOpen(next);
        }}
        presets={[
          {
            label: "Last 7 days",
            value: { from: shiftComparisonDate(asOf, -6), to: asOf },
          },
          {
            label: "Last 28 days",
            value: { from: shiftComparisonDate(asOf, -27), to: asOf },
          },
          {
            label: "This month",
            value: { from: `${asOf.slice(0, 7)}-01`, to: asOf },
          },
        ]}
      >
        <DateRangePickerTrigger
          className="max-w-full"
          aria-label={`Current period: ${comparisonRangeLabel(range)}`}
        >
          <CalendarDays
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span className="truncate text-sm tabular-nums">
            {comparisonRangeLabel(range)}
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
              <div className="mt-3 flex justify-between border-t border-border pt-3">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!draft?.to}
                  onClick={() => {
                    if (draft?.to) {
                      onRangeChange({ from: draft.from, to: draft.to });
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
      <AnimatedDropdown>
        <AnimatedDropdownTrigger
          aria-label={`Compare with: ${modes.find((item) => item.value === mode)?.label}`}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <History aria-hidden className="size-4 text-muted-foreground" />
          {modes.find((item) => item.value === mode)?.label}
          <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
        </AnimatedDropdownTrigger>
        <AnimatedDropdownContent align="end">
          <AnimatedDropdownRadioGroup
            value={mode}
            onValueChange={(value) => onModeChange(value as ComparisonMode)}
          >
            {modes.map((item) => (
              <AnimatedDropdownRadioItem key={item.value} value={item.value}>
                <item.icon
                  aria-hidden
                  className="size-4 text-muted-foreground"
                />
                {item.label}
              </AnimatedDropdownRadioItem>
            ))}
          </AnimatedDropdownRadioGroup>
        </AnimatedDropdownContent>
      </AnimatedDropdown>
    </fieldset>
  );
}
