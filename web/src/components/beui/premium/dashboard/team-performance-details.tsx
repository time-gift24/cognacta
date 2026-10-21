"use client";

import { X } from "lucide-react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import { PlanningProgress } from "@/components/beui/premium/dashboard-pages/planning-ui";
import { formatReportValue } from "./format";
import { PeriodComparisonChart } from "./period-comparison-chart";
import {
  buildComparison,
  type ComparisonRange,
  comparisonRangeLabel,
} from "./period-comparison-model";
import type { TeamPerformanceRow } from "./team-performance-model";

export function TeamPerformanceDetails({
  member,
  range,
  onClose,
}: {
  member: TeamPerformanceRow | undefined;
  range: ComparisonRange;
  onClose: () => void;
}) {
  const metric = { id: "delivered", label: "Delivered work" };
  const series = member
    ? buildComparison(
        [...member.currentRecords, ...member.previousRecords].map((record) => ({
          date: record.date,
          values: { delivered: record.delivered },
        })),
        metric,
        range,
        "previous",
      )
    : null;
  return (
    <AnimatedModal
      open={!!member}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      panelClassName="max-w-2xl rounded-2xl border border-border p-5 sm:p-6"
    >
      {member && series && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <AnimatedModalTitle className="text-xl font-medium">
                {member.name}’s performance
              </AnimatedModalTitle>
              <AnimatedModalDescription className="mt-2 text-sm text-muted-foreground">
                {member.team} · {comparisonRangeLabel(range)}
              </AnimatedModalDescription>
            </div>
            <Button
              variant="ghost"
              className="size-9 shrink-0 rounded-full p-0"
              aria-label="Close teammate details"
              onClick={onClose}
            >
              <X aria-hidden className="size-4" />
            </Button>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {[
              ["Delivered", formatReportValue(member.delivered)],
              [
                "First reply",
                member.replyTime === null
                  ? "—"
                  : `${formatReportValue(member.replyTime, { decimals: 1 })} min`,
              ],
              [
                "On-time replies",
                member.onTime === null
                  ? "—"
                  : formatReportValue(member.onTime, {
                      style: "percent",
                      decimals: 1,
                    }),
              ],
              [
                "Reviews passed",
                member.quality === null
                  ? "—"
                  : formatReportValue(member.quality, {
                      style: "percent",
                      decimals: 1,
                    }),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-2 text-xl font-medium tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 border-t border-border pt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-normal text-muted-foreground">
                Delivered work by day
              </h3>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-0.5 w-3 rounded-full bg-primary"
                  />
                  Current
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="w-3 border-t border-dashed border-muted-foreground"
                  />
                  Previous
                </span>
              </div>
            </div>
            {member.currentRecords.length ? (
              <PeriodComparisonChart
                points={series.points}
                metric={metric}
                view="line"
                showPrevious
              />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No observations for this teammate.
              </p>
            )}
          </div>
          <div className="mt-4 grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
            {[
              {
                label: "Reply targets",
                value: member.onTime,
                done: member.onTimeReplies,
                total: member.firstReplies,
                note: "Replies within the configured response target",
              },
              {
                label: "Review checks",
                value: member.quality,
                done: member.passedReviews,
                total: member.reviewed,
                note: "Delivered items that passed review",
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex justify-between gap-3 text-xs">
                  <span>{item.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {item.done} / {item.total}
                  </span>
                </div>
                {item.value !== null ? (
                  <PlanningProgress
                    label={`${member.name} ${item.label}`}
                    value={item.value}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No observations yet
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.note}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Coverage: {member.currentRecords.length}/{series.points.length} days
            · previous {member.previousRecords.length}/{series.points.length}.
            Missing days remain gaps.
          </p>
        </>
      )}
    </AnimatedModal>
  );
}
