"use client";

import { ArrowRight, Check, Layers, Minus, Route } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type WorkflowComparisonStep = {
  id: string;
  before: { title: string; description: string };
  after: { title: string; description: string };
};

export type WorkflowComparisonProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  beforeLabel?: string;
  afterLabel?: string;
  beforeSummary?: string;
  afterSummary?: string;
  steps?: readonly WorkflowComparisonStep[];
  className?: string;
};

const STEPS: WorkflowComparisonStep[] = [
  {
    id: "capture",
    before: {
      title: "Requests everywhere",
      description:
        "Check your inbox, chat, and spreadsheets for the full picture.",
    },
    after: {
      title: "One place to start",
      description: "Every request arrives in a shared, organized queue.",
    },
  },
  {
    id: "assign",
    before: {
      title: "Another handoff",
      description: "Ask around to find out who has time to take it on.",
    },
    after: {
      title: "A clear next step",
      description: "Assign an owner and keep the context with the work.",
    },
  },
  {
    id: "track",
    before: {
      title: "Chasing an update",
      description: "Send a follow-up just to learn where things stand.",
    },
    after: {
      title: "Progress you can see",
      description: "Follow each task from its first step to the finish.",
    },
  },
  {
    id: "finish",
    before: {
      title: "Rebuild the context",
      description: "Dig through old threads when the same question comes up.",
    },
    after: {
      title: "Keep what you learn",
      description: "Turn completed work into a useful reference for next time.",
    },
  },
];

export function WorkflowComparison({
  eyebrow = "A better everyday workflow",
  title = "Less chasing. More doing.",
  description = "See what changes when your team's work has a place to come together.",
  beforeLabel = "The scattered approach",
  afterLabel = "A connected workspace",
  beforeSummary = "Your team holds everything together.",
  afterSummary = "Your workspace keeps everyone together.",
  steps = STEPS,
  className,
}: WorkflowComparisonProps) {
  const reduce = useReducedMotion();
  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-20 text-foreground sm:px-8 sm:py-24",
        className,
      )}
    >
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-4 text-balance text-4xl font-medium tracking-tight">
            {title}
          </h2>
          <p className="mt-5 max-w-xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        <div className="relative mt-10 grid gap-4 md:grid-cols-2 md:gap-8">
          {(["before", "after"] as const).map((side) => {
            const isAfter = side === "after";
            const Icon = isAfter ? Route : Layers;
            return (
              <motion.article
                key={side}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: reduce ? 0 : 0.4,
                  delay: reduce ? 0 : isAfter ? 0.1 : 0,
                  ease: EASE_OUT,
                }}
                className="flex flex-col rounded-3xl border border-border bg-background p-6 sm:p-8"
              >
                <div className="mb-7 flex items-center justify-between gap-4">
                  <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {isAfter ? "After" : "Before"}
                  </span>
                </div>
                <h3 className="text-xl font-medium">
                  {isAfter ? afterLabel : beforeLabel}
                </h3>
                <ol className="my-8 flex-1 space-y-7">
                  {steps.map((step, index) => (
                    <motion.li
                      key={step.id}
                      initial={
                        reduce ? false : { opacity: 0, x: isAfter ? -6 : 0 }
                      }
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{
                        duration: reduce ? 0 : 0.3,
                        delay: reduce ? 0 : index * 0.05,
                        ease: EASE_OUT,
                      }}
                      className="flex gap-3"
                    >
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        {isAfter ? (
                          <Check className="size-3" aria-hidden="true" />
                        ) : (
                          <Minus className="size-3" aria-hidden="true" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          {step[side].title}
                        </p>
                        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                          {step[side].description}
                        </p>
                      </div>
                    </motion.li>
                  ))}
                </ol>
                <p className="border-t border-border pt-5 text-sm font-medium leading-6">
                  {isAfter ? afterSummary : beforeSummary}
                </p>
              </motion.article>
            );
          })}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-16 hidden size-10 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background md:flex"
          >
            <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </section>
  );
}
