"use client";

import {
  Activity,
  Blocks,
  BrainCircuit,
  ClipboardCheck,
  Database,
  type LucideIcon,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/beui/utils";

type WorkflowStep = {
  label: string;
  icon: LucideIcon;
  iconClassName: string;
};

const workflowSteps: WorkflowStep[] = [
  {
    label: "Data sources",
    icon: Database,
    iconClassName:
      "bg-[#ead8d5] text-[#9f716b] dark:bg-[oklch(0.3_0.025_25)] dark:text-[oklch(0.78_0.07_25)]",
  },
  {
    label: "Prompt design",
    icon: MessageSquareText,
    iconClassName:
      "bg-[#cce1f5] text-[#4f8dc5] dark:bg-[oklch(0.3_0.035_245)] dark:text-[oklch(0.78_0.1_245)]",
  },
  {
    label: "Tool selection",
    icon: Blocks,
    iconClassName:
      "bg-[#f1d1a8] text-[#b77a36] dark:bg-[oklch(0.31_0.04_70)] dark:text-[oklch(0.8_0.11_70)]",
  },
  {
    label: "Reasoning loop",
    icon: BrainCircuit,
    iconClassName:
      "bg-[#dbcaf8] text-[#7c4bc8] dark:bg-[oklch(0.3_0.045_300)] dark:text-[oklch(0.78_0.11_300)]",
  },
  {
    label: "Safety checks",
    icon: ShieldCheck,
    iconClassName:
      "bg-[#cceaf5] text-[#4e9dbd] dark:bg-[oklch(0.3_0.035_220)] dark:text-[oklch(0.79_0.09_220)]",
  },
  {
    label: "Quality evals",
    icon: ClipboardCheck,
    iconClassName:
      "bg-[#d5efc7] text-[#659d4c] dark:bg-[oklch(0.3_0.035_140)] dark:text-[oklch(0.79_0.1_140)]",
  },
  {
    label: "Production monitor",
    icon: Activity,
    iconClassName:
      "bg-[#ecd9d5] text-[#a7756c] dark:bg-[oklch(0.3_0.025_25)] dark:text-[oklch(0.78_0.07_25)]",
  },
];

export type RollingStackProps = {
  className?: string;
  title?: string;
};

export function RollingStack({
  className,
  title = "A rolling stack of interface items moving through focus",
}: RollingStackProps) {
  return (
    <div
      role="img"
      aria-label={title}
      className={cn(
        "rolling-stack relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-[oklch(0.25_0_0)] dark:text-[oklch(0.94_0_0)]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="relative h-14 w-full [transform-style:preserve-3d]">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            const phase = ((index - 3 + workflowSteps.length) % 7) * 1.4;

            return (
              <div
                key={step.label}
                data-step={index + 1}
                className="rolling-stack__step absolute top-0 left-[9%] flex h-14 w-[82%] items-center gap-3 rounded-2xl bg-white px-4 dark:bg-[oklch(0.24_0_0)] sm:gap-4 sm:px-5"
                style={{ animationDelay: `-${phase}s` } as CSSProperties}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full sm:size-10",
                    step.iconClassName,
                  )}
                >
                  <Icon className="size-4.5 sm:size-5" strokeWidth={1.8} />
                </span>
                <span className="truncate font-medium text-base tracking-tight sm:text-lg">
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .rolling-stack__step {
          animation: rolling-stack-cycle 9.8s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
          backface-visibility: hidden;
          will-change: transform, opacity;
        }

        @keyframes rolling-stack-cycle {
          0%,
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 48px) scale(1);
            z-index: 40;
          }
          14.285% {
            opacity: 0.72;
            transform: translate3d(0, 82%, 24px) scale(0.92);
            z-index: 30;
          }
          28.57% {
            opacity: 0.42;
            transform: translate3d(0, 155%, 8px) scale(0.85);
            z-index: 20;
          }
          42.855% {
            opacity: 0.16;
            transform: translate3d(0, 220%, 0) scale(0.78);
            z-index: 10;
          }
          48% {
            opacity: 0;
            transform: translate3d(0, 260%, 0) scale(0.74);
            z-index: 0;
          }
          52% {
            opacity: 0;
            transform: translate3d(0, -260%, 0) scale(0.74);
            z-index: 0;
          }
          57.14% {
            opacity: 0.16;
            transform: translate3d(0, -220%, 0) scale(0.78);
            z-index: 10;
          }
          71.425% {
            opacity: 0.42;
            transform: translate3d(0, -155%, 8px) scale(0.85);
            z-index: 20;
          }
          85.71% {
            opacity: 0.72;
            transform: translate3d(0, -82%, 24px) scale(0.92);
            z-index: 30;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .rolling-stack__step {
            animation: none;
          }

          .rolling-stack__step[data-step="1"] {
            opacity: 0.16;
            transform: translate3d(0, -220%, 0) scale(0.78);
            z-index: 10;
          }
          .rolling-stack__step[data-step="2"] {
            opacity: 0.42;
            transform: translate3d(0, -155%, 8px) scale(0.85);
            z-index: 20;
          }
          .rolling-stack__step[data-step="3"] {
            opacity: 0.72;
            transform: translate3d(0, -82%, 24px) scale(0.92);
            z-index: 30;
          }
          .rolling-stack__step[data-step="4"] {
            opacity: 1;
            transform: translate3d(0, 0, 48px) scale(1);
            z-index: 40;
          }
          .rolling-stack__step[data-step="5"] {
            opacity: 0.72;
            transform: translate3d(0, 82%, 24px) scale(0.92);
            z-index: 30;
          }
          .rolling-stack__step[data-step="6"] {
            opacity: 0.42;
            transform: translate3d(0, 155%, 8px) scale(0.85);
            z-index: 20;
          }
          .rolling-stack__step[data-step="7"] {
            opacity: 0.16;
            transform: translate3d(0, 220%, 0) scale(0.78);
            z-index: 10;
          }
        }
      `}</style>
    </div>
  );
}
