"use client";

import { motion } from "motion/react";
import { EASE_OUT } from "@/lib/beui/ease";
import type {
  AppShowcaseDestination,
  AppShowcasePeople,
  AppShowcasePersonId,
  AppShowcasePlanItem,
} from "../app-showcase-data";
import { RISE, STAGGER } from "../app-showcase-motion";

/** Cover photo settles, then the itinerary rows stagger in. */
export function PlanScreen({
  destination,
  items,
  members,
  people,
  day,
  reduce,
}: {
  destination: AppShowcaseDestination;
  items: readonly AppShowcasePlanItem[];
  members: readonly AppShowcasePersonId[];
  people: AppShowcasePeople;
  /** Day label shown before the destination name. */
  day: string;
  reduce: boolean | null;
}) {
  return (
    <div className="pt-1">
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={
          reduce ? { duration: 0 } : { duration: 0.6, ease: EASE_OUT }
        }
        className="relative h-32 overflow-hidden rounded-2xl"
      >
        {/* biome-ignore lint/performance/noImgElement: remote destination photo inside the device mock. */}
        <img
          src={destination.image}
          alt=""
          className="size-full object-cover"
        />
        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-full bg-background/85 py-1 pr-1 pl-3 backdrop-blur-md">
          <span className="truncate font-medium text-xs">
            {day} · {destination.name}
          </span>
          <span className="flex -space-x-1.5">
            {members.map((id) => {
              const person = people[id];
              if (!person) return null;
              return (
                // biome-ignore lint/performance/noImgElement: small remote avatar inside the device mock.
                <img
                  key={id}
                  src={person.avatar}
                  alt=""
                  width={22}
                  height={22}
                  className="size-5.5 rounded-full object-cover ring-2 ring-background"
                />
              );
            })}
          </span>
        </div>
      </motion.div>

      <motion.ul
        variants={STAGGER}
        initial={reduce ? false : "hidden"}
        animate="show"
        className="mt-3 space-y-1.5"
      >
        {items.map((item) => (
          <motion.li
            key={item.title}
            variants={RISE}
            className="flex items-center gap-3 rounded-2xl border border-border p-1.5 pr-3"
          >
            {/* biome-ignore lint/performance/noImgElement: small remote photo inside the device mock. */}
            <img
              src={item.image}
              alt=""
              width={36}
              height={36}
              className="size-9 shrink-0 rounded-xl object-cover"
            />
            <span className="min-w-0 flex-1 truncate text-sm">
              {item.title}
            </span>
            <span className="font-mono text-muted-foreground text-xs tabular-nums">
              {item.time}
            </span>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}
