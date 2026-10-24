"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { EASE_IN_OUT } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";

const TOTAL_BARS = 13;
const BAR_IDS = Array.from(
  { length: TOTAL_BARS },
  (_, index) => `bar-${index + 1}`,
);
const BASE_HEIGHT = 30;
const WAVE_HEIGHT = 88;
const HOVER_LIFT = 58;
const BAR_PULSE_DURATION = 2.4;
const BAR_STAGGER = 0.2;
const PASS_REPEAT_DELAY = (TOTAL_BARS - 1) * BAR_STAGGER;
const BAR_MATRIX = "matrix(0.866025 0.5 0 1 0.0580127 -2.88838)";
const BAR_SPRING = {
  type: "spring",
  stiffness: 200,
  damping: 20,
  mass: 0.8,
} as const;

export type BarWaveProps = {
  className?: string;
  title?: string;
};

export function BarWave({
  className,
  title = "An isometric stack of bars moving in a slow wave",
}: BarWaveProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [settling, setSettling] = useState(false);
  const resumeTimer = useRef<number | null>(null);
  const gradientId = useId().replaceAll(":", "");
  const reduce = useReducedMotion() ?? false;
  const canHover = useHoverCapable();
  const interactive = canHover && !reduce;

  useEffect(
    () => () => {
      if (resumeTimer.current !== null) {
        window.clearTimeout(resumeTimer.current);
      }
    },
    [],
  );

  function startHover(index: number) {
    if (resumeTimer.current !== null) {
      window.clearTimeout(resumeTimer.current);
      resumeTimer.current = null;
    }

    setSettling(false);
    setHovered(index);
  }

  function endHover() {
    setHovered(null);
    setSettling(true);

    if (resumeTimer.current !== null) {
      window.clearTimeout(resumeTimer.current);
    }

    resumeTimer.current = window.setTimeout(() => {
      setSettling(false);
      resumeTimer.current = null;
    }, 1200);
  }

  return (
    <div
      role="img"
      aria-label={title}
      className={cn(
        "relative isolate aspect-[4/3] w-full overflow-hidden bg-muted [--bar-end:#4b52c7] [--bar-mid:#6670ee] [--bar-start:#8c91ff] [--bar-stroke:#343a9b] dark:[--bar-end:oklch(0.61_0.19_282)] dark:[--bar-mid:oklch(0.7_0.16_282)] dark:[--bar-start:oklch(0.8_0.11_282)] dark:[--bar-stroke:oklch(0.78_0.08_282)]",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="-60 -80 480 360"
        preserveAspectRatio="xMidYMid meet"
        onPointerLeave={interactive ? endHover : undefined}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="var(--bar-start)" />
            <stop offset="0.58" stopColor="var(--bar-mid)" />
            <stop offset="1" stopColor="var(--bar-end)" />
          </linearGradient>
        </defs>

        <g transform="rotate(180 175 65)">
          {BAR_IDS.map((barId, index) => {
            const distance =
              hovered === null
                ? Number.POSITIVE_INFINITY
                : Math.abs(hovered - index);
            const influence = Math.max(0, 1 - distance * 0.22);
            const focusedHeight = BASE_HEIGHT + influence * HOVER_LIFT;

            const animate = reduce
              ? { height: BASE_HEIGHT, filter: "brightness(0.92)" }
              : hovered !== null
                ? {
                    height: focusedHeight,
                    filter: `brightness(${0.7 + influence * 0.38})`,
                  }
                : settling
                  ? { height: BASE_HEIGHT, filter: "brightness(0.7)" }
                  : {
                      height: [BASE_HEIGHT, WAVE_HEIGHT, BASE_HEIGHT],
                      filter: [
                        "brightness(0.7)",
                        "brightness(1.08)",
                        "brightness(0.7)",
                      ],
                    };

            const transition = reduce
              ? { duration: 0 }
              : hovered !== null || settling
                ? BAR_SPRING
                : {
                    duration: BAR_PULSE_DURATION,
                    times: [0, 0.5, 1],
                    delay: index * BAR_STAGGER,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatDelay: PASS_REPEAT_DELAY,
                    ease: EASE_IN_OUT,
                  };

            return (
              <motion.rect
                key={barId}
                x={0.4 + index * 15}
                y={0.75 + index * -15}
                width="135"
                height={BASE_HEIGHT}
                rx="6.5"
                transform={BAR_MATRIX}
                fill={`url(#${gradientId})`}
                stroke="var(--bar-stroke)"
                strokeWidth="0.8"
                animate={animate}
                transition={transition}
                onHoverStart={interactive ? () => startHover(index) : undefined}
                onHoverEnd={interactive ? endHover : undefined}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
