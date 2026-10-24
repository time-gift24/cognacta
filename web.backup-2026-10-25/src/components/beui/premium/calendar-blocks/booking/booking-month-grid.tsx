"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useId, useMemo } from "react";
import { Button } from "@/components/beui/motion/button";
import type { BookingLabels } from "./booking-data";
import { BookingDayCell } from "./booking-day-cell";
import { monthSlide } from "./booking-motion";
import { formatMonth, monthGrid } from "./booking-time";
import { useRovingGrid } from "./use-roving-grid";

const WEEKDAYS = [
  { short: "Mo", long: "Monday" },
  { short: "Tu", long: "Tuesday" },
  { short: "We", long: "Wednesday" },
  { short: "Th", long: "Thursday" },
  { short: "Fr", long: "Friday" },
  { short: "Sa", long: "Saturday" },
  { short: "Su", long: "Sunday" },
];

type BookingMonthGridProps = {
  month: string;
  direction: number;
  today: string;
  selectedDate: string | null;
  activeDate: string;
  setActiveDate: (date: string) => void;
  onSelectDate: (date: string) => void;
  slotCount: (date: string) => number;
  isUnavailable: (date: string) => boolean;
  canVisit: (date: string) => boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onMonthStep: (step: -1 | 1) => void;
  labels: BookingLabels;
  reduce: boolean;
};

export function BookingMonthGrid({
  month,
  direction,
  today,
  selectedDate,
  activeDate,
  setActiveDate,
  onSelectDate,
  slotCount,
  isUnavailable,
  canVisit,
  canGoPrevious,
  canGoNext,
  onMonthStep,
  labels,
  reduce,
}: BookingMonthGridProps) {
  const id = useId();
  const cells = useMemo(() => monthGrid(month), [month]);
  const weeks = useMemo(() => {
    const rows: (typeof cells)[] = [];
    for (let index = 0; index < cells.length; index += 7)
      rows.push(cells.slice(index, index + 7));
    return rows;
  }, [cells]);
  const { getCellProps } = useRovingGrid({
    activeDate,
    setActiveDate,
    onSelect: (date) => {
      if (!isUnavailable(date)) onSelectDate(date);
    },
    canVisit,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3
          id={`${id}-month`}
          aria-live="polite"
          className="font-medium text-sm"
        >
          {formatMonth(month)}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={labels.previousMonth}
            disabled={!canGoPrevious}
            onClick={() => onMonthStep(-1)}
          >
            <ChevronLeft aria-hidden className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={labels.nextMonth}
            disabled={!canGoNext}
            onClick={() => onMonthStep(1)}
          >
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div aria-hidden="true" className="grid grid-cols-7">
          {WEEKDAYS.map((weekday) => (
            <span
              key={weekday.short}
              className="py-1 text-center font-mono text-muted-foreground text-xs"
            >
              {weekday.short}
            </span>
          ))}
        </div>

        <div className="relative overflow-hidden">
          <LayoutGroup id={`${id}-days`}>
            <AnimatePresence
              mode="popLayout"
              initial={false}
              custom={{ direction, reduce }}
            >
              <motion.div
                key={month}
                custom={{ direction, reduce }}
                variants={monthSlide}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <table
                  aria-labelledby={`${id}-month`}
                  className="w-full table-fixed border-collapse"
                >
                  <thead className="sr-only">
                    <tr>
                      {WEEKDAYS.map((weekday) => (
                        <th key={weekday.short} scope="col">
                          {weekday.long}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map((week) => (
                      <tr key={week[0].inMonth ? week[0].date : week[0].key}>
                        {week.map((cell) =>
                          cell.inMonth ? (
                            <BookingDayCell
                              key={cell.date}
                              date={cell.date}
                              slotCount={slotCount(cell.date)}
                              isToday={cell.date === today}
                              isSelected={cell.date === selectedDate}
                              isUnavailable={isUnavailable(cell.date)}
                              pillLayoutId={`${id}-pill`}
                              reduce={reduce}
                              onSelect={onSelectDate}
                              cellProps={getCellProps(cell.date)}
                            />
                          ) : (
                            <td key={cell.key} className="h-11 sm:h-12" />
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            </AnimatePresence>
          </LayoutGroup>
        </div>
      </div>
    </div>
  );
}
