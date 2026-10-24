"use client";

import { UserRound, Workflow } from "lucide-react";
import { cn } from "@/lib/beui/utils";

type AppMark = {
  label: string;
  logoUrl: string;
};

const appGroups: AppMark[][] = [
  [
    {
      label: "Slack",
      logoUrl:
        "https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png",
    },
    {
      label: "Notion",
      logoUrl: "https://cdn.simpleicons.org/notion",
    },
  ],
  [
    {
      label: "Figma",
      logoUrl: "https://cdn.simpleicons.org/figma/F24E1E",
    },
    {
      label: "Google Drive",
      logoUrl: "https://cdn.simpleicons.org/googledrive/4285F4",
    },
  ],
];

const signalPaths = [
  "M320 126 V224",
  "M320 272 V304 Q320 342 282 342 H205",
  "M320 272 V304 Q320 342 358 342 H435",
] as const;

export type ConnectedHubThreeLayout = "default" | "card";

export type ConnectedHubThreeProps = {
  className?: string;
  layout?: ConnectedHubThreeLayout;
  title?: string;
};

export function ConnectedHubThree({
  className,
  layout = "default",
  title = "A user routed through one workflow into two connected app groups",
}: ConnectedHubThreeProps) {
  const compact = layout === "card";

  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "connected-hub-three relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-foreground",
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
        <path
          d="M282 92 H224 Q164 92 164 152 V342 H176"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="7 9"
          strokeLinecap="round"
          className="text-border"
        />
        <path
          d="M358 92 H416 Q476 92 476 152 V342 H464"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="7 9"
          strokeLinecap="round"
          className="text-border"
        />

        {signalPaths.map((path, index) => (
          <g key={path}>
            <path
              d={path}
              pathLength="100"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="text-border"
            />
            <path
              d={path}
              pathLength="100"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="connected-hub-three__signal text-primary"
              style={{ animationDelay: `${index * -1.6}s` }}
            />
          </g>
        ))}

        {[
          [282, 92],
          [358, 92],
          [320, 126],
          [320, 224],
          [205, 342],
          [435, 342],
        ].map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle
              cx={cx}
              cy={cy}
              r="7"
              fill="var(--color-background)"
              stroke="var(--color-border)"
            />
            <circle cx={cx} cy={cy} r="2.5" fill="var(--color-primary)" />
          </g>
        ))}
      </svg>

      <div
        className={cn(
          "absolute top-[19%] left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-border bg-background",
          compact ? "size-14" : "size-[4.5rem]",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-primary/10 text-primary",
            compact ? "size-9" : "size-12",
          )}
        >
          <UserRound className={compact ? "size-5" : "size-7"} />
        </div>
      </div>

      <div className="absolute top-[52%] left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <div
          aria-hidden="true"
          className="connected-hub-three__pulse absolute -inset-2 rounded-2xl border border-primary/30"
        />
        <div
          className={cn(
            "relative flex items-center justify-center rounded-2xl border border-border bg-background text-primary",
            compact ? "size-12" : "size-16",
          )}
        >
          <Workflow className={compact ? "size-5" : "size-7"} />
        </div>
      </div>

      {appGroups.map((apps, groupIndex) => (
        <div
          key={apps.map((app) => app.label).join("-")}
          className={cn(
            "absolute top-[76%] z-10 flex -translate-x-1/2 -translate-y-1/2 items-center rounded-2xl border border-border bg-background",
            compact ? "gap-1.5 p-1.5" : "gap-2 p-2",
            groupIndex === 0 ? "left-[28%]" : "left-[72%]",
          )}
        >
          {apps.map((app) => (
            <div
              key={app.label}
              className={cn(
                "flex items-center justify-center rounded-xl bg-muted",
                compact ? "size-10" : "size-12",
              )}
            >
              {/* biome-ignore lint/performance/noImgElement: integration marks are official lightweight brand assets. */}
              <img
                src={app.logoUrl}
                alt=""
                aria-hidden="true"
                className={cn(
                  "object-contain",
                  compact ? "size-[1.125rem]" : "size-5",
                )}
              />
            </div>
          ))}
        </div>
      ))}

      <style>{`
        .connected-hub-three__signal {
          stroke-dasharray: 4 96;
          animation: connected-hub-three-flow 4.8s linear infinite;
          will-change: stroke-dashoffset, opacity;
        }

        .connected-hub-three__pulse {
          animation: connected-hub-three-pulse 4.8s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
          will-change: transform, opacity;
        }

        @keyframes connected-hub-three-flow {
          0% {
            opacity: 0;
            stroke-dashoffset: 100;
          }
          12%,
          82% {
            opacity: 0.9;
          }
          100% {
            opacity: 0;
            stroke-dashoffset: 0;
          }
        }

        @keyframes connected-hub-three-pulse {
          0%,
          58%,
          100% {
            opacity: 0.55;
            transform: scale(1);
          }
          72% {
            opacity: 0;
            transform: scale(1.16);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .connected-hub-three__signal,
          .connected-hub-three__pulse {
            animation: none;
          }

          .connected-hub-three__signal {
            opacity: 0.55;
            stroke-dasharray: 4 18;
          }
        }
      `}</style>
    </div>
  );
}
