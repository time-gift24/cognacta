"use client";

import { Bell, Cloud, Database, ShieldCheck } from "lucide-react";
import type { ComponentType, CSSProperties } from "react";
import { cn } from "@/lib/beui/utils";

const events = [
  { id: "alert", Icon: Bell, primaryWidth: "42%", secondaryWidth: "76%" },
  {
    id: "access",
    Icon: ShieldCheck,
    primaryWidth: "52%",
    secondaryWidth: "68%",
  },
  { id: "sync", Icon: Cloud, primaryWidth: "38%", secondaryWidth: "73%" },
  {
    id: "storage",
    Icon: Database,
    primaryWidth: "47%",
    secondaryWidth: "64%",
  },
] satisfies Array<{
  id: string;
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  primaryWidth: string;
  secondaryWidth: string;
}>;

export type IsometricPreviewTwoProps = {
  className?: string;
  title?: string;
};

export function IsometricPreviewTwo({
  className,
  title = "An animated event queue moving focus through four system updates",
}: IsometricPreviewTwoProps) {
  return (
    <div
      role="img"
      aria-label={title}
      style={
        {
          "--queue-grid": "clamp(1rem, 5cqw, 2.25rem)",
          "--queue-half-grid": "clamp(0.5rem, 2.5cqw, 1.125rem)",
          "--queue-gap": "clamp(0.25rem, 0.85cqw, 0.375rem)",
          "--queue-blue":
            "color-mix(in oklab, var(--color-accent) 52%, var(--color-violet))",
          containerType: "inline-size",
        } as CSSProperties
      }
      className={cn(
        "isometric-preview-two relative aspect-[4/3] w-full overflow-hidden bg-muted text-foreground",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="isometric-preview-two__grid absolute inset-0"
      />

      <div className="absolute inset-x-0 top-1/2 mx-auto flex w-[calc(var(--queue-grid)+var(--queue-grid)+var(--queue-grid)+var(--queue-grid)+var(--queue-grid)+var(--queue-grid))] -translate-y-[51%] flex-col gap-[var(--queue-gap)]">
        {events.map(({ id, Icon, primaryWidth, secondaryWidth }, index) => (
          <div
            key={id}
            aria-hidden="true"
            className="isometric-preview-two__row relative flex h-[calc(var(--queue-grid)+var(--queue-grid)-var(--queue-gap))] items-center gap-[clamp(0.4rem,1.35vw,0.7rem)] rounded-[clamp(0.4rem,1vw,0.625rem)] border border-border bg-card px-[clamp(0.4rem,1.35vw,0.7rem)] shadow-sm"
            style={
              {
                "--queue-delay": `${-(8 - index * 2)}s`,
              } as CSSProperties
            }
          >
            <span className="grid aspect-square h-[66%] shrink-0 place-items-center rounded-[clamp(0.3rem,0.8vw,0.5rem)] bg-(--queue-blue)/10 text-(--queue-blue)">
              <Icon className="size-[43%]" strokeWidth={1.6} />
            </span>

            <span className="flex min-w-0 flex-1 flex-col gap-[clamp(0.3rem,1vw,0.55rem)]">
              <span
                className="h-[clamp(0.25rem,0.75vw,0.42rem)] rounded-full bg-(--queue-blue)/25"
                style={{ width: primaryWidth }}
              />
              <span
                className="h-[clamp(0.25rem,0.75vw,0.42rem)] rounded-full bg-foreground/10"
                style={{ width: secondaryWidth }}
              />
            </span>

            <span className="isometric-preview-two__outline pointer-events-none absolute inset-0 rounded-[inherit] border border-(--queue-blue)" />
            <span className="isometric-preview-two__badge absolute -right-[clamp(0.25rem,0.75vw,0.4rem)] -top-[clamp(0.25rem,0.75vw,0.4rem)] grid size-[clamp(0.85rem,2.2vw,1.2rem)] place-items-center rounded-full bg-(--queue-blue) text-[clamp(0.4rem,0.9vw,0.55rem)] font-semibold text-(--color-accent-fg) shadow-sm">
              {index + 1}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        .isometric-preview-two__grid {
          background-image:
            linear-gradient(to right, color-mix(in oklab, currentColor 5%, transparent) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in oklab, currentColor 5%, transparent) 1px, transparent 1px);
          background-position:
            calc(50% + var(--queue-half-grid))
            calc(50% + var(--queue-half-grid));
          background-size: var(--queue-grid) var(--queue-grid);
          mask-image: radial-gradient(circle at center, black 25%, transparent 78%);
          opacity: 0.5;
        }

        .isometric-preview-two__row {
          animation: isometric-preview-two-row 8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
          animation-delay: var(--queue-delay);
          transform-origin: center;
        }

        .isometric-preview-two__outline,
        .isometric-preview-two__badge {
          animation: isometric-preview-two-focus 8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
          animation-delay: var(--queue-delay);
        }

        .isometric-preview-two__badge {
          animation-name: isometric-preview-two-badge;
          transform-origin: center;
        }

        @keyframes isometric-preview-two-row {
          0%,
          17% {
            opacity: 1;
            transform: translateY(-2px);
          }
          24%,
          93% {
            opacity: 0.42;
            transform: translateY(0);
          }
          100% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }

        @keyframes isometric-preview-two-focus {
          0%,
          17%,
          100% {
            opacity: 1;
          }
          24%,
          93% {
            opacity: 0;
          }
        }

        @keyframes isometric-preview-two-badge {
          0%,
          17%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          24%,
          93% {
            opacity: 0;
            transform: scale(0.72);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .isometric-preview-two__row,
          .isometric-preview-two__outline,
          .isometric-preview-two__badge {
            animation: none;
          }

          .isometric-preview-two__row:not(:first-child) {
            opacity: 0.42;
          }

          .isometric-preview-two__row:not(:first-child) .isometric-preview-two__outline,
          .isometric-preview-two__row:not(:first-child) .isometric-preview-two__badge {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
