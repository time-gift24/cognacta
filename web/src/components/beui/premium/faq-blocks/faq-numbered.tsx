"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { EASE_OUT_CSS, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { FAQ_ITEMS, type FaqItem } from "./faq-data";
import {
  FAQ_LOAD_CONTAINER,
  FAQ_LOAD_ITEM,
  faqListContainer,
} from "./faq-motion";

export type FaqNumberedProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  items?: readonly FaqItem[];
  defaultOpenId?: string | null;
  className?: string;
};

export function FaqNumbered({
  eyebrow = "Good to know",
  title = "A clear answer for every question.",
  description = "Everything you need to understand the product, your plan, and what happens next.",
  items = FAQ_ITEMS.slice(0, 6),
  defaultOpenId = items[0]?.id ?? null,
  className,
}: FaqNumberedProps) {
  const reduce = useReducedMotion();
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(defaultOpenId);

  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-16 font-sans text-foreground sm:px-8 sm:py-24",
        className,
      )}
    >
      <motion.div
        initial={reduce ? false : "hidden"}
        animate={reduce ? undefined : "show"}
        variants={FAQ_LOAD_CONTAINER}
        className="mx-auto w-full max-w-6xl"
      >
        <motion.header
          variants={FAQ_LOAD_ITEM}
          className="mx-auto max-w-2xl pb-10 text-center sm:pb-12"
        >
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.16em]">
            {eyebrow}
          </p>
          <h2 className="mt-5 text-balance font-medium text-4xl leading-none tracking-tight">
            {title}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground text-sm leading-6 sm:text-base">
            {description}
          </p>
        </motion.header>

        <motion.div
          initial={reduce ? false : "hidden"}
          animate={reduce ? undefined : "show"}
          variants={faqListContainer(0.12)}
          className="mx-auto max-w-4xl overflow-hidden"
        >
          {items.map((item, index) => {
            const open = item.id === openId;
            const triggerId = `${baseId}-${item.id}-trigger`;
            const contentId = `${baseId}-${item.id}-content`;

            return (
              <motion.article
                key={item.id}
                layout="position"
                variants={FAQ_LOAD_ITEM}
                transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                className="border-border border-b last:border-b-0"
              >
                <Button
                  variant="plain"
                  id={triggerId}
                  type="button"
                  aria-expanded={open}
                  aria-controls={contentId}
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="group grid min-h-24 w-full grid-cols-[2rem_1fr] items-start gap-3 px-4 py-7 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6 sm:py-8 lg:px-8"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "shrink-0 pt-1 font-mono font-medium text-sm tabular-nums transition-colors duration-200",
                      open
                        ? "text-foreground"
                        : "text-muted-foreground/55 group-hover:text-muted-foreground",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "max-w-3xl text-balance font-medium text-xl leading-7 tracking-tight transition-colors duration-200",
                      open
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {item.question}
                  </span>
                </Button>

                <section
                  id={contentId}
                  aria-labelledby={triggerId}
                  aria-hidden={!open}
                  style={{ transitionTimingFunction: EASE_OUT_CSS }}
                  className={cn(
                    "grid overflow-hidden transition-[grid-template-rows] duration-300 motion-reduce:transition-none",
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="grid min-h-0 grid-cols-[2rem_1fr] gap-3 overflow-hidden px-4 sm:px-6 lg:px-8">
                    <p
                      style={{ transitionTimingFunction: EASE_OUT_CSS }}
                      className={cn(
                        "col-start-2 max-w-3xl pb-8 text-left text-pretty text-muted-foreground text-sm leading-6 transition-[opacity,transform] duration-200 motion-reduce:transition-none sm:pb-9",
                        open
                          ? "translate-y-0 opacity-100"
                          : "-translate-y-1 opacity-0",
                      )}
                    >
                      {item.answer}
                    </p>
                  </div>
                </section>
              </motion.article>
            );
          })}
        </motion.div>
      </motion.div>
    </section>
  );
}
