"use client";

import { Check, Copy, History, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import { MorphicTooltip } from "@/components/beui/premium/morphic-tooltip";
import { cn } from "@/lib/beui/utils";
import { ActorAvatar, changeValue, FOCUS_RING } from "./event-row";
import type { AuditEvent } from "./types";

export function EventDialog({
  event,
  details,
  onClose,
}: {
  event: AuditEvent;
  details?: ReactNode;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function copyId() {
    try {
      await navigator.clipboard.writeText(event.id);
      if (mounted.current) setCopyState("copied");
    } catch {
      if (mounted.current) setCopyState("error");
    }
  }
  return (
    <AnimatedModal
      open={open}
      onOpenChange={setOpen}
      onExitComplete={onClose}
      backdropClassName="bg-foreground/15 backdrop-blur-sm"
      panelClassName="max-w-xl rounded-2xl border border-border"
    >
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground [&_svg]:size-4"
        >
          {event.icon ?? <History />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs text-muted-foreground">{event.category}</p>
          <AnimatedModalTitle className="break-words text-xl font-medium">
            Event details
          </AnimatedModalTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          tabIndex={0}
          data-autofocus
          aria-label="Close event details"
          onClick={() => setOpen(false)}
          className={cn("size-9 rounded-full", FOCUS_RING)}
        >
          <X aria-hidden className="size-4" />
        </Button>
      </header>
      <div className="space-y-5 p-5">
        <div className="flex items-center gap-3">
          <ActorAvatar actor={event.actor} />
          <div className="min-w-0">
            <p className="text-sm font-medium">{event.actor.name}</p>
            <time
              dateTime={event.occurredAt}
              className="mt-0.5 block text-xs text-muted-foreground"
            >
              {event.day.label} · {event.timeLabel}
            </time>
          </div>
        </div>
        <AnimatedModalDescription className="text-sm leading-relaxed">
          {event.actor.name} {event.action}{" "}
          <span className="font-medium">{event.target}</span>.
        </AnimatedModalDescription>
        {event.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {event.description}
          </p>
        )}
        {!!event.changes?.length && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full table-fixed text-left text-xs">
              <caption className="sr-only">Changed values</caption>
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  {["Field", "Before", "After"].map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="px-2 py-3 font-normal sm:px-3"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {event.changes.map((change, index) => (
                  <tr key={`${change.label}-${index}`}>
                    <th
                      scope="row"
                      className="break-words px-2 py-3 align-top font-medium sm:px-3"
                    >
                      {change.label}
                    </th>
                    <td className="break-words px-2 py-3 align-top text-muted-foreground sm:px-3">
                      {changeValue(change.before)}
                    </td>
                    <td className="break-words px-2 py-3 align-top font-medium sm:px-3">
                      {changeValue(change.after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {details}
        {!!event.metadata?.length && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            {event.metadata.map((field, index) => (
              <div key={`${field.label}-${index}`} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{field.label}</dt>
                <dd className="mt-1 break-words text-sm">{field.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <footer className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
        <span className="text-xs text-muted-foreground">Event ID</span>
        <code className="min-w-0 flex-1 break-all text-xs">{event.id}</code>
        <MorphicTooltip
          content={copyState === "copied" ? "Copied" : "Copy event ID"}
        >
          <Button
            variant="ghost"
            size="icon"
            tabIndex={0}
            aria-label="Copy event ID"
            onClick={() => void copyId()}
            className={cn("size-9 rounded-full", FOCUS_RING)}
          >
            {copyState === "copied" ? (
              <Check aria-hidden className="size-4" />
            ) : (
              <Copy aria-hidden className="size-4" />
            )}
          </Button>
        </MorphicTooltip>
        <output
          aria-live="polite"
          className={cn(
            copyState === "error"
              ? "basis-full text-xs text-destructive"
              : "sr-only",
          )}
        >
          {copyState === "copied"
            ? "Event ID copied."
            : copyState === "error"
              ? "Couldn't copy. Select the ID to copy it manually."
              : ""}
        </output>
      </footer>
    </AnimatedModal>
  );
}
