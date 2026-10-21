"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { cn } from "@/lib/beui/utils";
import { type BreakdownSortKey, BreakdownTable } from "./breakdown-table";
import { BreakdownToolbar, type BreakdownView } from "./breakdown-toolbar";
import { CreditPlanCard } from "./credit-plan-card";
import {
  CREDIT_CATEGORIES,
  CREDIT_PERIODS,
  CREDIT_TEAMMATES,
  CREDIT_WORKFLOWS,
  type CreditCategory,
  type CreditRow,
  type CreditUsagePeriod,
  formatCompact,
} from "./credit-usage-data";
import { SECTION_RISE, SECTION_STAGGER } from "./credit-usage-motion";
import { useExportState } from "./use-export-state";

/* ─────────────────────────────────────────────────────────
 * CREDIT USAGE BREAKDOWN
 *
 *  load     header, plan card, and table rise in sequence; meter
 *           segments grow from the left; stats roll up
 *  period   every number rolls to the new period; segments spring
 *           to their new widths
 *  meter    hovering a segment or legend item glides one tooltip
 *           and fades other categories and table rows; clicking
 *           filters the table
 *  table    tabs swap row sets; search and sort reflow rows; "Show
 *           all" cascades the rest
 *
 *  Parts: CreditPlanCard (SegmentedMeter), BreakdownToolbar,
 *  BreakdownTable. Data shapes live in credit-usage-data.ts.
 * ───────────────────────────────────────────────────────── */

const DEFAULT_LABELS = {
  plan: "Scale plan",
  changePlan: "Change plan",
  creditsUsed: "credits used",
  primaryTab: "Workflows",
  secondaryTab: "Teammates",
  primaryColumn: "Workflow",
  secondaryColumn: "Teammate",
  category: "Category",
  runs: "Runs",
  hours: "Hours",
  credits: "Credits",
  share: "Share",
  export: "Export",
  filter: "Filter",
  empty: "Nothing matches that search.",
};

export type CreditUsageLabels = typeof DEFAULT_LABELS;

export type CreditUsageProps = {
  title?: ReactNode;
  description?: ReactNode;
  /** Categories with their label and color classes. */
  categories?: readonly CreditCategory[];
  /** Reporting periods with plan limit, usage per category, and stats. */
  periods?: readonly CreditUsagePeriod[];
  /** Period id selected on load. Defaults to the second period. */
  defaultPeriod?: string;
  /** Rows for the first table tab. */
  primaryRows?: readonly CreditRow[];
  /** Rows for the second table tab. */
  secondaryRows?: readonly CreditRow[];
  /** Override any interface copy. */
  labels?: Partial<CreditUsageLabels>;
  /** Formatter for compact legend numbers. */
  format?: (value: number) => string;
  /** Rows shown before "Show all". */
  collapsedRows?: number;
  onChangePlan?: () => void;
  /** Called by Export. Return a promise to drive the loading state. */
  onExport?: () => void | Promise<void>;
  className?: string;
};

export function CreditUsage({
  title = "Credits this cycle",
  description = "See which workflows and teammates spent your credits.",
  categories = CREDIT_CATEGORIES,
  periods = CREDIT_PERIODS,
  defaultPeriod,
  primaryRows = CREDIT_WORKFLOWS,
  secondaryRows = CREDIT_TEAMMATES,
  labels: labelOverrides,
  format = formatCompact,
  collapsedRows = 5,
  onChangePlan,
  onExport,
  className,
}: CreditUsageProps) {
  const reduce = useReducedMotion();
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const [periodId, setPeriodId] = useState(
    defaultPeriod ?? periods[Math.min(1, periods.length - 1)]?.id,
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [view, setView] = useState<BreakdownView>("primary");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<BreakdownSortKey>("credits");
  const [expanded, setExpanded] = useState(false);
  const exporter = useExportState(onExport);

  const period = periods.find((p) => p.id === periodId) ?? periods[0];
  const byId = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const used = categories.reduce(
    (sum, c) => sum + (period.usage[c.id] ?? 0),
    0,
  );

  const rows = useMemo(() => {
    const scale = period.rowScale ?? 1;
    const needle = query.trim().toLowerCase();
    return (view === "primary" ? primaryRows : secondaryRows)
      .map((row) => ({
        ...row,
        runs: Math.round(row.runs * scale),
        hours: Math.round(row.hours * scale),
        credits: Math.round(row.credits * scale),
      }))
      .filter(
        (row) =>
          (!category || row.category === category) &&
          (!needle ||
            `${row.name} ${row.detail} ${byId.get(row.category)?.label ?? ""}`
              .toLowerCase()
              .includes(needle)),
      )
      .sort((a, b) => b[sort] - a[sort]);
  }, [period, view, primaryRows, secondaryRows, query, category, sort, byId]);

  const toggleCategory = (id: string) =>
    setCategory((current) => (current === id ? null : id));

  return (
    <motion.section
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={SECTION_STAGGER}
      aria-labelledby="credit-usage-title"
      className={cn(
        "w-full bg-background px-4 py-12 font-sans text-foreground sm:px-8 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-5xl">
        <motion.div
          variants={SECTION_RISE}
          className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h2
              id="credit-usage-title"
              className="font-medium text-4xl tracking-tight"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-2 text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {periods.length > 1 ? (
            <Tabs value={period.id} onValueChange={setPeriodId} variant="pill">
              <TabsList aria-label="Reporting period">
                {periods.map((item) => (
                  <TabsTrigger key={item.id} value={item.id}>
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null}
        </motion.div>

        <motion.div variants={SECTION_RISE} className="mt-8">
          <CreditPlanCard
            period={period}
            categories={categories}
            planName={labels.plan}
            changePlanLabel={labels.changePlan}
            creditsUsedLabel={labels.creditsUsed}
            activeCategory={hovered}
            onActiveCategoryChange={setHovered}
            selectedCategory={category}
            onSelectCategory={toggleCategory}
            format={format}
            onChangePlan={onChangePlan}
          />
        </motion.div>

        <motion.div variants={SECTION_RISE} className="mt-10">
          <BreakdownToolbar
            view={view}
            onViewChange={(next) => {
              setView(next);
              setExpanded(false);
            }}
            tabLabels={{
              primary: labels.primaryTab,
              secondary: labels.secondaryTab,
            }}
            query={query}
            onQueryChange={setQuery}
            categories={categories}
            selectedCategory={category}
            onSelectCategory={toggleCategory}
            onClearCategory={() => setCategory(null)}
            exportState={exporter.state}
            onExport={exporter.run}
            labels={labels}
          />
          <BreakdownTable
            rows={rows}
            total={used}
            categories={byId}
            labels={{
              ...labels,
              name:
                view === "primary"
                  ? labels.primaryColumn
                  : labels.secondaryColumn,
            }}
            rowsKey={view}
            sort={sort}
            onSort={setSort}
            focusCategory={hovered ?? category}
            collapsedRows={collapsedRows}
            expanded={expanded}
            onExpandedChange={setExpanded}
          />
        </motion.div>
      </div>
    </motion.section>
  );
}
