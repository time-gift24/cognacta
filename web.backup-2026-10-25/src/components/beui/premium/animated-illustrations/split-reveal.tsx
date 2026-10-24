"use client";

import {
  BookOpenText,
  Check,
  Code2,
  Database,
  FileText,
  ListChecks,
  type LucideIcon,
  MessageSquareText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/beui/utils";

type ContextSource = {
  label: string;
  icon: LucideIcon;
  className: string;
  cardClassName: string;
  active?: boolean;
};

const contextSources: ContextSource[] = [
  {
    label: "Product docs",
    icon: BookOpenText,
    className: "top-[25%] left-[5%]",
    cardClassName: "top-[24%] left-[5%]",
  },
  {
    label: "API schema",
    icon: Code2,
    className: "top-[25%] right-[4%]",
    cardClassName: "top-[24%] right-[4%]",
    active: true,
  },
  {
    label: "Support notes",
    icon: MessageSquareText,
    className: "top-[39%] left-[-4%]",
    cardClassName: "top-[39%] left-[3%]",
  },
  {
    label: "Usage signals",
    icon: Database,
    className: "top-[39%] right-[7%]",
    cardClassName: "top-[39%] right-[7%]",
    active: true,
  },
  {
    label: "Release brief",
    icon: FileText,
    className: "top-[53%] left-[7%]",
    cardClassName: "top-[54%] left-[7%]",
    active: true,
  },
  {
    label: "Model policy",
    icon: ShieldCheck,
    className: "top-[53%] right-[-4%]",
    cardClassName: "top-[54%] right-[3%]",
  },
  {
    label: "Evaluation set",
    icon: ListChecks,
    className: "top-[67%] left-[2%]",
    cardClassName: "top-[69%] left-[2%]",
    active: true,
  },
  {
    label: "User intent",
    icon: UserRound,
    className: "top-[67%] right-[2%]",
    cardClassName: "top-[69%] right-[2%]",
  },
];

function ContextSourceLayer({
  className,
  layout,
}: {
  className: string;
  layout: SplitRevealLayout;
}) {
  return (
    <div className={cn("absolute inset-0", className)}>
      {contextSources.map((source) => {
        const Icon = source.icon;

        return (
          <div
            key={source.label}
            className={cn(
              "absolute flex w-[43%] items-center gap-1.5 rounded-full bg-white px-2 ring-1 ring-black/5 dark:bg-[oklch(0.24_0_0)] dark:ring-white/10",
              layout === "card" ? "h-7" : "h-8",
              layout === "card" ? source.cardClassName : source.className,
            )}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e2edf9] text-[#4c83b8] dark:bg-[oklch(0.3_0.035_245)] dark:text-[oklch(0.78_0.1_245)]">
              <Icon className="size-3" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-xs sm:text-sm">
              {source.label}
            </span>
            <span
              className={cn(
                "flex size-3.5 shrink-0 items-center justify-center rounded-full bg-[#d9f0e2] text-[#328455] dark:bg-[oklch(0.3_0.035_150)] dark:text-[oklch(0.79_0.1_150)]",
                source.active ? "opacity-100" : "opacity-35",
              )}
            >
              <Check className="size-2" strokeWidth={2.5} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

export type SplitRevealLayout = "default" | "card";

export type SplitRevealProps = {
  className?: string;
  layout?: SplitRevealLayout;
  title?: string;
};

export function SplitReveal({
  className,
  layout = "default",
  title = "Content changing from blurred to clear",
}: SplitRevealProps) {
  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "split-reveal relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-[oklch(0.25_0_0)] dark:text-[oklch(0.94_0_0)]",
        className,
      )}
    >
      <div aria-hidden="true" className="absolute inset-0">
        <div
          className={cn(
            "split-reveal__dots absolute inset-x-[8%] top-[24%] bg-[radial-gradient(circle,var(--split-dot)_1px,transparent_1px)] bg-size-[10px_10px] opacity-50 [--split-dot:#cfcfcf] dark:[--split-dot:oklch(0.42_0_0)]",
            layout === "card" ? "bottom-[19%]" : "bottom-[17%]",
          )}
        />

        <ContextSourceLayer
          className="split-reveal__after z-10"
          layout={layout}
        />
        <ContextSourceLayer
          className="split-reveal__before z-10"
          layout={layout}
        />

        <div className="absolute inset-y-0 left-[10%] z-20 w-[40%]">
          <div className="split-reveal__divider relative h-full w-full">
            <div className="absolute top-[7%] right-0 z-20 flex h-8 translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-white px-3 font-medium text-xs dark:bg-[oklch(0.24_0_0)] sm:text-sm">
              <span className="split-reveal__status-dot size-2 rounded-full bg-[#42a66c] dark:bg-[oklch(0.72_0.14_150)]" />
              Context refined
            </div>

            <div
              className={cn(
                "absolute top-[24%] right-0 left-0 bg-linear-to-r from-transparent via-[#b7daf4]/30 to-[#66b1e9]/45 dark:via-[oklch(0.6_0.1_240/0.2)] dark:to-[oklch(0.65_0.13_240/0.32)]",
                layout === "card" ? "bottom-[19%]" : "bottom-[17%]",
              )}
            >
              <span className="absolute top-[27%] right-[18%] size-1 rounded-full bg-white/85" />
              <span className="absolute top-[43%] right-[36%] size-1.5 rounded-full bg-white/75" />
              <span className="absolute top-[61%] right-[12%] size-1 rounded-full bg-white/90" />
              <span className="absolute top-[72%] right-[48%] size-1 rounded-full bg-[#89bfe9]/70" />
            </div>

            <div
              className={cn(
                "absolute right-0 w-px bg-linear-to-b from-[#5f9ee4]/35 via-[#5f9ee4] to-[#5f9ee4]/35 dark:from-[oklch(0.7_0.12_250/0.35)] dark:via-[oklch(0.7_0.12_250)] dark:to-[oklch(0.7_0.12_250/0.35)]",
                layout === "card"
                  ? "top-[calc(7%+2rem)] bottom-9"
                  : "top-[calc(7%+2rem)] bottom-[calc(1%+2.25rem)]",
              )}
            />

            <div
              className={cn(
                "absolute right-0 z-20 flex size-9 translate-x-1/2 items-center justify-center rounded-xl bg-white shadow-[0_5px_14px_rgba(36,36,36,0.08)] dark:bg-[oklch(0.28_0_0)] dark:shadow-none",
                layout === "card" ? "bottom-0" : "bottom-[1%]",
              )}
            >
              <span className="relative block size-4 rounded-[5px] bg-[#171717] dark:bg-[oklch(0.94_0_0)]">
                <span className="absolute inset-[4px] rounded-[2px] bg-white dark:bg-[oklch(0.19_0_0)]" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .split-reveal__before {
          filter: blur(2px);
          animation: split-reveal-before 7.2s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
          will-change: clip-path;
        }

        .split-reveal__after {
          animation: split-reveal-after 7.2s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
          will-change: clip-path;
        }

        .split-reveal__divider {
          animation: split-reveal-divider 7.2s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
          will-change: transform, opacity;
        }

        .split-reveal__status-dot {
          animation: split-reveal-confirm 7.2s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
          will-change: transform, opacity;
        }

        @keyframes split-reveal-before {
          0%,
          100% {
            clip-path: inset(0 65% 0 0);
          }
          50% {
            clip-path: inset(0 35% 0 0);
          }
        }

        @keyframes split-reveal-after {
          0%,
          100% {
            clip-path: inset(0 0 0 35%);
          }
          50% {
            clip-path: inset(0 0 0 65%);
          }
        }

        @keyframes split-reveal-divider {
          0%,
          100% {
            opacity: 0.72;
            transform: translateX(-37.5%);
          }
          50% {
            opacity: 1;
            transform: translateX(37.5%);
          }
        }

        @keyframes split-reveal-confirm {
          0%,
          100% {
            opacity: 0.45;
            transform: scale(0.92);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .split-reveal__before,
          .split-reveal__after,
          .split-reveal__divider,
          .split-reveal__status-dot {
            animation: none;
          }

          .split-reveal__before {
            clip-path: inset(0 50% 0 0);
          }

          .split-reveal__after {
            clip-path: inset(0 0 0 50%);
          }
        }
      `}</style>
    </div>
  );
}
