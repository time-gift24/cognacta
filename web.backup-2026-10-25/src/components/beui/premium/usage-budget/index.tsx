"use client";

import { Gauge, Minus, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type UsageResource = {
  id: string;
  name: string;
  amount: number;
  detail: string;
};
export type UsageBudgetProps = {
  resources: readonly UsageResource[];
  initialBudget?: number;
  period?: string;
  onBudgetChange?: (budget: number) => void;
  className?: string;
};

export function UsageBudget({
  resources,
  initialBudget = 100,
  period = "September",
  onBudgetChange,
  className,
}: UsageBudgetProps) {
  const reduce = useReducedMotion();
  const [budget, setBudget] = useState(Math.max(25, initialBudget));
  const [previousBudget, setPreviousBudget] = useState(budget);
  const spent = resources.reduce(
    (sum, item) => sum + Math.max(0, item.amount),
    0,
  );
  const percentage = Math.min(100, Math.round((spent / budget) * 100));
  const filled = Math.round(percentage / 2.5);
  const previousFilled = Math.round(
    Math.min(100, (spent / previousBudget) * 100) / 2.5,
  );
  const filling = filled >= previousFilled;
  const numberDirection = budget >= previousBudget ? "up" : "down";
  function change(next: number) {
    setPreviousBudget(budget);
    setBudget(next);
    onBudgetChange?.(next);
  }
  return (
    <section
      aria-label="Usage budget"
      className={cn(
        "w-full max-w-lg rounded-3xl border border-border bg-background p-5 sm:p-6",
        className,
      )}
    >
      <header className="flex items-center justify-between">
        <h2 className="text-4xl font-medium">Usage budget</h2>
        <span className="text-xs text-muted-foreground">{period}</span>
      </header>
      <div className="my-7 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">Total used</p>
          <div className="flex items-center gap-2">
            <DigitSwap
              value={`$${spent.toFixed(2)}`}
              className="text-4xl font-medium tracking-tight"
            />
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              / <DigitSwap value={`$${budget}`} direction={numberDirection} />
            </span>
          </div>
        </div>
        <span className="flex size-11 items-center justify-center rounded-full bg-muted">
          <Gauge className="size-5" />
        </span>
      </div>
      <div className="flex h-9 items-center gap-1" aria-hidden="true">
        {Array.from({ length: 40 }, (_, index) => index).map((segment) => {
          const active = segment < filled;
          const changed =
            segment >= Math.min(filled, previousFilled) &&
            segment < Math.max(filled, previousFilled);
          const order = filling
            ? segment - previousFilled
            : previousFilled - 1 - segment;
          return (
            <span
              key={segment}
              className="relative h-full min-w-0 flex-1 overflow-hidden rounded-full bg-primary/10"
            >
              <motion.span
                initial={reduce ? false : { scaleY: 0, opacity: 0 }}
                animate={{ scaleY: active ? 1 : 0, opacity: active ? 1 : 0 }}
                transition={{
                  duration: reduce ? 0 : 0.24,
                  ease: EASE_OUT,
                  delay:
                    reduce || !changed
                      ? 0
                      : Math.min(Math.max(0, order) * 0.025, 0.25),
                }}
                className="absolute inset-0 origin-bottom rounded-full bg-primary"
              />
            </span>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {spent > budget
          ? `$${(spent - budget).toFixed(2)} over budget`
          : `$${(budget - spent).toFixed(2)} remaining this month · ${percentage}% used`}
      </p>
      <dl className="my-6 divide-y divide-border">
        {resources.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 py-3"
          >
            <dt>
              <span className="block text-sm font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground">
                {item.detail}
              </span>
            </dt>
            <dd className="text-sm tabular-nums">
              ${Math.max(0, item.amount).toFixed(2)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
        <div>
          <p className="text-sm font-medium">Monthly limit</p>
          <p className="text-xs text-muted-foreground">
            Adjust in $25 increments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Decrease budget"
            disabled={budget <= 25}
            onClick={() => change(Math.max(25, budget - 25))}
            className="size-9 border border-border rounded-full h-9"
          >
            <Minus className="size-4" />
          </Button>
          <output className="flex h-9 min-w-12 items-center justify-center text-sm leading-none tabular-nums">
            <DigitSwap value={`$${budget}`} direction={numberDirection} />
          </output>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Increase budget"
            onClick={() => change(budget + 25)}
            className="size-9 border border-border rounded-full h-9"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
