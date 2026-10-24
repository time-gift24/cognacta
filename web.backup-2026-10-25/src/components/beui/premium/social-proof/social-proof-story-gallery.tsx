"use client";

import { ArrowUpRight, Check, Play, Star } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type StoryGalleryItem = {
  quote: string;
  name: string;
  role: string;
  company: string;
  image: string;
  imageAlt: string;
  href: string;
  result: string;
};

export type SocialProofStoryGalleryProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  stories?: StoryGalleryItem[];
  className?: string;
};

const DEFAULT_STORIES: StoryGalleryItem[] = [
  {
    quote:
      "The product finally feels as considered as the idea that started it.",
    name: "Maya Chen",
    role: "Product lead",
    company: "Northstar",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Maya Chen, product lead at Northstar",
    href: "#maya-story",
    result: "+38% activation",
  },
  {
    quote: "We shipped in days, and the result still felt completely ours.",
    name: "Noah Williams",
    role: "Founder",
    company: "Daybreak",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Noah Williams, founder of Daybreak",
    href: "#noah-story",
    result: "11 hours saved",
  },
  {
    quote: "The team moved faster without lowering the quality of the work.",
    name: "Iris Cole",
    role: "Design director",
    company: "Arc",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Iris Cole, design director at Arc",
    href: "#iris-story",
    result: "2.4× retained usage",
  },
];

export function SocialProofStoryGallery({
  eyebrow = "Customer stories",
  title = "Meet the people behind the results.",
  description = "Short stories from teams who turned a strong product idea into something customers could immediately trust.",
  stories = DEFAULT_STORIES,
  className,
}: SocialProofStoryGalleryProps) {
  const reduceMotion = useReducedMotion();
  const visibleStories = stories.slice(0, 3);
  const featured = visibleStories[0];

  if (!featured) return null;

  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-20 text-foreground sm:px-8 sm:py-24",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-medium text-muted-foreground text-sm">{eyebrow}</p>
          <h2 className="mt-4 text-balance text-4xl font-medium">{title}</h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground text-base leading-7">
            {description}
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.55, ease: EASE_OUT }
            }
            className="overflow-hidden rounded-2xl border border-border bg-background"
          >
            <div className="relative h-80 overflow-hidden sm:h-96">
              {/* biome-ignore lint/performance/noImgElement: installable blocks accept consumer-hosted customer portraits. */}
              <img
                src={featured.image}
                alt={featured.imageAlt}
                className="size-full object-cover"
              />
              <ButtonLink
                href={featured.href}
                tabIndex={0}
                size="icon"
                variant="secondary"
                aria-label={`Read ${featured.name}'s customer story`}
                className="absolute top-4 right-4 size-9 border-border bg-background rounded-full h-9"
              >
                <Play aria-hidden className="size-4 fill-current" />
              </ButtonLink>
              <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 font-medium text-sm">
                <span className="grid size-5 place-items-center rounded-full bg-foreground text-background">
                  <Check aria-hidden className="size-3" />
                </span>
                Verified outcome
              </span>
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-pretty text-xl font-medium leading-8">
                “{featured.quote}”
              </p>
              <div className="mt-6 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <p className="font-medium text-sm">{featured.name}</p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {featured.role}, {featured.company}
                  </p>
                </div>
                <p className="rounded-full border border-border bg-background px-4 py-2 font-medium text-sm">
                  {featured.result}
                </p>
              </div>
            </div>
          </motion.article>

          <div className="grid gap-4">
            {visibleStories.slice(1).map((story, index) => (
              <motion.article
                key={story.name}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : {
                        duration: 0.55,
                        delay: 0.08 + index * 0.08,
                        ease: EASE_OUT,
                      }
                }
                className="grid overflow-hidden rounded-2xl border border-border bg-background sm:grid-cols-[0.8fr_1.2fr]"
              >
                <div className="relative min-h-52 overflow-hidden sm:min-h-64">
                  {/* biome-ignore lint/performance/noImgElement: installable blocks accept consumer-hosted customer portraits. */}
                  <img
                    src={story.image}
                    alt={story.imageAlt}
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover"
                  />
                </div>
                <div className="flex flex-col p-5 sm:p-6">
                  <p className="text-pretty text-xl font-medium leading-8">
                    “{story.quote}”
                  </p>
                  <div className="mt-auto pt-6">
                    <p className="font-medium text-sm">{story.name}</p>
                    <p className="mt-1 text-muted-foreground text-sm">
                      {story.role}, {story.company}
                    </p>
                    <div className="mt-4 flex flex-col items-start">
                      <p className="inline-flex rounded-full border border-border bg-background px-3 py-2 font-medium text-sm">
                        {story.result}
                      </p>
                      <ButtonLink
                        href={story.href}
                        tabIndex={0}
                        variant="ghost"
                        className="-ml-3 mt-2 px-3 text-sm rounded-full h-9"
                      >
                        Read story
                        <ArrowUpRight aria-hidden className="size-4" />
                      </ButtonLink>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-background p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-foreground text-background">
              <Star aria-hidden className="size-5 fill-current" />
            </span>
            <div>
              <p className="text-xl font-medium">4.9 average rating</p>
              <p className="mt-1 text-muted-foreground text-sm">
                From verified customer stories
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:justify-self-end">
            {[
              ["2,000+", "teams"],
              ["94%", "recommend"],
              ["46", "countries"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-background px-3 py-3 text-center sm:px-5"
              >
                <p className="text-xl font-medium">{value}</p>
                <p className="mt-1 text-muted-foreground text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
