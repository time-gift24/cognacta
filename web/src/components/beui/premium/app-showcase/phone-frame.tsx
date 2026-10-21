"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { SPRING_LAYOUT } from "@/lib/beui/ease";
import { SCREEN } from "./app-showcase-motion";

/** Device shell with a status bar; slides `children` by `screenKey`. */
export function PhoneFrame({
  screenKey,
  label,
  direction,
  reduce,
  children,
}: {
  /** Changing key slides the new screen in from `direction`. */
  screenKey: string;
  /** Accessible description of the current screen. */
  label: string;
  direction: number;
  reduce: boolean | null;
  children: ReactNode;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className="relative w-72 rounded-4xl border border-border bg-background p-2"
    >
      <div className="relative h-[32rem] overflow-hidden rounded-3xl border border-border bg-background">
        <div className="flex items-center justify-between px-5 pt-3 pb-2 font-medium text-xs">
          <span className="tabular-nums">9:41</span>
          <span className="h-5 w-20 rounded-full bg-foreground" />
          <span className="text-muted-foreground">5G</span>
        </div>

        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={screenKey}
            custom={direction}
            variants={reduce ? undefined : SCREEN}
            initial={reduce ? false : "enter"}
            animate="center"
            exit={reduce ? { opacity: 0, transition: { duration: 0 } } : "exit"}
            transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
            className="absolute inset-x-0 top-10 bottom-0 px-4 pb-4"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
