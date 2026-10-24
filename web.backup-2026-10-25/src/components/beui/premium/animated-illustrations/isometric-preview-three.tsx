"use client";

import {
  AudioWaveform,
  Blocks,
  Brush,
  Database,
  type LucideIcon,
  PanelsTopLeft,
  Rocket,
  Zap,
} from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/beui/utils";

export type PerspectiveStackItem = {
  label: string;
  icon?: LucideIcon;
};

const defaultItems = [
  { label: "Sources", icon: Database },
  { label: "Structure", icon: Blocks },
  { label: "Actions", icon: Zap },
  { label: "Layout", icon: PanelsTopLeft },
  { label: "Motion", icon: AudioWaveform },
  { label: "Theme", icon: Brush },
  { label: "Release", icon: Rocket },
] satisfies PerspectiveStackItem[];

export type IsometricPreviewThreeProps = {
  className?: string;
  items?: readonly PerspectiveStackItem[];
  title?: string;
};

export function IsometricPreviewThree({
  className,
  items = defaultItems,
  title = "Seven product capabilities arranged around an animated central spine",
}: IsometricPreviewThreeProps) {
  const visibleItems = items.slice(0, defaultItems.length);

  return (
    <div
      role="img"
      aria-label={title}
      style={{ containerType: "inline-size" }}
      className={cn(
        "isometric-preview-three relative aspect-[4/3] w-full overflow-hidden bg-muted text-foreground",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--background)_78%,transparent),transparent_72%)]"
      />

      <div
        aria-hidden="true"
        className="absolute inset-[7%_9%] grid grid-rows-7"
      >
        <span className="absolute top-[7.142857%] bottom-[7.142857%] left-1/2 w-px -translate-x-1/2 bg-border" />

        {visibleItems.map((item, index) => {
          const Icon = item.icon ?? Blocks;
          const active = index === 3;
          const left = index % 2 === 0;

          return (
            <div key={`${item.label}-${index}`} className="relative">
              <span
                className={cn(
                  "isometric-preview-three__node absolute top-1/2 left-1/2 z-20 size-[clamp(0.4rem,1.5cqw,0.7rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border bg-background",
                  active ? "border-(--color-accent)" : "border-border-strong",
                )}
                style={
                  {
                    "--node-delay": `${-(3.85 - index * 0.55)}s`,
                  } as CSSProperties
                }
              />

              <div
                className={cn(
                  "absolute top-1/2 flex -translate-y-1/2 items-center gap-[clamp(0.45rem,1.7cqw,0.9rem)] rounded-[clamp(0.65rem,2cqw,1rem)] border bg-background px-[clamp(0.55rem,2cqw,1rem)]",
                  active
                    ? "right-[7%] left-[7%] z-10 h-[84%] border-(--color-accent) text-foreground"
                    : "h-[72%] w-[39%] border-border text-muted-foreground",
                  !active &&
                    (left
                      ? "right-[calc(50%+clamp(0.65rem,2.2cqw,1.15rem))]"
                      : "left-[calc(50%+clamp(0.65rem,2.2cqw,1.15rem))]"),
                )}
              >
                {active ? (
                  <span className="isometric-preview-three__focus absolute inset-0 rounded-[inherit] bg-(--color-accent)/5" />
                ) : null}
                <span
                  className={cn(
                    "relative grid aspect-square h-[62%] shrink-0 place-items-center rounded-[clamp(0.45rem,1.4cqw,0.75rem)] border",
                    active
                      ? "border-(--color-accent)/35 bg-(--color-accent)/8 text-(--color-accent)"
                      : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-[46%]" strokeWidth={1.7} />
                </span>
                <span className="relative truncate text-[clamp(0.58rem,2cqw,1rem)] font-medium tracking-[-0.025em]">
                  {item.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .isometric-preview-three__node {
          animation: isometric-preview-three-node 3.85s linear infinite;
          animation-delay: var(--node-delay);
          will-change: transform, opacity;
        }

        .isometric-preview-three__focus {
          animation: isometric-preview-three-focus 3.2s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
        }

        @keyframes isometric-preview-three-node {
          0%,
          10% {
            opacity: 1;
            transform: scale(1.45);
          }
          20%,
          100% {
            opacity: 0.48;
            transform: scale(1);
          }
        }

        @keyframes isometric-preview-three-focus {
          0%,
          100% {
            opacity: 0.35;
          }
          50% {
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .isometric-preview-three__node,
          .isometric-preview-three__focus {
            animation: none;
          }

          .isometric-preview-three__node {
            opacity: 0.64;
          }

          .isometric-preview-three__focus {
            opacity: 0.72;
          }
        }
      `}</style>
    </div>
  );
}
