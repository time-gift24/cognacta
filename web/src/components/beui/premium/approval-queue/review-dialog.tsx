"use client";

import {
  ArrowUpRight,
  Check,
  FileText,
  LoaderCircle,
  MessageSquare,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import { FOCUS_RING, RequestAvatar, RequestStatus } from "./request-summary";
import type {
  ApprovalAction,
  ApprovalDecision,
  ApprovalRequest,
} from "./types";

const ACTIONS = [
  { action: "approved", label: "Approve", icon: Check },
  {
    action: "changes_requested",
    label: "Request changes",
    icon: MessageSquare,
  },
  { action: "declined", label: "Decline", icon: X },
] as const;

export function ReviewDialog({
  request,
  details,
  onDecision,
  onClose,
}: {
  request: ApprovalRequest;
  details?: ReactNode;
  onDecision?: (decision: ApprovalDecision) => void | Promise<void>;
  onClose: () => void;
}) {
  const id = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);
  const saving = useRef(false);
  const [open, setOpen] = useState(true);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<ApprovalAction | null>(null);
  const [error, setError] = useState("");
  const canDecide = request.status === "pending" && !!onDecision;
  const showDecisionControls = canDecide || !!pending;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function decide(action: ApprovalAction) {
    if (!onDecision || !canDecide || saving.current) return;
    if (action !== "approved" && !note.trim()) {
      setError(
        action === "declined"
          ? "Add a reason before declining."
          : "Describe the changes you need.",
      );
      noteRef.current?.focus();
      return;
    }
    saving.current = true;
    contentRef.current?.focus({ preventScroll: true });
    setPending(action);
    setError("");
    try {
      await onDecision({ action, note: note.trim() });
      if (mounted.current) setOpen(false);
    } catch {
      if (mounted.current) {
        setPending(null);
        setError(
          "Couldn't save your decision. Your note is still here. Try again.",
        );
      }
    } finally {
      saving.current = false;
    }
  }

  function close() {
    if (!saving.current) setOpen(false);
  }

  return (
    <AnimatedModal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
      onExitComplete={onClose}
      backdropClassName="bg-foreground/15 backdrop-blur-sm"
      viewportClassName="overscroll-contain inset-3 sm:inset-6"
      panelClassName="max-w-xl rounded-2xl border border-border"
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        aria-busy={!!pending}
        className="outline-none"
      >
        <header className="flex items-start gap-3 border-b border-border px-5 py-4">
          <span
            aria-hidden
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground [&_svg]:size-4"
          >
            {request.icon ?? <FileText />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs text-muted-foreground">
              {request.category}
              {request.reference ? ` · ${request.reference}` : ""}
            </p>
            <AnimatedModalTitle className="text-xl font-medium">
              {request.title}
            </AnimatedModalTitle>
          </div>
          <Button
            tabIndex={0}
            variant="ghost"
            size="icon"
            data-autofocus
            disabled={!!pending}
            aria-label="Close review"
            onClick={close}
            className={cn("size-9 rounded-full", FOCUS_RING)}
          >
            <X aria-hidden className="size-4" />
          </Button>
        </header>
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <RequestAvatar person={request.submittedBy} />
              <p className="text-xs">
                {request.submittedBy.name}
                <span className="ml-2 text-muted-foreground">
                  {request.submittedAt}
                </span>
              </p>
            </div>
            <RequestStatus status={request.status} />
          </div>
          <AnimatedModalDescription className="text-sm leading-relaxed text-muted-foreground">
            {request.summary}
          </AnimatedModalDescription>
          {!!request.fields?.length && (
            <dl className="grid grid-cols-2 gap-x-5 gap-y-4 rounded-xl border border-border p-4">
              {request.fields.map((field, index) => (
                <div key={`${field.label}-${index}`} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium">
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {details}
          {!!request.attachments?.length && (
            <section aria-labelledby={`${id}-files`}>
              <h3 id={`${id}-files`} className="mb-2 text-xs font-medium">
                Supporting files
              </h3>
              <ul className="space-y-2">
                {request.attachments.map((file) => {
                  const content = (
                    <>
                      <FileText
                        aria-hidden
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">
                          {file.name}
                        </span>
                        {file.description && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {file.description}
                          </span>
                        )}
                      </span>
                      {file.href && (
                        <ArrowUpRight
                          aria-hidden
                          className="size-3.5 text-muted-foreground"
                        />
                      )}
                    </>
                  );
                  return (
                    <li key={file.id}>
                      {file.href ? (
                        <a
                          href={file.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className={cn(
                            "flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors hover:border-foreground/30",
                            FOCUS_RING,
                          )}
                        >
                          {content}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                          {content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {request.review && (
            <section
              aria-labelledby={`${id}-decision`}
              className="rounded-xl border border-border p-4"
            >
              <h3 id={`${id}-decision`} className="text-xs font-medium">
                Review note
              </h3>
              {request.review.note && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {request.review.note}
                </p>
              )}
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <RequestAvatar person={request.review.reviewer} />
                {request.review.reviewer.name} · {request.review.reviewedAt}
              </p>
            </section>
          )}
          {showDecisionControls && (
            <div>
              <label
                htmlFor={`${id}-note`}
                className="mb-1.5 block text-xs font-medium"
              >
                Review note{" "}
                <span className="font-normal text-muted-foreground">
                  · optional when approving
                </span>
              </label>
              <textarea
                ref={noteRef}
                id={`${id}-note`}
                value={note}
                rows={3}
                disabled={!!pending}
                aria-invalid={!!error || undefined}
                aria-describedby={error ? `${id}-error` : `${id}-hint`}
                placeholder="Share your feedback…"
                onChange={(event) => {
                  setNote(event.target.value);
                  setError("");
                }}
                className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/60 disabled:opacity-60"
              />
              <p
                id={`${id}-hint`}
                className="mt-1 text-xs text-muted-foreground"
              >
                A note is required to request changes or decline.
              </p>
            </div>
          )}
          {error && (
            <p
              id={`${id}-error`}
              role="alert"
              className="text-xs text-destructive"
            >
              {error}
            </p>
          )}
        </div>
        {showDecisionControls && (
          <footer className="flex flex-wrap items-center gap-1 border-t border-border px-5 py-4 sm:gap-2">
            {ACTIONS.map(({ action, label, icon: Icon }) => (
              <Button
                key={action}
                tabIndex={0}
                variant={
                  action === "approved"
                    ? "primary"
                    : action === "declined"
                      ? "ghost"
                      : "outline"
                }
                disabled={!!pending}
                onClick={() => void decide(action)}
                className={cn(
                  "h-9 gap-1.5 rounded-full px-2 text-xs sm:px-3",
                  action === "declined" && "ml-auto",
                  FOCUS_RING,
                )}
              >
                {pending === action ? (
                  <LoaderCircle
                    aria-hidden
                    className="size-3.5 animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <Icon aria-hidden className="size-3.5" />
                )}
                {pending === action ? "Saving…" : label}
              </Button>
            ))}
          </footer>
        )}
        <output aria-live="polite" className="sr-only">
          {pending ? "Saving your decision." : ""}
        </output>
      </div>
    </AnimatedModal>
  );
}
