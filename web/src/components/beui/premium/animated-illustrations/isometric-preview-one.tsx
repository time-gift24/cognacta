"use client";

import { cn } from "@/lib/beui/utils";

export type IsometricPreviewOneProps = {
  className?: string;
  title?: string;
};

export function IsometricPreviewOne({
  className,
  title = "An isometric line-art compute node with animated data lanes and status signals",
}: IsometricPreviewOneProps) {
  return (
    <div
      role="img"
      aria-label={title}
      className={cn(
        "isometric-preview-one relative aspect-[4/3] w-full overflow-hidden bg-muted text-foreground",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="size-full"
        viewBox="0 0 640 480"
        fill="none"
      >
        <g className="text-border" stroke="currentColor" strokeWidth="2">
          <path
            className="isometric-preview-one__lane isometric-preview-one__lane--one"
            d="M10 450L830 4"
            strokeDasharray="10 13"
          />
          <path
            className="isometric-preview-one__lane isometric-preview-one__lane--two"
            d="M45 473L865 27"
            strokeDasharray="10 13"
          />
        </g>

        <ellipse
          cx="322"
          cy="352"
          rx="150"
          ry="48"
          className="fill-foreground/[0.04]"
        />

        <g stroke="currentColor" strokeLinejoin="round" strokeWidth="2.5">
          <path
            d="M192 151C192 143 196 137 204 132L307 73C316 68 327 68 336 73L451 137C459 142 463 148 463 157V220L329 298L192 221V151Z"
            className="fill-card"
          />
          <path
            d="M192 221L329 298L463 220V281C463 291 458 299 449 304L342 366C334 371 324 371 316 366L205 304C196 299 192 291 192 281V221Z"
            className="fill-background"
          />
          <path d="M329 298V368" className="text-border" />
          <path d="M342 291V360" className="text-border" />
          <path d="M192 221L329 298L463 220" className="text-foreground" />
          <path d="M192 245L329 322L463 244" className="text-border" />

          <path
            d="M192 151L316 221C324 226 334 226 342 221L463 157"
            className="fill-none text-foreground"
          />

          <g className="fill-foreground stroke-none">
            <circle cx="249" cy="124" r="4" />
            <circle cx="327" cy="83" r="4" />
            <circle cx="407" cy="127" r="4" />
            <circle cx="329" cy="207" r="4" />
          </g>

          <g className="text-muted-foreground" strokeLinecap="round">
            <path d="M211 198V226" />
            <path d="M218 202V230" />
            <path d="M225 206V234" />
            <path d="M232 210V238" />
          </g>

          <g className="isometric-preview-one__signals fill-muted-foreground stroke-none">
            <circle cx="417" cy="205" r="6" />
            <circle cx="435" cy="195" r="6" />
            <circle cx="453" cy="185" r="6" />
          </g>

          <path
            className="isometric-preview-one__transfer text-foreground"
            d="M224 276L308 323"
            strokeDasharray="8 10"
            strokeLinecap="round"
          />
          <path
            className="isometric-preview-one__transfer isometric-preview-one__transfer--reverse text-muted-foreground"
            d="M360 323L436 279"
            strokeDasharray="8 10"
            strokeLinecap="round"
          />
        </g>

        <g className="isometric-preview-one__packets fill-foreground">
          <circle cx="132" cy="426" r="4" />
          <circle cx="590" cy="135" r="4" />
        </g>
      </svg>

      <style>{`
        .isometric-preview-one__lane {
          animation: isometric-preview-one-lane 4.8s linear infinite;
        }

        .isometric-preview-one__lane--two {
          animation-direction: reverse;
          animation-duration: 5.6s;
        }

        .isometric-preview-one__signals circle {
          animation: isometric-preview-one-signal 2.4s
            cubic-bezier(0.23, 1, 0.32, 1) infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        .isometric-preview-one__signals circle:nth-child(2) {
          animation-delay: 160ms;
        }

        .isometric-preview-one__signals circle:nth-child(3) {
          animation-delay: 320ms;
        }

        .isometric-preview-one__transfer {
          animation: isometric-preview-one-transfer 3.2s linear infinite;
        }

        .isometric-preview-one__transfer--reverse {
          animation-direction: reverse;
          animation-duration: 3.8s;
        }

        .isometric-preview-one__packets {
          animation: isometric-preview-one-packets 4.8s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
        }

        @keyframes isometric-preview-one-lane {
          to {
            stroke-dashoffset: -92;
          }
        }

        @keyframes isometric-preview-one-signal {
          0%,
          18%,
          100% {
            opacity: 0.35;
            transform: scale(0.92);
          }
          42%,
          70% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes isometric-preview-one-transfer {
          to {
            stroke-dashoffset: -72;
          }
        }

        @keyframes isometric-preview-one-packets {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .isometric-preview-one__lane,
          .isometric-preview-one__signals circle,
          .isometric-preview-one__transfer,
          .isometric-preview-one__packets {
            animation: none;
            opacity: 0.75;
          }
        }
      `}</style>
    </div>
  );
}
