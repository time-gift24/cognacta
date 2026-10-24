"use client";

import { MessageCircle, MousePointer2 } from "lucide-react";
import { cn } from "@/lib/beui/utils";

const collaborators = [
  {
    name: "Maya",
    imageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80",
  },
  {
    name: "Noah",
    imageUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80",
  },
  {
    name: "Iris",
    imageUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80",
  },
] as const;

const selectionHandles = [
  "-top-1 -left-1",
  "-top-1 -right-1",
  "-bottom-1 -left-1",
  "-right-1 -bottom-1",
] as const;

export type LivePresenceLayout = "default" | "card";

export type LivePresenceProps = {
  className?: string;
  layout?: LivePresenceLayout;
  title?: string;
};

export function LivePresence({
  className,
  layout = "default",
  title = "Collaborators edit and comment on a shared design canvas",
}: LivePresenceProps) {
  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "live-presence relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-foreground [container-type:inline-size]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute top-[9%] left-1/2 z-30 flex -translate-x-1/2 items-center rounded-full border border-border bg-background",
          layout === "card" ? "h-8 px-2.5" : "h-11 px-3.5",
        )}
      >
        <div className="flex -space-x-1.5">
          {collaborators.map((collaborator) => (
            <span
              key={collaborator.name}
              className={cn(
                "overflow-hidden rounded-full border-2 border-background bg-secondary",
                layout === "card" ? "size-5" : "size-7",
              )}
            >
              {/* biome-ignore lint/performance/noImgElement: remote portraits keep the installable illustration framework-agnostic. */}
              <img
                src={collaborator.imageUrl}
                alt=""
                className="size-full object-cover"
              />
            </span>
          ))}
        </div>
        <span
          className={cn(
            "ml-2 border-border border-l pl-2 font-medium",
            layout === "card" ? "text-[6px]" : "text-[8px]",
          )}
        >
          3 editing
        </span>
        <span className="ml-2 size-1.5 rounded-full bg-emerald-500" />
      </div>

      <div
        aria-hidden="true"
        className={cn(
          "absolute top-[22%] left-1/2 h-[58%] w-[78%] max-w-[31rem] -translate-x-1/2 border border-border bg-background",
          layout === "card" && "h-[60%] w-[84%]",
        )}
      >
        <span
          className={cn(
            "absolute top-[8%] left-[6%] text-muted-foreground uppercase tracking-[0.16em]",
            layout === "card" ? "text-[5px]" : "text-[7px]",
          )}
        >
          Homepage · Hero
        </span>

        <div className="absolute top-[25%] left-[6%] h-[48%] w-[82%] border border-blue-600">
          <div className="flex size-full items-center px-[5%]">
            <span
              className={cn(
                "font-semibold leading-[1.02] tracking-[-0.045em]",
                layout === "card"
                  ? "text-[clamp(12px,4.6cqw,19px)]"
                  : "text-[clamp(18px,4.8cqw,31px)]",
              )}
            >
              <span className="block whitespace-nowrap">
                Turn clear thinking
              </span>
              <span className="block whitespace-nowrap">
                into shared momentum.
              </span>
            </span>
          </div>

          {selectionHandles.map((position) => (
            <span
              key={position}
              className={cn(
                "absolute size-2 border border-blue-600 bg-background",
                position,
              )}
            />
          ))}

          <span
            className={cn(
              "absolute top-full left-1/2 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-blue-600 px-2 py-1 font-mono text-white",
              layout === "card" ? "text-[5px]" : "text-[7px]",
            )}
          >
            560 × 122
          </span>

          <span
            className={cn(
              "live-presence__pin absolute top-1/2 right-0 grid -translate-y-1/2 translate-x-1/2 place-items-center rounded-full bg-blue-600 text-white",
              layout === "card" ? "size-5" : "size-7",
            )}
          >
            <MessageCircle
              aria-hidden="true"
              className={layout === "card" ? "size-2.5" : "size-3.5"}
              fill="currentColor"
              strokeWidth={2}
            />
          </span>
        </div>

        <div
          className={cn(
            "live-presence__comment absolute right-[2%] bottom-[5%] z-20 border border-border bg-background",
            layout === "card"
              ? "w-[38%] rounded-md px-2 py-1.5"
              : "w-[35%] rounded-lg px-3 py-2",
          )}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "overflow-hidden rounded-full bg-secondary",
                layout === "card" ? "size-4" : "size-5",
              )}
            >
              {/* biome-ignore lint/performance/noImgElement: remote portraits keep the installable illustration framework-agnostic. */}
              <img
                src={collaborators[0].imageUrl}
                alt=""
                className="size-full object-cover"
              />
            </span>
            <span
              className={cn(
                "font-medium",
                layout === "card" ? "text-[6px]" : "text-[8px]",
              )}
            >
              Maya
            </span>
          </div>
          <p
            className={cn(
              "mt-1 text-muted-foreground leading-snug",
              layout === "card" ? "text-[5px]" : "text-[7px]",
            )}
          >
            This version is ready to ship.
          </p>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="live-presence__cursor live-presence__cursor--maya absolute top-[70%] left-[69%] z-40 text-blue-600"
      >
        <MousePointer2
          className={layout === "card" ? "size-4" : "size-5"}
          fill="currentColor"
          strokeWidth={1.5}
        />
        <span
          className={cn(
            "ml-2 inline-flex rounded-sm bg-blue-600 px-1.5 py-0.5 font-medium text-white",
            layout === "card" ? "text-[5px]" : "text-[7px]",
          )}
        >
          Maya
        </span>
      </div>

      <div
        aria-hidden="true"
        className="live-presence__cursor live-presence__cursor--noah absolute top-[19%] left-[74%] z-40 text-amber-600"
      >
        <MousePointer2
          className={layout === "card" ? "size-4" : "size-5"}
          fill="currentColor"
          strokeWidth={1.5}
        />
        <span
          className={cn(
            "ml-2 inline-flex rounded-sm bg-amber-600 px-1.5 py-0.5 font-medium text-white",
            layout === "card" ? "text-[5px]" : "text-[7px]",
          )}
        >
          Noah
        </span>
      </div>

      <style>{`
        .live-presence__cursor--maya {
          animation: live-presence-maya 8s cubic-bezier(0.77, 0, 0.175, 1)
            infinite;
          will-change: transform;
        }

        .live-presence__cursor--noah {
          animation: live-presence-noah 8s cubic-bezier(0.77, 0, 0.175, 1)
            infinite;
          will-change: transform;
        }

        .live-presence__pin {
          animation: live-presence-pin 8s cubic-bezier(0.23, 1, 0.32, 1)
            infinite;
          will-change: transform;
        }

        .live-presence__comment {
          animation: live-presence-comment 8s cubic-bezier(0.23, 1, 0.32, 1)
            infinite;
          transform-origin: 100% 100%;
          will-change: opacity, transform;
        }

        @keyframes live-presence-maya {
          0%,
          12%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          28%,
          80% {
            transform: translate3d(-13cqw, -15cqw, 0);
          }
          92% {
            transform: translate3d(-4cqw, -4cqw, 0);
          }
        }

        @keyframes live-presence-noah {
          0%,
          34%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          52%,
          84% {
            transform: translate3d(-31cqw, 21cqw, 0);
          }
          93% {
            transform: translate3d(-8cqw, 6cqw, 0);
          }
        }

        @keyframes live-presence-pin {
          0%,
          45%,
          100% {
            transform: translate(50%, -50%) scale(0.82);
          }
          54%,
          90% {
            transform: translate(50%, -50%) scale(1);
          }
        }

        @keyframes live-presence-comment {
          0%,
          51%,
          96%,
          100% {
            opacity: 0;
            transform: translate3d(0, 6px, 0) scale(0.97);
          }
          62%,
          90% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .live-presence__cursor,
          .live-presence__pin,
          .live-presence__comment {
            animation: none;
          }

          .live-presence__comment {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
