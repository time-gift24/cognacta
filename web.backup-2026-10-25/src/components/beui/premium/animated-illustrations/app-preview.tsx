"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  BatteryMedium,
  WalletCards,
  Wifi,
} from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/beui/utils";

const assets = [
  {
    id: "btc",
    symbol: "B",
    name: "Bitcoin",
    amount: "$12,420",
    change: "+3.8%",
  },
  {
    id: "eth",
    symbol: "E",
    name: "Ethereum",
    amount: "$8,280",
    change: "+2.1%",
  },
  { id: "sol", symbol: "S", name: "Solana", amount: "$4,160", change: "+6.4%" },
] as const;

export type AppPreviewLayout = "default" | "card";

export type AppPreviewProps = {
  className?: string;
  layout?: AppPreviewLayout;
  title?: string;
};

function StatusBar({ layout }: { layout: AppPreviewLayout }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between pt-[5%] font-semibold",
        layout === "card" ? "text-[0.34rem]" : "text-[0.5rem]",
      )}
    >
      <span>9:41</span>
      <span className="flex items-center gap-0.5">
        <Wifi className={layout === "card" ? "size-2" : "size-2.5"} />
        <BatteryMedium className={layout === "card" ? "size-2.5" : "size-3"} />
      </span>
    </div>
  );
}

function CryptoScreen({ layout }: { layout: AppPreviewLayout }) {
  return (
    <div className="h-full rounded-t-[1.8rem] border border-border bg-background px-[8%]">
      <StatusBar layout={layout} />

      <div className="mt-[10%] flex items-center justify-between">
        <div>
          <p
            className={cn(
              "text-muted-foreground",
              layout === "card" ? "text-[0.31rem]" : "text-[0.46rem]",
            )}
          >
            Total balance
          </p>
          <p
            className={cn(
              "font-semibold tracking-tight",
              layout === "card" ? "text-[0.64rem]" : "text-[0.94rem]",
            )}
          >
            Portfolio
          </p>
        </div>
        <span className="grid size-6 place-items-center rounded-full bg-muted text-muted-foreground">
          <WalletCards className="size-3" strokeWidth={1.8} />
        </span>
      </div>

      <div className="app-preview__balance relative mt-[9%] overflow-hidden rounded-2xl border border-border bg-card p-[8%] text-foreground">
        <div className="relative z-10">
          <p
            className={cn(
              "text-muted-foreground",
              layout === "card" ? "text-[0.29rem]" : "text-[0.43rem]",
            )}
          >
            Available
          </p>
          <div className="mt-0.5 flex items-end justify-between gap-2">
            <p
              className={cn(
                "font-semibold tracking-tight tabular-nums",
                layout === "card" ? "text-[0.78rem]" : "text-[1.14rem]",
              )}
            >
              $24,860.42
            </p>
            <span
              className={cn(
                "mb-0.5 inline-flex items-center gap-0.5 text-muted-foreground",
                layout === "card" ? "text-[0.27rem]" : "text-[0.4rem]",
              )}
            >
              <ArrowUpRight className="size-[0.9em]" />
              4.8%
            </span>
          </div>
        </div>

        <svg
          aria-hidden="true"
          className="mt-[9%] h-10 w-full overflow-visible text-foreground/70"
          viewBox="0 0 220 42"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            className="app-preview__chart"
            d="M2 35C21 32 27 20 44 23C63 26 67 34 86 27C104 20 106 7 126 11C147 15 152 25 171 18C191 11 198 4 218 6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
        </svg>
      </div>

      <div className="mt-[7%] grid grid-cols-2 gap-2">
        <div className="app-preview__action flex items-center gap-2 rounded-xl border border-border bg-card p-[7%]">
          <span className="grid size-6 place-items-center rounded-lg bg-muted text-muted-foreground">
            <ArrowDownLeft className="size-3" />
          </span>
          <span
            className={cn(
              "font-medium",
              layout === "card" ? "text-[0.31rem]" : "text-[0.46rem]",
            )}
          >
            Receive
          </span>
        </div>
        <div className="app-preview__action flex items-center gap-2 rounded-xl border border-border bg-card p-[7%] [animation-delay:120ms]">
          <span className="grid size-6 place-items-center rounded-lg bg-muted text-muted-foreground">
            <ArrowUpRight className="size-3" />
          </span>
          <span
            className={cn(
              "font-medium",
              layout === "card" ? "text-[0.31rem]" : "text-[0.46rem]",
            )}
          >
            Send
          </span>
        </div>
      </div>

      <p
        className={cn(
          "mt-[8%] font-medium",
          layout === "card" ? "text-[0.34rem]" : "text-[0.5rem]",
        )}
      >
        Assets
      </p>
      <div className="mt-[4%] space-y-1.5">
        {assets.map((asset, index) => (
          <div
            key={asset.id}
            className="app-preview__asset flex items-center gap-2 rounded-xl bg-muted/65 px-2 py-1.5"
            style={{ "--asset-delay": `${index * 110}ms` } as CSSProperties}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-background font-mono text-[0.5rem] font-semibold">
              {asset.symbol}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate font-medium",
                  layout === "card" ? "text-[0.3rem]" : "text-[0.45rem]",
                )}
              >
                {asset.name}
              </p>
              <p
                className={cn(
                  "text-muted-foreground",
                  layout === "card" ? "text-[0.24rem]" : "text-[0.36rem]",
                )}
              >
                {asset.change}
              </p>
            </div>
            <span
              className={cn(
                "font-medium tabular-nums",
                layout === "card" ? "text-[0.29rem]" : "text-[0.43rem]",
              )}
            >
              {asset.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppPreview({
  className,
  layout = "default",
  title = "A partial crypto portfolio screen with an animated balance chart and asset list",
}: AppPreviewProps) {
  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "app-preview relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-foreground",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute bottom-[-25%] left-1/2 h-[108%] w-[58%] -translate-x-1/2 rounded-t-[2.15rem] border border-border bg-background/70 p-1.5"
      >
        <CryptoScreen layout={layout} />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[18%] bg-linear-to-t from-muted to-transparent"
      />

      <style>{`
        .app-preview__balance,
        .app-preview__action,
        .app-preview__asset {
          animation: app-preview-item 7.2s cubic-bezier(0.23, 1, 0.32, 1)
            infinite;
          transform-origin: 50% 100%;
        }

        .app-preview__asset {
          animation-delay: var(--asset-delay);
        }

        .app-preview__chart {
          stroke-dasharray: 280;
          animation: app-preview-chart 7.2s cubic-bezier(0.23, 1, 0.32, 1)
            infinite;
        }

        @keyframes app-preview-item {
          0%,
          14% {
            opacity: 0;
            transform: translate3d(0, 8px, 0) scale(0.97);
          }
          30%,
          92% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, -3px, 0) scale(0.98);
          }
        }

        @keyframes app-preview-chart {
          0%,
          20% {
            opacity: 0.3;
            stroke-dashoffset: 280;
          }
          42%,
          92% {
            opacity: 1;
            stroke-dashoffset: 0;
          }
          100% {
            opacity: 0.3;
            stroke-dashoffset: -30;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .app-preview__balance,
          .app-preview__action,
          .app-preview__asset,
          .app-preview__chart {
            animation: none;
            opacity: 1;
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}
