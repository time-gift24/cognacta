"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/beui/utils";

export type AIThinkingLoaderVariant =
  | "orbit"
  | "scan"
  | "wave"
  | "assemble"
  | "diamond"
  | "nodes";

export interface AIThinkingLoaderProps {
  variant?: AIThinkingLoaderVariant;
  label?: string;
  /** Pause the visual without removing the status label. */
  paused?: boolean;
  className?: string;
  /** Replaces the variant color and adds classes to the visual. */
  visualClassName?: string;
}

const labels: Record<AIThinkingLoaderVariant, string> = {
  orbit: "Thinking",
  scan: "Analyzing",
  wave: "Creating",
  assemble: "Processing",
  diamond: "Reasoning",
  nodes: "Reading docs",
};

const colors: Record<AIThinkingLoaderVariant, string> = {
  orbit: "text-emerald-600 dark:text-emerald-400",
  scan: "text-blue-600 dark:text-blue-400",
  wave: "text-pink-600 dark:text-pink-400",
  assemble: "text-orange-600 dark:text-orange-400",
  diamond: "text-cyan-600 dark:text-cyan-400",
  nodes: "text-rose-600 dark:text-rose-400",
};

const ring = [
  [2, 0],
  [3, 0],
  [4, 1],
  [4, 2],
  [4, 3],
  [3, 4],
  [2, 4],
  [1, 4],
  [0, 3],
  [0, 2],
  [0, 1],
  [1, 0],
];
const diamond = [
  [2, 0],
  [3, 1],
  [4, 2],
  [3, 3],
  [2, 4],
  [1, 3],
  [0, 2],
  [1, 1],
];
const grid = Array.from({ length: 25 }, (_, i) => [i % 5, Math.floor(i / 5)]);
const tiles = Array.from({ length: 9 }, (_, i) => [
  (i % 3) + 1,
  Math.floor(i / 3) + 1,
]);

// CSS loops stay independent of React renders. Only opacity and transforms animate.
const styles = `
@keyframes beui-ai-pixel { 0%, 65%, 100% { opacity: .12; } 22%, 34% { opacity: 1; } }
@keyframes beui-ai-tile { 0%, 100% { opacity: .18; transform: translateY(2px); } 35%, 65% { opacity: 1; transform: translateY(0); } }
@keyframes beui-ai-node { 0%, 100% { opacity: 1; } 18%, 82% { opacity: .35; } }
@keyframes beui-ai-signal {
  0%, 100% { transform: translate(7px, 22px); }
  33.333% { transform: translate(18px, 5px); }
  66.667% { transform: translate(27px, 25px); }
}
.beui-ai-loader .beui-ai-pixel { animation: beui-ai-pixel 1.8s linear infinite; }
.beui-ai-loader[data-variant="assemble"] .beui-ai-pixel { animation-name: beui-ai-tile; animation-duration: 2.4s; }
.beui-ai-loader .beui-ai-node { animation: beui-ai-node 2.4s linear infinite; }
.beui-ai-loader .beui-ai-signal { animation: beui-ai-signal 2.4s linear infinite; }
.beui-ai-loader[data-paused="true"] .beui-ai-pixel,
.beui-ai-loader[data-paused="true"] .beui-ai-node,
.beui-ai-loader[data-paused="true"] .beui-ai-signal { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .beui-ai-loader .beui-ai-pixel, .beui-ai-loader .beui-ai-node { animation: none; opacity: .7; transform: none; }
  .beui-ai-loader .beui-ai-signal { animation: none; display: none; }
}
`;

export function AIThinkingLoader({
  variant = "orbit",
  label = labels[variant],
  paused = false,
  className,
  visualClassName,
}: AIThinkingLoaderProps) {
  const pixels =
    variant === "orbit"
      ? ring
      : variant === "diamond"
        ? diamond
        : variant === "assemble"
          ? tiles
          : grid;

  return (
    <output
      aria-live="polite"
      aria-atomic="true"
      data-variant={variant}
      data-paused={paused}
      className={cn(
        "beui-ai-loader inline-flex shrink-0 items-center gap-3 whitespace-nowrap text-sm font-medium text-muted-foreground",
        className,
      )}
    >
      <style>{styles}</style>
      <svg
        aria-hidden="true"
        viewBox="0 0 32 32"
        className={cn(
          "size-7 shrink-0 overflow-visible",
          visualClassName ?? colors[variant],
        )}
        fill="currentColor"
      >
        {variant === "nodes" ? (
          <>
            <path
              d="M7 22 18 5 27 25Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
              opacity=".2"
            />
            <g className="beui-ai-signal">
              <circle r="3" opacity=".14" />
              <circle r="1.5" />
            </g>
            {[
              [7, 22],
              [18, 5],
              [27, 25],
            ].map(([x, y], i) => (
              <g
                key={x}
                className="beui-ai-node"
                style={{ animationDelay: `${i === 0 ? 0 : (i - 3) * 0.8}s` }}
              >
                <circle cx={x} cy={y} r="5" opacity=".1" />
                <circle
                  cx={x}
                  cy={y}
                  r="3.75"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth=".75"
                  opacity=".3"
                />
                <circle cx={x} cy={y} r="2.5" />
              </g>
            ))}
          </>
        ) : (
          pixels.map(([x, y], i) => {
            const phase =
              variant === "scan"
                ? y * 0.18
                : variant === "wave"
                  ? (x + 4 - y) * 0.13
                  : i * (variant === "assemble" ? 0.16 : 1.8 / pixels.length);
            return (
              <rect
                key={`${x}-${y}`}
                x={x * 6 + 2}
                y={y * 6 + 2}
                width="4"
                height="4"
                rx="1"
                className="beui-ai-pixel"
                style={{ animationDelay: `${-phase}s` } as CSSProperties}
              />
            );
          })
        )}
      </svg>
      {label && (
        <span>
          {label}
          <span aria-hidden="true">…</span>
        </span>
      )}
    </output>
  );
}
