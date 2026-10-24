"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  Check,
  Database,
  Route,
  ShieldCheck,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type WhatWeOfferControlStackItem = {
  title: string;
  description: string;
  icon?: LucideIcon;
};

export type WhatWeOfferControlStackProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  items?: WhatWeOfferControlStackItem[];
  className?: string;
};

const DEFAULT_ITEMS: WhatWeOfferControlStackItem[] = [
  {
    title: "Flexible intelligence",
    description: "Choose and route models around the work, not the provider.",
    icon: BrainCircuit,
  },
  {
    title: "Connected context",
    description: "Bring approved knowledge into every relevant run.",
    icon: Database,
  },
  {
    title: "Action-ready tools",
    description: "Connect services through explicit, reviewable actions.",
    icon: Route,
  },
  {
    title: "Visible safeguards",
    description: "Keep approvals, traces, limits, and ownership clear.",
    icon: ShieldCheck,
  },
];

const WORKFLOW_STEPS = [
  { label: "Request understood", detail: "Intent and policy checked" },
  { label: "Context retrieved", detail: "4 approved sources" },
  { label: "Action completed", detail: "Trace saved for review" },
] as const;

export function WhatWeOfferControlStack({
  eyebrow = "One control layer",
  title = "Everything your AI team needs to move with confidence.",
  description = "Bring models, knowledge, tools, and oversight into one connected operating layer that stays clear as usage grows.",
  ctaLabel = "See the control layer",
  ctaHref = "#",
  items = DEFAULT_ITEMS,
  className,
}: WhatWeOfferControlStackProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-20 text-foreground sm:px-6 sm:py-24 lg:px-8 lg:py-28",
        className,
      )}
    >
      <div className="mx-auto grid w-full max-w-7xl gap-4 rounded-3xl border border-border/70 bg-background p-3 sm:p-4 lg:grid-cols-[1.04fr_0.96fr] lg:p-5">
        <ControlStackVisual reduceMotion={reduceMotion} />

        <motion.div
          initial={
            reduceMotion
              ? false
              : {
                  opacity: 0,
                  transform: "translateY(18px)",
                  filter: "blur(8px)",
                }
          }
          whileInView={
            reduceMotion
              ? undefined
              : {
                  opacity: 1,
                  transform: "translateY(0px)",
                  filter: "blur(0px)",
                }
          }
          viewport={{ once: true, margin: "-60px" }}
          transition={
            reduceMotion ? undefined : { duration: 0.6, ease: EASE_OUT }
          }
          className="flex flex-col rounded-3xl bg-background p-6 sm:p-8 lg:p-10"
        >
          <span className="w-fit rounded-full bg-muted px-3 py-1.5 font-medium text-muted-foreground text-xs uppercase tracking-widest">
            {eyebrow}
          </span>
          <h2 className="mt-7 max-w-xl text-balance font-medium text-4xl leading-tight tracking-tight">
            {title}
          </h2>
          <p className="mt-5 max-w-lg text-pretty text-muted-foreground text-sm leading-7 sm:text-base">
            {description}
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {items.slice(0, 4).map((item, index) => {
              const Icon = item.icon ?? DEFAULT_ITEMS[index]?.icon ?? Activity;

              return (
                <motion.article
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, transform: "translateY(12px)" }
                  }
                  whileInView={
                    reduceMotion
                      ? undefined
                      : { opacity: 1, transform: "translateY(0px)" }
                  }
                  viewport={{ once: true, margin: "-40px" }}
                  transition={
                    reduceMotion
                      ? undefined
                      : {
                          duration: 0.45,
                          delay: 0.12 + index * 0.06,
                          ease: EASE_OUT,
                        }
                  }
                  className="rounded-2xl border border-border/60 bg-background p-4"
                  key={`${item.title}-${index}`}
                >
                  <span className="grid size-9 place-items-center rounded-full bg-muted text-foreground">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <h3 className="mt-5 font-medium text-xl leading-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-pretty text-muted-foreground text-sm leading-6">
                    {item.description}
                  </p>
                </motion.article>
              );
            })}
          </div>

          <ButtonLink
            className="mt-8 w-fit rounded-full h-9"
            href={ctaHref}
            size="lg"
            variant="primary"
          >
            {ctaLabel}
            <ArrowUpRight aria-hidden className="size-4" />
          </ButtonLink>
        </motion.div>
      </div>
    </section>
  );
}

function ControlStackVisual({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.div
      initial={
        reduceMotion
          ? false
          : { opacity: 0, transform: "translateY(20px)", filter: "blur(8px)" }
      }
      whileInView={
        reduceMotion
          ? undefined
          : { opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" }
      }
      viewport={{ once: true, margin: "-60px" }}
      transition={reduceMotion ? undefined : { duration: 0.65, ease: EASE_OUT }}
      className="relative isolate min-h-[40rem] overflow-hidden rounded-3xl border border-border/60 bg-background"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-muted/70 via-background to-background"
      />
      <div
        aria-hidden
        className="absolute -left-20 top-10 size-64 rounded-full bg-foreground/5 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-24 bottom-12 size-72 rounded-full bg-foreground/5 blur-3xl"
      />

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 18, rotate: -3 }}
        whileInView={
          reduceMotion ? undefined : { opacity: 0.35, y: 0, rotate: -3 }
        }
        viewport={{ once: true, margin: "-50px" }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 0.55, delay: 0.08, ease: EASE_OUT }
        }
        className="absolute inset-x-10 top-14 h-80 rounded-3xl border border-border/60 bg-background/45 backdrop-blur-xl"
      />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 20, rotate: 2 }}
        whileInView={
          reduceMotion ? undefined : { opacity: 0.55, y: 0, rotate: 2 }
        }
        viewport={{ once: true, margin: "-50px" }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 0.55, delay: 0.14, ease: EASE_OUT }
        }
        className="absolute inset-x-8 top-20 h-80 rounded-3xl border border-border/60 bg-background/55 backdrop-blur-xl"
      />

      <div className="absolute inset-x-5 top-24 rounded-3xl border border-border/70 bg-background/85 p-5 backdrop-blur-2xl sm:inset-x-10 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-muted">
              <Activity aria-hidden className="size-4" />
            </span>
            <div>
              <p className="font-medium text-sm">Workflow control</p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Latest production run
              </p>
            </div>
          </div>
          <span className="rounded-full bg-muted px-3 py-1.5 font-mono text-muted-foreground text-xs">
            1.8s
          </span>
        </div>

        <div className="mt-6 grid gap-2.5">
          {WORKFLOW_STEPS.map((step, index) => (
            <motion.div
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, transform: "translateX(-10px)" }
              }
              whileInView={
                reduceMotion
                  ? undefined
                  : { opacity: 1, transform: "translateX(0px)" }
              }
              viewport={{ once: true, margin: "-40px" }}
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: 0.4,
                      delay: 0.25 + index * 0.08,
                      ease: EASE_OUT,
                    }
              }
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background px-3.5 py-3"
              key={step.label}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted">
                <Check aria-hidden className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-sm">{step.label}</p>
                <p className="mt-0.5 truncate text-muted-foreground text-xs">
                  {step.detail}
                </p>
              </div>
              <span className="ml-auto size-2 rounded-full bg-foreground" />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-5 bottom-5 grid grid-cols-2 gap-3 sm:inset-x-10 sm:bottom-8">
        <div className="rounded-2xl border border-border/60 bg-background/75 p-4 backdrop-blur-xl">
          <p className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
            Run status
          </p>
          <p className="mt-3 font-medium text-3xl">Passed</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/75 p-4 backdrop-blur-xl">
          <p className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
            Human review
          </p>
          <p className="mt-3 font-medium text-3xl tabular-nums">Ready</p>
        </div>
      </div>
    </motion.div>
  );
}
