"use client";

import {
  BatteryMedium,
  Bot,
  Check,
  FileText,
  ListChecks,
  Send,
  Wifi,
} from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/beui/utils";

const planItems = [
  { id: "position", label: "Clarify the position" },
  { id: "launch", label: "Draft launch sequence" },
  { id: "review", label: "Schedule final review" },
] as const;

export type AppPreviewTwoLayout = "default" | "card";

export type AppPreviewTwoProps = {
  className?: string;
  layout?: AppPreviewTwoLayout;
  title?: string;
};

function StatusBar({ layout }: { layout: AppPreviewTwoLayout }) {
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

function AiScreen({ layout }: { layout: AppPreviewTwoLayout }) {
  return (
    <div className="relative h-full overflow-hidden rounded-t-[1.8rem] border border-border bg-background px-[8%]">
      <StatusBar layout={layout} />

      <div className="mt-[10%] flex items-center justify-between">
        <div>
          <p
            className={cn(
              "text-muted-foreground",
              layout === "card" ? "text-[0.31rem]" : "text-[0.46rem]",
            )}
          >
            Workspace
          </p>
          <p
            className={cn(
              "font-semibold tracking-tight",
              layout === "card" ? "text-[0.64rem]" : "text-[0.94rem]",
            )}
          >
            Ask your assistant
          </p>
        </div>
        <span className="grid size-6 place-items-center rounded-full bg-muted text-muted-foreground">
          <Bot className="size-3" strokeWidth={1.8} />
        </span>
      </div>

      <div className="app-ai__prompt mt-[9%] ml-auto w-[88%] rounded-2xl rounded-br-md border border-border bg-muted px-[8%] py-[7%] text-foreground">
        <p
          className={cn(
            "leading-snug",
            layout === "card" ? "text-[0.34rem]" : "text-[0.5rem]",
          )}
        >
          Turn these notes into a focused launch plan.
        </p>
      </div>

      <div className="mt-[8%] min-h-[48%]">
        <div className="app-ai__thinking flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Bot className="size-3" strokeWidth={1.8} />
          </span>
          <span
            className={cn(
              "app-ai__shimmer font-medium text-muted-foreground",
              layout === "card" ? "text-[0.31rem]" : "text-[0.46rem]",
            )}
          >
            Thinking through the brief…
          </span>
        </div>

        <div className="app-ai__response">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Bot className="size-3" strokeWidth={1.8} />
            </span>
            <p
              className={cn(
                "font-medium",
                layout === "card" ? "text-[0.34rem]" : "text-[0.5rem]",
              )}
            >
              Launch plan ready
            </p>
          </div>

          <p
            className={cn(
              "mt-[6%] leading-relaxed text-muted-foreground",
              layout === "card" ? "text-[0.29rem]" : "text-[0.43rem]",
            )}
          >
            I organized the brief into three clear moves with owners and review
            points.
          </p>

          <div className="mt-[6%] space-y-1.5">
            {planItems.map((item, index) => (
              <div
                key={item.id}
                className="app-ai__plan flex items-center gap-2 rounded-xl bg-muted/65 px-2 py-1.5"
                style={{ "--plan-delay": `${index * 120}ms` } as CSSProperties}
              >
                <span className="grid size-4 shrink-0 place-items-center rounded-full border border-border bg-background text-foreground">
                  <Check className="size-2.5" strokeWidth={2.3} />
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    layout === "card" ? "text-[0.3rem]" : "text-[0.45rem]",
                  )}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-[6%] flex gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-muted-foreground">
              <FileText className="size-2.5" />
              <span
                className={
                  layout === "card" ? "text-[0.25rem]" : "text-[0.38rem]"
                }
              >
                Brief
              </span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-muted-foreground">
              <ListChecks className="size-2.5" />
              <span
                className={
                  layout === "card" ? "text-[0.25rem]" : "text-[0.38rem]"
                }
              >
                Tasks
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="absolute right-[8%] bottom-[11%] left-[8%] flex items-center gap-2 rounded-xl border border-border bg-card p-1.5">
        <span
          className={cn(
            "min-w-0 flex-1 px-1.5 text-muted-foreground",
            layout === "card" ? "text-[0.28rem]" : "text-[0.42rem]",
          )}
        >
          Ask a follow-up
        </span>
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
          <Send className="size-3" strokeWidth={1.9} />
        </span>
      </div>
    </div>
  );
}

export function AppPreviewTwo({
  className,
  layout = "default",
  title = "A partial AI assistant screen that thinks through a prompt and builds a launch plan",
}: AppPreviewTwoProps) {
  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "app-ai relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-foreground",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute bottom-[-25%] left-1/2 h-[108%] w-[58%] -translate-x-1/2 rounded-t-[2.15rem] border border-border bg-background/70 p-1.5"
      >
        <AiScreen layout={layout} />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[18%] bg-linear-to-t from-muted to-transparent"
      />

      <style>{`
        .app-ai__prompt {
          animation: app-ai-prompt 8s cubic-bezier(0.23, 1, 0.32, 1) infinite;
          transform-origin: 100% 100%;
        }

        .app-ai__thinking {
          animation: app-ai-thinking 8s ease-in-out infinite;
        }

        .app-ai__shimmer {
          background: linear-gradient(
            90deg,
            color-mix(in oklab, var(--muted-foreground) 32%, transparent) 0%,
            var(--foreground) 48%,
            color-mix(in oklab, var(--muted-foreground) 32%, transparent) 100%
          );
          background-size: 220% 100%;
          background-clip: text;
          color: transparent;
          animation: app-ai-shimmer 1.5s linear infinite;
        }

        .app-ai__response {
          animation: app-ai-response 8s cubic-bezier(0.23, 1, 0.32, 1)
            infinite;
        }

        .app-ai__plan {
          animation: app-ai-plan 8s cubic-bezier(0.23, 1, 0.32, 1) infinite;
          animation-delay: var(--plan-delay);
        }

        @keyframes app-ai-prompt {
          0%,
          8% {
            opacity: 0;
            transform: scale(0.72);
          }
          20%,
          94% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.94);
          }
        }

        @keyframes app-ai-thinking {
          0%,
          18% {
            opacity: 0;
            transform: translate3d(0, 5px, 0);
          }
          28%,
          48% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
          56%,
          100% {
            opacity: 0;
            transform: translate3d(0, -3px, 0);
          }
        }

        @keyframes app-ai-shimmer {
          to {
            background-position: -220% 0;
          }
        }

        @keyframes app-ai-response {
          0%,
          48% {
            opacity: 0;
            transform: translate3d(0, 8px, 0);
          }
          60%,
          94% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, -3px, 0);
          }
        }

        @keyframes app-ai-plan {
          0%,
          55% {
            opacity: 0;
            transform: translate3d(0, 6px, 0) scale(0.98);
          }
          68%,
          94% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, -2px, 0) scale(0.99);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .app-ai__prompt,
          .app-ai__response,
          .app-ai__plan {
            animation: none;
            opacity: 1;
          }

          .app-ai__thinking {
            display: none;
          }

          .app-ai__shimmer {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
