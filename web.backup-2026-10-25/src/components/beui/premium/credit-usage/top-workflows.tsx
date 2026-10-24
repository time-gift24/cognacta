"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { Sparkline } from "@/components/beui/charts/sparkline";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";
import type { CreditCategory } from "./credit-usage-data";
import { SECTION_RISE } from "./credit-usage-motion";
import type { TrendWorkflow } from "./credit-usage-trend-data";

export type TopWorkflowsProps = {
  workflows: readonly TrendWorkflow[];
  categories: ReadonlyMap<string, CreditCategory>;
  /** Category highlighted elsewhere; other rows fade. */
  highlightedCategory: string | null;
  onHighlightCategory: (id: string | null) => void;
  format: (value: number) => string;
  title: string;
  description: string;
};

/** Ranked workflows with sparklines that link to chart categories. */
export function TopWorkflows({
  workflows,
  categories,
  highlightedCategory,
  onHighlightCategory,
  format,
  title,
  description,
}: TopWorkflowsProps) {
  const canHover = useHoverCapable();

  return (
    <motion.div
      variants={SECTION_RISE}
      className="rounded-3xl border border-border p-5 sm:p-6"
    >
      <h3 className="font-medium text-xl">{title}</h3>
      <p className="mt-1 text-muted-foreground text-sm">{description}</p>
      <ul className="mt-5 space-y-1">
        {workflows.map((workflow, index) => {
          const category = categories.get(workflow.category);
          const up = workflow.change >= 0;
          const dim =
            highlightedCategory !== null &&
            highlightedCategory !== workflow.category;
          return (
            <li
              key={workflow.id}
              onPointerEnter={
                canHover
                  ? () => onHighlightCategory(workflow.category)
                  : undefined
              }
              onPointerLeave={
                canHover ? () => onHighlightCategory(null) : undefined
              }
              className={cn(
                "flex items-center gap-3 rounded-2xl py-2.5 transition-opacity duration-200",
                dim && "opacity-40",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">{workflow.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground text-xs">
                  <span
                    className={cn("size-1.5 rounded-full", category?.color)}
                  />
                  {category?.label ?? workflow.category}
                </p>
              </div>
              <Sparkline
                values={workflow.spark}
                strokeClassName={category?.stroke}
                delay={0.5 + index * 0.08}
              />
              <div className="w-16 shrink-0 text-right">
                <p className="font-mono text-sm tabular-nums">
                  {format(workflow.credits)}
                </p>
                <p className="mt-0.5 inline-flex items-center gap-0.5 font-mono text-muted-foreground text-xs tabular-nums">
                  {up ? (
                    <ArrowUpRight className="size-3" aria-hidden="true" />
                  ) : (
                    <ArrowDownRight className="size-3" aria-hidden="true" />
                  )}
                  {Math.abs(workflow.change)}%
                  <span className="sr-only">
                    {up ? "increase" : "decrease"}
                  </span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
