"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/beui/utils";

export type RollingStackTwoItem = {
  label: string;
  logoUrl: string;
};

const defaultItems: RollingStackTwoItem[] = [
  {
    label: "Ethereum",
    logoUrl: "https://cdn.simpleicons.org/ethereum/627EEA",
  },
  {
    label: "Solana",
    logoUrl: "https://cdn.simpleicons.org/solana/14F195",
  },
  {
    label: "Bitcoin",
    logoUrl: "https://cdn.simpleicons.org/bitcoin/F7931A",
  },
  {
    label: "Polygon",
    logoUrl: "https://cdn.simpleicons.org/polygon/8247E5",
  },
  {
    label: "Binance",
    logoUrl: "https://cdn.simpleicons.org/binance/F0B90B",
  },
];

export type RollingStackTwoLayout = "default" | "card";

export type RollingStackTwoProps = {
  className?: string;
  items?: RollingStackTwoItem[];
  layout?: RollingStackTwoLayout;
  suffix?: string;
  title?: string;
};

export function RollingStackTwo({
  className,
  items = defaultItems,
  layout = "default",
  suffix = "in one wallet",
  title = "A rolling list of crypto networks moving into focus beside one wallet",
}: RollingStackTwoProps) {
  const visibleItems =
    items.length >= defaultItems.length
      ? items.slice(0, defaultItems.length)
      : defaultItems;

  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "rolling-stack-two relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-foreground [container-type:inline-size]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="flex w-[86cqw] items-center justify-center gap-[clamp(0.75rem,4cqw,2rem)]">
          <div
            className={cn(
              "relative shrink-0 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_24%,black_76%,transparent)]",
              layout === "card"
                ? "h-[34cqw] max-h-32 w-[34cqw] max-w-32"
                : "h-[42cqw] max-h-48 w-[38cqw] max-w-52",
            )}
          >
            {visibleItems.map((item, index) => {
              const phase =
                ((index - 2 + visibleItems.length) % visibleItems.length) * 2;

              return (
                <div
                  key={item.label}
                  data-step={index + 1}
                  className={cn(
                    "rolling-stack-two__item absolute top-1/2 left-1/2 flex items-center rounded-full border border-border bg-background",
                    layout === "card"
                      ? "h-[clamp(2rem,9cqw,2.5rem)] w-[31cqw] max-w-28 gap-[clamp(0.375rem,1.5cqw,0.5rem)] px-[clamp(0.625rem,2.5cqw,0.75rem)]"
                      : "h-[clamp(2.5rem,11cqw,3.5rem)] w-[36cqw] max-w-52 gap-[clamp(0.5rem,2cqw,0.75rem)] px-[clamp(0.75rem,3cqw,1.25rem)]",
                  )}
                  style={{ animationDelay: `-${phase}s` } as CSSProperties}
                >
                  {/* biome-ignore lint/performance/noImgElement: integration marks are official lightweight brand assets. */}
                  <img
                    src={item.logoUrl}
                    alt=""
                    aria-hidden="true"
                    className={cn(
                      "shrink-0 object-contain",
                      layout === "card"
                        ? "size-[clamp(1rem,4.5cqw,1.25rem)]"
                        : "size-[clamp(1.25rem,6cqw,2rem)]",
                    )}
                  />
                  <span
                    className={cn(
                      "truncate font-medium tracking-tight",
                      layout === "card"
                        ? "text-[clamp(0.625rem,3cqw,0.75rem)]"
                        : "text-[clamp(0.75rem,4cqw,1.25rem)]",
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          <p
            className={cn(
              "min-w-0 shrink-0 whitespace-nowrap font-semibold tracking-[-0.045em]",
              layout === "card"
                ? "text-[clamp(1rem,5cqw,1.25rem)]"
                : "text-[clamp(1.25rem,7cqw,3rem)]",
            )}
          >
            {suffix}
          </p>
        </div>
      </div>

      <style>{`
        .rolling-stack-two__item {
          animation: rolling-stack-two-cycle 10s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
          backface-visibility: hidden;
          will-change: transform, opacity;
        }

        @keyframes rolling-stack-two-cycle {
          0%,
          100% {
            opacity: 1;
            transform: translate3d(-50%, -50%, 0) scale(1);
            z-index: 30;
          }
          20% {
            opacity: 0.34;
            transform: translate3d(-50%, 88%, 0) scale(0.9);
            z-index: 20;
          }
          40% {
            opacity: 0;
            transform: translate3d(-50%, 164%, 0) scale(0.82);
            z-index: 10;
          }
          49% {
            opacity: 0;
            transform: translate3d(-50%, 210%, 0) scale(0.78);
            z-index: 0;
          }
          51% {
            opacity: 0;
            transform: translate3d(-50%, -310%, 0) scale(0.78);
            z-index: 0;
          }
          60% {
            opacity: 0;
            transform: translate3d(-50%, -264%, 0) scale(0.82);
            z-index: 10;
          }
          80% {
            opacity: 0.34;
            transform: translate3d(-50%, -188%, 0) scale(0.9);
            z-index: 20;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .rolling-stack-two__item {
            animation: none;
            opacity: 0;
          }

          .rolling-stack-two__item[data-step="2"] {
            opacity: 0.34;
            transform: translate3d(-50%, -188%, 0) scale(0.9);
          }

          .rolling-stack-two__item[data-step="3"] {
            opacity: 1;
            transform: translate3d(-50%, -50%, 0) scale(1);
          }

          .rolling-stack-two__item[data-step="4"] {
            opacity: 0.34;
            transform: translate3d(-50%, 88%, 0) scale(0.9);
          }
        }
      `}</style>
    </div>
  );
}
