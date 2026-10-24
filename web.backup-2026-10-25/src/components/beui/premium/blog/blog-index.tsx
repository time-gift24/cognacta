"use client";

import { ArrowRight, Mail } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { ButtonLink } from "@/components/beui/motion/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { EASE_OUT } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";
import { BLOG_POSTS, type BlogCategory, FEATURED_POST } from "./blog-data";

const FILTERS = ["All", "Places", "Food", "People"] as const;
type Filter = (typeof FILTERS)[number];

export type BlogIndexProps = {
  publication?: string;
  className?: string;
};

export function BlogIndex({ className }: BlogIndexProps) {
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const [filter, setFilter] = useState<Filter>("All");
  const posts = useMemo(
    () =>
      filter === "All"
        ? BLOG_POSTS
        : BLOG_POSTS.filter((post) => post.category === filter),
    [filter],
  );

  const reveal = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: reduce ? 0 : 0.45, ease: EASE_OUT, delay },
  });

  return (
    <div
      className={cn(
        "min-h-screen w-full bg-background font-sans text-foreground",
        className,
      )}
    >
      <main id="blog-top">
        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.45, ease: EASE_OUT }}
            className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center"
          >
            <p className="font-medium text-muted-foreground text-sm">
              Independent stories about everyday life
            </p>
            <h1 className="text-balance tracking-[-0.035em] text-4xl md:text-5xl font-medium">
              Pay attention to what stays with you.
            </h1>
            <p className="mx-auto max-w-2xl text-pretty text-sm text-muted-foreground leading-7 sm:text-base">
              A quiet journal about places, people, and the small rituals that
              make a day feel like your own.
            </p>
          </motion.div>
        </section>

        <motion.section
          {...reveal()}
          aria-labelledby="featured-story"
          className="px-4 sm:px-8"
        >
          <a
            href="#article"
            className="group mx-auto grid w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-background p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground md:grid-cols-[0.9fr_1.1fr]"
          >
            <div className="aspect-[16/10] overflow-hidden rounded-lg md:aspect-auto md:h-96">
              {/* biome-ignore lint/performance/noImgElement: distributed page stays portable without requiring consumer Next image host configuration. */}
              <motion.img
                src={FEATURED_POST.image}
                alt={FEATURED_POST.imageAlt}
                width={1800}
                height={1350}
                className="h-full w-full object-cover"
                whileHover={reduce || !canHover ? undefined : { scale: 1.025 }}
                transition={{ duration: reduce ? 0 : 0.45, ease: EASE_OUT }}
              />
            </div>
            <div className="flex flex-col justify-between p-7 sm:p-10 lg:p-14">
              <div>
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                  Featured / {FEATURED_POST.category}
                </p>
                <h2
                  id="featured-story"
                  className="mt-5 text-balance leading-tight tracking-[-0.045em] text-4xl font-medium"
                >
                  {FEATURED_POST.title}
                </h2>
                <p className="mt-5 max-w-lg text-pretty text-muted-foreground leading-7">
                  {FEATURED_POST.excerpt}
                </p>
              </div>
              <div className="mt-12 flex items-end justify-between gap-6">
                <p className="text-sm">
                  {FEATURED_POST.author}
                  <span className="text-muted-foreground">
                    {" "}
                    / {FEATURED_POST.readTime}
                  </span>
                </p>
                <ArrowRight
                  className="size-5 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
            </div>
          </a>
        </motion.section>

        <section
          id="stories"
          className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20"
        >
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-muted-foreground text-sm">The latest</p>
              <h2 className="mt-1 font-medium text-4xl tracking-[-0.035em]">
                Recent stories
              </h2>
            </div>
            <Tabs
              value={filter}
              onValueChange={(value) => setFilter(value as Filter)}
              variant="pill"
            >
              <TabsList
                aria-label="Filter stories"
                className="flex flex-wrap bg-muted p-0"
              >
                {FILTERS.map((item) => (
                  <TabsTrigger
                    key={item}
                    value={item}
                    className="min-h-10 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {item}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <motion.div
            layout
            className="grid gap-x-6 gap-y-12 pt-8 md:grid-cols-2 lg:grid-cols-3"
          >
            {posts.map((post, index) => (
              <motion.article
                layout
                key={post.slug}
                {...reveal(index * 0.04)}
                whileHover={
                  reduce || !canHover
                    ? undefined
                    : { transform: "translateY(-4px)" }
                }
                className="group"
              >
                <a
                  href="#article"
                  className="block h-full rounded-2xl border border-border bg-background p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-lg">
                    {/* biome-ignore lint/performance/noImgElement: distributed page stays portable without requiring consumer Next image host configuration. */}
                    <motion.img
                      src={post.image}
                      alt={post.imageAlt}
                      width={1200}
                      height={900}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      whileHover={
                        reduce || !canHover ? undefined : { scale: 1.025 }
                      }
                      transition={{
                        duration: reduce ? 0 : 0.45,
                        ease: EASE_OUT,
                      }}
                    />
                  </div>
                  <div className="px-3 pt-5 pb-3">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.13em]">
                      {post.category} / {post.readTime}
                    </p>
                    <h3 className="mt-3 text-balance font-medium text-xl leading-tight tracking-[-0.035em]">
                      {post.title}
                    </h3>
                    <p className="mt-3 text-pretty text-muted-foreground leading-6">
                      {post.excerpt}
                    </p>
                    <p className="mt-5 flex items-center gap-2 font-medium text-sm">
                      Read story
                      <ArrowRight
                        className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </p>
                  </div>
                </a>
              </motion.article>
            ))}
          </motion.div>
        </section>

        <section id="newsletter" className="px-4 pb-16 sm:px-8 sm:pb-20">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-7 rounded-2xl border border-border bg-background p-6 sm:p-9 md:flex-row md:items-center">
            <div>
              <p className="text-muted-foreground text-sm">A note on Sundays</p>
              <h2 className="mt-2 text-balance font-medium text-4xl tracking-[-0.035em]">
                One good story, delivered quietly.
              </h2>
            </div>
            <ButtonLink href="#blog-top" size="lg">
              Join the journal
              <Mail className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </section>
      </main>
    </div>
  );
}

export type { BlogCategory };
