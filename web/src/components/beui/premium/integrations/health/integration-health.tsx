"use client";

/*
 * Storyboard
 * 1. On first view the header, summary tiles, toolbar, and list blur-rise in
 *    sequence, 70ms apart. Rows then cascade 45ms apart; rows that arrive
 *    later (filtering, searching) enter on their own without a delay.
 * 2. Filtering or searching removes rows with a quick 150ms fade and the
 *    survivors glide into place on a layout spring.
 * 3. "Sync now" spins the row icon, swaps the last-sync text, and fills a
 *    hairline progress bar; on completion the time resets and the sparkline
 *    gains a point.
 * 4. Reconnecting from the detail dialog pops the status pill from failing to
 *    healthy and rolls the summary counts.
 * Reduced motion: no blur, rise, spin, or springs; content and state changes
 * appear instantly.
 */

import { Search, X } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import {
  DEFAULT_INTEGRATION_HEALTH_CONNECTIONS,
  DEFAULT_INTEGRATION_HEALTH_LABELS,
  formatSyncAge as defaultFormatSyncAge,
  type IntegrationHealthConnection,
  type IntegrationHealthFilter,
  type IntegrationHealthLabels,
} from "./integration-health-data";
import { IntegrationHealthDialog } from "./integration-health-dialog";
import {
  layoutTransition,
  ROW_GAP,
  ROW_LEAD,
  rowVariants,
  stageContainer,
  stageItem,
} from "./integration-health-motion";
import { IntegrationHealthRow } from "./integration-health-row";
import { IntegrationHealthSummary } from "./integration-health-summary";
import { IntegrationHealthToolbar } from "./integration-health-toolbar";
import {
  type IntegrationHealthCallbacks,
  useIntegrationHealth,
} from "./use-integration-health";

export type IntegrationHealthProps = IntegrationHealthCallbacks & {
  connections?: readonly IntegrationHealthConnection[];
  labels?: Partial<IntegrationHealthLabels>;
  defaultFilter?: IntegrationHealthFilter;
  formatSyncAge?: (minutes: number) => string;
  className?: string;
};

export function IntegrationHealth({
  connections: initialConnections = DEFAULT_INTEGRATION_HEALTH_CONNECTIONS,
  labels: labelOverrides,
  defaultFilter = "all",
  formatSyncAge = defaultFormatSyncAge,
  onReconnect,
  onSyncNow,
  onRequestScope,
  className,
}: IntegrationHealthProps) {
  const labels = useMemo(
    () => ({ ...DEFAULT_INTEGRATION_HEALTH_LABELS, ...labelOverrides }),
    [labelOverrides],
  );
  const reduce = Boolean(useReducedMotion());
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.15 });
  const [settled, setSettled] = useState(false);
  const [filter, setFilter] = useState<IntegrationHealthFilter>(defaultFilter);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [open, setOpen] = useState(false);
  const health = useIntegrationHealth(initialConnections, {
    onReconnect,
    onSyncNow,
    onRequestScope,
  });

  // After the first cascade, later rows enter without a stagger delay.
  useEffect(() => {
    if (!inView || settled) return;
    const timer = window.setTimeout(() => setSettled(true), 900);
    return () => window.clearTimeout(timer);
  }, [inView, settled]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return health.connections.filter((connection) => {
      if (filter !== "all" && connection.status !== filter) return false;
      if (!term) return true;
      return `${connection.integration.name} ${connection.account}`
        .toLowerCase()
        .includes(term);
    });
  }, [filter, health.connections, query]);

  const selected = health.connections.find(
    (connection) => connection.id === selectedId,
  );
  const item = stageItem(reduce);

  function openDetails(id: string) {
    setSelectedId(id);
    setOpen(true);
  }

  return (
    <section
      ref={sectionRef}
      className={cn("w-full bg-background px-4 py-16 sm:px-8", className)}
    >
      <motion.div
        variants={stageContainer}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="mx-auto flex max-w-5xl flex-col gap-6"
      >
        <motion.header variants={item} className="max-w-2xl">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
            {labels.eyebrow}
          </p>
          <h2 className="mt-3 text-balance font-medium text-4xl text-foreground tracking-tight">
            {labels.title}
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground text-sm sm:text-base">
            {labels.description}
          </p>
        </motion.header>

        <motion.div variants={item}>
          <IntegrationHealthSummary counts={health.counts} labels={labels} />
        </motion.div>

        <motion.div variants={item}>
          <IntegrationHealthToolbar
            filter={filter}
            onFilterChange={setFilter}
            query={query}
            onQueryChange={setQuery}
            counts={health.counts}
            total={health.connections.length}
            labels={labels}
          />
        </motion.div>

        <motion.div
          variants={item}
          className="rounded-3xl border border-border p-1.5"
        >
          <ul className="relative flex flex-col gap-1">
            <AnimatePresence mode="popLayout">
              {visible.map((connection, index) => {
                const delay = settled ? 0 : ROW_LEAD + index * ROW_GAP;
                return (
                  <motion.li
                    key={connection.id}
                    layout={!reduce}
                    custom={{ reduce, delay }}
                    variants={rowVariants}
                    initial="hidden"
                    animate={inView ? "visible" : "hidden"}
                    exit="exit"
                    transition={layoutTransition(reduce)}
                    className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-2xl px-3 py-3 transition-colors hover:bg-muted/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring sm:px-4 md:grid-cols-[auto_minmax(0,1fr)_8rem_5.5rem_4rem_7.5rem]"
                  >
                    <IntegrationHealthRow
                      connection={connection}
                      labels={labels}
                      syncing={health.syncing.has(connection.id)}
                      sparkDelay={delay + 0.2}
                      formatSyncAge={formatSyncAge}
                      onOpen={() => openDetails(connection.id)}
                      onSync={() => health.syncNow(connection.id)}
                    />
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>

          <AnimatePresence initial={false}>
            {visible.length === 0 ? (
              <motion.div
                key="empty"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                className="flex flex-col items-center gap-3 px-6 py-12 text-center"
              >
                <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Search aria-hidden="true" className="size-4" />
                </span>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {labels.emptyTitle}
                  </p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {labels.emptyDescription}
                  </p>
                </div>
                {query ? (
                  <Button variant="secondary" onClick={() => setQuery("")}>
                    <X aria-hidden="true" className="size-4" />
                    {labels.clearSearch}
                  </Button>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      <IntegrationHealthDialog
        connection={selected}
        open={open}
        onOpenChange={setOpen}
        labels={labels}
        formatSyncAge={formatSyncAge}
        onReconnect={health.reconnect}
        onRequestScope={health.requestScope}
      />
    </section>
  );
}
