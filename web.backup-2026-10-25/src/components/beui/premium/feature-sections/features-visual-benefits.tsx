"use client";

import { ArrowRight, Fingerprint, Layers, Workflow } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/beui/motion/button";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type VisualBenefit = {
  title: string;
  description: string;
  icon: ReactNode;
};
export type FeaturesVisualBenefitsProps = {
  title?: string;
  benefits?: VisualBenefit[];
  visual?: ReactNode;
  cta?: { label: string; href: string; external?: boolean };
  className?: string;
};
const defaultBenefits: VisualBenefit[] = [
  {
    title: "Your work, on your terms",
    description:
      "Keep ownership of your data and decisions. Build a workspace that fits the way your team thinks.",
    icon: <Fingerprint className="size-5" strokeWidth={1.5} />,
  },
  {
    title: "Everything in the right place",
    description:
      "Bring your notes, tools, and projects together, so a good idea never gets lost between tabs.",
    icon: <Layers className="size-5" strokeWidth={1.5} />,
  },
  {
    title: "Less setup. More progress.",
    description:
      "Turn everyday routines into repeatable workflows and give your team time for the work that matters.",
    icon: <Workflow className="size-5" strokeWidth={1.5} />,
  },
];

export function FeaturesVisualBenefits({
  title = "A clearer way to move forward.",
  benefits = defaultBenefits,
  visual,
  cta = { label: "Find your flow", href: "/signup" },
  className,
}: FeaturesVisualBenefitsProps) {
  const reduce = useReducedMotion();
  return (
    <section
      className={cn(
        "w-full bg-background px-6 py-12 text-foreground sm:px-10 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="mx-auto mb-10 max-w-2xl text-balance text-center text-4xl font-medium tracking-tight sm:mb-14">
          {title}
        </h2>
        <div className="grid gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
          <div className="relative min-h-80 overflow-hidden rounded-3xl md:min-h-96">
            {visual ?? <VisualBenefitsArtwork />}
          </div>
          <div className="flex flex-col py-1">
            <div className="space-y-7 sm:space-y-9">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    duration: 0.45,
                    delay: index * 0.08,
                    ease: EASE_OUT,
                  }}
                  className="flex gap-4"
                >
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground"
                  >
                    {benefit.icon}
                  </span>
                  <div className="pt-1">
                    <h3 className="text-xl font-medium tracking-tight">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
            <ButtonLink
              href={cta.href}
              {...(cta.external
                ? { target: "_blank", rel: "noreferrer noopener" }
                : {})}
              className="mt-8 h-9 w-full"
            >
              <span>{cta.label}</span>
              <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function VisualBenefitsArtwork() {
  const reduce = useReducedMotion();
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 75% 15%, #fff4da, transparent 60%), linear-gradient(140deg, #e2eef1, #f2e9dd 60%, #eacfbf)",
      }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(#fff 0.75px, transparent 0.75px)",
          backgroundSize: "12px 12px",
        }}
      />
      <div
        className="absolute -left-1/4 top-1/2 h-1/2 w-full -rotate-45 rounded-full"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(255,255,255,.65), transparent)",
          filter: "blur(22px)",
        }}
      />
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ perspective: "1000px" }}
      >
        <div
          className="relative h-64 w-64 sm:h-72 sm:w-72"
          style={{
            transform: "rotateX(48deg) rotateZ(-32deg)",
            transformStyle: "preserve-3d",
          }}
        >
          {[0, 1, 2, 3].map((layer) => (
            <motion.div
              key={layer}
              className="absolute inset-0 overflow-hidden rounded-3xl"
              style={{
                background:
                  layer === 3
                    ? "linear-gradient(135deg, rgba(255,255,255,.86), rgba(255,244,225,.48) 45%, rgba(180,220,224,.62))"
                    : `linear-gradient(135deg, rgba(255,255,255,${0.6 - layer * 0.08}), rgba(155,199,204,.38), rgba(247,203,163,.5))`,
                border: "1px solid rgba(255,255,255,.85)",
                transformStyle: "preserve-3d",
              }}
              initial={false}
              animate={{
                z: layer * 38 - 65,
                y: reduce
                  ? -layer * 8
                  : [-layer * 8, -layer * 8 - 8, -layer * 8],
              }}
              transition={{
                duration: 7,
                delay: layer * 0.25,
                repeat: reduce ? 0 : Infinity,
                ease: EASE_IN_OUT,
              }}
            >
              <div
                className="absolute inset-5 rounded-2xl"
                style={{ border: "1px solid rgba(255,255,255,.55)" }}
              />
              {layer === 3 && (
                <>
                  <div
                    className="absolute inset-12 rounded-full"
                    style={{
                      background:
                        "conic-gradient(from 45deg, rgba(150,191,199,.1), rgba(255,255,255,.95), rgba(224,180,147,.45), rgba(162,208,211,.45), rgba(150,191,199,.1))",
                      padding: "18px",
                    }}
                  >
                    <div
                      className="size-full rounded-full"
                      style={{
                        background: "linear-gradient(135deg, #e5eff0, #f5e9d9)",
                      }}
                    />
                  </div>
                  <div
                    className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 25%, #ffffff, #d1e5e4 60%, #aecbc9)",
                    }}
                  />
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-8 left-8 flex gap-1.5">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="size-1 rounded-full bg-foreground/20" />
        ))}
      </div>
      <div className="absolute inset-0 dark:bg-background/20" />
    </div>
  );
}
