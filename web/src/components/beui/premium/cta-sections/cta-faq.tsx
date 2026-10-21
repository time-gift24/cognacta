"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  BouncyAccordion,
  type BouncyAccordionItem,
} from "@/components/beui/motion/bouncy-accordion";
import { ButtonLink } from "@/components/beui/motion/button";
import { TextReveal } from "@/components/beui/motion/text-reveal";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type CtaFaqLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type CtaFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type CtaFaqProps = {
  headline?: string[];
  subtext?: string;
  cta?: CtaFaqLink;
  items?: CtaFaqItem[];
  /** Override the theme-based gradient surface. */
  gradientClassName?: string;
  className?: string;
};

const DEFAULT_ITEMS: CtaFaqItem[] = [
  {
    id: "license",
    question: "What do I get with a license?",
    answer:
      "Full source access to every premium beUI component and block, plus new drops every month — yours to copy, paste, and customize.",
  },
  {
    id: "client-projects",
    question: "Can I use it in client projects?",
    answer:
      "Yes. One license covers unlimited personal and client projects — no per-seat or per-site fees.",
  },
  {
    id: "stack",
    question: "Does it work with my stack?",
    answer:
      "beUI is built for React, Next.js, and Tailwind CSS. Drop components straight into your app with no extra setup.",
  },
  {
    id: "install",
    question: "How do I install components?",
    answer:
      "Add them via the shadcn CLI from your private beUI Pro registry, or copy the source directly from each component page.",
  },
  {
    id: "free-tier",
    question: "Is there a free version?",
    answer:
      "The public beUI library is free and open. Premium unlocks the motion-heavy components, blocks, and templates.",
  },
  {
    id: "updates",
    question: "Do you ship new components?",
    answer:
      "New premium components and blocks land every month, included in your license at no extra cost.",
  },
];

// Keep the decorative glow tied to the host app's primary color.
const DEFAULT_GRADIENT =
  "bg-[radial-gradient(ellipse_at_bottom_right,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_70%)]";

export function CtaFaq({
  headline = ["Ready to build", "with beUI?"],
  subtext = "Premium motion components and blocks, copy-paste ready.",
  cta = { label: "Get Started Today", href: "#" },
  items = DEFAULT_ITEMS,
  gradientClassName,
  className,
}: CtaFaqProps) {
  const reduce = useReducedMotion();

  const accordionItems: BouncyAccordionItem[] = items.map((item) => ({
    id: item.id,
    title: item.question,
    description: item.answer,
  }));

  return (
    <section className={cn("w-full px-4 py-16 sm:px-8", className)}>
      <div className="mx-auto grid w-full max-w-6xl items-start gap-8 lg:grid-cols-2">
        {/* Gradient CTA card. */}
        <div
          className={cn(
            "relative flex min-h-[22rem] items-start overflow-hidden rounded-3xl border border-border bg-background p-8 pb-28 sm:min-h-[28rem] sm:p-12 sm:pb-32",
            gradientClassName ?? DEFAULT_GRADIENT,
          )}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 560 450"
            preserveAspectRatio="xMaxYMax slice"
            className="pointer-events-none absolute inset-0 size-full text-primary"
          >
            <ellipse
              cx="565"
              cy="485"
              rx="430"
              ry="310"
              fill="currentColor"
              fillOpacity="0.05"
            />
            <ellipse
              cx="565"
              cy="485"
              rx="360"
              ry="260"
              fill="currentColor"
              fillOpacity="0.09"
              stroke="currentColor"
              strokeOpacity="0.12"
            />
            <ellipse
              cx="565"
              cy="485"
              rx="290"
              ry="210"
              fill="currentColor"
              fillOpacity="0.15"
              stroke="currentColor"
              strokeOpacity="0.2"
            />
            <ellipse
              cx="565"
              cy="485"
              rx="220"
              ry="160"
              fill="currentColor"
              fillOpacity="0.25"
              stroke="currentColor"
              strokeOpacity="0.3"
            />
            <ellipse
              cx="565"
              cy="485"
              rx="150"
              ry="110"
              fill="currentColor"
              fillOpacity="0.5"
            />
          </svg>

          <div className="relative">
            <TextReveal
              as="h2"
              text={headline}
              split="word"
              blur={10}
              className="max-w-md font-sans text-foreground leading-[1.05] text-4xl font-medium"
            />

            <motion.p
              initial={
                reduce ? false : { opacity: 0, y: 12, filter: "blur(6px)" }
              }
              whileInView={
                reduce ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }
              }
              viewport={{ once: true, margin: "-60px" }}
              transition={
                reduce
                  ? undefined
                  : { duration: 0.6, ease: EASE_OUT, delay: 0.15 }
              }
              className="mt-4 max-w-sm text-pretty text-muted-foreground text-sm leading-7 sm:text-base"
            >
              {subtext}
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={
                reduce
                  ? undefined
                  : { duration: 0.6, ease: EASE_OUT, delay: 0.24 }
              }
              className="mt-8"
            >
              <ButtonLink
                href={cta.href}
                size="lg"
                className="bg-primary px-7 text-primary-foreground hover:bg-primary/90 rounded-full h-9"
                {...(cta.external
                  ? { target: "_blank", rel: "noreferrer noopener" }
                  : {})}
              >
                {cta.label}
              </ButtonLink>
            </motion.div>
          </div>
        </div>

        {/* FAQ accordion. */}
        <BouncyAccordion items={accordionItems} defaultValue={items[0]?.id} />
      </div>
    </section>
  );
}
