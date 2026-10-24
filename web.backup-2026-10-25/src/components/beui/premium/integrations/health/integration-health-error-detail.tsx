"use client";

import { Check, CircleAlert, Copy } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type {
  IntegrationHealthError,
  IntegrationHealthLabels,
} from "./integration-health-data";
import { STATUS_TONES } from "./integration-health-motion";

/** Rose-tinted error summary with a copyable reference ID. */
export function IntegrationHealthErrorDetail({
  error,
  labels,
}: {
  error: IntegrationHealthError;
  labels: IntegrationHealthLabels;
}) {
  const reduce = Boolean(useReducedMotion());
  const [copied, setCopied] = useState(false);
  const tone = STATUS_TONES.failing;

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(error.id);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={cn("rounded-2xl border p-4", tone.pill)}>
      <p className="flex items-center gap-1.5 font-medium text-sm">
        <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
        {error.summary}
      </p>
      <p className="mt-1.5 text-pretty text-foreground/80 text-sm leading-6">
        {error.detail}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-full border border-border bg-background py-1 pr-1 pl-3.5">
        <span className="min-w-0 truncate text-muted-foreground text-xs">
          {labels.errorId}{" "}
          <code className="font-mono text-foreground">{error.id}</code>
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
          aria-label={labels.copyErrorId}
          className="relative h-8 shrink-0 px-3 text-foreground after:absolute after:-inset-y-1 after:inset-x-0 after:content-['']"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={copied ? "copied" : "copy"}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
              transition={reduce ? { duration: 0 } : SPRING_SWAP}
              className="inline-flex items-center gap-1.5"
            >
              {copied ? (
                <Check aria-hidden="true" className="size-3.5" />
              ) : (
                <Copy aria-hidden="true" className="size-3.5" />
              )}
              {copied ? labels.copied : labels.copy}
            </motion.span>
          </AnimatePresence>
        </Button>
        <span aria-live="polite" className="sr-only">
          {copied ? labels.copied : ""}
        </span>
      </div>
    </div>
  );
}
