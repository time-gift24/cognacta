"use client";

import { History, Search, SearchX, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import {
  MorphicTooltip,
  MorphicTooltipProvider,
} from "@/components/beui/premium/morphic-tooltip";
import { Select } from "@/components/beui/premium/select";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { EventDialog } from "./event-dialog";
import { EventRow, FOCUS_RING } from "./event-row";
import type { AuditEvent, AuditTrailProps } from "./types";

export type {
  AuditActor,
  AuditChange,
  AuditEvent,
  AuditTrailProps,
} from "./types";

export function AuditTrail({
  events,
  title = "Audit trail",
  headerActions,
  renderDetails,
  className,
}: AuditTrailProps) {
  const scope = useId();
  const reduce = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const returnId = useRef<string | null>(null);
  const keyboardFilter = useRef(false);
  const [filter, setFilter] = useState("all");
  const [actor, setActor] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const [fadeFilter, setFadeFilter] = useState(false);
  const actors = Array.from(
    new Map(events.map((event) => [event.actor.id, event.actor])).values(),
  );
  if (
    actor !== "all" &&
    !actors.some((person) => `actor:${person.id}` === actor)
  ) {
    setActor("all");
  }
  const categories = Array.from(new Set(events.map((event) => event.category)));
  const needle = query.trim().toLocaleLowerCase();
  const matching = events.filter(
    (event) =>
      (actor === "all" || `actor:${event.actor.id}` === actor) &&
      (!needle ||
        [
          event.id,
          event.actor.name,
          event.action,
          event.target,
          event.category,
          event.description,
          ...(event.changes ?? []).flatMap((change) => [
            change.label,
            change.before,
            change.after,
          ]),
          ...(event.metadata ?? []).flatMap((field) => [
            field.label,
            field.value,
          ]),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(needle)),
  );
  const filters = [
    { value: "all", label: "All", count: matching.length },
    ...categories.map((category) => ({
      value: `category:${category}`,
      label: category,
      count: matching.filter((event) => event.category === category).length,
    })),
  ];
  const currentFilter = filters.some((item) => item.value === filter)
    ? filter
    : "all";
  if (currentFilter !== filter) setFilter(currentFilter);
  const visible = matching.filter(
    (event) =>
      currentFilter === "all" || `category:${event.category}` === currentFilter,
  );
  const groups = new Map<string, { label: string; events: AuditEvent[] }>();
  for (const event of visible) {
    const group = groups.get(event.day.id);
    if (group) group.events.push(event);
    else groups.set(event.day.id, { label: event.day.label, events: [event] });
  }

  function changeFilter(value: string) {
    setFadeFilter(!keyboardFilter.current);
    keyboardFilter.current = false;
    setFilter(value);
  }
  function clearFilters() {
    setQuery("");
    setActor("all");
    setFilter("all");
    setFadeFilter(false);
    input.current?.focus();
  }
  function closeDetails() {
    setSelected(null);
    const id = returnId.current;
    returnId.current = null;
    requestAnimationFrame(() => {
      const buttons = Array.from(
        root.current?.querySelectorAll<HTMLButtonElement>(
          "[data-audit-open]",
        ) ?? [],
      );
      (
        buttons.find((button) => button.dataset.auditOpen === id) ??
        buttons[0] ??
        input.current
      )?.focus({ preventScroll: true });
    });
  }

  return (
    <MorphicTooltipProvider delay={180}>
      <section
        ref={root}
        aria-labelledby={`${scope}-title`}
        className={cn(
          "w-full max-w-4xl bg-background p-4 text-foreground sm:p-6",
          className,
        )}
      >
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground"
            >
              <History className="size-4" />
            </span>
            <div>
              <h2 id={`${scope}-title`} className="text-xl font-medium">
                {title}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Changes across your workspace
              </p>
            </div>
          </div>
          {headerActions}
        </header>
        <Tabs value={currentFilter} onValueChange={changeFilter} variant="pill">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="max-w-full overflow-x-auto p-1">
              <TabsList
                aria-label="Filter audit categories"
                className="gap-0.5 p-0.5"
                onKeyDown={(event) => {
                  if (["Enter", " "].includes(event.key)) {
                    keyboardFilter.current = true;
                    return;
                  }
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const current = filters.findIndex(
                    (item) => item.value === currentFilter,
                  );
                  const index =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? filters.length - 1
                        : (current +
                            (event.key === "ArrowRight" ? 1 : -1) +
                            filters.length) %
                          filters.length;
                  keyboardFilter.current = true;
                  changeFilter(filters[index].value);
                  event.currentTarget
                    .querySelectorAll<HTMLElement>('[role="tab"]')
                    [index]?.focus();
                }}
              >
                {filters.map((item, index) => (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    id={`${scope}-category-${index}`}
                    aria-controls={`${scope}-events`}
                    tabIndex={currentFilter === item.value ? 0 : -1}
                    className={cn("h-8 gap-1.5 px-3 py-0 text-xs", FOCUS_RING)}
                  >
                    {item.label}
                    <span className="tabular-nums text-muted-foreground">
                      {item.count}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
              <Select
                label="Filter audit actors"
                options={[
                  { id: "all", label: "Everyone" },
                  ...actors.map((person) => ({
                    id: `actor:${person.id}`,
                    label: person.name,
                  })),
                ]}
                value={actor}
                onValueChange={(value) => {
                  setActor(value);
                  setFadeFilter(false);
                }}
                portal
                buttonClassName="min-w-36 text-xs focus:border-foreground/60"
                optionsClassName="motion-reduce:transition-none"
              />
              <Input
                ref={input}
                type="search"
                aria-label="Search audit events"
                placeholder="Search events…"
                value={query}
                onChange={setQuery}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && query) {
                    event.preventDefault();
                    setQuery("");
                  }
                }}
                leftIcon={<Search aria-hidden />}
                rightIcon={
                  query ? (
                    <MorphicTooltip content="Clear search">
                      <Button
                        variant="ghost"
                        size="icon"
                        tabIndex={0}
                        aria-label="Clear audit search"
                        onClick={() => {
                          setQuery("");
                          input.current?.focus();
                        }}
                        className={cn("size-8 rounded-full", FOCUS_RING)}
                      >
                        <X aria-hidden className="size-3.5" />
                      </Button>
                    </MorphicTooltip>
                  ) : undefined
                }
                className="min-w-36 flex-1 sm:w-44 sm:flex-none"
                classNames={{
                  field:
                    "h-10 rounded-full bg-background ring-0 data-[state=focused]:border-foreground/60",
                  input: "text-xs [&::-webkit-search-cancel-button]:hidden",
                  rightIcon: "right-1",
                }}
              />
            </div>
          </div>
          <div
            id={`${scope}-events`}
            role="tabpanel"
            aria-labelledby={`${scope}-category-${filters.findIndex((item) => item.value === currentFilter)}`}
            className="max-h-144 overflow-y-auto overscroll-contain px-1"
          >
            <motion.div
              key={currentFilter}
              initial={reduce || !fadeFilter ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduce ? 0 : 0.1, ease: EASE_OUT }}
              className="min-h-96"
            >
              {visible.length ? (
                Array.from(groups, ([dayId, group]) => (
                  <section key={dayId} className="mb-5 last:mb-0">
                    <h3 className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground sm:px-4">
                      {group.label}
                      <span aria-hidden className="h-px flex-1 bg-border" />
                      <span className="tabular-nums">
                        {group.events.length}
                      </span>
                    </h3>
                    <ol className="divide-y divide-border/60">
                      {group.events.map((event) => (
                        <EventRow
                          key={event.id}
                          event={event}
                          onOpen={() => {
                            returnId.current = event.id;
                            setSelected(event);
                          }}
                        />
                      ))}
                    </ol>
                  </section>
                ))
              ) : (
                <div className="flex min-h-96 flex-col items-center justify-center gap-3 px-4 text-center">
                  <span
                    aria-hidden
                    className="flex size-12 items-center justify-center rounded-full border border-border text-muted-foreground"
                  >
                    {events.length ? (
                      <SearchX className="size-5" />
                    ) : (
                      <History className="size-5" />
                    )}
                  </span>
                  <p className="text-sm font-medium">
                    {events.length ? "No matching events" : "No activity yet"}
                  </p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    {events.length
                      ? "Try another category, person, or search term."
                      : "Recorded changes will appear here."}
                  </p>
                  {!!events.length && (
                    <Button
                      variant="outline"
                      tabIndex={0}
                      onClick={clearFilters}
                      className={cn(
                        "h-9 rounded-full px-3 text-xs",
                        FOCUS_RING,
                      )}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </Tabs>
        <output aria-live="polite" className="sr-only">
          {visible.length} matching {visible.length === 1 ? "event" : "events"}.
        </output>
        {selected && (
          <EventDialog
            key={selected.id}
            event={selected}
            details={renderDetails?.(selected)}
            onClose={closeDetails}
          />
        )}
      </section>
    </MorphicTooltipProvider>
  );
}
