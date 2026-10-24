"use client";

import {
  BatteryMedium,
  Bell,
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Wifi,
} from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/beui/utils";

const stories = ["A", "N", "M", "R"] as const;

export type AppPreviewThreeLayout = "default" | "card";

export type AppPreviewThreeProps = {
  className?: string;
  layout?: AppPreviewThreeLayout;
  title?: string;
};

function StatusBar({ layout }: { layout: AppPreviewThreeLayout }) {
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

function SocialScreen({ layout }: { layout: AppPreviewThreeLayout }) {
  return (
    <div className="h-full overflow-hidden rounded-t-[1.8rem] border border-border bg-background px-[8%]">
      <StatusBar layout={layout} />

      <div className="mt-[10%] flex items-center justify-between">
        <div>
          <p
            className={cn(
              "text-muted-foreground",
              layout === "card" ? "text-[0.31rem]" : "text-[0.46rem]",
            )}
          >
            Discover
          </p>
          <p
            className={cn(
              "font-semibold tracking-tight",
              layout === "card" ? "text-[0.64rem]" : "text-[0.94rem]",
            )}
          >
            Following
          </p>
        </div>
        <span className="relative grid size-6 place-items-center rounded-full bg-muted text-muted-foreground">
          <Bell className="size-3" strokeWidth={1.8} />
          <span className="absolute top-0 right-0 size-1.5 rounded-full bg-muted-foreground ring-2 ring-background" />
        </span>
      </div>

      <div className="mt-[8%] flex gap-3">
        {stories.map((story, index) => (
          <div
            key={story}
            className="app-social__story min-w-0 flex-1"
            style={{ "--story-delay": `${index * 90}ms` } as CSSProperties}
          >
            <div className="mx-auto grid aspect-square w-full max-w-10 place-items-center rounded-full border border-foreground/20 bg-muted p-0.5">
              <div className="grid size-full place-items-center rounded-full bg-background font-mono text-[0.46rem] font-medium">
                {story}
              </div>
            </div>
          </div>
        ))}
      </div>

      <article className="app-social__post mt-[9%] overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 p-[6%]">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted font-mono text-[0.46rem] font-medium">
            KM
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate font-medium",
                layout === "card" ? "text-[0.31rem]" : "text-[0.46rem]",
              )}
            >
              Kai Morgan
            </p>
            <p
              className={cn(
                "truncate text-muted-foreground",
                layout === "card" ? "text-[0.24rem]" : "text-[0.36rem]",
              )}
            >
              Lisbon · 12 min
            </p>
          </div>
          <MoreHorizontal className="size-3.5 text-muted-foreground" />
        </div>

        <div className="app-social__media relative aspect-[1.3/1] overflow-hidden bg-linear-to-br from-muted via-foreground/5 to-foreground/15">
          <div className="absolute inset-[18%] rotate-[-8deg] rounded-[32%] border border-background/70 bg-background/35" />
          <div className="absolute inset-[30%_20%_12%_38%] rotate-[10deg] rounded-[38%] border border-background/80 bg-background/45" />
        </div>

        <div className="p-[6%]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="app-social__like inline-flex items-center gap-1 text-foreground">
              <Heart className="size-3.5" fill="currentColor" />
              <span
                className={cn(
                  "tabular-nums",
                  layout === "card" ? "text-[0.27rem]" : "text-[0.4rem]",
                )}
              >
                248
              </span>
            </span>
            <MessageCircle className="size-3.5" />
            <Send className="size-3.5" />
            <Bookmark className="ml-auto size-3.5" />
          </div>
          <p
            className={cn(
              "mt-[6%] leading-relaxed",
              layout === "card" ? "text-[0.29rem]" : "text-[0.43rem]",
            )}
          >
            Morning light, quiet streets, and nowhere else to be.
          </p>
        </div>
      </article>

      <article className="app-social__post mt-2 flex items-center gap-2 rounded-xl bg-muted/65 p-[6%] [animation-delay:220ms]">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-background font-mono text-[0.44rem] font-medium">
          AP
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate font-medium",
              layout === "card" ? "text-[0.3rem]" : "text-[0.45rem]",
            )}
          >
            Ava shared a new collection
          </p>
          <p
            className={cn(
              "mt-0.5 text-muted-foreground",
              layout === "card" ? "text-[0.24rem]" : "text-[0.36rem]",
            )}
          >
            Just now
          </p>
        </div>
      </article>
    </div>
  );
}

export function AppPreviewThree({
  className,
  layout = "default",
  title = "A partial social app screen with stories, an animated post, and engagement actions",
}: AppPreviewThreeProps) {
  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "app-social relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-foreground",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute bottom-[-25%] left-1/2 h-[108%] w-[58%] -translate-x-1/2 rounded-t-[2.15rem] border border-border bg-background/70 p-1.5"
      >
        <SocialScreen layout={layout} />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[18%] bg-linear-to-t from-muted to-transparent"
      />

      <style>{`
        .app-social__story,
        .app-social__post {
          animation: app-social-item 7.6s cubic-bezier(0.23, 1, 0.32, 1)
            infinite;
          transform-origin: 50% 100%;
        }

        .app-social__story {
          animation-delay: var(--story-delay);
        }

        .app-social__media {
          animation: app-social-media 7.6s ease-in-out infinite;
        }

        .app-social__like {
          animation: app-social-like 7.6s cubic-bezier(0.34, 1.56, 0.64, 1)
            infinite;
          transform-origin: 25% 50%;
        }

        @keyframes app-social-item {
          0%,
          15% {
            opacity: 0;
            transform: translate3d(0, 8px, 0) scale(0.97);
          }
          30%,
          92% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, -3px, 0) scale(0.98);
          }
        }

        @keyframes app-social-media {
          0%,
          100% {
            filter: contrast(0.92);
            transform: scale(1);
          }
          55% {
            filter: contrast(1.04);
            transform: scale(1.025);
          }
        }

        @keyframes app-social-like {
          0%,
          52%,
          100% {
            transform: scale(1);
          }
          58% {
            transform: scale(1.22);
          }
          64% {
            transform: scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .app-social__story,
          .app-social__post,
          .app-social__media,
          .app-social__like {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
