"use client";

import { cn } from "@/lib/beui/utils";

export type IsometricPreviewFourProps = {
  className?: string;
  title?: string;
};

export function IsometricPreviewFour({
  className,
  title = "A signal moving through entry, API, layered runtime, and application stages",
}: IsometricPreviewFourProps) {
  return (
    <div
      role="img"
      aria-label={title}
      className={cn(
        "isometric-preview-four relative aspect-[4/3] w-full overflow-hidden bg-muted text-foreground",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="size-full"
        viewBox="0 0 640 480"
        fill="none"
      >
        <g className="text-border" stroke="currentColor" strokeWidth="1.75">
          <path d="M82 407L558 117" />
          <path d="M91 421L567 131" />
          <path d="M100 435L576 145" />
        </g>

        <g className="isometric-preview-four__packet text-primary">
          <circle cx="92" cy="421" r="5" fill="currentColor" />
          <circle cx="92" cy="421" r="10" fill="currentColor" opacity="0.12" />
        </g>

        <g transform="translate(0 -9)">
          <g
            className="isometric-preview-four__entry"
            stroke="currentColor"
            strokeLinejoin="round"
          >
            <path
              d="M73 338L149 383V443L73 398V338Z"
              className="fill-background text-foreground"
              strokeWidth="2.5"
            />
            <path
              d="M81 329L157 374V434L149 443V383L73 338L81 329Z"
              className="fill-card text-foreground"
              strokeWidth="2.5"
            />
            <path
              d="M96 370L133 392"
              className="text-border-strong"
              strokeLinecap="round"
              strokeWidth="4"
            />
            <path
              d="M96 385L123 401"
              className="text-muted-foreground"
              strokeLinecap="round"
              strokeWidth="3"
            />
          </g>
        </g>
        <text
          x="151"
          y="422"
          className="fill-muted-foreground text-[10px] font-medium uppercase tracking-[0.14em]"
        >
          Entry
        </text>

        <g transform="translate(0 -14)">
          <g
            className="isometric-preview-four__station isometric-preview-four__station--api"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <path
              d="M189 291L240 320L240 370L189 341V291Z"
              className="fill-background text-foreground"
            />
            <path
              d="M240 320L291 291V341L240 370V320Z"
              className="fill-card text-foreground"
            />
            <path
              d="M189 291L240 262L291 291L240 320L189 291Z"
              className="fill-muted text-foreground"
            />
            <path
              d="M240 262V320M189 291L291 341M291 291L189 341"
              className="text-border-strong"
            />
            <path
              d="M214.5 276.5L265.5 305.5M265.5 276.5L214.5 305.5"
              className="text-border-strong"
            />
            <path d="M189 316L240 345L291 316" className="text-border" />
            <path
              d="M189 291L240 262L291 291L240 320L189 291Z"
              className="isometric-preview-four__active-face fill-primary/10 text-primary"
            />
          </g>
        </g>
        <text
          x="265"
          y="354"
          className="fill-muted-foreground text-[10px] font-medium uppercase tracking-[0.14em]"
        >
          API
        </text>

        <g transform="translate(0 -45)">
          <g
            className="isometric-preview-four__station isometric-preview-four__station--layers"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <path
              d="M326 276L381 244L436 276L381 308L326 276Z"
              className="fill-background text-foreground"
            />
            <path
              d="M326 276L381 308V320L326 288V276Z"
              className="fill-muted text-foreground"
            />
            <path
              d="M381 308L436 276V288L381 320V308Z"
              className="fill-card text-foreground"
            />
            <path
              d="M326 251L381 219L436 251L381 283L326 251Z"
              className="fill-background text-foreground"
            />
            <path
              d="M326 251L381 283V295L326 263V251Z"
              className="fill-muted text-foreground"
            />
            <path
              d="M381 283L436 251V263L381 295V283Z"
              className="fill-card text-foreground"
            />
            <path
              d="M326 226L381 194L436 226L381 258L326 226Z"
              className="fill-background text-foreground"
            />
            <path
              d="M326 226L381 258V270L326 238V226Z"
              className="fill-muted text-foreground"
            />
            <path
              d="M381 258L436 226V238L381 270V258Z"
              className="fill-card text-foreground"
            />
            <path
              d="M326 226L381 194L436 226L381 258L326 226Z"
              className="isometric-preview-four__active-face fill-primary/10 text-primary"
            />
            <path
              d="M356 226L381 212L406 226L381 240L356 226Z"
              className="fill-background text-border-strong"
            />
          </g>
          <text
            x="403"
            y="336"
            className="fill-muted-foreground text-[10px] font-medium uppercase tracking-[0.14em]"
          >
            Layers
          </text>
        </g>

        <g transform="translate(0 -6)">
          <g
            className="isometric-preview-four__station isometric-preview-four__station--app"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="2.25"
          >
            <path
              d="M471 100L523 70L575 100V164L523 194L471 164V100Z"
              className="fill-card text-foreground"
            />
            <path
              d="M471 100L523 70L575 100L523 130L471 100Z"
              className="fill-muted text-foreground"
            />
            <path
              d="M486 101L501 92L516 101L501 110L486 101ZM508 88L523 79L538 88L523 97L508 88ZM530 101L545 92L560 101L545 110L530 101ZM508 114L523 105L538 114L523 123L508 114Z"
              className="isometric-preview-four__active-face fill-primary/10 text-primary"
            />
          </g>
        </g>
        <text
          x="553"
          y="186"
          className="fill-muted-foreground text-[10px] font-medium uppercase tracking-[0.14em]"
        >
          App
        </text>
      </svg>

      <style>{`
        .isometric-preview-four__packet {
          animation: isometric-preview-four-packet 5.6s linear infinite;
          transform-box: view-box;
          transform-origin: center;
          will-change: transform, opacity;
        }

        .isometric-preview-four__entry,
        .isometric-preview-four__station {
          transform-box: fill-box;
          transform-origin: center;
        }

        .isometric-preview-four__entry {
          animation: isometric-preview-four-stage-one 5.6s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
        }

        .isometric-preview-four__station--api {
          animation: isometric-preview-four-stage-two 5.6s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
        }

        .isometric-preview-four__station--layers {
          animation: isometric-preview-four-stage-three 5.6s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
        }

        .isometric-preview-four__station--app {
          animation: isometric-preview-four-stage-four 5.6s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
        }

        .isometric-preview-four__active-face {
          animation: isometric-preview-four-face 2.8s
            cubic-bezier(0.77, 0, 0.175, 1) infinite alternate;
        }

        @keyframes isometric-preview-four-packet {
          0% { opacity: 0; transform: translate3d(0, 0, 0); }
          4% { opacity: 1; }
          96% { opacity: 1; }
          100% { opacity: 0; transform: translate3d(476px, -290px, 0); }
        }

        @keyframes isometric-preview-four-stage-one {
          0%, 4%, 22%, 100% { transform: translateY(0); }
          10%, 16% { transform: translateY(-5px); }
        }

        @keyframes isometric-preview-four-stage-two {
          0%, 25%, 46%, 100% { transform: translateY(0); }
          32%, 40% { transform: translateY(-5px); }
        }

        @keyframes isometric-preview-four-stage-three {
          0%, 49%, 70%, 100% { transform: translateY(0); }
          56%, 64% { transform: translateY(-5px); }
        }

        @keyframes isometric-preview-four-stage-four {
          0%, 73%, 94%, 100% { transform: translateY(0); }
          80%, 88% { transform: translateY(-5px); }
        }

        @keyframes isometric-preview-four-face {
          from { opacity: 0.35; }
          to { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .isometric-preview-four__packet {
            animation: isometric-preview-four-packet-reduced 5.6s linear infinite;
          }

          .isometric-preview-four__entry,
          .isometric-preview-four__station {
            animation: none;
          }

          .isometric-preview-four__active-face {
            animation: none;
            opacity: 0.7;
          }
        }

        @keyframes isometric-preview-four-packet-reduced {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
