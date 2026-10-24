"use client";

import { ArrowRight, Bot, ChevronRight, History } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import type { AuditActor, AuditEvent } from "./types";

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function changeValue(value: string | null) {
  return value === null ? "Not set" : value === "" ? "Empty" : value;
}

export function ActorAvatar({
  actor,
  className,
}: {
  actor: AuditActor;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const initials = actor.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-xs text-muted-foreground",
        className,
      )}
    >
      {actor.kind === "system" ? (
        <Bot className="size-4" />
      ) : actor.avatarUrl && actor.avatarUrl !== failedUrl ? (
        // biome-ignore lint/performance/noImgElement: Installable source supports host-provided avatar URLs without a Next image loader.
        <img
          src={actor.avatarUrl}
          alt=""
          loading="lazy"
          draggable={false}
          className="size-full object-cover"
          onError={() => setFailedUrl(actor.avatarUrl)}
        />
      ) : (
        initials || <History className="size-4" />
      )}
    </span>
  );
}

export function EventRow({
  event,
  onOpen,
}: {
  event: AuditEvent;
  onOpen: () => void;
}) {
  const change = event.changes?.length === 1 ? event.changes[0] : null;
  return (
    <li className="@container/audit-row">
      <div className="relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2 rounded-xl px-3 py-3 text-start text-sm text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background @xl/audit-row:grid-cols-[auto_minmax(0,9rem)_minmax(0,1fr)_auto_auto] @xl/audit-row:gap-x-5 @xl/audit-row:px-4 @xl/audit-row:py-4">
        <ActorAvatar
          actor={event.actor}
          className="size-8 @xl/audit-row:size-9"
        />
        <span className="col-start-2 row-start-1 min-w-0 break-words text-sm font-medium leading-snug">
          {event.actor.name}
        </span>
        <span className="col-span-4 col-start-1 row-start-2 min-w-0 @xl/audit-row:col-span-1 @xl/audit-row:col-start-3 @xl/audit-row:row-start-1">
          <span className="block break-words text-sm leading-snug">
            <span className="text-muted-foreground">{event.action}</span>{" "}
            <span className="font-medium">{event.target}</span>
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 [&_svg]:size-3 [&_svg]:shrink-0">
              {event.icon ?? <History aria-hidden />}
              <span className="truncate">{event.category}</span>
            </span>
            {change ? (
              <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-1.5 gap-y-1">
                <span className="max-w-full truncate">{change.label}:</span>
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                  <span className="max-w-24 truncate rounded-md border border-border px-1.5 py-0.5">
                    {changeValue(change.before)}
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="size-3 shrink-0 rtl:rotate-180"
                  />
                  <span className="max-w-24 truncate rounded-md border border-border px-1.5 py-0.5 text-foreground">
                    {changeValue(change.after)}
                  </span>
                </span>
              </span>
            ) : event.changes?.length ? (
              <span>{event.changes.length} fields changed</span>
            ) : null}
          </span>
        </span>
        <time
          dateTime={event.occurredAt}
          className="col-start-3 row-start-1 max-w-20 break-words text-end text-xs tabular-nums text-muted-foreground @xl/audit-row:col-start-4"
        >
          {event.timeLabel}
        </time>
        <ChevronRight
          aria-hidden
          className="col-start-4 row-start-1 size-3.5 shrink-0 text-muted-foreground @xl/audit-row:col-start-5 rtl:rotate-180"
        />
        {/* Full-row control; the shared Button is always pill-shaped, so the
            row keeps its own radius and this sits on top. */}
        <Button
          variant="plain"
          type="button"
          data-audit-open={event.id}
          aria-label={`View event: ${event.actor.name} ${event.action} ${event.target}`}
          aria-haspopup="dialog"
          onClick={onOpen}
          whileHover={undefined}
          whileTap={undefined}
          className="absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
    </li>
  );
}
