"use client";

import {
  Braces,
  Brain,
  GitBranch,
  Library,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { EASE_OUT } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";
import { SignalCardShader } from "./signal-card-shader";

export type FeaturesSignalGridProps = {
  eyebrow?: string;
  title?: readonly [string, string];
  subtext?: string;
  className?: string;
};

const FEATURES = [
  {
    title: ["Connected", "orchestration"],
    body: "Keep every step, handoff, and decision connected from request to outcome.",
    icon: GitBranch,
  },
  {
    title: ["Context-aware", "execution"],
    body: "Bring the right knowledge into each task before the work begins.",
    icon: Library,
  },
  {
    title: ["Built-in", "guardrails"],
    body: "Apply clear boundaries exactly where sensitive actions need them.",
    icon: ShieldCheck,
  },
  {
    title: ["Persistent", "memory"],
    body: "Carry useful context forward without making users repeat themselves.",
    icon: Brain,
  },
  {
    title: ["Structured", "outputs"],
    body: "Turn every result into predictable data that other systems can use.",
    icon: Braces,
  },
  {
    title: ["Human", "approval"],
    body: "Keep people in control when a decision needs review or confirmation.",
    icon: UserCheck,
  },
] as const;

export function FeaturesSignalGrid({
  eyebrow = "One connected system",
  title = ["Scattered context.", "One clear next step."],
  subtext = "Bring knowledge, decisions, and execution into the same operating layer. Every signal stays visible from input to outcome.",
  className,
}: FeaturesSignalGridProps) {
  const reduce = useReducedMotion() ?? false;
  const canHover = useHoverCapable();
  const [activeCard, setActiveCard] = useState<number | null>(null);

  return (
    <section
      className={cn("w-full bg-background px-4 py-20 sm:px-8", className)}
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
            {eyebrow}
          </p>
          <h2 className="mt-4 font-sans font-medium text-4xl text-foreground leading-none tracking-tight">
            <span className="block">{title[0]}</span>{" "}
            <span className="block">{title[1]}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground text-sm leading-7">
            {subtext}
          </p>
        </div>

        <div className="relative mt-12 grid border border-border sm:grid-cols-2 lg:grid-cols-3">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-full -top-px z-10 h-0 w-3 border-border border-t"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-full -left-px z-10 h-3 w-0 border-border border-l"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-full -top-px z-10 h-0 w-3 border-border border-t"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-px bottom-full z-10 h-3 w-0 border-border border-l"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-full -bottom-px z-10 h-0 w-3 border-border border-t"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-full -left-px z-10 h-3 w-0 border-border border-l"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-full -bottom-px z-10 h-0 w-3 border-border border-t"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-full -right-px z-10 h-3 w-0 border-border border-l"
          />

          {FEATURES.map(({ title: featureTitle, body, icon: Icon }, index) => (
            <motion.article
              key={featureTitle.join(" ")}
              initial={
                reduce ? false : { opacity: 0, transform: "translateY(16px)" }
              }
              whileInView={
                reduce
                  ? undefined
                  : { opacity: 1, transform: "translateY(0px)" }
              }
              viewport={{ once: true, margin: "-48px" }}
              transition={
                reduce
                  ? undefined
                  : { duration: 0.45, ease: EASE_OUT, delay: index * 0.05 }
              }
              onHoverStart={() => {
                if (canHover) setActiveCard(index);
              }}
              onHoverEnd={() => {
                if (canHover) setActiveCard(null);
              }}
              className={cn(
                "group relative flex min-h-56 flex-col overflow-hidden border-border px-7 py-10",
                index < FEATURES.length - 1 && "border-b",
                index < 4 ? "sm:border-b" : "sm:border-b-0",
                index % 2 === 0 ? "sm:border-r" : "sm:border-r-0",
                index < 3 ? "lg:border-b" : "lg:border-b-0",
                index % 3 !== 2 ? "lg:border-r" : "lg:border-r-0",
              )}
            >
              {canHover && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                >
                  <SignalCardShader
                    active={activeCard === index}
                    palette={index}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background/25" />
                </div>
              )}

              <div className="relative z-10 flex h-full flex-col">
                <span className="grid size-11 place-items-center rounded-full bg-muted text-foreground">
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-medium text-foreground text-xl leading-snug tracking-tight">
                  <span className="block">{featureTitle[0]}</span>{" "}
                  <span className="block">{featureTitle[1]}</span>
                </h3>
                <p className="mt-2 max-w-xs text-pretty text-muted-foreground text-sm leading-6">
                  {body}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
