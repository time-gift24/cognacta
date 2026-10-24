"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useId, useRef } from "react";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type TeammateAvatarVariant = "ink" | "mint" | "amber" | "sky";

// Original character artwork. Its palette belongs to the illustration;
// surrounding controls and interface surfaces continue to use theme tokens.
const CHARACTERS = {
  ink: {
    body: "var(--foreground)",
    highlight: "var(--foreground)",
    shade: "var(--foreground)",
    eyes: "var(--background)",
    shape:
      "M31 5C46 3 59 15 59 31C59 48 46 59 30 59C13 59 5 47 5 32C5 18 15 7 31 5Z",
    tilt: -12,
  },
  mint: {
    body: "#7ab89e",
    highlight: "#b9dfb8",
    shade: "#448d79",
    eyes: "#f7fff7",
    shape:
      "M32 5C47 5 57 17 58 31C59 47 46 58 31 58C15 58 5 46 6 31C7 15 17 5 32 5Z",
    tilt: -20,
  },
  amber: {
    body: "#e9b65f",
    highlight: "#f6dca0",
    shade: "#cf8c43",
    eyes: "#fff8e8",
    shape:
      "M23 6C31 1 44 5 48 13L58 31C63 41 55 49 44 53L27 59C17 63 7 55 6 44L5 27C4 17 13 12 23 6Z",
    tilt: 12,
  },
  sky: {
    body: "#78a7cd",
    highlight: "#b8d6e8",
    shade: "#4d7ca9",
    eyes: "#f2faff",
    shape:
      "M32 5C37 5 41 10 45 16L59 40C64 50 58 57 48 57H17C6 57 2 50 7 40L20 16C24 9 27 5 32 5Z",
    tilt: -8,
  },
} as const;

export function TeammateAvatar({
  variant = "mint",
  animated = false,
  className,
}: {
  variant?: TeammateAvatarVariant;
  animated?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const gradientId = useId();
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref);
  const character = CHARACTERS[variant];
  const blink = animated && inView && !reduce;

  return (
    <svg
      ref={ref}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn("size-9 shrink-0", className)}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="14"
          y1="8"
          x2="47"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={character.highlight} />
          <stop offset="0.5" stopColor={character.body} />
          <stop offset="1" stopColor={character.shade} />
        </linearGradient>
      </defs>
      <path d={character.shape} fill={`url(#${gradientId})`} />
      <g transform={`rotate(${character.tilt} 39 23)`}>
        <motion.g
          initial={false}
          animate={{ scaleY: blink ? [1, 1, 0.12, 1] : 1 }}
          transition={
            blink
              ? {
                  duration: 4.8,
                  times: [0, 0.91, 0.95, 1],
                  repeat: Infinity,
                  ease: EASE_OUT,
                }
              : { duration: 0 }
          }
          style={{ transformOrigin: "39px 23px" }}
        >
          <rect
            x="31"
            y="17"
            width="5"
            height="10"
            rx="2.5"
            fill={character.eyes}
          />
          <rect
            x="42"
            y="17"
            width="5"
            height="10"
            rx="2.5"
            fill={character.eyes}
          />
        </motion.g>
      </g>
    </svg>
  );
}
