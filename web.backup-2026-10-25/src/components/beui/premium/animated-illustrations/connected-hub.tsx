"use client";

import { cn } from "@/lib/beui/utils";

type ProviderNode = {
  label: string;
  logoUrl: string;
  className: string;
  largeLogo?: boolean;
};

const providerNodes: ProviderNode[] = [
  {
    label: "Dodo Payments",
    logoUrl: "https://cdn.simpleicons.org/dodopayments",
    className: "top-[55%] left-[18%]",
  },
  {
    label: "Stripe",
    logoUrl: "https://cdn.simpleicons.org/stripe",
    className: "top-[28%] left-[36%]",
  },
  {
    label: "Polar",
    logoUrl: "https://polar.sh/assets/brand/app-icon.png",
    className: "top-[28%] left-[64%]",
    largeLogo: true,
  },
  {
    label: "Paddle",
    logoUrl: "https://cdn.simpleicons.org/paddle",
    className: "top-[55%] left-[82%]",
  },
];

const connectionPaths = [
  "M115 264 C208 264 190 360 320 360",
  "M230 134 C230 254 270 272 320 360",
  "M410 134 C410 254 370 272 320 360",
  "M525 264 C432 264 450 360 320 360",
] as const;

export type ConnectedHubLayout = "default" | "card";

export type ConnectedHubProps = {
  className?: string;
  layout?: ConnectedHubLayout;
  title?: string;
};

export function ConnectedHub({
  className,
  layout = "default",
  title = "Four services connected to one central hub",
}: ConnectedHubProps) {
  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "connected-hub relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-[oklch(0.25_0_0)] [--hub-arc-1:#e7e8ec] [--hub-arc-2:#e4e6eb] [--hub-arc-3:#e1e4ea] [--hub-connection:#b8c9e5] [--hub-dot:#d8dbe1] [--hub-signal:#6d9df4] dark:text-[oklch(0.94_0_0)] dark:[--hub-arc-1:oklch(0.3_0.01_250)] dark:[--hub-arc-2:oklch(0.28_0.01_250)] dark:[--hub-arc-3:oklch(0.26_0.01_250)] dark:[--hub-connection:oklch(0.55_0.06_250)] dark:[--hub-dot:oklch(0.38_0.01_250)] dark:[--hub-signal:oklch(0.72_0.14_250)]",
        className,
      )}
    >
      <div aria-hidden="true" className="absolute inset-0">
        <div className="absolute inset-[5%] bg-[radial-gradient(circle,var(--hub-dot)_1px,transparent_1px)] bg-size-[12px_12px] opacity-45" />

        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 640 480"
          fill="none"
          preserveAspectRatio="xMidYMid meet"
        >
          <path
            d="M68 410 A252 252 0 0 1 572 410"
            stroke="var(--hub-arc-1)"
            strokeWidth="30"
            opacity="0.72"
          />
          <path
            d="M120 410 A200 200 0 0 1 520 410"
            stroke="var(--hub-arc-2)"
            strokeWidth="26"
            opacity="0.74"
          />
          <path
            d="M172 410 A148 148 0 0 1 468 410"
            stroke="var(--hub-arc-3)"
            strokeWidth="22"
            opacity="0.76"
          />

          {connectionPaths.map((path, index) => (
            <g key={path}>
              <path
                d={path}
                pathLength="100"
                stroke="var(--hub-connection)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d={path}
                pathLength="100"
                className="connected-hub__signal"
                stroke="var(--hub-signal)"
                strokeWidth="3"
                strokeLinecap="round"
                style={{ animationDelay: `${index * -1.35}s` }}
              />
            </g>
          ))}
        </svg>

        {providerNodes.map((node) => {
          return (
            <div
              key={node.label}
              className={cn(
                "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 shadow-[0_8px_24px_rgba(74,91,122,0.08)] dark:border-white/15 dark:bg-[oklch(0.96_0_0/0.94)] dark:shadow-none",
                layout === "card" ? "size-14" : "size-20",
                node.className,
              )}
            >
              {/* biome-ignore lint/performance/noImgElement: provider marks are served as official lightweight brand assets. */}
              <img
                src={node.logoUrl}
                alt=""
                aria-hidden="true"
                className={cn(
                  "object-contain",
                  layout === "card" ? "size-6" : "size-8",
                  node.largeLogo &&
                    (layout === "card"
                      ? "size-7 rounded-lg"
                      : "size-10 rounded-xl"),
                )}
              />
            </div>
          );
        })}

        <div
          className={cn(
            "absolute top-[75%] left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#dfe5f2] bg-white/80 shadow-[0_10px_28px_rgba(91,117,173,0.09)] dark:border-[oklch(0.4_0.04_250)] dark:bg-[oklch(0.24_0_0/0.9)] dark:shadow-none",
            layout === "card" ? "p-1.5" : "p-2",
          )}
        >
          <div
            className={cn(
              "rounded-full border border-[#d6e0f5] bg-white/80 dark:border-[oklch(0.45_0.05_250)] dark:bg-[oklch(0.28_0_0/0.9)]",
              layout === "card" ? "p-1" : "p-1.5",
            )}
          >
            <div
              className={cn(
                "flex items-center rounded-full bg-linear-to-r from-[#789cf3] to-[#5d7fe7] text-white shadow-[0_7px_18px_rgba(93,127,231,0.24)]",
                layout === "card" ? "h-9 px-4" : "h-11 px-5",
              )}
            >
              <span
                className={cn(
                  "whitespace-nowrap font-medium",
                  layout === "card" ? "text-xs" : "text-sm",
                )}
              >
                Payments
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .connected-hub__signal {
          stroke-dasharray: 3 97;
          animation: connected-hub-flow 5.4s linear infinite;
          will-change: stroke-dashoffset, opacity;
        }

        @keyframes connected-hub-flow {
          0% {
            opacity: 0;
            stroke-dashoffset: 100;
          }
          10%,
          82% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            stroke-dashoffset: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .connected-hub__signal {
            animation: none;
          }

          .connected-hub__signal {
            opacity: 0.7;
            stroke-dasharray: 3 18;
          }
        }
      `}</style>
    </div>
  );
}
