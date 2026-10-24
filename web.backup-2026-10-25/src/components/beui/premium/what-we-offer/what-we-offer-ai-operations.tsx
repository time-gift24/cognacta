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

export type WhatWeOfferItem = {
  title: string;
  description: string;
  icon?: LucideIcon;
};

export type WhatWeOfferAiOperationsProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  backgroundImage?: string;
  visualLabel?: string;
  metric?: string;
  metricLabel?: string;
  items?: WhatWeOfferItem[];
  className?: string;
};

const DEFAULT_ITEMS: WhatWeOfferItem[] = [
  {
    title: "Model flexibility",
    description:
      "Route each task to the right model without rebuilding the workflow around one provider.",
    icon: BrainCircuit,
  },
  {
    title: "Private knowledge",
    description:
      "Connect approved company context with access that stays scoped to the right people and agents.",
    icon: Database,
  },
  {
    title: "Tool orchestration",
    description:
      "Link APIs, databases, and internal services through explicit, reviewable actions.",
    icon: Route,
  },
  {
    title: "Controls and traces",
    description:
      "See every step, approval, cost, and output instead of operating inside a black box.",
    icon: ShieldCheck,
  },
];

export function WhatWeOfferAiOperations({
  eyebrow = "What we offer",
  title = "Launch AI workflows without giving up control.",
  description = "Connect models, company knowledge, and tools in one clear system—then monitor every run as your team scales.",
  ctaLabel = "Explore AI workflows",
  ctaHref = "#",
  backgroundImage = "/showcase/ai-workbench-bg.webp",
  visualLabel = "Every run stays traceable from input to output",
  metric = "24/7",
  metricLabel = "workflow visibility",
  items = DEFAULT_ITEMS,
  className,
}: WhatWeOfferAiOperationsProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-20 text-foreground sm:px-6 sm:py-24 lg:px-8 lg:py-28",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-7xl rounded-3xl border border-border/70 bg-background p-3 sm:p-4 lg:p-5">
        <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
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
            className="flex flex-col rounded-3xl bg-background p-6 sm:p-8 lg:min-h-[32rem] lg:p-10"
          >
            <span className="w-fit rounded-full bg-muted px-3 py-1.5 font-medium text-muted-foreground text-xs uppercase tracking-widest">
              {eyebrow}
            </span>

            <h2 className="mt-8 max-w-xl text-balance font-medium text-4xl leading-tight tracking-tight">
              {title}
            </h2>

            <div className="mt-10 max-w-lg lg:mt-auto lg:pt-16">
              <p className="text-pretty text-muted-foreground text-sm leading-7 sm:text-base">
                {description}
              </p>
              <ButtonLink
                className="mt-7 rounded-full h-9"
                href={ctaHref}
                size="lg"
                variant="primary"
              >
                {ctaLabel}
                <ArrowUpRight aria-hidden className="size-4" />
              </ButtonLink>
            </div>
          </motion.div>

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
              reduceMotion
                ? undefined
                : { duration: 0.65, delay: 0.08, ease: EASE_OUT }
            }
            className="relative isolate min-h-[28rem] overflow-hidden rounded-3xl border border-border/60 sm:min-h-[32rem]"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url("${backgroundImage}")` }}
            />
            <div className="absolute inset-0 bg-foreground/20 dark:bg-background/35" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/55 via-foreground/10 to-transparent dark:from-background/70 dark:via-background/15" />

            <div className="absolute inset-x-5 top-5 rounded-2xl bg-background/45 p-4 backdrop-blur-xl backdrop-saturate-150 sm:inset-x-6 sm:top-6 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-muted text-foreground">
                    <Activity aria-hidden className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium text-sm">Live operations</p>
                    <p className="mt-0.5 text-muted-foreground text-xs">
                      Agent workspace
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1.5 text-muted-foreground text-xs backdrop-blur-md">
                  <span className="size-2 rounded-full bg-foreground" />
                  Monitoring
                </span>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {["Context connected", "Tools approved", "Trace complete"].map(
                  (label) => (
                    <div
                      className="flex items-center gap-2 rounded-xl bg-background/15 px-3 py-3 text-xs backdrop-blur-md"
                      key={label}
                    >
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted">
                        <Check aria-hidden className="size-3" />
                      </span>
                      <span className="truncate">{label}</span>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="absolute inset-x-4 bottom-4 sm:inset-x-8 sm:bottom-8">
              <p className="max-w-sm font-medium text-background text-sm leading-6 dark:text-foreground">
                {visualLabel}
              </p>
              <div className="mt-4 flex items-end justify-between gap-3 sm:mt-5 sm:gap-5">
                <p className="font-medium text-5xl text-background leading-none tracking-tight sm:text-8xl dark:text-foreground">
                  {metric}
                </p>
                <span className="mb-0.5 whitespace-nowrap rounded-full bg-background/30 px-3 py-1.5 text-background text-xs backdrop-blur-xl backdrop-saturate-150 sm:mb-1 sm:px-4 sm:py-2 dark:bg-background/50 dark:text-foreground">
                  {metricLabel}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.slice(0, 4).map((item, index) => (
            <OfferCard
              index={index}
              item={item}
              key={`${item.title}-${index}`}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function OfferCard({
  item,
  index,
  reduceMotion,
}: {
  item: WhatWeOfferItem;
  index: number;
  reduceMotion: boolean;
}) {
  const Icon = item.icon ?? DEFAULT_ITEMS[index]?.icon ?? BrainCircuit;

  return (
    <motion.article
      initial={
        reduceMotion
          ? false
          : { opacity: 0, transform: "translateY(16px)", filter: "blur(6px)" }
      }
      whileInView={
        reduceMotion
          ? undefined
          : { opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" }
      }
      viewport={{ once: true, margin: "-50px" }}
      transition={
        reduceMotion
          ? undefined
          : { duration: 0.5, delay: 0.08 + index * 0.07, ease: EASE_OUT }
      }
      className="flex flex-col rounded-2xl border border-border bg-background p-5 sm:p-6"
    >
      <span className="grid size-10 place-items-center rounded-full bg-muted text-foreground">
        <Icon aria-hidden className="size-4" />
      </span>
      <h3 className="mt-6 font-medium text-xl leading-tight">{item.title}</h3>
      <p className="mt-2 text-pretty text-muted-foreground text-sm leading-6">
        {item.description}
      </p>
    </motion.article>
  );
}
