"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { SPRING_LAYOUT } from "@/lib/beui/ease";
import type {
  AppShowcasePeople,
  AppShowcaseSplitEntry,
} from "../app-showcase-data";
import { ScreenHeader } from "./screen-header";

/** The group total rolls up while each share bar grows in turn. */
export function SplitScreen({
  entries,
  people,
  eyebrow,
  title,
  totalLabel,
  currency,
  reduce,
}: {
  entries: readonly AppShowcaseSplitEntry[];
  people: AppShowcasePeople;
  eyebrow: string;
  title: string;
  totalLabel: string;
  /** Symbol shown before amounts. */
  currency: string;
  reduce: boolean | null;
}) {
  const total = entries.reduce((sum, entry) => sum + entry.share, 0);
  const max = Math.max(1, ...entries.map((entry) => entry.share));
  const [shown, setShown] = useState(reduce ? total : 0);

  useEffect(() => {
    if (reduce) return;
    const timer = setTimeout(() => setShown(total), 180);
    return () => clearTimeout(timer);
  }, [reduce, total]);

  return (
    <div>
      <ScreenHeader eyebrow={eyebrow} title={title} />
      <div className="rounded-2xl border border-border p-4">
        <p className="text-muted-foreground text-xs">{totalLabel}</p>
        <p className="mt-1 flex items-baseline gap-1 font-medium text-4xl tracking-tight">
          <span className="text-muted-foreground text-xl">{currency}</span>
          <DigitSwap value={shown} className="tabular-nums" />
        </p>
      </div>
      <ul className="mt-3 space-y-3">
        {entries.map((entry, index) => {
          const person = people[entry.person];
          return (
            <li key={entry.person}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  {person ? (
                    // biome-ignore lint/performance/noImgElement: small remote avatar inside the device mock.
                    <img
                      src={person.avatar}
                      alt=""
                      width={28}
                      height={28}
                      className="size-7 rounded-full object-cover"
                    />
                  ) : null}
                  {person?.name ?? entry.person}
                </span>
                <span className="font-mono text-xs tabular-nums">
                  {currency}
                  {entry.share}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ scaleX: reduce ? entry.share / max : 0 }}
                  animate={{ scaleX: entry.share / max }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { ...SPRING_LAYOUT, delay: 0.2 + index * 0.07 }
                  }
                  className="h-full origin-left rounded-full bg-foreground"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
