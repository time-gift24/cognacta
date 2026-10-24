"use client";

import { ArrowUpRight, MessageCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import { FAQ_ITEMS, type FaqItem } from "./faq-data";
import { FaqDisclosureList } from "./faq-disclosure-list";
import { FAQ_LOAD_CONTAINER, FAQ_LOAD_ITEM } from "./faq-motion";

export type FaqSplitProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  items?: readonly FaqItem[];
  className?: string;
};

export function FaqSplit({
  eyebrow = "Questions, answered",
  title = "The details, without the fine print.",
  description = "Everything you need to know before creating your first workspace.",
  items = FAQ_ITEMS.slice(0, 7),
  className,
}: FaqSplitProps) {
  const reduce = useReducedMotion();

  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-16 text-foreground sm:px-8 sm:py-24",
        className,
      )}
    >
      <motion.div
        initial={reduce ? false : "hidden"}
        animate={reduce ? undefined : "show"}
        variants={FAQ_LOAD_CONTAINER}
        className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16"
      >
        <motion.div
          variants={FAQ_LOAD_ITEM}
          className="lg:sticky lg:top-8 lg:self-start"
        >
          <p className="font-medium text-muted-foreground text-sm">{eyebrow}</p>
          <h2 className="mt-4 max-w-md text-balance font-medium text-4xl leading-none tracking-tight">
            {title}
          </h2>
          <p className="mt-5 max-w-md text-pretty text-muted-foreground text-sm leading-6">
            {description}
          </p>

          <div className="mt-10 max-w-md rounded-2xl border border-border bg-background p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground">
                <MessageCircle className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                  Human support
                </p>
                <p className="mt-1 font-medium text-xl">Still deciding?</p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-pretty text-muted-foreground text-sm leading-6">
              Tell us what you are comparing and we will help you choose the
              right setup.
            </p>
            <ButtonLink
              href="#faq-contact"
              variant="outline"
              size="sm"
              className="mt-5 bg-background px-4 rounded-full h-9"
            >
              Ask a question
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </motion.div>

        <motion.div variants={FAQ_LOAD_ITEM}>
          <FaqDisclosureList
            items={items}
            defaultValue={items[0]?.id}
            numbered
            loadDelay={0.18}
          />
        </motion.div>
      </motion.div>
      <span id="faq-contact" className="sr-only">
        Contact support
      </span>
    </section>
  );
}
