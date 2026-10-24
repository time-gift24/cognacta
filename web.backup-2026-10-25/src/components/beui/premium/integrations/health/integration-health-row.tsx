"use client";

import { CircleAlert, RefreshCw, Wrench } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Sparkline } from "@/components/beui/charts/sparkline";
import { Button } from "@/components/beui/motion/button";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { IntegrationMark } from "../integration-mark";
import type {
  IntegrationHealthConnection,
  IntegrationHealthLabels,
} from "./integration-health-data";
import {
  EXIT_TRANSITION,
  STATUS_TONES,
  SYNC_DURATION_MS,
} from "./integration-health-motion";
import { IntegrationHealthStatusPill } from "./integration-health-status-pill";

export type IntegrationHealthRowProps = {
  connection: IntegrationHealthConnection;
  labels: IntegrationHealthLabels;
  syncing: boolean;
  sparkDelay: number;
  formatSyncAge: (minutes: number) => string;
  onOpen: () => void;
  onSync: () => void;
};

/**
 * Row content. The app name is the whole-row click target; the action button
 * sits above that overlay. While syncing, the icon spins, the last-sync text
 * swaps to a syncing label, and a hairline progress bar fills along the
 * bottom edge. Reduced motion keeps the label swap and a static bar.
 */
export function IntegrationHealthRow({
  connection,
  labels,
  syncing,
  sparkDelay,
  formatSyncAge,
  onOpen,
  onSync,
}: IntegrationHealthRowProps) {
  const reduce = Boolean(useReducedMotion());
  const { integration, status, error } = connection;
  const failing = status === "failing";
  const syncText = syncing
    ? `${labels.syncing}…`
    : formatSyncAge(connection.lastSyncMinutes);

  return (
    <>
      <IntegrationMark
        integration={integration}
        className="size-10 rounded-full bg-background"
      />

      <div className="min-w-0">
        <Button
          variant="plain"
          onClick={onOpen}
          whileHover={undefined}
          whileTap={undefined}
          aria-label={`${labels.openDetails} ${integration.name}`}
          className="block max-w-full truncate text-left font-medium text-foreground text-sm outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          {integration.name}
        </Button>
        <p className="truncate text-muted-foreground text-xs">
          {connection.account}
        </p>
        <AnimatePresence initial={false}>
          {error ? (
            <motion.p
              key={error.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: EXIT_TRANSITION }}
              transition={{ duration: reduce ? 0 : 0.3, ease: EASE_OUT }}
              className={cn(
                "mt-1 flex items-center gap-1 text-xs",
                STATUS_TONES.failing.text,
              )}
            >
              <CircleAlert aria-hidden="true" className="size-3 shrink-0" />
              <span className="truncate">{error.summary}</span>
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      <IntegrationHealthStatusPill
        status={status}
        label={labels[status]}
        className="justify-self-end md:justify-self-start"
      />

      <div className="col-span-3 flex items-center gap-3 pl-13 md:contents">
        <p className="min-w-0 flex-1 text-muted-foreground text-xs tabular-nums md:flex-none">
          <span className="sr-only">{labels.lastSync}: </span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={syncText}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{
                opacity: 0,
                y: reduce ? 0 : -6,
                transition: EXIT_TRANSITION,
              }}
              transition={{ duration: reduce ? 0 : 0.25, ease: EASE_OUT }}
              className={cn(
                "inline-block whitespace-nowrap",
                syncing && "text-foreground",
              )}
            >
              {syncText}
            </motion.span>
          </AnimatePresence>
        </p>

        <Sparkline
          values={connection.volume}
          strokeClassName={STATUS_TONES[status].stroke}
          delay={sparkDelay}
          label={`${labels.volume}: ${connection.volume.join(", ")}`}
          className="h-6 w-16"
        />

        <div className="relative z-10 flex justify-end">
          {failing ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpen}
              aria-label={`${labels.fix} ${integration.name}`}
              className="h-9 px-3.5"
            >
              <Wrench aria-hidden="true" className="size-3.5" />
              {labels.fix}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSync}
              disabled={syncing}
              aria-busy={syncing}
              aria-label={`${labels.syncNow}: ${integration.name}`}
              className="h-9 px-3.5 text-foreground disabled:opacity-100"
            >
              <motion.span
                aria-hidden="true"
                animate={syncing && !reduce ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  syncing && !reduce
                    ? {
                        duration: 0.9,
                        ease: "linear",
                        repeat: Number.POSITIVE_INFINITY,
                      }
                    : { duration: 0.3, ease: EASE_OUT }
                }
                className="inline-flex"
              >
                <RefreshCw className="size-3.5" />
              </motion.span>
              <span className="hidden sm:inline">
                {syncing ? labels.syncing : labels.syncNow}
              </span>
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {syncing ? (
          <motion.span
            key="progress"
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 bottom-0 h-0.5 overflow-hidden rounded-full bg-border/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3, delay: 0.1 } }}
          >
            <motion.span
              className="block h-full origin-left rounded-full bg-foreground/70"
              initial={{ scaleX: reduce ? 0.5 : 0 }}
              animate={{ scaleX: reduce ? 0.5 : 1 }}
              transition={{
                duration: reduce ? 0 : SYNC_DURATION_MS / 1000,
                ease: EASE_IN_OUT,
              }}
            />
          </motion.span>
        ) : null}
      </AnimatePresence>
    </>
  );
}
