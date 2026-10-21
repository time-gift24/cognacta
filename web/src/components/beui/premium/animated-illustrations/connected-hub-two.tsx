"use client";

import { cn } from "@/lib/beui/utils";

type IntegrationNode = {
  label: string;
  logoUrl: string;
  position: "far-left" | "left" | "right" | "far-right";
};

const integrations: IntegrationNode[] = [
  {
    label: "Linear",
    logoUrl: "https://cdn.simpleicons.org/linear",
    position: "far-left",
  },
  {
    label: "Figma",
    logoUrl: "https://cdn.simpleicons.org/figma",
    position: "left",
  },
  {
    label: "Notion",
    logoUrl: "https://cdn.simpleicons.org/notion",
    position: "right",
  },
  {
    label: "Google Drive",
    logoUrl: "https://cdn.simpleicons.org/googledrive",
    position: "far-right",
  },
];

const nodePosition = {
  "far-left": "left-[20.5%]",
  left: "left-[34.5%]",
  right: "left-[65.5%]",
  "far-right": "left-[79.5%]",
} satisfies Record<IntegrationNode["position"], string>;

const signalPaths = [
  "M131 278 V152 Q131 104 179 104 H320 V224",
  "M221 278 V104 H320 V224",
  "M419 278 V104 H320 V224",
  "M509 278 V152 Q509 104 461 104 H320 V224",
] as const;

export type ConnectedHubTwoLayout = "default" | "card";

export type ConnectedHubTwoProps = {
  className?: string;
  layout?: ConnectedHubTwoLayout;
  title?: string;
};

export function ConnectedHubTwo({
  className,
  layout = "default",
  title = "Four apps connected through a shared workspace hub",
}: ConnectedHubTwoProps) {
  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "connected-hub-two relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-foreground",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 640 480"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        {signalPaths.map((path, index) => (
          <g key={path}>
            <path
              d={path}
              pathLength="100"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              className="text-border"
            />
            <path
              d={path}
              pathLength="100"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="connected-hub-two__signal text-foreground"
              style={{ animationDelay: `${index * -0.8}s` }}
            />
          </g>
        ))}

        <path
          d="M320 310 V374"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          className="text-border"
        />
      </svg>

      {integrations.map((integration) => (
        <div
          key={integration.label}
          className={cn(
            "absolute top-[58%] z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background",
            layout === "card" ? "size-10" : "size-14",
            nodePosition[integration.position],
          )}
        >
          {/* biome-ignore lint/performance/noImgElement: integration marks are official lightweight brand assets. */}
          <img
            src={integration.logoUrl}
            alt=""
            aria-hidden="true"
            className={cn(
              "object-contain",
              layout === "card" ? "size-[1.125rem]" : "size-6",
            )}
          />
        </div>
      ))}

      <div className="absolute top-[58%] left-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
        <div
          aria-hidden="true"
          className="connected-hub-two__ring absolute -inset-1.5 rounded-full border border-border"
        />
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full border border-border bg-background",
            layout === "card" ? "size-14" : "size-20",
          )}
        >
          {/* biome-ignore lint/performance/noImgElement: the Slack mark is an official lightweight brand asset. */}
          <img
            src="https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png"
            alt=""
            aria-hidden="true"
            className={cn(
              "object-contain",
              layout === "card" ? "size-6" : "size-8",
            )}
          />
        </div>
      </div>

      <div
        className={cn(
          "absolute top-[79%] left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background p-1",
          layout === "card" ? "min-w-20" : "min-w-28",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-secondary font-medium text-secondary-foreground",
            layout === "card" ? "h-7 px-3 text-[10px]" : "h-8 px-4 text-xs",
          )}
        >
          Connect apps
        </div>
      </div>

      <style>{`
        .connected-hub-two__signal {
          stroke-dasharray: 2 98;
          animation: connected-hub-two-flow 3.2s linear infinite;
          will-change: stroke-dashoffset, opacity;
        }

        .connected-hub-two__ring {
          animation: connected-hub-two-pulse 3.2s cubic-bezier(0.77, 0, 0.175, 1)
            infinite;
          will-change: transform, opacity;
        }

        @keyframes connected-hub-two-flow {
          0% {
            opacity: 0;
            stroke-dashoffset: 100;
          }
          12%,
          84% {
            opacity: 0.65;
          }
          100% {
            opacity: 0;
            stroke-dashoffset: 0;
          }
        }

        @keyframes connected-hub-two-pulse {
          0%,
          54%,
          100% {
            opacity: 0.5;
            transform: scale(1);
          }
          70% {
            opacity: 0;
            transform: scale(1.12);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .connected-hub-two__signal,
          .connected-hub-two__ring {
            animation: none;
          }

          .connected-hub-two__signal {
            opacity: 0.45;
            stroke-dasharray: 2 18;
          }
        }
      `}</style>
    </div>
  );
}
