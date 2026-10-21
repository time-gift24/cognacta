"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/beui/utils";

type StackCard = {
  balance: string;
  change: string;
  id: string;
  logoUrl: string;
  name: string;
  surfaceClassName: string;
  symbol: string;
  value: string;
};

const stackCards: StackCard[] = [
  {
    balance: "3.24 ETH",
    change: "+2.4%",
    id: "ethereum",
    logoUrl: "https://cdn.simpleicons.org/ethereum/627EEA",
    name: "Ethereum",
    surfaceClassName:
      "bg-[oklch(0.94_0.035_240)] dark:bg-[oklch(0.27_0.035_240)]",
    symbol: "ETH",
    value: "$8,932",
  },
  {
    balance: "48.6 SOL",
    change: "+5.1%",
    id: "solana",
    logoUrl: "https://cdn.simpleicons.org/solana/14F195",
    name: "Solana",
    surfaceClassName:
      "bg-[oklch(0.94_0.04_150)] dark:bg-[oklch(0.27_0.035_150)]",
    symbol: "SOL",
    value: "$7,214",
  },
  {
    balance: "12.8 BNB",
    change: "+1.7%",
    id: "binance",
    logoUrl: "https://cdn.simpleicons.org/binance/F0B90B",
    name: "BNB",
    surfaceClassName: "bg-[oklch(0.95_0.05_85)] dark:bg-[oklch(0.28_0.04_85)]",
    symbol: "BNB",
    value: "$7,010",
  },
  {
    balance: "6,420 USDT",
    change: "0.0%",
    id: "tether",
    logoUrl: "https://cdn.simpleicons.org/tether/26A17B",
    name: "Tether",
    surfaceClassName:
      "bg-[oklch(0.94_0.035_205)] dark:bg-[oklch(0.27_0.035_205)]",
    symbol: "USDT",
    value: "$6,420",
  },
  {
    balance: "0.184 BTC",
    change: "+3.8%",
    id: "bitcoin",
    logoUrl: "https://cdn.simpleicons.org/bitcoin/F7931A",
    name: "Bitcoin",
    surfaceClassName: "bg-[oklch(0.95_0.045_65)] dark:bg-[oklch(0.28_0.04_65)]",
    symbol: "BTC",
    value: "$12,860",
  },
];

export type CardStackLayout = "default" | "card";

export type CardStackProps = {
  className?: string;
  layout?: CardStackLayout;
  title?: string;
};

export function CardStack({
  className,
  layout = "default",
  title = "A compact stack of crypto asset cards cycling from front to back",
}: CardStackProps) {
  const compact = layout === "card";

  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "card-stack relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-foreground [container-type:inline-size]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center [perspective:900px]"
      >
        <div
          className={cn(
            "relative w-[58cqw] max-w-[23rem] [transform-style:preserve-3d]",
            compact ? "h-[28cqw] max-h-[8.5rem]" : "h-[32cqw] max-h-[12rem]",
          )}
        >
          {stackCards.map((card, index) => {
            const phase =
              ((index - 4 + stackCards.length) % stackCards.length) * 2;
            const animationStyle = {
              animationDelay: `-${phase}s`,
            } as CSSProperties;

            return (
              <div
                key={card.id}
                data-step={index + 1}
                className={cn(
                  "card-stack__card absolute inset-0 overflow-hidden rounded-[clamp(1rem,4cqw,1.75rem)] border border-border",
                  card.surfaceClassName,
                )}
                style={animationStyle}
              >
                <div
                  className="card-stack__content flex h-full flex-col justify-between p-[clamp(0.75rem,3.2cqw,1.25rem)]"
                  style={animationStyle}
                >
                  <div className="flex items-center gap-[clamp(0.5rem,2cqw,0.75rem)]">
                    <span className="grid size-[clamp(1.75rem,7cqw,2.5rem)] shrink-0 place-items-center rounded-full border border-foreground/8 bg-background/60">
                      {/* biome-ignore lint/performance/noImgElement: token marks are official lightweight brand assets. */}
                      <img
                        src={card.logoUrl}
                        alt=""
                        aria-hidden="true"
                        className="size-[48%] object-contain"
                      />
                    </span>
                    <div className="min-w-0">
                      <span className="block truncate font-medium text-[clamp(0.7rem,3cqw,1rem)] tracking-tight">
                        {card.name}
                      </span>
                      <span className="block font-mono text-[clamp(0.45rem,1.7cqw,0.6rem)] text-foreground/55 uppercase tracking-[0.08em]">
                        {card.symbol}
                      </span>
                    </div>
                    <span className="ms-auto shrink-0 font-mono text-[clamp(0.5rem,2cqw,0.65rem)] text-foreground/65 tabular-nums">
                      {card.change}
                    </span>
                  </div>

                  <div className="border-foreground/10 border-t pt-[clamp(0.45rem,2cqw,0.7rem)]">
                    <span className="block font-semibold text-[clamp(1rem,4.2cqw,1.45rem)] tracking-[-0.04em] tabular-nums">
                      {card.value}
                    </span>
                    <span className="mt-0.5 block font-mono text-[clamp(0.45rem,1.7cqw,0.6rem)] text-foreground/55 tabular-nums">
                      {card.balance}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .card-stack__card {
          animation: card-stack-cycle 10s linear infinite;
          backface-visibility: hidden;
          transform-origin: 50% 100%;
          will-change: transform, opacity;
        }

        .card-stack__content {
          animation: card-stack-content-cycle 10s linear infinite;
          will-change: opacity;
        }

        @keyframes card-stack-cycle {
          0%,
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 48px) rotate(0deg) scale(1);
            z-index: 50;
          }
          6% {
            opacity: 1;
            transform: translate3d(1%, -2%, 56px) rotate(0.5deg) scale(1.006);
            z-index: 60;
          }
          13% {
            opacity: 1;
            transform: translate3d(4%, -9%, 64px) rotate(2deg) scale(1.015);
            z-index: 60;
          }
          20% {
            opacity: 0;
            transform: translate3d(42%, -52%, 58px) rotate(10deg) scale(0.98);
            z-index: 60;
          }
          24% {
            opacity: 0;
            transform: translate3d(0, 42%, 0) rotate(-1deg) scale(0.85);
            z-index: 10;
          }
          40% {
            opacity: 0.46;
            transform: translate3d(0, 34%, 0) rotate(0deg) scale(0.87);
            z-index: 10;
          }
          60% {
            opacity: 0.68;
            transform: translate3d(0, 23%, 12px) rotate(0deg) scale(0.91);
            z-index: 20;
          }
          80% {
            opacity: 0.86;
            transform: translate3d(0, 12%, 28px) rotate(0deg) scale(0.955);
            z-index: 30;
          }
          92% {
            opacity: 0.96;
            transform: translate3d(0, 3%, 40px) rotate(0deg) scale(0.99);
            z-index: 40;
          }
        }

        @keyframes card-stack-content-cycle {
          0%,
          16%,
          100% {
            opacity: 1;
          }
          20%,
          96% {
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .card-stack__card {
            animation: none;
            opacity: 0;
          }

          .card-stack__content {
            animation: none;
            opacity: 0;
          }

          .card-stack__card[data-step="2"] {
            opacity: 0.46;
            transform: translate3d(0, 34%, 0) scale(0.87);
            z-index: 10;
          }

          .card-stack__card[data-step="3"] {
            opacity: 0.68;
            transform: translate3d(0, 23%, 12px) scale(0.91);
            z-index: 20;
          }

          .card-stack__card[data-step="4"] {
            opacity: 0.86;
            transform: translate3d(0, 12%, 28px) scale(0.955);
            z-index: 30;
          }

          .card-stack__card[data-step="5"] {
            opacity: 1;
            transform: translate3d(0, 0, 48px) scale(1);
            z-index: 50;
          }

          .card-stack__card[data-step="5"] .card-stack__content {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
