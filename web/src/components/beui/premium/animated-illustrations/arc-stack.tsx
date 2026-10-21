"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/beui/utils";

export type ArcStackLayout = "default" | "card";
export type ArcStackShape = "portrait" | "circle";
export type ArcStackSize = "default" | "compact";

export type ArcStackItem = {
  id: string;
  content: ReactNode;
  className?: string;
};

export type ArcStackProps = {
  className?: string;
  items: ArcStackItem[];
  layout?: ArcStackLayout;
  shape?: ArcStackShape;
  size?: ArcStackSize;
  title: string;
};

export function ArcStack({
  className,
  items,
  layout = "default",
  shape = "portrait",
  size = "default",
  title,
}: ArcStackProps) {
  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "arc-stack relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-foreground",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center [perspective:900px]"
      >
        <div
          className={cn(
            "relative [transform-style:preserve-3d]",
            shape === "circle" ? "aspect-square" : "aspect-[4/5]",
            size === "compact"
              ? layout === "card"
                ? "h-[28%]"
                : "h-[24%]"
              : layout === "card"
                ? "h-[48%]"
                : "h-[46%]",
          )}
        >
          {items.map((item, index) => {
            const phase = ((index - 3 + items.length) % 7) * 1.4;

            return (
              <div
                key={item.id}
                data-step={index + 1}
                className={cn(
                  "arc-stack__card absolute inset-0 overflow-hidden rounded-xl border border-background/80 bg-background",
                  item.className,
                )}
                style={{ animationDelay: `-${phase}s` } as CSSProperties}
              >
                {item.content}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .arc-stack__card {
          animation: arc-stack-cycle 9.8s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
          backface-visibility: hidden;
          transform-origin: 50% 100%;
          will-change: transform, opacity;
        }

        @keyframes arc-stack-cycle {
          0%,
          100% {
            opacity: 1;
            transform: translate3d(0, -14%, 72px) rotate(0deg) scale(1.06);
            z-index: 50;
          }
          14.285% {
            opacity: 0.9;
            transform: translate3d(88%, 0, 42px) rotate(9deg) scale(0.91);
            z-index: 40;
          }
          28.57% {
            opacity: 0.52;
            transform: translate3d(166%, 29%, 16px) rotate(17deg) scale(0.74);
            z-index: 30;
          }
          42.855% {
            opacity: 0.12;
            transform: translate3d(220%, 61%, 0) rotate(23deg) scale(0.62);
            z-index: 10;
          }
          48% {
            opacity: 0;
            transform: translate3d(250%, 76%, 0) rotate(26deg) scale(0.58);
            z-index: 0;
          }
          52% {
            opacity: 0;
            transform: translate3d(-250%, 76%, 0) rotate(-26deg) scale(0.58);
            z-index: 0;
          }
          57.14% {
            opacity: 0.12;
            transform: translate3d(-220%, 61%, 0) rotate(-23deg) scale(0.62);
            z-index: 10;
          }
          71.425% {
            opacity: 0.52;
            transform: translate3d(-166%, 29%, 16px) rotate(-17deg) scale(0.74);
            z-index: 30;
          }
          85.71% {
            opacity: 0.9;
            transform: translate3d(-88%, 0, 42px) rotate(-9deg) scale(0.91);
            z-index: 40;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .arc-stack__card {
            animation: none;
          }

          .arc-stack__card[data-step="1"] {
            opacity: 0.12;
            transform: translate3d(-220%, 61%, 0) rotate(-23deg) scale(0.62);
            z-index: 10;
          }
          .arc-stack__card[data-step="2"] {
            opacity: 0.52;
            transform: translate3d(-166%, 29%, 16px) rotate(-17deg) scale(0.74);
            z-index: 30;
          }
          .arc-stack__card[data-step="3"] {
            opacity: 0.9;
            transform: translate3d(-88%, 0, 42px) rotate(-9deg) scale(0.91);
            z-index: 40;
          }
          .arc-stack__card[data-step="4"] {
            opacity: 1;
            transform: translate3d(0, -14%, 72px) rotate(0deg) scale(1.06);
            z-index: 50;
          }
          .arc-stack__card[data-step="5"] {
            opacity: 0.9;
            transform: translate3d(88%, 0, 42px) rotate(9deg) scale(0.91);
            z-index: 40;
          }
          .arc-stack__card[data-step="6"] {
            opacity: 0.52;
            transform: translate3d(166%, 29%, 16px) rotate(17deg) scale(0.74);
            z-index: 30;
          }
          .arc-stack__card[data-step="7"] {
            opacity: 0.12;
            transform: translate3d(220%, 61%, 0) rotate(23deg) scale(0.62);
            z-index: 10;
          }
        }
      `}</style>
    </div>
  );
}
