"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/beui/utils";
import type { WhatsNewImageMedia } from "./whats-new-data";
import { KEN_BURNS_TRANSITION, kenBurnsPath } from "./whats-new-motion";

export type WhatsNewKenBurnsProps = {
  media: WhatsNewImageMedia;
  /** Picks one of the drift paths so neighbouring slides differ. */
  variant?: number;
  /** Static image when false (reduced motion or off screen). */
  animated: boolean;
  className?: string;
};

/** Release artwork with a slow pan and zoom while its slide is showing. */
export function WhatsNewKenBurns({
  media,
  variant = 0,
  animated,
  className,
}: WhatsNewKenBurnsProps) {
  const path = kenBurnsPath(variant);

  return (
    // biome-ignore lint/performance/noImgElement: release art is hosted on the beUI origin so installed blocks work outside this app.
    <motion.img
      src={media.src}
      alt={media.alt}
      decoding="async"
      draggable={false}
      initial={false}
      animate={
        animated
          ? { scale: path.scale, x: path.x, y: path.y }
          : { scale: 1, x: "0%", y: "0%" }
      }
      transition={animated ? KEN_BURNS_TRANSITION : { duration: 0 }}
      className={cn(
        "size-full object-cover select-none will-change-transform",
        className,
      )}
    />
  );
}
