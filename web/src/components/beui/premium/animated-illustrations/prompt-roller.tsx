"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/beui/utils";

const defaultPrompts = [
  "Analyze onchain data",
  "Compare token metrics",
  "Review governance votes",
  "Summarize market news",
  "Track wallet activity",
  "Forecast treasury runway",
  "Monitor protocol risk",
] as const;

export type PromptRollerLayout = "default" | "card";

export type PromptRollerProps = {
  className?: string;
  items?: readonly string[];
  layout?: PromptRollerLayout;
  title?: string;
};

function AgentMark({ compact }: { compact: boolean }) {
  return (
    <span
      className={cn(
        "grid shrink-0 grid-cols-2 place-items-center gap-[0.16em] rounded-full bg-primary text-primary-foreground",
        compact
          ? "size-[clamp(1.75rem,8cqw,2.25rem)]"
          : "size-[clamp(2.25rem,10cqw,3.25rem)]",
      )}
    >
      <span className="size-[0.26em] rounded-full bg-primary-foreground/85" />
      <span className="size-[0.26em] rounded-full bg-primary-foreground/85" />
    </span>
  );
}

export function PromptRoller({
  className,
  items = defaultPrompts,
  layout = "default",
  title = "AI prompts rolling vertically through one active selection",
}: PromptRollerProps) {
  const source = items.length > 0 ? items : defaultPrompts;
  const rollingItems = Array.from(
    { length: defaultPrompts.length },
    (_, index) => ({
      id: `prompt-slot-${index + 1}`,
      label: source[index % source.length] ?? defaultPrompts[index],
    }),
  );
  const compact = layout === "card";

  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "prompt-roller relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-foreground [container-type:inline-size]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 [perspective:900px] [transform-style:preserve-3d]"
      >
        <div
          className={cn(
            "absolute top-1/2 left-1/2 z-[35] flex h-[clamp(3rem,14cqw,4.75rem)] w-[86cqw] max-w-2xl -translate-x-1/2 -translate-y-1/2 items-center rounded-full border border-border bg-background px-[clamp(0.75rem,3.5cqw,1.5rem)]",
            compact && "h-[clamp(2.75rem,13cqw,4rem)] w-[88cqw]",
          )}
        >
          <AgentMark compact={compact} />
        </div>

        {rollingItems.map((item, index) => {
          const phase =
            ((index - 3 + rollingItems.length) % rollingItems.length) * 1.4;

          return (
            <div
              key={item.id}
              data-step={index + 1}
              className={cn(
                "prompt-roller__item absolute top-1/2 left-1/2 h-[clamp(3rem,14cqw,4.75rem)] w-[86cqw] max-w-2xl",
                compact && "h-[clamp(2.75rem,13cqw,4rem)] w-[88cqw]",
              )}
              style={{ animationDelay: `-${phase}s` } as CSSProperties}
            >
              <span className="prompt-roller__quiet absolute inset-0 grid place-items-center whitespace-nowrap font-medium tracking-[-0.035em] text-muted-foreground">
                <span
                  className={cn(
                    compact
                      ? "text-[clamp(0.875rem,4cqw,1.25rem)]"
                      : "text-[clamp(1rem,5cqw,1.75rem)]",
                  )}
                >
                  {item.label}
                </span>
              </span>

              <span className="prompt-roller__active absolute inset-0 flex items-center ps-[clamp(4.75rem,19cqw,7rem)] pe-[clamp(0.75rem,3.5cqw,1.5rem)]">
                <span
                  className={cn(
                    "truncate font-semibold tracking-[-0.04em]",
                    compact
                      ? "text-[clamp(0.95rem,4.4cqw,1.35rem)]"
                      : "text-[clamp(1.125rem,5.5cqw,2rem)]",
                  )}
                >
                  {item.label}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-50 h-[16%] bg-linear-to-b from-muted to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-50 h-[16%] bg-linear-to-t from-muted to-transparent"
      />

      <style>{`
        .prompt-roller__item {
          animation: prompt-roller-cycle 9.8s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
          backface-visibility: hidden;
          transform-style: preserve-3d;
          will-change: transform, opacity;
        }

        .prompt-roller__active,
        .prompt-roller__quiet {
          animation: prompt-roller-active 9.8s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
          animation-delay: inherit;
          backface-visibility: hidden;
        }

        .prompt-roller__quiet {
          animation-name: prompt-roller-quiet;
        }

        @keyframes prompt-roller-cycle {
          0%,
          100% {
            opacity: 1;
            transform: translate3d(-50%, -50%, 54px) rotate(0deg) scale(1);
            z-index: 40;
          }
          14.285% {
            opacity: 0.56;
            transform: translate3d(-57%, 92%, 20px) rotate(-7deg) scale(0.92);
            z-index: 30;
          }
          28.57% {
            opacity: 0.26;
            transform: translate3d(-67%, 188%, 0) rotate(-13deg) scale(0.84);
            z-index: 20;
          }
          42.855% {
            opacity: 0;
            transform: translate3d(-79%, 270%, 0) rotate(-18deg) scale(0.78);
            z-index: 10;
          }
          48% {
            opacity: 0;
            transform: translate3d(-86%, 320%, 0) rotate(-21deg) scale(0.74);
            z-index: 0;
          }
          52% {
            opacity: 0;
            transform: translate3d(-86%, -420%, 0) rotate(21deg) scale(0.74);
            z-index: 0;
          }
          57.14% {
            opacity: 0;
            transform: translate3d(-79%, -370%, 0) rotate(18deg) scale(0.78);
            z-index: 10;
          }
          71.425% {
            opacity: 0.26;
            transform: translate3d(-67%, -288%, 0) rotate(13deg) scale(0.84);
            z-index: 20;
          }
          85.71% {
            opacity: 0.56;
            transform: translate3d(-57%, -192%, 20px) rotate(7deg) scale(0.92);
            z-index: 30;
          }
        }

        @keyframes prompt-roller-active {
          0%,
          5%,
          95%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          12%,
          88% {
            opacity: 0;
            transform: scale(0.96);
          }
        }

        @keyframes prompt-roller-quiet {
          0%,
          5%,
          95%,
          100% {
            opacity: 0;
            transform: scale(1.04);
          }
          12%,
          88% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .prompt-roller__item,
          .prompt-roller__active,
          .prompt-roller__quiet {
            animation: none;
          }

          .prompt-roller__item {
            opacity: 0;
          }

          .prompt-roller__item[data-step="3"] {
            opacity: 0.32;
            transform: translate3d(-57%, -192%, 20px) rotate(7deg)
              scale(0.92);
          }

          .prompt-roller__item[data-step="4"] {
            opacity: 1;
            transform: translate3d(-50%, -50%, 54px) rotate(0deg) scale(1);
          }

          .prompt-roller__item[data-step="5"] {
            opacity: 0.32;
            transform: translate3d(-57%, 92%, 20px) rotate(-7deg) scale(0.92);
          }

          .prompt-roller__item:not([data-step="4"]) .prompt-roller__active {
            opacity: 0;
          }

          .prompt-roller__item:not([data-step="4"]) .prompt-roller__quiet {
            opacity: 1;
          }

          .prompt-roller__item[data-step="4"] .prompt-roller__quiet {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
