"use client";

import { ChevronRight, Search, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { Marquee } from "@/components/beui/motion/marquee";
import { SPRING_LAYOUT, SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { Grainient } from "../feature-sections/grainient";
import { IntegrationConnectDialog } from "./integration-connect-dialog";
import { DEFAULT_INTEGRATIONS, type IntegrationItem } from "./integration-data";
import { IntegrationMark } from "./integration-mark";

type IntegrationView = "browse" | "installed";

export type IntegrationsDirectoryProps = {
  title?: string;
  description?: string;
  integrations?: readonly IntegrationItem[];
  className?: string;
};

export function IntegrationsDirectory({
  title = "Integrations",
  description = "Plug in the tools your team already uses.",
  integrations = DEFAULT_INTEGRATIONS,
  className,
}: IntegrationsDirectoryProps) {
  const reduce = useReducedMotion();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<IntegrationView>("browse");
  const [selectedIntegration, setSelectedIntegration] =
    useState<IntegrationItem | null>(null);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return integrations.filter((integration) => {
      const matchesView = view === "browse" || integration.installed;
      const matchesQuery =
        !normalized ||
        integration.name.toLowerCase().includes(normalized) ||
        integration.description.toLowerCase().includes(normalized);
      return matchesView && matchesQuery;
    });
  }, [integrations, query, view]);

  return (
    <section
      className={cn("w-full bg-background px-4 py-16 sm:px-8", className)}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-foreground tracking-[-0.04em] text-4xl font-medium">
              {title}
            </h2>
            <p className="mt-1.5 text-muted-foreground">{description}</p>
          </div>

          <Input
            leftIcon={<Search aria-hidden className="size-4" />}
            aria-label="Search integrations"
            type="search"
            value={query}
            onChange={(event) => setQuery(event)}
            placeholder="Search integrations"
            className="w-full sm:max-w-sm"
            classNames={{
              input:
                "pr-5 pl-11 text-foreground text-sm placeholder:text-muted-foreground",
            }}
          />
        </div>

        <div className="mt-6 inline-flex rounded-full bg-muted p-1">
          {(["browse", "installed"] as const).map((item) => (
            <Button
              variant="plain"
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={cn(
                "relative min-h-9 rounded-full px-4 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                item === view
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item === view ? (
                <motion.span
                  layoutId="integration-view"
                  transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                  className="absolute inset-0 rounded-full bg-background"
                />
              ) : null}
              <span className="relative">{item}</span>
            </Button>
          ))}
        </div>

        <IntegrationMarqueeBanner integrations={integrations} />

        {visible.length ? (
          <motion.div
            layout
            className="mt-5 grid min-w-0 gap-x-8 md:grid-cols-2"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((integration) => (
                <motion.div
                  layout
                  key={integration.id}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, scale: 0.97 }}
                  transition={reduce ? { duration: 0 } : SPRING_SWAP}
                  // Inline radius lets Motion correct the corners during layout.
                  style={{ borderRadius: 16 }}
                  className="group relative flex min-h-20 min-w-0 w-full items-center gap-3 px-2.5 text-left transition-colors hover:bg-muted/65 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background"
                >
                  <IntegrationMark
                    integration={integration}
                    className="size-10 rounded-xl"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold text-foreground">
                        {integration.name}
                      </span>
                      {integration.installed ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 uppercase tracking-[0.08em] dark:text-emerald-300">
                          Installed
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block truncate text-muted-foreground text-sm">
                      {integration.description}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                  {/* Full-row control; the shared Button is always pill-shaped, so the
                      row keeps its own radius and this sits on top. */}
                  <Button
                    variant="plain"
                    type="button"
                    aria-label={integration.name}
                    onClick={() => setSelectedIntegration(integration)}
                    whileHover={undefined}
                    whileTap={undefined}
                    className="absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="mt-5">
            <EmptyIntegrations onReset={() => setQuery("")} />
          </div>
        )}
      </div>

      {selectedIntegration ? (
        <IntegrationConnectDialog
          integration={selectedIntegration}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedIntegration(null);
          }}
        />
      ) : null}
    </section>
  );
}

function IntegrationMarqueeBanner({
  integrations,
}: {
  integrations: readonly IntegrationItem[];
}) {
  const repeated = [...integrations, ...integrations];
  const offset = Math.max(1, Math.floor(integrations.length / 2));
  const secondRow = [...repeated.slice(offset), ...repeated.slice(0, offset)];

  return (
    <div
      aria-hidden="true"
      className="relative mt-6 overflow-hidden rounded-3xl border border-border/60 bg-background py-6 sm:py-8"
    >
      <Grainient
        className="pointer-events-none absolute inset-0 opacity-80 dark:opacity-55"
        color1="#d9ebff"
        color2="#8fc5ff"
        color3="#4b8ee8"
        grainAmount={0.06}
        contrast={1.05}
        saturation={0.9}
        zoom={0.82}
      />
      <div className="relative space-y-5">
        <Marquee speed={34} gap="1.5rem">
          {repeated.map((integration, index) => (
            <IntegrationMark
              key={`${integration.id}-first-${index}`}
              integration={integration}
              className="size-12 rounded-xl border-border/45 bg-background/15 backdrop-blur-md sm:size-14"
            />
          ))}
        </Marquee>
        <Marquee direction="right" speed={38} gap="1.5rem">
          {secondRow.map((integration, index) => (
            <IntegrationMark
              key={`${integration.id}-second-${index}`}
              integration={integration}
              className="size-12 rounded-xl border-border/45 bg-background/15 backdrop-blur-md sm:size-14"
            />
          ))}
        </Marquee>
      </div>
    </div>
  );
}

function EmptyIntegrations({ onReset }: { onReset: () => void }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-3xl border border-border bg-background px-6 text-center">
      <div>
        <Sparkles className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-3 font-medium text-foreground">
          No integrations found
        </p>
        <Button
          variant="plain"
          type="button"
          onClick={onReset}
          className="mt-2 text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Clear search
        </Button>
      </div>
    </div>
  );
}
