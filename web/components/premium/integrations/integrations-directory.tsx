"use client";
import { Input } from "@/components/form-fields";

import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, ChevronRight, Search } from "@/components/icons";
import {
  AnimatedDropdown,
  AnimatedDropdownTrigger,
  AnimatedDropdownContent,
  AnimatedDropdownRadioGroup,
  AnimatedDropdownRadioItem,
} from "../animated-dropdown";
import { SPRING_SWAP } from "@/lib/ease";
import { DEFAULT_INTEGRATIONS, type IntegrationItem } from "./integration-data";
import { IntegrationMark } from "./integration-mark";
import { IntegrationDetails } from "./integration-details";

const STORAGE_KEY = "pair.integrations.v1";

// Adapted from the beUI Integrations Directory block for the Pair workspace.
export function IntegrationsDirectory() {
  const reduce = useReducedMotion();
  const tabId = useId();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"all" | "connected">("all");
  const [category, setCategory] = useState("All categories");
  const [connected, setConnected] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [selected, setSelected] = useState<IntegrationItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(STORAGE_KEY) ?? "[]",
      );
      if (Array.isArray(saved))
        setConnected(
          saved.filter(
            (id): id is string =>
              typeof id === "string" &&
              DEFAULT_INTEGRATIONS.some((app) => app.id === id),
          ),
        );
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(connected));
    } catch {
      setStorageError(true);
    }
  }, [connected, ready]);

  const visible = DEFAULT_INTEGRATIONS.filter(
    (app) =>
      (view === "all" || connected.includes(app.id)) &&
      (category === "All categories" || app.category === category) &&
      `${app.name} ${app.description}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );

  function toggleConnection() {
    if (!selected) return;
    const wasConnected = connected.includes(selected.id);
    setConnected((items) =>
      wasConnected
        ? items.filter((id) => id !== selected.id)
        : [...items, selected.id],
    );
    setNotice(
      `${selected.name} ${wasConnected ? "disconnected" : "connected"} in this demo.`,
    );
    setDialogOpen(false);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pt-20 pb-10 sm:px-8 lg:pt-12">
      <header>
        <p className="mb-2 text-xs text-muted-foreground">
          Workspace / Connected apps
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Connected apps
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bring your tools into the conversation.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div
          role="group"
          aria-label="Integration view"
          className="inline-flex self-start rounded-full bg-surface-raised p-1"
        >
          {(["all", "connected"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className="relative isolate min-h-10 rounded-full px-4 text-sm focus-visible:outline-2 focus-visible:outline-primary"
            >
              {view === value ? (
                <motion.span
                  layoutId={tabId}
                  transition={reduce ? { duration: 0 } : SPRING_SWAP}
                  className="absolute inset-0 -z-10 rounded-full bg-surface-active"
                />
              ) : null}
              {value === "all" ? "All apps" : `Connected (${connected.length})`}
            </button>
          ))}
        </div>
        <div className="flex w-full items-center gap-2 xl:w-auto">
          <label className="relative min-w-0 flex-1 xl:w-56">
            <span className="sr-only">Search apps</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search apps"
              className="rounded-full pr-4 pl-10"
            />
          </label>
          <AnimatedDropdown>
            <AnimatedDropdownTrigger asChild>
              <button
                type="button"
                aria-label={`Filter by category: ${category}`}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-background px-3.5 text-xs text-muted-foreground hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-primary"
              >
                {category}
                <ChevronDown className="size-3.5" />
              </button>
            </AnimatedDropdownTrigger>
            <AnimatedDropdownContent align="end" className="w-48 min-w-0">
              <AnimatedDropdownRadioGroup
                value={category}
                onValueChange={setCategory}
              >
                {[
                  "All categories",
                  ...new Set(DEFAULT_INTEGRATIONS.map((app) => app.category)),
                ].map((name) => (
                  <AnimatedDropdownRadioItem key={name} value={name}>
                    {name}
                  </AnimatedDropdownRadioItem>
                ))}
              </AnimatedDropdownRadioGroup>
            </AnimatedDropdownContent>
          </AnimatedDropdown>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((app) => (
            <motion.button
              key={app.id}
              type="button"
              disabled={!ready}
              onClick={() => {
                setSelected(app);
                setDialogOpen(true);
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="group flex items-start gap-3 rounded-2xl border border-border p-4 text-left transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
            >
              <IntegrationMark
                integration={app}
                className="size-11 rounded-xl border-0 bg-surface-raised"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {app.name}
                  {connected.includes(app.id) ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                      <Check className="size-3" />
                      Connected
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {app.description}
                </span>
                <span className="mt-2 inline-flex rounded-full border border-border bg-surface-raised px-2 py-0.5 text-[10px] leading-4 text-muted-foreground">
                  {app.category}
                </span>
              </span>
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      {visible.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm">
            {view === "connected" && !connected.length
              ? "No apps connected yet"
              : "No matching apps"}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("All categories");
              setView("all");
            }}
            className="mt-3 min-h-10 rounded-full px-4 text-sm text-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            Browse all apps
          </button>
        </div>
      ) : null}
      <p className="mt-6 text-xs text-muted-foreground">
        Template preview. Connections are simulated; no external account access
        is requested.
      </p>
      <p role="status" className="mt-2 text-xs text-muted-foreground">
        {storageError
          ? "Browser storage is unavailable; changes may not survive a refresh."
          : notice}
      </p>
      {selected ? (
        <IntegrationDetails
          integration={selected}
          connected={connected.includes(selected.id)}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onConfirm={toggleConnection}
        />
      ) : null}
    </div>
  );
}
