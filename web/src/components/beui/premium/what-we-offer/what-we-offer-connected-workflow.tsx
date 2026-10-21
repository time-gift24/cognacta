"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  BrainCircuit,
  Database,
  Eye,
  Network,
  Route,
  ShieldCheck,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type WhatWeOfferConnectedWorkflowItem = {
  title: string;
  description: string;
  icon?: LucideIcon;
};

export type WhatWeOfferConnectedWorkflowProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  hubLabel?: string;
  ctaLabel?: string;
  ctaHref?: string;
  items?: WhatWeOfferConnectedWorkflowItem[];
  className?: string;
};

const DEFAULT_ITEMS: WhatWeOfferConnectedWorkflowItem[] = [
  {
    title: "Models that fit the task",
    description:
      "Route requests across providers while keeping one stable workflow.",
    icon: BrainCircuit,
  },
  {
    title: "Knowledge with permissions",
    description:
      "Retrieve useful context without losing the access rules around it.",
    icon: Database,
  },
  {
    title: "Tools with clear boundaries",
    description:
      "Let agents act through explicit operations your team can approve.",
    icon: Route,
  },
  {
    title: "Oversight at every step",
    description:
      "Review traces, quality, costs, and outcomes from one shared view.",
    icon: ShieldCheck,
  },
];

const CARD_POSITION = [
  "lg:col-start-1 lg:row-start-1",
  "lg:col-start-3 lg:row-start-1",
  "lg:col-start-1 lg:row-start-2",
  "lg:col-start-3 lg:row-start-2",
] as const;

export function WhatWeOfferConnectedWorkflow({
  eyebrow = "Connected by design",
  title = "Four capabilities. One workflow your team can follow.",
  description = "Each part works independently, but the real value appears when intelligence, context, action, and oversight move together.",
  hubLabel = "Your AI workflow",
  ctaLabel = "Build your workflow",
  ctaHref = "#",
  items = DEFAULT_ITEMS,
  className,
}: WhatWeOfferConnectedWorkflowProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-20 text-foreground sm:px-6 sm:py-24 lg:px-8 lg:py-28",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-7xl">
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
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex rounded-full bg-muted px-3 py-1.5 font-medium text-muted-foreground text-xs uppercase tracking-widest">
            {eyebrow}
          </span>
          <h2 className="mt-7 text-balance font-medium text-4xl leading-tight tracking-tight">
            {title}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-muted-foreground text-sm leading-7 sm:text-base">
            {description}
          </p>
        </motion.div>

        <div className="relative mt-12 overflow-hidden rounded-3xl bg-background p-3 sm:p-5 lg:p-8">
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-muted/40 via-background to-background"
          />
          <ConnectionLines reduceMotion={reduceMotion} />

          <div className="relative grid gap-4 lg:grid-cols-[1fr_14rem_1fr] lg:grid-rows-2 lg:items-stretch">
            <WorkflowHub label={hubLabel} reduceMotion={reduceMotion} />

            {items.slice(0, 4).map((item, index) => (
              <WorkflowOfferCard
                className={CARD_POSITION[index]}
                index={index}
                item={item}
                key={`${item.title}-${index}`}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <ButtonLink href={ctaHref} size="lg" variant="primary">
            {ctaLabel}
            <ArrowUpRight aria-hidden className="size-4" />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function WorkflowHub({
  label,
  reduceMotion,
}: {
  label: string;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      initial={
        reduceMotion ? false : { opacity: 0, scale: 0.9, filter: "blur(8px)" }
      }
      whileInView={
        reduceMotion ? undefined : { opacity: 1, scale: 1, filter: "blur(0px)" }
      }
      viewport={{ once: true, margin: "-60px" }}
      transition={
        reduceMotion
          ? undefined
          : { duration: 0.55, delay: 0.12, ease: EASE_OUT }
      }
      className="relative order-first mx-auto grid min-h-64 w-full max-w-sm place-items-center overflow-hidden rounded-3xl border border-border bg-background lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:min-h-full"
    >
      <div
        aria-hidden
        className="absolute size-56 rounded-full border border-border"
      />
      <div
        aria-hidden
        className="absolute size-48 rounded-full border border-border"
      />
      <div aria-hidden className="absolute size-40 rounded-full bg-muted" />
      <div className="relative z-10 flex max-w-32 flex-col items-center text-center">
        <span className="grid size-11 place-items-center rounded-full bg-background text-foreground">
          <Network aria-hidden className="size-5" />
        </span>
        <p className="mt-3 text-balance font-medium text-sm leading-5">
          {label}
        </p>
        <span className="mt-2 flex items-center gap-1.5 text-muted-foreground text-xs">
          <span className="size-1.5 rounded-full bg-foreground" />
          Connected
        </span>
      </div>
    </motion.div>
  );
}

function WorkflowOfferCard({
  item,
  index,
  reduceMotion,
  className,
}: {
  item: WhatWeOfferConnectedWorkflowItem;
  index: number;
  reduceMotion: boolean;
  className?: string;
}) {
  const Icon = item.icon ?? DEFAULT_ITEMS[index]?.icon ?? Eye;

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
          : { duration: 0.5, delay: 0.18 + index * 0.07, ease: EASE_OUT }
      }
      className={cn(
        "flex min-h-52 flex-col rounded-3xl border border-border bg-background p-5 sm:p-6",
        className,
      )}
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

function ConnectionLines({ reduceMotion }: { reduceMotion: boolean }) {
  const paths = [
    "M 180 120 C 330 120, 350 190, 500 250",
    "M 820 120 C 670 120, 650 190, 500 250",
    "M 180 380 C 330 380, 350 310, 500 250",
    "M 820 380 C 670 380, 650 310, 500 250",
  ];

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden h-full w-full text-border lg:block"
      preserveAspectRatio="none"
      viewBox="0 0 1000 500"
    >
      {paths.map((path, index) => (
        <motion.path
          animate={{ pathLength: 1, opacity: 1 }}
          d={path}
          fill="none"
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
          key={path}
          stroke="currentColor"
          strokeWidth="1"
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.8, delay: 0.18 + index * 0.08, ease: EASE_OUT }
          }
        />
      ))}
    </svg>
  );
}
