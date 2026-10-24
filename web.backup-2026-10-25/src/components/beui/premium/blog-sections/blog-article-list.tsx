"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { type BlogStory, defaultStories } from "./article-data";

export type BlogArticleListProps = {
  title?: string;
  description?: string;
  articles?: BlogStory[];
  className?: string;
};
export function BlogArticleList({
  title = "The latest, in a little more detail.",
  description = "Ideas, updates, and stories from our corner of the internet.",
  articles = defaultStories,
  className,
}: BlogArticleListProps) {
  const [category, setCategory] = useState("All");
  const reduce = useReducedMotion();
  const id = useId();
  const categories = [
    "All",
    ...new Set(articles.map((article) => article.category)),
  ];
  const active = categories.includes(category) ? category : "All";
  const visible =
    active === "All"
      ? articles
      : articles.filter((article) => article.category === active);
  return (
    <section
      className={cn(
        "w-full bg-background px-6 py-12 text-foreground sm:px-10 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 max-w-2xl">
          <h2 className="text-balance text-4xl font-medium tracking-tight">
            {title}
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </header>
        <Tabs value={active} onValueChange={setCategory} variant="pill">
          <TabsList aria-label="Article categories" className="mb-7 flex-wrap">
            {categories.map((item, index) => (
              <TabsTrigger
                key={item}
                value={item}
                id={`${id}-tab-${index}`}
                aria-controls={`${id}-panel`}
              >
                {item}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div
          id={`${id}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${categories.indexOf(active)}`}
          className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="sr-only" aria-live="polite">
            {visible.length} articles
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="divide-y divide-border border-y border-border"
            >
              {visible.map((article) => (
                <article key={article.id}>
                  <a
                    href={article.href}
                    {...(article.external
                      ? { target: "_blank", rel: "noreferrer noopener" }
                      : {})}
                    className="group grid grid-cols-[5rem_1fr] items-center gap-4 rounded-lg py-6 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[9rem_1fr] sm:gap-7"
                  >
                    <div className="aspect-square overflow-hidden rounded-2xl sm:aspect-[4/3]">
                      {article.cover}
                    </div>
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{article.category}</span>
                        <span aria-hidden>·</span>
                        <time dateTime={article.date}>{article.dateLabel}</time>
                      </div>
                      <h3 className="text-xl font-medium leading-snug tracking-tight group-hover:underline group-hover:decoration-border group-hover:underline-offset-4">
                        {article.title}
                      </h3>
                      <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-muted-foreground sm:block">
                        {article.excerpt}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {article.readingTime}
                        <span className="hidden sm:inline">
                          {" "}
                          · {article.author}
                        </span>
                      </p>
                    </div>
                  </a>
                </article>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
