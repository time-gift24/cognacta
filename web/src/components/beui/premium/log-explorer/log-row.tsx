"use client";

import { Check, ChevronRight, Copy } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { MorphicTooltip } from "@/components/beui/premium/morphic-tooltip";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type { LogEntry } from "./types";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function LogRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: LogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const reduce = useReducedMotion();
  const id = useId();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPayload = entry.payload !== undefined;
  const payload =
    typeof entry.payload === "string"
      ? entry.payload
      : JSON.stringify(entry.payload, null, 2);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copyPayload() {
    try {
      await navigator.clipboard.writeText(payload ?? "");
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyState("idle"), 1800);
  }

  return (
    <motion.li
      data-log-entry={entry.id}
      data-expanded={expanded}
      layout={!reduce}
      transition={{ layout: SPRING_LAYOUT }}
      className={cn(
        "overflow-hidden rounded-2xl border border-transparent bg-background",
        expanded && "my-1 border-border",
      )}
    >
      <Button
        tabIndex={0}
        variant="ghost"
        whileHover={undefined}
        whileTap={undefined}
        layout={reduce ? false : "position"}
        aria-label={`Inspect: ${entry.message}`}
        aria-expanded={expanded}
        aria-controls={expanded ? `${id}-payload` : undefined}
        onClick={onToggle}
        className={cn(
          "grid h-auto min-h-10 w-full grid-cols-[auto_1fr_auto] items-baseline gap-x-3 gap-y-1 rounded-full px-3 py-2 text-left font-mono text-xs font-normal text-foreground sm:grid-cols-[5.25rem_4rem_minmax(0,1fr)_auto]",
          FOCUS_RING,
        )}
      >
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {entry.time}
        </span>
        <span
          className={cn(
            "text-xs font-medium uppercase",
            entry.level === "error"
              ? "text-destructive"
              : entry.level === "warn"
                ? "text-foreground"
                : "text-muted-foreground",
          )}
        >
          {entry.level}
        </span>
        <span className="col-span-3 min-w-0 truncate sm:col-span-1 sm:col-start-3 sm:row-start-1">
          {entry.message}
          {entry.context && (
            <span className="text-muted-foreground">
              <span aria-hidden className="mx-2">
                ·
              </span>
              {entry.context}
            </span>
          )}
        </span>
        <span
          aria-hidden
          className="col-start-3 row-start-1 justify-self-end text-muted-foreground sm:col-start-4"
        >
          <ChevronRight
            className={cn(
              "size-3.5 transition-transform duration-150 motion-reduce:transition-none",
              expanded && "rotate-90",
            )}
          />
        </span>
      </Button>
      {expanded && (
        <motion.section
          id={`${id}-payload`}
          aria-label={`Details for ${entry.message}`}
          layout={reduce ? false : "position"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12, ease: EASE_OUT }}
          className="px-3 pb-3 sm:px-4 sm:pb-4"
        >
          <div className="flex items-center justify-between gap-3 border-t border-border pt-2 pb-1">
            <span className="text-xs text-muted-foreground">
              {hasPayload ? "Payload" : "Entry details"}
            </span>
            {hasPayload && (
              <MorphicTooltip
                content={copyState === "copied" ? "Copied" : "Copy payload"}
              >
                <Button
                  tabIndex={0}
                  variant="ghost"
                  size="icon"
                  aria-label={
                    copyState === "copied" ? "Payload copied" : "Copy payload"
                  }
                  className={cn("size-9 rounded-full", FOCUS_RING)}
                  onClick={copyPayload}
                >
                  {copyState === "copied" ? (
                    <Check aria-hidden className="size-3.5" />
                  ) : (
                    <Copy aria-hidden className="size-3.5" />
                  )}
                </Button>
              </MorphicTooltip>
            )}
          </div>
          <p className="mb-3 break-words text-sm">
            {entry.message}
            {entry.context && (
              <span className="ml-2 text-muted-foreground">
                {entry.context}
              </span>
            )}
          </p>
          {hasPayload && (
            <pre className="max-h-56 overflow-auto overscroll-contain rounded-xl border border-border p-3 font-mono text-xs leading-relaxed text-foreground">
              <code>{payload}</code>
            </pre>
          )}
          <output
            className={cn(
              "mt-2 block text-xs",
              copyState === "error" ? "text-destructive" : "sr-only",
            )}
          >
            {copyState === "copied"
              ? "Payload copied to clipboard."
              : copyState === "error"
                ? "Couldn’t copy. Select the payload to copy it manually."
                : ""}
          </output>
        </motion.section>
      )}
    </motion.li>
  );
}
