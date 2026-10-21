"use client";

import { ArrowRight, Mail } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { FormEvent } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { EASE_OUT } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";

type RoundedStory = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  image: string;
  imageAlt: string;
};

const FEATURED_STORY: RoundedStory = {
  slug: "the-room-before-opening",
  title: "The room before opening",
  excerpt:
    "A cafe has a different rhythm before the first order. We spent a morning with the people who prepare that quiet hour.",
  category: "Places",
  readTime: "7 min read",
  image:
    "https://images.unsplash.com/photo-1528598754407-20e385ee7b31?auto=format&fit=crop&fm=webp&q=82&w=1800",
  imageAlt: "A quiet cafe interior lit by tall windows",
};

const STORIES: readonly RoundedStory[] = [
  {
    slug: "a-market-wakes-in-color",
    title: "A market wakes in color",
    excerpt:
      "Following the small decisions behind a flower stall, from the first bucket to the final bouquet.",
    category: "People",
    readTime: "5 min read",
    image:
      "https://images.unsplash.com/photo-1753982861969-295e79c4bf78?auto=format&fit=crop&fm=webp&q=82&w=1200",
    imageAlt: "A florist arranging bouquets at a market stall",
  },
  {
    slug: "what-the-hands-remember",
    title: "What the hands remember",
    excerpt:
      "Inside a pottery practice shaped by repetition, useful mistakes, and knowing when to stop.",
    category: "Craft",
    readTime: "6 min read",
    image:
      "https://images.unsplash.com/photo-1781389005078-d9e413d89c94?auto=format&fit=crop&fm=webp&q=82&w=1200",
    imageAlt: "An artisan shaping clay by hand at a worktable",
  },
  {
    slug: "the-shelf-that-finds-you",
    title: "The shelf that finds you",
    excerpt:
      "A Lisbon bookseller on arranging a room for wandering rather than searching.",
    category: "Places",
    readTime: "4 min read",
    image:
      "https://images.unsplash.com/photo-1755613495591-5b86c76a9df6?auto=format&fit=crop&fm=webp&q=82&w=1200",
    imageAlt: "A warmly lit independent bookstore in Lisbon",
  },
];

export type BlogRoundedIndexProps = {
  publication?: string;
  className?: string;
  onSubscribe?: (email: string) => void;
};

export function BlogRoundedIndex({
  className,
  onSubscribe,
}: BlogRoundedIndexProps) {
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const reveal = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: reduce ? 0 : 0.45, ease: EASE_OUT, delay },
  });

  const handleSubscribe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");

    if (typeof email === "string") {
      onSubscribe?.(email);
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen w-full bg-background font-sans text-foreground",
        className,
      )}
    >
      <main id="rounded-blog-top">
        <section className="mx-auto w-full max-w-6xl px-4 pt-14 pb-10 sm:px-8 sm:pt-20 sm:pb-14">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.45, ease: EASE_OUT }}
            className="mx-auto flex max-w-4xl flex-col items-center pb-10 text-center sm:pb-12"
          >
            <p className="font-medium text-muted-foreground text-sm uppercase tracking-[0.12em]">
              Journal / Issue 04
            </p>
            <div className="mt-8 flex flex-col items-center gap-6">
              <h1 className="max-w-3xl text-balance tracking-[-0.035em] text-4xl md:text-5xl font-medium">
                Stories for slower attention.
              </h1>
              <p className="max-w-md text-pretty text-sm text-muted-foreground leading-7 sm:text-base">
                Field reports about thoughtful work, familiar places, and the
                people who notice what others pass by.
              </p>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 sm:px-8">
          <motion.article {...reveal()}>
            <a
              href="#rounded-article"
              className="group block rounded-3xl border border-border/60 bg-background p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="aspect-[16/10] overflow-hidden rounded-2xl sm:aspect-[3/1]">
                {/* biome-ignore lint/performance/noImgElement: distributed page stays portable without requiring consumer Next image host configuration. */}
                <motion.img
                  src={FEATURED_STORY.image}
                  alt={FEATURED_STORY.imageAlt}
                  width={1800}
                  height={1350}
                  className="h-full w-full object-cover"
                  whileHover={
                    reduce || !canHover ? undefined : { scale: 1.025 }
                  }
                  transition={{ duration: reduce ? 0 : 0.45, ease: EASE_OUT }}
                />
              </div>
              <div className="grid gap-8 p-5 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div className="max-w-2xl">
                  <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                    Featured / {FEATURED_STORY.category}
                  </p>
                  <h2 className="mt-5 text-balance leading-tight tracking-[-0.045em] text-4xl font-medium">
                    {FEATURED_STORY.title}
                  </h2>
                  <p className="mt-4 max-w-md text-pretty text-muted-foreground leading-7">
                    {FEATURED_STORY.excerpt}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground text-sm">
                    {FEATURED_STORY.readTime}
                  </span>
                  <span className="grid size-10 place-items-center rounded-full bg-muted text-foreground">
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </div>
              </div>
            </a>
          </motion.article>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-muted-foreground text-sm">New this week</p>
              <h2 className="mt-1 font-medium text-4xl tracking-[-0.035em]">
                Recent stories
              </h2>
            </div>
            <a
              href="#rounded-blog-top"
              className="hidden min-h-10 items-center gap-2 font-medium text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:inline-flex"
            >
              Browse archive
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-border/60">
            {STORIES.map((story, index) => (
              <motion.article
                key={story.slug}
                {...reveal(index * 0.05)}
                className={cn(index > 0 && "border-border/60 border-t")}
              >
                <a
                  href="#rounded-article"
                  className="group grid gap-5 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[10rem_minmax(0,1fr)_2.5rem] sm:items-center"
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-lg">
                    {/* biome-ignore lint/performance/noImgElement: distributed page stays portable without requiring consumer Next image host configuration. */}
                    <motion.img
                      src={story.image}
                      alt={story.imageAlt}
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
                  <div className="py-1">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.13em]">
                      {story.category} / {story.readTime}
                    </p>
                    <h3 className="mt-3 text-balance font-medium text-xl leading-tight tracking-[-0.03em]">
                      {story.title}
                    </h3>
                    <p className="mt-3 text-pretty text-muted-foreground text-sm leading-6">
                      {story.excerpt}
                    </p>
                  </div>
                  <span className="grid size-10 place-items-center rounded-full bg-muted text-foreground transition-transform duration-300 group-hover:translate-x-1 sm:justify-self-end">
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </a>
              </motion.article>
            ))}
          </div>
        </section>

        <section
          id="rounded-newsletter"
          className="px-4 pb-16 sm:px-8 sm:pb-24"
        >
          <motion.div
            {...reveal()}
            className="mx-auto flex w-full max-w-6xl flex-col items-center gap-7 rounded-3xl border border-border/60 bg-background p-8 text-center sm:p-12"
          >
            <div className="flex max-w-2xl flex-col items-center">
              <p className="text-muted-foreground text-sm">
                Every other Sunday
              </p>
              <h2 className="mt-2 text-balance font-medium text-4xl tracking-[-0.035em]">
                One thoughtful story for your morning.
              </h2>
            </div>
            <form
              onSubmit={handleSubscribe}
              className="flex w-full max-w-xl flex-col gap-3 sm:flex-row"
            >
              <Input
                aria-label="Email address"
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="Email address"
                className="w-full flex-1"
                classNames={{
                  input: "px-5 text-base placeholder:text-muted-foreground",
                }}
              />
              <Button
                type="submit"
                size="lg"
                pressScale={0.96}
                className="w-full sm:w-auto rounded-full h-9"
              >
                Join the journal
                <Mail className="size-4" aria-hidden="true" />
              </Button>
            </form>
          </motion.div>
        </section>

        <span id="rounded-article" className="sr-only">
          Article preview
        </span>
      </main>
    </div>
  );
}
