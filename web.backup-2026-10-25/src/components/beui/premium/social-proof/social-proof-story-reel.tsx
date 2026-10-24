"use client";

import { Check, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type StoryReelItem = {
  company: string;
  category: string;
  quote: string;
  author: string;
  role: string;
  initials: string;
  result: string;
  resultLabel: string;
};

export type SocialProofStoryReelProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  stories?: StoryReelItem[];
  className?: string;
};

const DEFAULT_STORIES: StoryReelItem[] = [
  {
    company: "Luma",
    category: "Commerce",
    quote:
      "The new experience gave customers a reason to stay, and gave our team a clearer standard for everything we ship next.",
    author: "Ada Mensah",
    role: "VP of Product",
    initials: "AM",
    result: "+38%",
    resultLabel: "activation after launch",
  },
  {
    company: "Northstar",
    category: "Infrastructure",
    quote:
      "We moved from a rough direction to a launch-ready product without losing the small details that made the idea worth building.",
    author: "Jon Bell",
    role: "Head of Design",
    initials: "JB",
    result: "11 hrs",
    resultLabel: "saved per release",
  },
  {
    company: "Fieldwork",
    category: "Operations",
    quote:
      "Our customers noticed the improvement before we announced it. Support dropped while weekly product usage kept climbing.",
    author: "Mina Park",
    role: "Chief Operating Officer",
    initials: "MP",
    result: "2.4×",
    resultLabel: "weekly retained usage",
  },
];

export function SocialProofStoryReel({
  eyebrow = "Customer outcomes",
  title = "Proof that shows up after launch.",
  description = "Three teams, three different products, and measurable change customers could feel.",
  stories = DEFAULT_STORIES,
  className,
}: SocialProofStoryReelProps) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const story = stories[active];
  if (!story) return null;

  const selectPrevious = () =>
    setActive((current) => (current - 1 + stories.length) % stories.length);
  const selectNext = () =>
    setActive((current) => (current + 1) % stories.length);

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

        <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-background p-3 sm:p-5">
          <div className="flex gap-2 overflow-x-auto rounded-xl bg-background/70 p-2">
            {stories.map((item, index) => (
              <Button
                variant="plain"
                key={item.company}
                type="button"
                onClick={() => setActive(index)}
                aria-pressed={index === active}
                className={cn(
                  "min-h-11 shrink-0 rounded-full px-4 font-medium text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  index === active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.company}
              </Button>
            ))}
          </div>

          <div className="relative mt-3 min-h-[32rem] overflow-hidden rounded-2xl border border-border bg-background sm:min-h-[30rem]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden"
            >
              <div className="absolute -top-20 -left-20 size-72 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute -right-20 -bottom-20 size-72 rounded-full bg-foreground/5 blur-3xl" />
              <div className="absolute inset-0 bg-linear-to-br from-background/20 via-transparent to-muted/50" />
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.article
                key={story.company}
                initial={{ opacity: 0, x: 24, filter: "blur(6px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -24, filter: "blur(6px)" }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.4, ease: EASE_OUT }
                }
                className="relative z-10 grid min-h-[32rem] gap-8 p-6 sm:min-h-[30rem] sm:p-10 md:grid-cols-[1.25fr_0.75fr] md:items-center"
              >
                <div>
                  <span className="inline-flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Quote aria-hidden className="size-5" />
                  </span>
                  <blockquote className="mt-6 max-w-2xl text-balance text-xl font-medium leading-8">
                    “{story.quote}”
                  </blockquote>
                  <div className="mt-8 flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-full bg-foreground font-medium text-background text-sm">
                      {story.initials}
                    </span>
                    <span>
                      <span className="block font-medium text-sm">
                        {story.author}
                      </span>
                      <span className="mt-1 block text-muted-foreground text-sm">
                        {story.role}, {story.company}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background p-6">
                  <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-2 font-medium text-sm">
                    <span className="grid size-5 place-items-center rounded-full bg-foreground text-background">
                      <Check aria-hidden className="size-3" />
                    </span>
                    Verified result
                  </span>
                  <p className="mt-8 text-4xl font-medium">{story.result}</p>
                  <p className="mt-2 text-muted-foreground text-sm">
                    {story.resultLabel}
                  </p>
                  <div className="mt-8 border-border border-t pt-5">
                    <p className="font-medium text-sm">{story.company}</p>
                    <p className="mt-1 text-muted-foreground text-sm">
                      {story.category}
                    </p>
                  </div>
                </div>
              </motion.article>
            </AnimatePresence>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl bg-background/70 p-2">
            <p className="pl-3 text-muted-foreground text-sm">
              {active + 1} of {stories.length}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                tabIndex={0}
                size="icon"
                variant="secondary"
                onClick={selectPrevious}
                aria-label="Previous customer story"
                className="size-9 rounded-full h-9"
              >
                <ChevronLeft aria-hidden className="size-4" />
              </Button>
              <Button
                type="button"
                tabIndex={0}
                size="icon"
                variant="primary"
                onClick={selectNext}
                aria-label="Next customer story"
                className="size-9 rounded-full h-9"
              >
                <ChevronRight aria-hidden className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
