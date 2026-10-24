"use client";

import { ArrowRight, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { createContext, type ReactNode, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { SPRING_LAYOUT } from "@/lib/beui/ease";
import { EXIT, INSTANT } from "./search-motion";

/** Mount time of the enclosing group; rows born near it join the cascade. */
export const CascadeContext = createContext(0);

/**
 * A typed section of results. Its rows cascade on mount; rows that arrive
 * later (while typing) enter on their own.
 */
export function SearchResultGroup({
  label,
  icon: Icon,
  count,
  showHeader,
  viewLabel,
  reduce,
  onView,
  children,
}: {
  label: string;
  icon: LucideIcon;
  count: number;
  showHeader: boolean;
  viewLabel: string;
  reduce: boolean | null;
  onView: () => void;
  children: ReactNode;
}) {
  const [born] = useState(() => performance.now());

  return (
    <CascadeContext.Provider value={born}>
      <motion.section
        layout="position"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, transition: EXIT }}
        transition={reduce ? INSTANT : SPRING_LAYOUT}
        aria-label={label}
        className="mb-10 last:mb-0"
      >
        {showHeader ? (
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 font-medium text-xl">
              <span className="grid size-8 place-items-center rounded-full bg-muted">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              {label}
            </h2>
            <Button type="button" variant="ghost" size="sm" onClick={onView}>
              {viewLabel}
              <DigitSwap value={count} className="tabular-nums" />
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        ) : null}
        <ul className="space-y-2">{children}</ul>
      </motion.section>
    </CascadeContext.Provider>
  );
}
