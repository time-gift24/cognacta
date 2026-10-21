"use client";

import { Plane } from "lucide-react";
import { motion } from "motion/react";
import { SPRING_PANEL } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type { AppShowcaseTicket } from "../app-showcase-data";
import { ScreenHeader } from "./screen-header";

// Deterministic decorative code pattern for the pass.
const CODE_CELLS = Array.from(
  { length: 81 },
  (_, i) => ((i * 2654435761) >>> 0) % 7 < 3,
);

/** The pass tips forward into place, then the reservation row rises. */
export function TicketScreen({
  ticket,
  eyebrow,
  title,
  seatLabel,
  groupLabel,
  reduce,
}: {
  ticket: AppShowcaseTicket;
  eyebrow: string;
  title: string;
  seatLabel: string;
  groupLabel: string;
  reduce: boolean | null;
}) {
  return (
    <div style={{ perspective: 800 }}>
      <ScreenHeader eyebrow={eyebrow} title={title} />
      <motion.div
        initial={reduce ? false : { rotateX: -24, y: 24, opacity: 0 }}
        animate={{ rotateX: 0, y: 0, opacity: 1 }}
        transition={reduce ? { duration: 0 } : { ...SPRING_PANEL, delay: 0.1 }}
        style={{ transformOrigin: "50% 0%" }}
        className="rounded-3xl border border-border"
      >
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-muted-foreground text-xs">{ticket.eyebrow}</p>
            <p className="mt-1 font-medium text-xl">{ticket.title}</p>
          </div>
          <span className="grid size-9 place-items-center rounded-full bg-muted">
            <Plane className="size-4" aria-hidden="true" />
          </span>
        </div>
        <div className="mx-4 border-border border-t border-dashed" />
        <div className="flex items-center gap-4 p-4">
          <div className="grid size-24 shrink-0 grid-cols-9 grid-rows-9 gap-0.5 rounded-xl border border-border p-2">
            {CODE_CELLS.map((on, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: static pattern
                key={i}
                className={cn(
                  "aspect-square rounded-full",
                  on ? "bg-foreground" : "bg-transparent",
                )}
              />
            ))}
          </div>
          <div className="space-y-2 text-xs">
            <p>
              <span className="text-muted-foreground">{seatLabel}</span>{" "}
              {ticket.seat}
            </p>
            <p>
              <span className="text-muted-foreground">{groupLabel}</span>{" "}
              {ticket.group}
            </p>
            <p className="text-muted-foreground">{ticket.note}</p>
          </div>
        </div>
      </motion.div>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0 } : { ...SPRING_PANEL, delay: 0.3 }}
        className="mt-3 flex items-center gap-3 rounded-2xl border border-border p-1.5 pr-3 text-sm"
      >
        {/* biome-ignore lint/performance/noImgElement: small remote photo inside the device mock. */}
        <img
          src={ticket.extra.image}
          alt=""
          width={36}
          height={36}
          className="size-9 rounded-xl object-cover"
        />
        <span className="flex-1">{ticket.extra.title}</span>
        <span className="font-mono text-muted-foreground text-xs">
          {ticket.extra.time}
        </span>
      </motion.div>
    </div>
  );
}
