"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";
import { ArticleCover } from "./article-cover";

export type BlogArticleCard = {
  id: string;
  category: string;
  title: string;
  /** Machine-readable ISO date. */
  date: string;
  dateLabel: string;
  href: string;
  external?: boolean;
  cover: ReactNode;
};
export type BlogArticleCardsProps = {
  title?: string;
  description?: string;
  articles?: BlogArticleCard[];
  coverPosition?: "top" | "bottom";
  className?: string;
};

const defaultArticles: BlogArticleCard[] = [
  {
    id: "less-friction",
    category: "Product",
    title: "A little less friction. A lot more room to create.",
    date: "2026-09-24",
    dateLabel: "September 24, 2026",
    href: "#less-friction",
    cover: <ArticleCover kind="layers" />,
  },
  {
    id: "listening",
    category: "Behind the scenes",
    title: "What we learned by listening before building.",
    date: "2026-09-18",
    dateLabel: "September 18, 2026",
    href: "#listening",
    cover: <ArticleCover kind="voice" />,
  },
  {
    id: "details",
    category: "Design",
    title: "Small details that make everyday work feel better.",
    date: "2026-09-10",
    dateLabel: "September 10, 2026",
    href: "#details",
    cover: <ArticleCover kind="focus" />,
  },
];

export function BlogArticleCards({
  title = "Fresh thinking. A closer look.",
  description = "Notes on what we’re making, learning, and exploring along the way.",
  articles = defaultArticles,
  coverPosition = "bottom",
  className,
}: BlogArticleCardsProps) {
  const reduce = useReducedMotion();
  const hover = useHoverCapable();
  return (
    <section
      className={cn(
        "w-full bg-background px-6 py-12 text-foreground sm:px-10 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-balance text-4xl font-medium tracking-tight">
            {title}
          </h2>
          <p className="mt-4 text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {articles.map((article, index) => (
            <motion.article
              key={article.id}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.55,
                delay: reduce ? 0 : index * 0.1,
                ease: EASE_OUT,
              }}
              className="flex min-w-0"
            >
              <motion.a
                href={article.href}
                {...(article.external
                  ? { target: "_blank", rel: "noreferrer noopener" }
                  : {})}
                initial="rest"
                whileHover={hover && !reduce ? "hover" : undefined}
                whileFocus={reduce ? undefined : "hover"}
                className="flex w-full flex-col rounded-3xl border border-border bg-background p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                <div
                  className={cn(
                    "flex flex-1 flex-col px-3",
                    coverPosition === "top" ? "order-2 pb-3 pt-5" : "pb-6 pt-4",
                  )}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                      {article.category}
                    </span>
                  </div>
                  <h3 className="text-pretty text-xl font-medium leading-snug tracking-tight">
                    {article.title}
                  </h3>
                  <time
                    dateTime={article.date}
                    className="mt-auto pt-4 text-sm text-muted-foreground"
                  >
                    {article.dateLabel}
                  </time>
                </div>
                <div className="aspect-[16/10] overflow-hidden rounded-2xl">
                  <motion.div
                    variants={{ rest: { scale: 1 }, hover: { scale: 1.035 } }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                    className="h-full w-full"
                  >
                    {article.cover}
                  </motion.div>
                </div>
              </motion.a>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
