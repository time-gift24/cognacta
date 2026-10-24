"use client";

import { ShieldCheck } from "lucide-react";
import { EASE_OUT_CSS } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

type DocumentPosition = "left" | "center" | "right";

export type DocumentCardsLayout = "default" | "card";

export type DocumentCardsProps = {
  className?: string;
  layout?: DocumentCardsLayout;
  title?: string;
};

function DocumentMark() {
  return (
    <span className="grid size-[clamp(1rem,4.5cqw,1.5rem)] rotate-45 grid-cols-2 gap-[clamp(0.08rem,0.45cqw,0.16rem)]">
      <span className="rounded-[2px] bg-muted-foreground/24" />
      <span className="rounded-[2px] bg-muted-foreground/24" />
      <span className="rounded-[2px] bg-muted-foreground/24" />
      <span className="rounded-[2px] bg-muted-foreground/24" />
    </span>
  );
}

function DocumentSheet({ position }: { position: DocumentPosition }) {
  const primary = position === "center";

  return (
    <div
      data-sheet={position}
      className="document-cards__sheet absolute top-[14%] left-1/2 h-[50cqw] max-h-[21rem] w-[34cqw] max-w-[14rem] overflow-hidden rounded-[clamp(0.625rem,2.5cqw,1rem)] border border-border bg-background"
    >
      <span className="absolute top-0 right-0 size-[24%] overflow-hidden rounded-bl-[clamp(0.5rem,2cqw,0.875rem)]">
        <span className="absolute inset-0 border-b border-l border-border bg-muted [clip-path:polygon(0_0,100%_100%,0_100%)]" />
      </span>

      <div
        className={cn(
          "absolute inset-x-[15%]",
          primary ? "top-[15%]" : "top-[30%]",
        )}
      >
        {primary ? <DocumentMark /> : null}

        <div
          className={cn(
            "space-y-[clamp(0.35rem,1.8cqw,0.75rem)]",
            primary && "mt-[24%]",
          )}
        >
          <span className="block h-[clamp(0.35rem,1.7cqw,0.65rem)] w-[72%] rounded-full bg-muted-foreground/18" />
          <span className="block h-[clamp(0.35rem,1.7cqw,0.65rem)] w-[88%] rounded-full bg-muted-foreground/14" />
          <span className="block h-[clamp(0.35rem,1.7cqw,0.65rem)] w-[58%] rounded-full bg-muted-foreground/12" />
          {!primary ? (
            <span className="block h-[clamp(0.35rem,1.7cqw,0.65rem)] w-[76%] rounded-full bg-muted-foreground/10" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function DocumentCards({
  className,
  layout = "default",
  title = "Three document cards fanning open behind a verification seal",
}: DocumentCardsProps) {
  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "document-cards relative isolate aspect-[4/3] w-full overflow-hidden bg-muted text-foreground [container-type:inline-size]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-65 [background-image:radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:clamp(1.25rem,5cqw,1.75rem)_clamp(1.25rem,5cqw,1.75rem)]"
      />

      <div aria-hidden="true" className="absolute inset-0">
        <DocumentSheet position="left" />
        <DocumentSheet position="right" />
        <DocumentSheet position="center" />

        <span className="document-cards__seal absolute bottom-[10%] left-1/2 z-40 grid size-[clamp(2.75rem,13cqw,4.5rem)] rounded-full border border-border bg-background p-[clamp(0.2rem,1cqw,0.35rem)]">
          <span className="grid size-full place-items-center rounded-full bg-primary text-primary-foreground">
            <ShieldCheck
              className="size-[48%]"
              strokeWidth={2.1}
              aria-hidden="true"
            />
          </span>
        </span>
      </div>

      <style>{`
        .document-cards .document-cards__sheet,
        .document-cards .document-cards__seal {
          animation-duration: 7.2s;
          animation-timing-function: ${EASE_OUT_CSS};
          animation-iteration-count: infinite;
          backface-visibility: hidden;
        }

        .document-cards .document-cards__sheet[data-sheet="left"] {
          animation-name: document-cards-left;
        }

        .document-cards .document-cards__sheet[data-sheet="right"] {
          animation-name: document-cards-right;
        }

        .document-cards .document-cards__sheet[data-sheet="center"] {
          animation-name: document-cards-center;
        }

        .document-cards .document-cards__seal {
          animation-name: document-cards-seal;
        }

        @keyframes document-cards-left {
          0%,
          6% {
            opacity: 0;
            transform: translate3d(-50%, 8%, 0) rotate(0deg) scale(0.95);
          }
          20%,
          88% {
            opacity: 1;
            transform: translate3d(-100%, 7%, 0) rotate(-11deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(-100%, 4%, 0) rotate(-11deg) scale(0.98);
          }
        }

        @keyframes document-cards-right {
          0%,
          8% {
            opacity: 0;
            transform: translate3d(-50%, 8%, 0) rotate(0deg) scale(0.95);
          }
          22%,
          88% {
            opacity: 1;
            transform: translate3d(0%, 7%, 0) rotate(11deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(0%, 4%, 0) rotate(11deg) scale(0.98);
          }
        }

        @keyframes document-cards-center {
          0%,
          12% {
            opacity: 0;
            transform: translate3d(-50%, 10%, 18px) scale(0.95);
          }
          28%,
          88% {
            opacity: 1;
            transform: translate3d(-50%, 0%, 28px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(-50%, -2%, 28px) scale(0.98);
          }
        }

        @keyframes document-cards-seal {
          0%,
          22% {
            opacity: 0;
            transform: translate3d(-50%, 28%, 36px) scale(0.92);
          }
          36%,
          88% {
            opacity: 1;
            transform: translate3d(-50%, 0%, 36px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(-50%, -8%, 36px) scale(0.97);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .document-cards .document-cards__sheet,
          .document-cards .document-cards__seal {
            animation: none;
            opacity: 1;
          }

          .document-cards .document-cards__sheet[data-sheet="left"] {
            transform: translate3d(-100%, 7%, 0) rotate(-11deg);
          }

          .document-cards .document-cards__sheet[data-sheet="right"] {
            transform: translate3d(0%, 7%, 0) rotate(11deg);
          }

          .document-cards .document-cards__sheet[data-sheet="center"] {
            transform: translate3d(-50%, 0%, 28px);
          }

          .document-cards .document-cards__seal {
            transform: translate3d(-50%, 0%, 36px);
          }
        }
      `}</style>
    </div>
  );
}
