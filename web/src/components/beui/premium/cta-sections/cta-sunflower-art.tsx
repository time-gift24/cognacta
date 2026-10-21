"use client";

import { useId } from "react";

const PETALS = Array.from({ length: 30 }, (_, index) => ({
  angle: index * 12,
  length: 0.88 + (index % 4) * 0.05,
}));
const SEEDS = Array.from({ length: 180 }, (_, index) => {
  const angle = index * 2.399963;
  const radius = Math.sqrt(index / 180) * 37;
  return {
    id: index,
    x: Number((130 + Math.cos(angle) * radius).toFixed(3)),
    y: Number((112 + Math.sin(angle) * radius).toFixed(3)),
    radius: index < 30 ? 1.2 : 1.7,
  };
});

/** Original decorative SVG artwork; each instance moves as one rooted stem. */
export function SunflowerArt() {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 260 600"
      className="size-full overflow-visible"
      fill="none"
    >
      <defs>
        <linearGradient
          id={`${id}-petal`}
          x1="120"
          y1="12"
          x2="139"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff3a1" />
          <stop offset=".3" stopColor="#ffd64d" />
          <stop offset=".75" stopColor="#f5a623" />
          <stop offset="1" stopColor="#c56a12" />
        </linearGradient>
        <linearGradient
          id={`${id}-leaf`}
          x1="35"
          y1="0"
          x2="210"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#254b2d" />
          <stop offset=".5" stopColor="#638b36" />
          <stop offset="1" stopColor="#a4b955" />
        </linearGradient>
        <linearGradient
          id={`${id}-stem`}
          x1="110"
          y1="0"
          x2="147"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#294c2c" />
          <stop offset=".6" stopColor="#7e9b48" />
          <stop offset="1" stopColor="#426530" />
        </linearGradient>
        <radialGradient id={`${id}-disc`}>
          <stop stopColor="#3c3520" />
          <stop offset=".6" stopColor="#653614" />
          <stop offset="1" stopColor="#a85b18" />
        </radialGradient>
      </defs>
      <path
        d="M143 610C145 490 115 360 125 248C130 191 131 149 130 112"
        stroke={`url(#${id}-stem)`}
        strokeWidth="11"
      />
      <path
        d="M141 607C142 469 116 351 128 242"
        stroke="#b0bd66"
        strokeWidth="2"
        opacity=".55"
      />
      <g fill={`url(#${id}-leaf)`} stroke="#426632" strokeWidth="1">
        <path d="M125 281C84 278 53 251 36 202C79 202 122 220 125 281Z" />
        <path d="M124 344C151 287 190 282 230 280C218 328 181 350 124 344Z" />
        <path d="M135 445C83 443 50 410 15 364C79 353 133 381 135 445Z" />
        <path d="M145 515C164 453 207 421 251 426C234 484 199 515 145 515Z" />
      </g>
      <g stroke="#c1cf79" strokeWidth="1.3" opacity=".55">
        <path d="M125 281Q80 245 36 202M124 344Q172 322 230 280M135 445Q85 402 15 364M145 515Q203 477 251 426" />
        <path d="m83 243-10-26m29 43-4-32m65 97 19 3m-2-13 7-19m-101 112-13-29m38 49-6-34m82 82 3-28m-20 42 33-1" />
      </g>
      <g transform="translate(0 4) rotate(6 130 112)">
        {PETALS.map(({ angle, length }) => (
          <path
            key={angle}
            d="M130 101C113 84 115 44 128 12C145 38 146 77 136 101Z"
            fill="#eaa128"
            stroke="#c9831c"
            strokeWidth=".7"
            transform={`rotate(${angle + 6} 130 112) translate(0 ${112 * (1 - length)}) scale(1 ${length})`}
          />
        ))}
      </g>
      {PETALS.map(({ angle, length }) => (
        <g
          key={angle}
          transform={`rotate(${angle} 130 112) translate(0 ${112 * (1 - length)}) scale(1 ${length})`}
        >
          <path
            d="M124 101C114 77 116 41 132 18C142 44 147 78 137 102Z"
            fill={`url(#${id}-petal)`}
            stroke="#e2a22d"
            strokeWidth=".65"
          />
          <path
            d="M131 30Q126 63 131 91"
            stroke="#fff0a0"
            strokeWidth="1"
            opacity=".7"
          />
        </g>
      ))}
      <circle cx="130" cy="112" r="43" fill="#b77320" />
      <circle cx="130" cy="112" r="39" fill={`url(#${id}-disc)`} />
      {SEEDS.map((seed) => (
        <circle
          key={seed.id}
          cx={seed.x}
          cy={seed.y}
          r={seed.radius}
          fill={seed.id % 3 === 0 ? "#e8b448" : "#bb812f"}
          opacity={seed.id < 25 ? 0.35 : 0.85}
        />
      ))}
    </svg>
  );
}
