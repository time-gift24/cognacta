"use client";

import { CheckCheck, ClipboardCheck, Search, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import {
  MorphicTooltip,
  MorphicTooltipProvider,
} from "@/components/beui/premium/morphic-tooltip";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { FOCUS_RING, RequestRow, STATUS_LABELS } from "./request-summary";
import { ReviewDialog } from "./review-dialog";
import type { ApprovalQueueProps } from "./types";

export type {
  ApprovalAction,
  ApprovalAttachment,
  ApprovalDecision,
  ApprovalPerson,
  ApprovalQueueProps,
  ApprovalRequest,
  ApprovalStatus,
} from "./types";

export function ApprovalQueue({
  requests,
  onDecision,
  title = "Approval queue",
  headerActions,
  renderDetails,
  className,
}: ApprovalQueueProps) {
  const scope = useId();
  const reduce = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const returnId = useRef<string | null>(null);
  const [filter, setFilter] = useState("pending");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const pendingCount = requests.filter(
    (request) => request.status === "pending",
  ).length;
  const filters = [
    { value: "pending", label: "Pending", count: pendingCount },
    {
      value: "reviewed",
      label: "Reviewed",
      count: requests.length - pendingCount,
    },
    { value: "all", label: "All", count: requests.length },
  ];
  const needle = query.trim().toLocaleLowerCase();
  const visible = requests.filter(
    (request) =>
      (filter === "all" ||
        (filter === "pending"
          ? request.status === "pending"
          : request.status !== "pending")) &&
      (!needle ||
        [
          request.title,
          request.summary,
          request.category,
          request.reference,
          request.submittedBy.name,
          STATUS_LABELS[request.status],
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(needle)),
  );
  const selected = requests.find((request) => request.id === openId);

  function restoreFocus() {
    const id = returnId.current;
    returnId.current = null;
    if (!id) return;
    requestAnimationFrame(() => {
      const buttons = Array.from(
        root.current?.querySelectorAll<HTMLButtonElement>(
          "[data-approval-open]",
        ) ?? [],
      );
      (
        buttons.find((button) => button.dataset.approvalOpen === id) ??
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
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground"
            >
              <ClipboardCheck className="size-4" />
            </span>
            <div className="min-w-0">
              <h2
                id={`${scope}-title`}
                className="truncate text-xl font-medium"
              >
                {title}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {pendingCount
                  ? `${pendingCount} requests awaiting review`
                  : "All requests reviewed"}
              </p>
            </div>
          </div>
          {headerActions}
        </header>
        <Tabs value={filter} onValueChange={setFilter} variant="pill">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <TabsList
              aria-label="Filter approval requests"
              className="gap-0.5 p-0.5"
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const current = filters.findIndex(
                  (item) => item.value === filter,
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
                setFilter(filters[index].value);
                event.currentTarget
                  .querySelectorAll<HTMLElement>('[role="tab"]')
                  [index]?.focus();
              }}
            >
              {filters.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  id={`${scope}-${item.value}`}
                  aria-controls={`${scope}-results`}
                  tabIndex={filter === item.value ? 0 : -1}
                  className={cn("h-8 gap-1.5 px-3 py-0 text-xs", FOCUS_RING)}
                >
                  {item.label}
                  <span className="tabular-nums text-muted-foreground">
                    {item.count}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            <Input
              ref={input}
              type="search"
              aria-label="Search approval requests"
              placeholder="Search requests…"
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
                      tabIndex={0}
                      variant="ghost"
                      size="icon"
                      aria-label="Clear search"
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
              className="w-full sm:w-56"
              classNames={{
                field:
                  "h-10 rounded-full bg-background ring-0 data-[state=focused]:border-foreground/60",
                input: "text-xs [&::-webkit-search-cancel-button]:hidden",
                rightIcon: "right-1",
              }}
            />
          </div>
          <div
            id={`${scope}-results`}
            role="tabpanel"
            aria-labelledby={`${scope}-${filter}`}
          >
            <div className="max-h-120 overflow-y-auto overscroll-contain p-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={filter}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.1, ease: EASE_OUT }}
                  className="min-h-96"
                >
                  {visible.length ? (
                    <ul className="space-y-2.5">
                      {visible.map((request) => (
                        <RequestRow
                          key={request.id}
                          request={request}
                          onOpen={() => {
                            returnId.current = request.id;
                            setOpenId(request.id);
                          }}
                        />
                      ))}
                    </ul>
                  ) : (
                    <div className="flex min-h-96 flex-col items-center justify-center gap-3 px-4 text-center">
                      <span
                        aria-hidden
                        className="flex size-12 items-center justify-center rounded-full border border-border text-muted-foreground"
                      >
                        <CheckCheck className="size-5" />
                      </span>
                      <p className="text-sm font-medium">
                        {needle
                          ? "No matching requests"
                          : filter === "pending"
                            ? "You're all caught up"
                            : "No requests here yet"}
                      </p>
                      <p className="max-w-xs text-xs text-muted-foreground">
                        {needle
                          ? "Try another title, category, or teammate."
                          : filter === "pending"
                            ? "New requests will appear here when they need a decision."
                            : "Reviewed requests stay here for reference."}
                      </p>
                      {query && (
                        <Button
                          variant="outline"
                          tabIndex={0}
                          onClick={() => {
                            setQuery("");
                            input.current?.focus();
                          }}
                          className={cn(
                            "h-9 rounded-full px-3 text-xs",
                            FOCUS_RING,
                          )}
                        >
                          Clear search
                        </Button>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Tabs>
        <output aria-live="polite" className="sr-only">
          {announcement}
        </output>
        {selected && (
          <ReviewDialog
            key={selected.id}
            request={selected}
            details={renderDetails?.(selected)}
            onClose={() => {
              setOpenId(null);
              restoreFocus();
            }}
            onDecision={
              onDecision
                ? async (decision) => {
                    await onDecision(selected, decision);
                    setAnnouncement(
                      `${selected.title}: ${STATUS_LABELS[decision.action].toLocaleLowerCase()}.`,
                    );
                  }
                : undefined
            }
          />
        )}
      </section>
    </MorphicTooltipProvider>
  );
}
