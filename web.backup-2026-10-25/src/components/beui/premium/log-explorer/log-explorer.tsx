"use client";

import {
  ArrowDown,
  Circle,
  CircleAlert,
  Pause,
  Play,
  Search,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import {
  MorphicTooltip,
  MorphicTooltipProvider,
} from "@/components/beui/premium/morphic-tooltip";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { LogRow } from "./log-row";
import type { LogExplorerProps, LogLevel } from "./types";

export type { LogEntry, LogExplorerProps, LogLevel, LogPayload } from "./types";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const FILTERS = [
  { value: "all", label: "All" },
  { value: "info", label: "Info" },
  { value: "warn", label: "Warn" },
  { value: "error", label: "Error" },
] as const;

export function LogExplorer({
  entries,
  title = "Execution logs",
  service,
  environment,
  paused: controlledPaused,
  defaultPaused = false,
  onPausedChange,
  headerActions,
  footer,
  className,
}: LogExplorerProps) {
  const [internalPaused, setInternalPaused] = useState(defaultPaused);
  const paused = controlledPaused ?? internalPaused;
  const [snapshot, setSnapshot] = useState({ paused, entries });
  // Capture the exact collection at the pause boundary, including changes made
  // by a controlled host. A guarded render update avoids one stale paint.
  if (snapshot.paused !== paused) setSnapshot({ paused, entries });
  const displayed = paused ? snapshot.entries : entries;
  const snapshotIds = new Set(snapshot.entries.map((entry) => entry.id));
  const pending = paused
    ? entries.filter((entry) => !snapshotIds.has(entry.id)).length
    : 0;
  const [filter, setFilter] = useState<"all" | LogLevel>("all");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [following, setFollowing] = useState(true);
  const [hasTopFade, setHasTopFade] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const needle = query.trim().toLocaleLowerCase();
  const visible = displayed.filter(
    (entry) =>
      (filter === "all" || entry.level === filter) &&
      (!needle ||
        [entry.time, entry.level, entry.message, entry.context]
          .join(" ")
          .toLocaleLowerCase()
          .includes(needle)),
  );
  const counts = { all: displayed.length, info: 0, warn: 0, error: 0 };
  for (const entry of displayed) counts[entry.level]++;
  const visibleCount = visible.length;
  const latestId = visible.at(-1)?.id;

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !following || expandedId) return;
    if (visibleCount === 0) viewport.scrollTop = 0;
    else if (latestId) viewport.scrollTop = viewport.scrollHeight;
  }, [visibleCount, latestId, following, expandedId]);

  function changeFilter(next: string) {
    if (!FILTERS.some((entry) => entry.value === next) || next === filter)
      return;
    setFilter(next as "all" | LogLevel);
    setExpandedId(null);
    setFollowing(true);
  }

  function clearSearch() {
    setQuery("");
    inputRef.current?.focus({ preventScroll: true });
  }

  function jumpToLatest() {
    setExpandedId(null);
    setFollowing(true);
    const viewport = viewportRef.current;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        "flex h-144 w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-muted text-foreground",
        className,
      )}
    >
      <MorphicTooltipProvider delay={180}>
        <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-6">
          <h2 id={`${id}-title`} className="text-xl font-medium">
            {title}
          </h2>
          {(service || environment) && (
            <span className="col-span-2 col-start-1 row-start-2 max-w-full justify-self-start truncate rounded-full border border-border px-2.5 py-1 font-mono text-xs text-muted-foreground sm:col-span-1 sm:col-start-2 sm:row-start-1">
              {[service, environment].filter(Boolean).join(" · ")}
            </span>
          )}
          <div className="col-start-2 row-start-1 flex items-center justify-self-end gap-2 sm:col-start-3">
            {headerActions}
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-full",
                paused ? "bg-muted-foreground" : "bg-success",
              )}
            />
            <Button
              tabIndex={0}
              variant={paused ? "outline" : "primary"}
              className={cn(
                "h-9 w-9 rounded-full px-0 text-xs sm:w-auto sm:min-w-24 sm:px-4",
                FOCUS_RING,
              )}
              aria-label={paused ? "Resume logs" : "Pause logs"}
              aria-pressed={paused}
              onClick={() => {
                if (controlledPaused === undefined) setInternalPaused(!paused);
                onPausedChange?.(!paused);
              }}
            >
              {paused ? (
                <Play aria-hidden className="size-3.5" />
              ) : (
                <Pause aria-hidden className="size-3.5" />
              )}
              <span className="hidden sm:inline">
                {paused ? "Resume" : "Pause"}
              </span>
            </Button>
          </div>
        </header>
        <Tabs
          value={filter}
          onValueChange={changeFilter}
          variant="pill"
          className="mx-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-background sm:mx-4"
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-5">
            <div className="max-w-full overflow-x-auto">
              <TabsList
                aria-label="Filter log severity"
                className="gap-0.5 p-0.5"
                onKeyDown={(event) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const current = FILTERS.findIndex(
                    (entry) => entry.value === filter,
                  );
                  const index =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? FILTERS.length - 1
                        : (current +
                            (event.key === "ArrowRight" ? 1 : -1) +
                            FILTERS.length) %
                          FILTERS.length;
                  changeFilter(FILTERS[index].value);
                  Array.from(
                    event.currentTarget.querySelectorAll<HTMLElement>(
                      '[role="tab"]',
                    ),
                  )[index]?.focus();
                }}
              >
                {FILTERS.map((entry) => (
                  <TabsTrigger
                    key={entry.value}
                    value={entry.value}
                    id={`${id}-${entry.value}`}
                    aria-controls={`${id}-results`}
                    tabIndex={filter === entry.value ? 0 : -1}
                    className={cn(
                      "h-8 gap-1 px-2 py-0 text-xs sm:gap-1.5 sm:px-3",
                      FOCUS_RING,
                    )}
                  >
                    {entry.label}
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {counts[entry.value]}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <Input
              rightIcon={
                query && (
                  <MorphicTooltip content="Clear search">
                    <Button
                      tabIndex={0}
                      variant="ghost"
                      size="icon"
                      aria-label="Clear search"
                      onClick={clearSearch}
                      className={cn("size-9 rounded-full", FOCUS_RING)}
                    >
                      <X aria-hidden className="size-3.5" />
                    </Button>
                  </MorphicTooltip>
                )
              }
              leftIcon={<Search aria-hidden className="size-4" />}
              ref={inputRef}
              type="search"
              aria-label="Search logs"
              placeholder="Search logs…"
              value={query}
              onChange={(event) => {
                setQuery(event);
                setExpandedId(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query) {
                  event.preventDefault();
                  clearSearch();
                }
              }}
              className="min-w-0 flex-1 w-full sm:w-60"
              classNames={{
                input: "text-xs placeholder:text-muted-foreground",
              }}
            />
          </div>
          <motion.div
            ref={viewportRef}
            layoutScroll
            role="tabpanel"
            id={`${id}-results`}
            aria-labelledby={`${id}-${filter}`}
            tabIndex={0}
            className={cn(
              "min-h-0 flex-1 overflow-auto overscroll-contain px-2 py-3 sm:px-4",
              hasTopFade &&
                "[mask-image:linear-gradient(to_bottom,transparent,black_24px)]",
              FOCUS_RING,
            )}
            onScroll={(event) => {
              const viewport = event.currentTarget;
              setHasTopFade(viewport.scrollTop > 0);
              setFollowing(
                viewport.scrollHeight -
                  viewport.scrollTop -
                  viewport.clientHeight <
                  24,
              );
            }}
          >
            {visible.length ? (
              <motion.ul
                key={filter}
                aria-label="Log entries"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.14, ease: EASE_OUT }}
              >
                {visible.map((entry) => (
                  <LogRow
                    key={entry.id}
                    entry={entry}
                    expanded={expandedId === entry.id}
                    onToggle={() => {
                      setExpandedId(expandedId === entry.id ? null : entry.id);
                      setFollowing(false);
                    }}
                  />
                ))}
              </motion.ul>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-4 py-8 text-center">
                <span className="flex size-12 items-center justify-center rounded-full border border-border text-muted-foreground">
                  <CircleAlert aria-hidden className="size-5" />
                </span>
                <p className="text-sm font-medium">
                  {needle
                    ? "No matching entries"
                    : filter !== "all"
                      ? "No entries at this level"
                      : paused
                        ? "No log entries"
                        : "Waiting for entries"}
                </p>
                {(needle || filter !== "all") && (
                  <Button
                    tabIndex={0}
                    variant="outline"
                    className={cn("h-9 rounded-full px-4 text-xs", FOCUS_RING)}
                    onClick={() => {
                      setQuery("");
                      changeFilter("all");
                      inputRef.current?.focus({ preventScroll: true });
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </Tabs>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-2 font-mono text-xs text-muted-foreground sm:px-6">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Circle aria-hidden className="size-2 fill-current" />
            <span>{paused ? "Paused" : "Live"}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">
              {visible.length} of {displayed.length} entries
            </span>
            {pending > 0 && (
              <span className="text-foreground">+{pending} new</span>
            )}
          </span>
          {footer ??
            (following && !expandedId ? (
              <span>Following latest</span>
            ) : (
              <Button
                tabIndex={0}
                variant="ghost"
                className={cn("h-9 rounded-full px-3 text-xs", FOCUS_RING)}
                onClick={jumpToLatest}
              >
                <ArrowDown aria-hidden className="size-3.5" /> Jump to latest
              </Button>
            ))}
        </footer>
        <output className="sr-only" aria-live="polite">
          {paused ? "Log display paused." : "Log display live."}{" "}
          {pending ? `${pending} new entries available.` : ""}
        </output>
      </MorphicTooltipProvider>
    </section>
  );
}
