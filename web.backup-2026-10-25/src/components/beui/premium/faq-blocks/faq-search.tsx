"use client";

import { Search, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import {
  BouncyAccordion,
  type BouncyAccordionItem,
} from "@/components/beui/motion/bouncy-accordion";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  FAQ_CATEGORIES,
  FAQ_ITEMS,
  type FaqCategory,
  type FaqItem,
} from "./faq-data";
import { FAQ_LOAD_CONTAINER, FAQ_LOAD_ITEM } from "./faq-motion";

type Filter = "All" | FaqCategory;
const FILTERS: readonly Filter[] = ["All", ...FAQ_CATEGORIES];

export type FaqSearchProps = {
  title?: string;
  description?: string;
  items?: readonly FaqItem[];
  className?: string;
};

export function FaqSearch({
  title = "How can we help?",
  description = "Search the most common questions or browse by topic.",
  items = FAQ_ITEMS,
  className,
}: FaqSearchProps) {
  const reduce = useReducedMotion();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = filter === "All" || item.category === filter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        `${item.question} ${item.answer}`
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [filter, items, query]);

  const accordionItems: BouncyAccordionItem[] = results.map((item) => ({
    id: item.id,
    title: (
      <span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <span>{item.question}</span>
        <span className="shrink-0 font-normal text-muted-foreground text-xs uppercase tracking-[0.1em]">
          {item.category}
        </span>
      </span>
    ),
    description: item.answer,
  }));

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
        className="mx-auto w-full max-w-4xl"
      >
        <motion.div variants={FAQ_LOAD_ITEM} className="text-center">
          <p className="font-medium text-muted-foreground text-sm">
            Help center
          </p>
          <h2 className="mt-3 text-balance font-medium text-4xl leading-none tracking-tight">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground text-sm leading-6">
            {description}
          </p>
        </motion.div>

        <motion.div variants={FAQ_LOAD_ITEM} className="mt-9">
          <Input
            rightIcon={
              query ? (
                <Button
                  variant="plain"
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-[color,background-color,box-shadow] duration-200 ease-out hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30"
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              ) : null
            }
            leftIcon={<Search aria-hidden className="size-4" />}
            type="search"
            value={query}
            onChange={(event) => setQuery(event)}
            placeholder="Search questions"
            aria-label="Search frequently asked questions"
            className="w-full"
            classNames={{
              input:
                "pr-14 pl-13 text-foreground placeholder:text-muted-foreground",
            }}
          />

          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(value as Filter)}
            variant="pill"
            className="mt-4 overflow-x-auto text-center"
          >
            <TabsList
              className="min-w-max"
              aria-label="Filter questions by topic"
            >
              {FILTERS.map((item) => (
                <TabsTrigger key={item} value={item}>
                  {item}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </motion.div>

        <motion.div
          layout
          variants={FAQ_LOAD_ITEM}
          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
          className="mt-8"
        >
          <AnimatePresence mode="wait" initial={false}>
            {accordionItems.length > 0 ? (
              <motion.div
                key={`${filter}-${query.trim().toLowerCase()}`}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={
                  reduce ? { duration: 0 } : { duration: 0.22, ease: EASE_OUT }
                }
              >
                <BouncyAccordion
                  items={accordionItems}
                  defaultValue={accordionItems[0]?.id}
                  classNames={{
                    trigger: "hover:bg-muted/60",
                    description: "text-sm leading-6",
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-border bg-background px-6 py-12 text-center"
              >
                <p className="font-medium text-xl">No matching questions</p>
                <p className="mt-2 text-muted-foreground text-sm">
                  Try a shorter search or choose another topic.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </section>
  );
}
