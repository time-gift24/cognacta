"use client";

import { useId } from "react";

// Decorative artwork stays static so the frame and its chart own the motion.
export function AnalyticsFlowRibbons() {
  const id = useId().replace(/:/g, "");
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-x-40 -top-16 -bottom-16 -z-10 sm:-inset-x-64 sm:-top-24 sm:-bottom-24"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 1600 700"
        preserveAspectRatio="none"
        className="size-full"
        fill="none"
      >
        <defs>
          <linearGradient id={`${id}-warm`} x1="0" x2="1" y1="0" y2="0">
            <stop stopColor="#e8b36a" stopOpacity="0.7" />
            <stop offset="0.45" stopColor="#c3d6c5" stopOpacity="0.25" />
            <stop offset="1" stopColor="#6ebbb0" stopOpacity="0.65" />
          </linearGradient>
          <linearGradient id={`${id}-deep`} x1="0" x2="1" y1="0" y2="0">
            <stop stopColor="#d48c49" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#c8d9c5" stopOpacity="0.15" />
            <stop offset="1" stopColor="#419c93" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id={`${id}-feather`} x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="white" stopOpacity="0" />
            <stop offset="0.25" stopColor="white" />
            <stop offset="0.75" stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask
            id={`${id}-mask`}
            maskContentUnits="objectBoundingBox"
            maskUnits="objectBoundingBox"
          >
            <rect width="1" height="1" fill={`url(#${id}-feather)`} />
          </mask>
        </defs>
        <g>
          <path
            d="M0 20C310 35 450 230 800 235C1150 240 1300 55 1600 20V680C1290 660 1140 470 800 465C460 460 310 660 0 680Z"
            fill={`url(#${id}-warm)`}
            opacity="0.35"
            mask={`url(#${id}-mask)`}
          />
          <path
            d="M0 90C310 105 500 265 800 275C1100 285 1320 105 1600 90V610C1280 600 1100 425 800 420C500 415 300 605 0 610Z"
            fill={`url(#${id}-warm)`}
            opacity="0.65"
            mask={`url(#${id}-mask)`}
          />
          <path
            d="M0 175C270 165 500 300 800 310C1100 320 1330 160 1600 175V525C1310 545 1120 390 800 385C480 380 280 540 0 525Z"
            fill={`url(#${id}-deep)`}
            opacity="0.8"
            mask={`url(#${id}-mask)`}
          />
          <path
            d="M0 260C300 235 510 335 800 340C1090 345 1320 245 1600 260V440C1310 460 1090 365 800 360C510 355 300 470 0 440Z"
            fill={`url(#${id}-deep)`}
            mask={`url(#${id}-mask)`}
          />
        </g>
      </svg>
    </div>
  );
}
