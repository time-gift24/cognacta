"use client";

import { MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useId } from "react";
import { EASE_OUT, SPRING_PANEL } from "@/lib/beui/ease";
import type { AppShowcaseStop } from "../app-showcase-data";
import { ScreenHeader } from "./screen-header";

/** The path draws across a dot map, then each stop pops in order. */
export function RouteScreen({
  stops,
  eyebrow,
  totalSuffix,
  startLabel,
  stepSuffix,
  reduce,
}: {
  stops: readonly AppShowcaseStop[];
  eyebrow: string;
  /** Text after the total minutes, such as "min on foot". */
  totalSuffix: string;
  /** Label for the first stop instead of a duration. */
  startLabel: string;
  /** Text after each leg's minutes, such as "min". */
  stepSuffix: string;
  reduce: boolean | null;
}) {
  const patternId = `app-showcase-grid-${useId().replace(/:/g, "")}`;
  const path = `M ${stops.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
  const total = stops.reduce((sum, stop) => sum + stop.minutes, 0);

  return (
    <div>
      <ScreenHeader eyebrow={eyebrow} title={`${total} ${totalSuffix}`} />
      <div className="relative overflow-hidden rounded-2xl border border-border">
        <svg viewBox="0 0 250 186" className="block w-full" aria-hidden="true">
          <defs>
            <pattern
              id={patternId}
              width="14"
              height="14"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" className="fill-border" />
            </pattern>
          </defs>
          <rect width="250" height="186" fill={`url(#${patternId})`} />
          <motion.path
            d={path}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-foreground"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 1.2, ease: EASE_OUT, delay: 0.2 }
            }
          />
          {stops.map((point, index) => (
            <motion.circle
              key={`${point.x}-${point.y}`}
              cx={point.x}
              cy={point.y}
              r="6"
              strokeWidth="3"
              className="fill-background stroke-foreground"
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { ...SPRING_PANEL, delay: 0.25 + index * 0.3 }
              }
              style={{ transformOrigin: `${point.x}px ${point.y}px` }}
            />
          ))}
        </svg>
      </div>
      <ol className="mt-3 space-y-1.5">
        {stops.map((stop, index) => (
          <li
            key={stop.name}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex items-center gap-2">
              <MapPin
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              {stop.name}
            </span>
            <span className="font-mono text-muted-foreground text-xs tabular-nums">
              {index === 0 ? startLabel : `+${stop.minutes} ${stepSuffix}`}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
