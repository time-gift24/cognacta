"use client";

import { Clock3, Video } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import type {
  BookingDuration,
  BookingHost,
  BookingLabels,
} from "./booking-data";

type BookingHostHeaderProps = {
  host: BookingHost;
  durations: readonly BookingDuration[];
  durationId: string;
  onDurationChange: (id: string) => void;
  labels: BookingLabels;
};

export function BookingHostHeader({
  host,
  durations,
  durationId,
  onDurationChange,
  labels,
}: BookingHostHeaderProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        {/* biome-ignore lint/performance/noImgElement: remote host portrait from Unsplash. */}
        <img
          src={host.avatar}
          alt={host.name}
          width={48}
          height={48}
          className="size-12 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="truncate font-medium text-sm">{host.name}</p>
          <p className="truncate text-muted-foreground text-xs">
            {host.role} · {host.company}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-balance font-medium text-xl">
          {host.meetingTitle}
        </h2>
        <p className="text-pretty text-muted-foreground text-sm">
          {host.description}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 font-medium text-muted-foreground text-xs">
          <Clock3 aria-hidden className="size-3.5" />
          {labels.durationLabel}
        </p>
        <Tabs value={durationId} onValueChange={onDurationChange}>
          <TabsList
            aria-label={labels.durationLabel}
            className="w-full *:flex-1"
          >
            {durations.map((duration) => (
              <TabsTrigger
                key={duration.id}
                value={duration.id}
                className="w-full tabular-nums"
              >
                {duration.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <Video aria-hidden className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-sm">{host.location}</p>
          {host.locationDetail ? (
            <p className="text-muted-foreground text-xs">
              {host.locationDetail}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
