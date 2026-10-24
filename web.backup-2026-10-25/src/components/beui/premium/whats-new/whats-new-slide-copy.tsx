"use client";

import { ArrowUpRight, Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AnimatedModalTitle } from "@/components/beui/motion/animated-modal";
import { ButtonLink } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import type {
  WhatsNewCategory,
  WhatsNewLabels,
  WhatsNewRelease,
  WhatsNewSlide,
} from "./whats-new-data";
import { COPY_VARIANTS, type SlideMotionContext } from "./whats-new-motion";

export type WhatsNewSlideCopyProps = {
  slide: WhatsNewSlide;
  category?: WhatsNewCategory;
  release: WhatsNewRelease;
  labels: WhatsNewLabels;
  direction: 1 | -1;
  reduceMotion: boolean;
};

function isExternal(href: string) {
  return /^https?:\/\//.test(href);
}

/** Category, title, description, highlights, and the optional CTA. */
export function WhatsNewSlideCopy({
  slide,
  category,
  release,
  labels,
  direction,
  reduceMotion,
}: WhatsNewSlideCopyProps) {
  const custom: SlideMotionContext = { direction, reduce: reduceMotion };
  const highlights = slide.highlights?.slice(0, 3) ?? [];
  const external = slide.cta ? isExternal(slide.cta.href) : false;

  return (
    <div className="relative min-h-60 overflow-clip sm:min-h-52">
      <AnimatePresence mode="wait" initial={false} custom={custom}>
        <motion.div
          key={slide.id}
          custom={custom}
          variants={COPY_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          className="space-y-3"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {category ? (
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 font-medium",
                  category.pillClassName,
                )}
              >
                {category.label}
              </span>
            ) : null}
            <span className="text-muted-foreground">
              {release.label} · {labels.formatDate(release.date)}
            </span>
          </div>
          <AnimatedModalTitle className="text-xl font-medium text-balance">
            {slide.title}
          </AnimatedModalTitle>
          <p className="text-sm text-pretty text-muted-foreground">
            {slide.description}
          </p>
          {highlights.length ? (
            <ul aria-label={labels.highlights} className="space-y-1.5 text-sm">
              {highlights.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Check aria-hidden className="size-2.5" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {slide.cta ? (
            <ButtonLink
              href={slide.cta.href}
              variant="outline"
              className="h-9 gap-1.5 px-4 text-sm"
              {...(external
                ? { target: "_blank", rel: "noreferrer noopener" }
                : {})}
            >
              {slide.cta.label}
              <ArrowUpRight aria-hidden className="size-4" />
            </ButtonLink>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
