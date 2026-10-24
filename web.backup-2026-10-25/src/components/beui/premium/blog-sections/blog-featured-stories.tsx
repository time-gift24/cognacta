"use client";

import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";
import { type BlogStory, defaultStories } from "./article-data";

export type BlogFeaturedStoriesProps = {
  title?: string;
  description?: string;
  stories?: BlogStory[];
  className?: string;
};
export function BlogFeaturedStories({
  title = "A few things worth sharing.",
  description = "Fresh perspectives from the people behind the product.",
  stories = defaultStories,
  className,
}: BlogFeaturedStoriesProps) {
  const reduce = useReducedMotion();
  const hover = useHoverCapable();
  const [featured, ...rest] = stories;
  return (
    <section
      className={cn(
        "w-full bg-background px-6 py-12 text-foreground sm:px-10 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 max-w-2xl">
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            From the journal
          </p>
          <h2 className="text-balance text-4xl font-medium tracking-tight">
            {title}
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </header>
        {featured && (
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <motion.article
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            >
              <motion.a
                href={featured.href}
                {...(featured.external
                  ? { target: "_blank", rel: "noreferrer noopener" }
                  : {})}
                initial="rest"
                whileHover={hover && !reduce ? "hover" : undefined}
                whileFocus={reduce ? undefined : "hover"}
                className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-3xl">
                  <motion.div
                    variants={{ rest: { scale: 1 }, hover: { scale: 1.035 } }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                    className="h-full"
                  >
                    {featured.cover}
                  </motion.div>
                  <span className="absolute left-4 top-4 rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                    Featured story
                  </span>
                </div>
                <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{featured.category}</span>
                  <span aria-hidden>·</span>
                  <span>{featured.readingTime}</span>
                </div>
                <h3 className="mt-3 text-xl font-medium tracking-tight">
                  {featured.title}
                </h3>
                <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
                  {featured.excerpt}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="text-foreground">{featured.author}</span>
                  <span aria-hidden>·</span>
                  <time dateTime={featured.date}>{featured.dateLabel}</time>
                </div>
              </motion.a>
            </motion.article>
            <div className="divide-y divide-border border-y border-border">
              {rest.map((story, index) => (
                <motion.article
                  key={story.id}
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: reduce ? 0 : index * 0.08,
                    ease: EASE_OUT,
                  }}
                >
                  <a
                    href={story.href}
                    {...(story.external
                      ? { target: "_blank", rel: "noreferrer noopener" }
                      : {})}
                    className="group grid grid-cols-[1fr_6rem] items-center gap-5 rounded-lg py-7 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[1fr_8rem]"
                  >
                    <div>
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{story.category}</span>
                        <span aria-hidden>·</span>
                        <span>{story.readingTime}</span>
                      </div>
                      <h3 className="text-xl font-medium leading-snug tracking-tight group-hover:underline group-hover:decoration-border group-hover:underline-offset-4">
                        {story.title}
                      </h3>
                      <time
                        dateTime={story.date}
                        className="mt-4 block text-xs text-muted-foreground"
                      >
                        {story.dateLabel}
                      </time>
                    </div>
                    <div className="aspect-square overflow-hidden rounded-2xl">
                      {story.cover}
                    </div>
                  </a>
                </motion.article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
