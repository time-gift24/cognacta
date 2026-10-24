"use client";

import {
  Check,
  ChevronRight,
  Clock3,
  FileText,
  MessageSquare,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/beui/motion/button";
import type { ApprovalPerson, ApprovalRequest, ApprovalStatus } from "./types";

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
export const STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  changes_requested: "Changes requested",
  declined: "Declined",
};
const STATUS_ICONS = {
  pending: Clock3,
  approved: Check,
  changes_requested: MessageSquare,
  declined: X,
};

export function RequestStatus({ status }: { status: ApprovalStatus }) {
  const Icon = STATUS_ICONS[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function RequestAvatar({ person }: { person: ApprovalPerson }) {
  const [failedUrl, setFailedUrl] = useState<string | undefined>();
  const initials = person.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-xs text-muted-foreground"
    >
      {person.avatarUrl && person.avatarUrl !== failedUrl ? (
        // The host supplies avatar URLs; initials remain usable when a file fails.
        // biome-ignore lint/performance/noImgElement: installable source cannot assume a Next image loader.
        <img
          src={person.avatarUrl}
          alt=""
          draggable={false}
          loading="lazy"
          className="size-full object-cover"
          onError={() => setFailedUrl(person.avatarUrl)}
        />
      ) : (
        initials || "?"
      )}
    </span>
  );
}

export function RequestRow({
  request,
  onOpen,
}: {
  request: ApprovalRequest;
  onOpen: () => void;
}) {
  return (
    <li className="relative flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-4 text-left text-sm text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background sm:gap-4 sm:px-5">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground [&_svg]:size-4"
      >
        {request.icon ?? <FileText />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-medium">{request.title}</span>
          {request.dueLabel && request.status === "pending" && (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              {request.dueLabel}
            </span>
          )}
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {request.summary}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{request.category}</span>
          <span aria-hidden>·</span>
          <span>{request.submittedAt}</span>
          <span className="inline-flex items-center gap-1.5 sm:hidden">
            <span aria-hidden>·</span>
            {request.submittedBy.name}
          </span>
        </span>
        <span className="mt-2 block sm:hidden">
          <RequestStatus status={request.status} />
        </span>
      </span>
      <span className="hidden w-32 shrink-0 space-y-2 sm:block">
        <span className="flex items-center gap-2">
          <RequestAvatar person={request.submittedBy} />
          <span className="truncate text-xs">{request.submittedBy.name}</span>
        </span>
        <RequestStatus status={request.status} />
      </span>
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
      {/* Full-row control; the shared Button is always pill-shaped, so the
            row keeps its own radius and this sits on top. */}
      <Button
        variant="plain"
        type="button"
        data-approval-open={request.id}
        aria-label={`${request.status === "pending" ? "Review" : "View"} ${request.title}`}
        aria-haspopup="dialog"
        onClick={onOpen}
        whileHover={undefined}
        whileTap={undefined}
        className="absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </li>
  );
}
