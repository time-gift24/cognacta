"use client";

import { cn } from "@/lib/beui/utils";

const people = {
  maya: {
    name: "Maya",
    imageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80",
  },
  noah: {
    name: "Noah",
    imageUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80",
  },
} as const;

export type LivePresenceTwoLayout = "default" | "card";

export type LivePresenceTwoProps = {
  className?: string;
  layout?: LivePresenceTwoLayout;
  title?: string;
};

type CollaboratorLabelProps = {
  collaborator: keyof typeof people;
  className?: string;
  layout: LivePresenceTwoLayout;
};

function CollaboratorLabel({
  collaborator,
  className,
  layout,
}: CollaboratorLabelProps) {
  const person = people[collaborator];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium",
        collaborator === "maya"
          ? "bg-primary text-primary-foreground"
          : "bg-foreground text-background",
        layout === "card" ? "text-[6px]" : "text-[8px]",
        className,
      )}
    >
      <span
        className={cn(
          "overflow-hidden rounded-full bg-muted",
          layout === "card" ? "size-3.5" : "size-4",
        )}
      >
        {/* biome-ignore lint/performance/noImgElement: remote portraits keep the installable illustration framework-agnostic. */}
        <img src={person.imageUrl} alt="" className="size-full object-cover" />
      </span>
      {person.name}
    </span>
  );
}

export function LivePresenceTwo({
  className,
  layout = "default",
  title = "Collaborators select and edit text together in a shared document",
}: LivePresenceTwoProps) {
  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "live-presence-text relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-foreground [container-type:inline-size]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute top-[18%] left-[9%] w-[82%]",
          layout === "card" ? "top-[17%]" : "top-[19%]",
        )}
      >
        <p
          className={cn(
            "font-medium tracking-[-0.035em] text-blue-600 dark:text-blue-400",
            layout === "card"
              ? "text-[clamp(13px,4.4cqw,20px)]"
              : "text-[clamp(18px,4.5cqw,26px)]",
          )}
        >
          Working draft
        </p>

        <div
          className={cn(
            "font-medium tracking-[-0.025em]",
            layout === "card"
              ? "mt-[6%] space-y-0 text-[clamp(9px,3.2cqw,14px)] leading-[1.48]"
              : "mt-[6%] space-y-0 text-[clamp(13px,3.4cqw,19px)] leading-[1.52]",
          )}
        >
          <p className="whitespace-nowrap">
            Build the next version with{" "}
            <span className="relative inline-block">
              <span className="relative z-10">shared context</span>
              <span className="live-presence-text__selection absolute -inset-x-1 -inset-y-0.5 z-0 origin-left rounded-[2px] bg-blue-500/10" />
              <span className="live-presence-text__caret live-presence-text__caret--maya absolute top-[4%] -right-1 z-20 h-[92%] border-primary border-r" />
              <CollaboratorLabel
                collaborator="maya"
                layout={layout}
                className="live-presence-text__label live-presence-text__label--maya absolute right-0 bottom-[calc(100%+0.45rem)] z-30 whitespace-nowrap"
              />
            </span>
            .
          </p>

          <p className="whitespace-nowrap text-muted-foreground">
            Leave feedback in place and keep{" "}
            <span className="relative inline-block text-foreground">
              <span className="relative z-10">every change</span>
              <span className="live-presence-text__caret live-presence-text__caret--noah absolute top-[4%] -left-1 z-20 h-[92%] border-foreground border-l" />
              <CollaboratorLabel
                collaborator="noah"
                layout={layout}
                className="live-presence-text__label live-presence-text__label--noah absolute top-[calc(100%+0.4rem)] left-0 z-30 whitespace-nowrap"
              />
            </span>
          </p>
          <p className="whitespace-nowrap text-muted-foreground">
            visible to the whole team.
          </p>
        </div>
      </div>

      <style>{`
        .live-presence-text__selection {
          animation: live-presence-text-selection 9s
            cubic-bezier(0.65, 0, 0.35, 1) infinite;
          will-change: opacity, transform;
        }

        .live-presence-text__caret--maya {
          animation: live-presence-text-maya-caret 9s
            cubic-bezier(0.65, 0, 0.35, 1) infinite;
          will-change: opacity, transform;
        }

        .live-presence-text__label--maya {
          animation: live-presence-text-maya-label 9s
            cubic-bezier(0.23, 1, 0.32, 1) infinite;
          transform-origin: 100% 100%;
          will-change: opacity, transform;
        }

        .live-presence-text__caret--noah {
          animation: live-presence-text-noah-caret 9s
            cubic-bezier(0.65, 0, 0.35, 1) infinite;
          will-change: opacity, transform;
        }

        .live-presence-text__label--noah {
          animation: live-presence-text-noah-label 9s
            cubic-bezier(0.23, 1, 0.32, 1) infinite;
          transform-origin: 0 0;
          will-change: opacity, transform;
        }

        @keyframes live-presence-text-selection {
          0%,
          10%,
          96%,
          100% {
            opacity: 0;
            transform: scaleX(0.02);
          }
          24%,
          82% {
            opacity: 1;
            transform: scaleX(1);
          }
        }

        @keyframes live-presence-text-maya-caret {
          0%,
          9%,
          96%,
          100% {
            opacity: 0;
            transform: translate3d(-13cqw, 0, 0);
          }
          24%,
          82% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes live-presence-text-maya-label {
          0%,
          17%,
          93%,
          100% {
            opacity: 0;
            transform: translate3d(0, 5px, 0) scale(0.94);
          }
          28%,
          82% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @keyframes live-presence-text-noah-caret {
          0%,
          40%,
          96%,
          100% {
            opacity: 0;
            transform: translate3d(8cqw, 0, 0);
          }
          54%,
          84% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes live-presence-text-noah-label {
          0%,
          47%,
          93%,
          100% {
            opacity: 0;
            transform: translate3d(0, -5px, 0) scale(0.94);
          }
          58%,
          84% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .live-presence-text__selection,
          .live-presence-text__caret,
          .live-presence-text__label {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
