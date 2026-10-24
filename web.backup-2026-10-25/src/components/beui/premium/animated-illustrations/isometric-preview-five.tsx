"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/beui/utils";

export type IsometricPreviewFiveProps = {
  className?: string;
  title?: string;
};

type TowerProps = {
  delay: string;
  faceHeight: number;
  logo: string;
  logoCenterY: number;
  x: number;
  y: number;
};

function IsometricTower({
  delay,
  faceHeight,
  logo,
  logoCenterY,
  x,
  y,
}: TowerProps) {
  return (
    <g
      className="isometric-preview-five__tower"
      style={{ "--tower-delay": delay } as CSSProperties}
      transform={`translate(${x} ${y})`}
    >
      <g transform="translate(7 42) skewY(30) scale(0.866 1)">
        <rect
          className="isometric-preview-five__face"
          x="0.866"
          y="1.5"
          width="62.663"
          height={faceHeight}
          rx="7"
        />
      </g>
      <g transform="translate(63 74) skewY(-30) scale(0.866 1)">
        <rect
          className="isometric-preview-five__face"
          x="0.866"
          y="0.5"
          width="62.663"
          height={faceHeight}
          rx="7"
        />
      </g>

      <g transform="translate(63 8) rotate(30) skewX(-30) scale(1 0.866025)">
        <rect
          className="isometric-preview-five__cap"
          width="66.744"
          height="66.744"
          rx="8"
        />
      </g>

      <g
        className="isometric-preview-five__symbol"
        transform={`translate(63 ${logoCenterY})`}
      >
        <g transform="rotate(30) skewX(-30) scale(1 0.866025) translate(-17 -17)">
          <image
            href={logo}
            width="34"
            height="34"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      </g>
    </g>
  );
}

export function IsometricPreviewFive({
  className,
  title = "Three translucent blue crypto towers rising in sequence",
}: IsometricPreviewFiveProps) {
  return (
    <div
      role="img"
      aria-label={title}
      className={cn(
        "isometric-preview-five relative grid aspect-[4/3] w-full place-items-center overflow-hidden bg-muted text-[#2563eb] dark:text-[#60a5fa]",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="h-[88%] w-auto max-w-[92%]"
        viewBox="0 0 435 444"
        fill="none"
      >
        <IsometricTower
          x={308}
          y={1}
          faceHeight={436}
          logo="https://cdn.simpleicons.org/solana/2563eb"
          logoCenterY={41}
          delay="4s"
        />
        <IsometricTower
          x={155}
          y={111}
          faceHeight={345}
          logo="https://cdn.simpleicons.org/ethereum/2563eb"
          logoCenterY={40}
          delay="2s"
        />
        <IsometricTower
          x={1}
          y={238}
          faceHeight={345}
          logo="https://cdn.simpleicons.org/bitcoin/2563eb"
          logoCenterY={42}
          delay="0s"
        />
      </svg>

      <style>{`
        .isometric-preview-five__tower {
          opacity: 0.68;
          animation: isometric-preview-five-focus 6s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
          animation-delay: var(--tower-delay);
        }

        .isometric-preview-five__cap {
          fill: color-mix(
            in oklab,
            var(--color-muted) 97.5%,
            currentColor 2.5%
          );
          stroke: currentColor;
          stroke-linejoin: round;
          stroke-opacity: 0.78;
          stroke-width: 1.6;
        }

        .isometric-preview-five__face {
          fill: currentColor;
          fill-opacity: 0.025;
          stroke: currentColor;
          stroke-linejoin: round;
          stroke-opacity: 0.36;
          stroke-width: 1.6;
        }

        .isometric-preview-five__symbol {
          opacity: 0.9;
          animation: isometric-preview-five-symbol 6s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
          animation-delay: var(--tower-delay);
        }

        @keyframes isometric-preview-five-focus {
          0%,
          18%,
          100% {
            opacity: 0.68;
          }
          30%,
          50% {
            opacity: 1;
          }
        }

        @keyframes isometric-preview-five-symbol {
          0%,
          18%,
          100% {
            opacity: 0.9;
          }
          30%,
          50% {
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .isometric-preview-five__tower,
          .isometric-preview-five__symbol {
            animation: none;
            opacity: 0.88;
          }
        }
      `}</style>
    </div>
  );
}
