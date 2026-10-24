"use client";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { EASE_OUT } from "@/lib/beui/ease";
export function ArticleCover({ kind }: { kind: "layers" | "voice" | "focus" }) {
  const reduce = useReducedMotion();
  const id = useId();
  const palette =
    kind === "layers"
      ? ["#f7e5d4", "#dc835d", "#f6c196", "#a44d39"]
      : kind === "voice"
        ? ["#d8e9ed", "#4f8da3", "#b0d9df", "#2c566e"]
        : ["#e5ebd9", "#7c9c71", "#d5dfb2", "#45634e"];
  return (
    <motion.svg
      aria-hidden="true"
      viewBox="0 0 480 300"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true }}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x2="1" y2="1">
          <stop stopColor={palette[0]} />
          <stop offset="1" stopColor={palette[2]} />
        </linearGradient>
        <linearGradient id={`${id}-fold`} x1="0" y1="0" x2="1" y2="0.8">
          <stop stopColor={palette[2]} />
          <stop offset="0.45" stopColor={palette[1]} />
          <stop offset="1" stopColor={palette[3]} />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0.9" y2="1">
          <stop stopColor="white" stopOpacity="0.9" />
          <stop offset="0.5" stopColor={palette[2]} />
          <stop offset="1" stopColor={palette[1]} />
        </linearGradient>
        <radialGradient id={`${id}-light`}>
          <stop stopColor="white" stopOpacity="0.65" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-grain`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.07" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
      </defs>
      <path fill={`url(#${id}-bg)`} d="M0 0h480v300H0z" />
      <ellipse cx="120" cy="40" rx="350" ry="260" fill={`url(#${id}-light)`} />
      {kind === "layers" ? (
        <g transform="translate(240 170)">
          {[-75, -50, -25, 0, 25, 50, 75].map((angle, i) => (
            <motion.g
              key={angle}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{
                duration: reduce ? 0 : 0.8,
                delay: reduce ? 0 : i * 0.06,
                ease: EASE_OUT,
              }}
            >
              <g transform={`rotate(${angle})`}>
                <path
                  d="M-9 77 C-26 12 -74 -42 -67 -102 Q-63 -124 -40 -121 L26 -111 Q45 -108 40 -86 C20 -20 15 27 9 77Z"
                  fill={`url(#${id}-fold)`}
                  stroke={palette[0]}
                  strokeOpacity="0.4"
                />
                <path
                  d="M-9 77 C-16 8 -35 -64 -40 -121"
                  fill="none"
                  stroke={palette[2]}
                  strokeWidth="1.5"
                />
              </g>
            </motion.g>
          ))}
        </g>
      ) : kind === "voice" ? (
        <g transform="translate(-15 0)">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <motion.path
              key={i}
              d={`M${-40 + i * 28} 280 C${80 + i * 24} 280 ${40 + i * 24} 40 ${170 + i * 24} 40 S${260 + i * 25} 255 ${440 + i * 25} 220`}
              fill="none"
              stroke={`url(#${id}-edge)`}
              strokeWidth="21"
              strokeLinecap="round"
              variants={{
                hidden: { opacity: 0, pathLength: 0 },
                visible: { opacity: 1, pathLength: 1 },
              }}
              transition={{
                duration: reduce ? 0 : 1.2,
                delay: reduce ? 0 : i * 0.05,
                ease: EASE_OUT,
              }}
            />
          ))}
        </g>
      ) : (
        <g transform="translate(240 150) rotate(-28)">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.ellipse
              key={i}
              cx={(i - 2) * 13}
              cy="0"
              rx={130 - i * 15}
              ry={115 - i * 14}
              fill={`url(#${id}-fold)`}
              stroke={`url(#${id}-edge)`}
              strokeWidth="9"
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{
                duration: reduce ? 0 : 0.8,
                delay: reduce ? 0 : i * 0.07,
                ease: EASE_OUT,
              }}
            />
          ))}
          <ellipse cx="39" cy="0" rx="32" ry="27" fill={`url(#${id}-bg)`} />
        </g>
      )}
      <path
        d="M0 0h480v300H0z"
        fill="transparent"
        filter={`url(#${id}-grain)`}
        pointerEvents="none"
      />
    </motion.svg>
  );
}
