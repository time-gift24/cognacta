"use client";

import {
  Bell,
  Boxes,
  Database,
  FileText,
  type LucideIcon,
  MessageSquareText,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/beui/utils";

type StackIcon = {
  name: string;
  icon: LucideIcon;
  className: string;
};

const stackIcons: StackIcon[] = [
  {
    name: "Search",
    icon: Search,
    className:
      "bg-[oklch(0.92_0.04_250)] text-[oklch(0.55_0.15_250)] dark:bg-[oklch(0.3_0.04_250)] dark:text-[oklch(0.78_0.1_250)]",
  },
  {
    name: "Document",
    icon: FileText,
    className:
      "bg-[oklch(0.93_0.045_80)] text-[oklch(0.58_0.13_70)] dark:bg-[oklch(0.31_0.04_70)] dark:text-[oklch(0.8_0.11_70)]",
  },
  {
    name: "Message",
    icon: MessageSquareText,
    className:
      "bg-[oklch(0.92_0.045_150)] text-[oklch(0.52_0.12_150)] dark:bg-[oklch(0.3_0.04_150)] dark:text-[oklch(0.79_0.1_150)]",
  },
  {
    name: "Modules",
    icon: Boxes,
    className:
      "bg-[oklch(0.91_0.055_305)] text-[oklch(0.54_0.16_305)] dark:bg-[oklch(0.3_0.045_305)] dark:text-[oklch(0.78_0.11_305)]",
  },
  {
    name: "Database",
    icon: Database,
    className:
      "bg-[oklch(0.92_0.04_220)] text-[oklch(0.53_0.12_220)] dark:bg-[oklch(0.3_0.04_220)] dark:text-[oklch(0.79_0.1_220)]",
  },
  {
    name: "Security",
    icon: ShieldCheck,
    className:
      "bg-[oklch(0.93_0.045_25)] text-[oklch(0.58_0.14_25)] dark:bg-[oklch(0.3_0.04_25)] dark:text-[oklch(0.8_0.1_25)]",
  },
  {
    name: "Notification",
    icon: Bell,
    className:
      "bg-[oklch(0.93_0.05_95)] text-[oklch(0.58_0.13_90)] dark:bg-[oklch(0.31_0.04_90)] dark:text-[oklch(0.81_0.1_90)]",
  },
];

export type HorizontalStackLayout = "default" | "card";

export type HorizontalStackProps = {
  className?: string;
  layout?: HorizontalStackLayout;
  title?: string;
};

export function HorizontalStack({
  className,
  layout = "default",
  title = "A horizontal rolling stack of icon cards moving through focus",
}: HorizontalStackProps) {
  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "horizontal-stack relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-foreground",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          className={cn(
            "relative [transform-style:preserve-3d]",
            layout === "card" ? "size-14" : "size-20",
          )}
        >
          {stackIcons.map((item, index) => {
            const Icon = item.icon;
            const phase = ((index - 3 + stackIcons.length) % 7) * 1.4;

            return (
              <div
                key={item.name}
                data-step={index + 1}
                className={cn(
                  "horizontal-stack__item absolute inset-0 grid place-items-center rounded-2xl border border-background/70",
                  item.className,
                  layout === "card" && "rounded-xl",
                )}
                style={{ animationDelay: `-${phase}s` } as CSSProperties}
              >
                <Icon
                  aria-hidden="true"
                  className={layout === "card" ? "size-5" : "size-7"}
                  strokeWidth={1.7}
                />
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .horizontal-stack__item {
          animation: horizontal-stack-cycle 9.8s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
          backface-visibility: hidden;
          will-change: transform, opacity;
        }

        @keyframes horizontal-stack-cycle {
          0%,
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 48px) scale(1.08);
            z-index: 40;
          }
          14.285% {
            opacity: 0.78;
            transform: translate3d(108%, 0, 24px) scale(0.92);
            z-index: 30;
          }
          28.57% {
            opacity: 0.48;
            transform: translate3d(208%, 0, 8px) scale(0.82);
            z-index: 20;
          }
          42.855% {
            opacity: 0.2;
            transform: translate3d(300%, 0, 0) scale(0.72);
            z-index: 10;
          }
          48% {
            opacity: 0;
            transform: translate3d(340%, 0, 0) scale(0.68);
            z-index: 0;
          }
          52% {
            opacity: 0;
            transform: translate3d(-340%, 0, 0) scale(0.68);
            z-index: 0;
          }
          57.14% {
            opacity: 0.2;
            transform: translate3d(-300%, 0, 0) scale(0.72);
            z-index: 10;
          }
          71.425% {
            opacity: 0.48;
            transform: translate3d(-208%, 0, 8px) scale(0.82);
            z-index: 20;
          }
          85.71% {
            opacity: 0.78;
            transform: translate3d(-108%, 0, 24px) scale(0.92);
            z-index: 30;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .horizontal-stack__item {
            animation: none;
          }

          .horizontal-stack__item[data-step="1"] {
            opacity: 0.2;
            transform: translate3d(-300%, 0, 0) scale(0.72);
            z-index: 10;
          }
          .horizontal-stack__item[data-step="2"] {
            opacity: 0.48;
            transform: translate3d(-208%, 0, 8px) scale(0.82);
            z-index: 20;
          }
          .horizontal-stack__item[data-step="3"] {
            opacity: 0.78;
            transform: translate3d(-108%, 0, 24px) scale(0.92);
            z-index: 30;
          }
          .horizontal-stack__item[data-step="4"] {
            opacity: 1;
            transform: translate3d(0, 0, 48px) scale(1.08);
            z-index: 40;
          }
          .horizontal-stack__item[data-step="5"] {
            opacity: 0.78;
            transform: translate3d(108%, 0, 24px) scale(0.92);
            z-index: 30;
          }
          .horizontal-stack__item[data-step="6"] {
            opacity: 0.48;
            transform: translate3d(208%, 0, 8px) scale(0.82);
            z-index: 20;
          }
          .horizontal-stack__item[data-step="7"] {
            opacity: 0.2;
            transform: translate3d(300%, 0, 0) scale(0.72);
            z-index: 10;
          }
        }
      `}</style>
    </div>
  );
}
