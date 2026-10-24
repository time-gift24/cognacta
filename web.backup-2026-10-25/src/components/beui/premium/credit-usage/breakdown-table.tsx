"use client";

import { ArrowDown, ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { EASE_IN, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { CategoryPill } from "./category-pill";
import type { CreditCategory, CreditRow } from "./credit-usage-data";

export type BreakdownSortKey = "runs" | "hours" | "credits";

export type BreakdownTableLabels = {
  name: string;
  category: string;
  runs: string;
  hours: string;
  credits: string;
  share: string;
  empty: string;
};

export type BreakdownTableProps = {
  rows: readonly CreditRow[];
  /** Total used for the share column. */
  total: number;
  categories: ReadonlyMap<string, CreditCategory>;
  labels: BreakdownTableLabels;
  /** Remounts rows when the data set changes, such as switching tabs. */
  rowsKey: string;
  sort: BreakdownSortKey;
  onSort: (key: BreakdownSortKey) => void;
  /** Category to keep at full opacity while others fade. */
  focusCategory: string | null;
  /** Rows shown before "Show all". */
  collapsedRows: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

/** Sortable, expandable breakdown with share bars and linked highlights. */
export function BreakdownTable({
  rows,
  total,
  categories,
  labels,
  rowsKey,
  sort,
  onSort,
  focusCategory,
  collapsedRows,
  expanded,
  onExpandedChange,
}: BreakdownTableProps) {
  const reduce = useReducedMotion();
  const shown = expanded ? rows : rows.slice(0, collapsedRows);
  const canExpand = rows.length > collapsedRows;
  const columns: readonly { key: BreakdownSortKey; label: string }[] = [
    { key: "runs", label: labels.runs },
    { key: "hours", label: labels.hours },
    { key: "credits", label: labels.credits },
  ];

  return (
    <>
      <div className="mt-5 overflow-x-auto rounded-3xl border border-border">
        <table className="w-full min-w-2xl text-left text-sm">
          <caption className="sr-only">Credit use by {labels.name}</caption>
          <thead className="border-border border-b text-muted-foreground">
            <tr>
              <th scope="col" className="px-5 py-3.5 font-normal">
                {labels.name}
              </th>
              <th scope="col" className="px-5 py-3.5 font-normal">
                {labels.category}
              </th>
              {columns.map((column) => (
                <SortHeader
                  key={column.key}
                  label={column.label}
                  active={sort === column.key}
                  onSort={() => onSort(column.key)}
                />
              ))}
              <th scope="col" className="px-5 py-3.5 text-right font-normal">
                {labels.share}
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((row, index) => (
                <BreakdownRow
                  key={`${rowsKey}-${row.id}`}
                  row={row}
                  category={categories.get(row.category)}
                  share={total ? (row.credits / total) * 100 : 0}
                  dim={focusCategory !== null && focusCategory !== row.category}
                  revealDelay={
                    index < collapsedRows ? 0 : (index - collapsedRows) * 0.05
                  }
                  reduce={reduce}
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-muted-foreground text-sm">
            {labels.empty}
          </p>
        ) : null}
      </div>

      {canExpand ? (
        <div className="relative">
          {!expanded ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 -top-24 h-24 bg-gradient-to-t from-background to-transparent"
            />
          ) : null}
          <div className="flex justify-center pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={expanded}
              onClick={() => onExpandedChange(!expanded)}
            >
              {expanded ? "Show less" : `Show all ${rows.length}`}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  expanded && "rotate-180",
                )}
              />
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SortHeader({
  label,
  active,
  onSort,
}: {
  label: string;
  active: boolean;
  onSort: () => void;
}) {
  return (
    <th
      scope="col"
      aria-sort={active ? "descending" : "none"}
      className="px-5 py-2 text-right font-normal"
    >
      <Button
        type="button"
        variant="plain"
        onClick={onSort}
        whileHover={undefined}
        whileTap={undefined}
        className={cn(
          "inline-flex min-h-8 items-center gap-1 px-1 transition-colors hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {label}
        <ArrowDown
          aria-hidden="true"
          className={cn(
            "size-3.5 transition-[opacity,transform] duration-200",
            active ? "opacity-100" : "-translate-y-0.5 opacity-0",
          )}
        />
      </Button>
    </th>
  );
}

function BreakdownRow({
  row,
  category,
  share,
  dim,
  revealDelay,
  reduce,
}: {
  row: CreditRow;
  category?: CreditCategory;
  share: number;
  dim: boolean;
  revealDelay: number;
  reduce: boolean | null;
}) {
  return (
    <motion.tr
      layout="position"
      initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(4px)" }}
      animate={{ opacity: dim ? 0.4 : 1, y: 0, filter: "blur(0px)" }}
      exit={
        reduce
          ? { opacity: 0, transition: { duration: 0 } }
          : {
              opacity: 0,
              filter: "blur(4px)",
              transition: { duration: 0.14, ease: EASE_IN },
            }
      }
      transition={
        reduce
          ? { duration: 0 }
          : {
              ...SPRING_LAYOUT,
              opacity: { duration: 0.25, delay: revealDelay },
              filter: { duration: 0.3 },
            }
      }
      className="border-border border-b last:border-b-0"
    >
      <th scope="row" className="px-5 py-4 font-normal">
        <span className="flex items-center gap-3">
          {row.avatar ? (
            // biome-ignore lint/performance/noImgElement: small remote avatar in table row.
            <img
              src={row.avatar}
              alt=""
              width={32}
              height={32}
              className="size-8 rounded-full object-cover"
            />
          ) : null}
          <span>
            <span className="block font-medium">{row.name}</span>
            <span className="block text-muted-foreground text-xs">
              {row.detail}
            </span>
          </span>
        </span>
      </th>
      <td className="px-5 py-4">
        <CategoryPill category={category} fallback={row.category} />
      </td>
      {(["runs", "hours", "credits"] as const).map((key) => (
        <td key={key} className="px-5 py-4 text-right font-mono tabular-nums">
          <NumberTicker value={row[key]} locale animateOnMount={false} />
        </td>
      ))}
      <td className="px-5 py-4">
        <span className="flex items-center justify-end gap-3">
          <span className="hidden h-1 w-16 overflow-hidden rounded-full bg-muted sm:block">
            <motion.span
              initial={false}
              animate={{ scaleX: Math.min(share / 15, 1) }}
              transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
              className={cn(
                "block h-full origin-left rounded-full",
                category?.color ?? "bg-foreground",
              )}
            />
          </span>
          <span className="w-12 text-right font-mono tabular-nums">
            {share.toFixed(1)}%
          </span>
        </span>
      </td>
    </motion.tr>
  );
}
