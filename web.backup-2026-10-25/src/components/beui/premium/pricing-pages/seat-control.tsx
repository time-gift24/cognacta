"use client";

import { Users } from "lucide-react";
import { RangeSlider } from "@/components/beui/motion/range-slider";
import type { PricingPageLabels } from "./pricing-page-data";

export type SeatControlProps = {
  seats: number;
  min: number;
  max: number;
  onSeatsChange: (seats: number) => void;
  labels: PricingPageLabels;
};

export function SeatControl({
  seats,
  min,
  max,
  onSeatsChange,
  labels,
}: SeatControlProps) {
  const unit = (value: number) =>
    value === 1 ? labels.editor : labels.editors;

  return (
    <div className="flex items-center gap-4 px-1 sm:border-border sm:border-l sm:pr-2 sm:pl-5 sm:ml-3">
      <span className="flex shrink-0 items-center gap-2 text-muted-foreground text-sm">
        <Users className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">{labels.team}</span>
      </span>
      <RangeSlider
        value={seats}
        onValueChange={onSeatsChange}
        min={min}
        max={max}
        step={1}
        showTicks={false}
        aria-label={labels.seatsAriaLabel}
        formatValueText={(value) => `${value} ${unit(value)}`}
        className="h-9 min-w-0 flex-1"
      />
      <p className="w-20 shrink-0 text-right text-sm tabular-nums">
        <span className="font-medium">{seats}</span>{" "}
        <span className="text-muted-foreground">{unit(seats)}</span>
      </p>
    </div>
  );
}
