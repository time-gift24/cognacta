"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { isImageMedia, type WhatsNewSlide } from "./whats-new-data";
import { TEASER_DELAY, THUMB_STAGGER } from "./whats-new-motion";

export type WhatsNewThumbStackProps = {
  slides: WhatsNewSlide[];
  /** Spread the fan a little further (card hover). */
  spread: boolean;
  reduceMotion: boolean;
  className?: string;
};

/** Resting fan positions, back to front. */
const FAN = [
  { x: 0, rotate: -8 },
  { x: 14, rotate: -1 },
  { x: 28, rotate: 7 },
];

function thumbSources(slides: WhatsNewSlide[]) {
  return slides
    .map((slide) =>
      isImageMedia(slide.media) ? slide.media.src : slide.media.thumbnail,
    )
    .filter((src): src is string => Boolean(src))
    .slice(0, 3);
}

/** Two or three overlapping release thumbnails that fan in after the card. */
export function WhatsNewThumbStack({
  slides,
  spread,
  reduceMotion,
  className,
}: WhatsNewThumbStackProps) {
  const sources = thumbSources(slides);
  // The entrance is delayed until the card lands; hover changes are not.
  const [entered, setEntered] = useState(false);
  if (!sources.length) return null;

  return (
    <div
      aria-hidden
      className={cn("relative h-12 shrink-0", className)}
      style={{ width: 48 + (sources.length - 1) * 14 + 4 }}
    >
      {sources.map((src, position) => {
        const rest = FAN[position];
        const target = reduceMotion
          ? { opacity: 1, x: rest.x, rotate: rest.rotate }
          : {
              opacity: 1,
              x: rest.x * (spread ? 1.35 : 1),
              rotate: rest.rotate * (spread ? 1.4 : 1),
              y: spread ? -2 : 0,
            };
        return (
          <motion.div
            key={src}
            initial={
              reduceMotion
                ? { opacity: 0, x: rest.x, rotate: rest.rotate }
                : { opacity: 0, x: 0, rotate: 0, y: 6 }
            }
            animate={target}
            transition={{
              duration: 0.45,
              ease: EASE_OUT,
              delay: entered
                ? 0
                : TEASER_DELAY + 0.25 + position * THUMB_STAGGER,
            }}
            onAnimationComplete={() => setEntered(true)}
            className="absolute top-0 left-0 size-12 overflow-clip rounded-xl border-2 border-background bg-muted"
            style={{ zIndex: position }}
          >
            {/* biome-ignore lint/performance/noImgElement: release art is hosted on the beUI origin so installed blocks work outside this app. */}
            <img
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className="size-full object-cover"
            />
          </motion.div>
        );
      })}
    </div>
  );
}
