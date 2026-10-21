"use client";

import { Blocks, Cable, Grid3X3, Network } from "lucide-react";
import { cn } from "@/lib/beui/utils";

type Destination = {
  label: string;
  logoUrl?: string;
  Icon?: typeof Blocks;
  position: string;
};

const destinations: Destination[] = [
  {
    label: "Internal tools",
    Icon: Blocks,
    position: "top-[20%]",
  },
  {
    label: "Anthropic",
    logoUrl: "https://cdn.simpleicons.org/anthropic",
    position: "top-1/2",
  },
  {
    label: "OpenAI",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/OpenAI_logo_2025_%28symbol%29.svg/120px-OpenAI_logo_2025_%28symbol%29.svg.png",
    position: "top-[80%]",
  },
];

const routes = [
  "M158 240 H230 V176 H420 V96 H482",
  "M158 240 H230 V304 H420 V240 H482",
  "M158 240 H230 V304 H420 V384 H482",
] as const;

export type ConnectedHubFourLayout = "default" | "card";

export type ConnectedHubFourProps = {
  className?: string;
  layout?: ConnectedHubFourLayout;
  title?: string;
};

export function ConnectedHubFour({
  className,
  layout = "default",
  title = "One product routing API and MCP connections into three tool destinations",
}: ConnectedHubFourProps) {
  const compact = layout === "card";

  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "connected-hub-four relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-foreground",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-[4%] bg-[radial-gradient(circle,var(--color-border)_1px,transparent_1px)] bg-size-[12px_12px] opacity-50"
      />

      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 640 480"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        {routes.map((route, index) => (
          <g key={route}>
            <path
              d={route}
              pathLength="100"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-border-strong"
            />
            <path
              d={route}
              pathLength="100"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="connected-hub-four__signal text-accent"
              style={{ animationDelay: `${index * -1.7}s` }}
            />
          </g>
        ))}
      </svg>

      <div
        className={cn(
          "absolute top-1/2 left-[18%] z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-3xl border border-border bg-background",
          compact ? "size-[4.5rem]" : "size-24",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-2xl bg-muted text-accent",
            compact ? "size-14" : "size-[4.5rem]",
          )}
        >
          <Grid3X3 className={compact ? "size-7" : "size-9"} />
        </div>
      </div>

      <RouteLabel
        compact={compact}
        className="top-[36.7%]"
        icon={Network}
        label="API"
      />
      <RouteLabel
        compact={compact}
        className="top-[63.3%]"
        icon={Cable}
        label="MCP"
      />

      {destinations.map(({ label, logoUrl, Icon, position }) => (
        <div
          key={label}
          className={cn(
            "absolute left-[82%] z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-3xl border border-border bg-background",
            compact ? "size-[4.25rem]" : "size-[5.5rem]",
            position,
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center rounded-2xl bg-muted",
              compact ? "size-12" : "size-[4.25rem]",
            )}
          >
            {logoUrl ? (
              // biome-ignore lint/performance/noImgElement: provider marks are official lightweight brand assets.
              <img
                src={logoUrl}
                alt=""
                aria-hidden="true"
                className={cn(
                  "object-contain dark:invert",
                  compact ? "size-5" : "size-7",
                )}
              />
            ) : Icon ? (
              <Icon
                aria-hidden="true"
                className={cn("text-foreground", compact ? "size-5" : "size-7")}
              />
            ) : null}
          </div>
        </div>
      ))}

      <style>{`
        .connected-hub-four__signal {
          stroke-dasharray: 3 97;
          animation: connected-hub-four-flow 5.2s linear infinite;
          will-change: stroke-dashoffset, opacity;
        }

        @keyframes connected-hub-four-flow {
          0% {
            opacity: 0;
            stroke-dashoffset: 100;
          }
          10%,
          84% {
            opacity: 0.9;
          }
          100% {
            opacity: 0;
            stroke-dashoffset: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .connected-hub-four__signal {
            animation: none;
            opacity: 0.55;
            stroke-dasharray: 3 18;
          }
        }
      `}</style>
    </div>
  );
}

function RouteLabel({
  className,
  compact,
  icon: Icon,
  label,
}: {
  className: string;
  compact: boolean;
  icon: typeof Network;
  label: string;
}) {
  return (
    <div
      className={cn(
        "absolute left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center rounded-full border border-border bg-background",
        compact ? "gap-2 py-1 pr-3 pl-1" : "gap-2.5 py-1.5 pr-4 pl-1.5",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-muted text-foreground",
          compact ? "size-7" : "size-8",
        )}
      >
        <Icon className={compact ? "size-3.5" : "size-4"} />
      </span>
      <span
        className={cn(
          "font-medium text-foreground",
          compact ? "text-[10px]" : "text-xs",
        )}
      >
        {label}
      </span>
    </div>
  );
}
