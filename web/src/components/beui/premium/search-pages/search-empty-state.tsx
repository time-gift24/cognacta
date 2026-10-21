"use client";

import { motion } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import { SPRING_BOUNCE, SPRING_PANEL } from "@/lib/beui/ease";
import { INSTANT } from "./search-motion";

/** Dashed orbit with a drifting magnifier; loops stop with reduced motion. */
function Magnifier({ reduce }: { reduce: boolean | null }) {
  return (
    <motion.svg
      viewBox="0 0 120 120"
      className="size-28"
      aria-hidden="true"
      initial={reduce ? false : { scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={reduce ? INSTANT : SPRING_BOUNCE}
    >
      <circle
        cx="60"
        cy="60"
        r="46"
        fill="none"
        strokeWidth="1.5"
        strokeDasharray="3 7"
        className="stroke-border"
      />
      <motion.g
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{
          duration: 14,
          ease: "linear",
          repeat: Number.POSITIVE_INFINITY,
        }}
        style={{ transformOrigin: "60px 60px" }}
      >
        <circle cx="60" cy="14" r="3.5" className="fill-foreground" />
        <circle cx="106" cy="60" r="2.5" className="fill-muted-foreground" />
        <circle cx="27" cy="93" r="2" className="fill-muted-foreground" />
      </motion.g>
      <motion.g
        animate={reduce ? undefined : { x: [0, 4, -2, 0], y: [0, -3, 2, 0] }}
        transition={{
          duration: 4,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        <circle
          cx="54"
          cy="54"
          r="18"
          strokeWidth="5"
          className="fill-background stroke-foreground"
        />
        <line
          x1="67"
          y1="67"
          x2="80"
          y2="80"
          strokeWidth="6"
          strokeLinecap="round"
          className="stroke-foreground"
        />
      </motion.g>
    </motion.svg>
  );
}

export type SearchEmptyStateProps = {
  title: string;
  hint: string;
  suggestions: readonly string[];
  reduce: boolean | null;
  onSuggest: (value: string) => void;
};

/** Empty results: the magnifier bounces in, then suggestions rise in turn. */
export function SearchEmptyState({
  title,
  hint,
  suggestions,
  reduce,
  onSuggest,
}: SearchEmptyStateProps) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={reduce ? INSTANT : SPRING_PANEL}
      className="flex flex-col items-center rounded-3xl border border-border px-6 py-14 text-center"
    >
      <Magnifier reduce={reduce} />
      <h2 className="mt-6 font-medium text-xl">{title}</h2>
      <p className="mt-2 max-w-sm text-muted-foreground text-sm leading-6">
        {hint}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {suggestions.map((value, index) => (
          <motion.div
            key={value}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduce ? INSTANT : { ...SPRING_PANEL, delay: 0.15 + index * 0.05 }
            }
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSuggest(value)}
            >
              {value}
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
