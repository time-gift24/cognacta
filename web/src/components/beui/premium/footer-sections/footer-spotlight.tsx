"use client";

import { ArrowUpRight, Layers } from "lucide-react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { type PointerEvent, type ReactNode, useRef } from "react";
import { SPRING_MOUSE } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";

export type FooterSpotlightLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type FooterSpotlightColumn = {
  title: string;
  links: FooterSpotlightLink[];
};

export type FooterSpotlightProps = {
  brand?: string;
  /** Giant outlined wordmark revealed by the cursor spotlight. */
  wordmark?: string;
  tagline?: string;
  columns?: FooterSpotlightColumn[];
  /** Optional content rendered under the brand tagline. */
  brandExtra?: ReactNode;
  /** Spotlight radius in pixels. */
  radius?: number;
  copyright?: string;
  className?: string;
};

const DEFAULT_COLUMNS: FooterSpotlightColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Components", href: "#" },
      { label: "Blocks", href: "#" },
      { label: "Templates", href: "#" },
      { label: "Pricing", href: "#" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Documentation", href: "#" },
      { label: "Registry", href: "#" },
      { label: "CLI", href: "#" },
      { label: "Examples", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
];

export function FooterSpotlight({
  brand = "beUI Pro",
  brandExtra,
  wordmark = brand,
  tagline = "Premium motion components and blocks for modern React apps.",
  columns = DEFAULT_COLUMNS,
  radius = 200,
  copyright = `© 2026 ${brand}. All rights reserved.`,
  className,
}: FooterSpotlightProps) {
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const opacity = useMotionValue(0);
  const sx = useSpring(x, SPRING_MOUSE);
  const sy = useSpring(y, SPRING_MOUSE);

  // Soft radial mask that follows the cursor and clips the filled wordmark.
  const mask = useMotionTemplate`radial-gradient(${radius}px circle at ${sx}px ${sy}px, black, transparent 70%)`;

  const spotlightOn = canHover && !reduce;

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    if (!spotlightOn) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
    opacity.set(1);
  }

  return (
    <footer
      className={cn(
        "relative w-full overflow-hidden border-t border-border bg-background",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          {/* Brand column. */}
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="grid size-10 place-items-center rounded-full border border-border"
              >
                <Layers className="size-4 text-foreground" />
              </span>
              <span className="font-sans text-foreground text-xl font-medium">
                {brand}
              </span>
            </div>
            <p className="mt-3 max-w-xs text-pretty text-muted-foreground text-sm leading-6">
              {tagline}
            </p>
            {brandExtra ? <div className="mt-6">{brandExtra}</div> : null}
          </div>

          {/* Compact, readable navigation with an active-link accent. */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <nav
                key={column.title}
                aria-label={column.title}
                className="flex flex-col"
              >
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  {column.title}
                </p>
                <ul className="mt-3 flex flex-col gap-1">
                  {column.links.map((link) => {
                    return (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          {...(link.external
                            ? { target: "_blank", rel: "noreferrer noopener" }
                            : {})}
                          className="group inline-flex min-h-10 w-fit items-center gap-1.5 rounded-full text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                        >
                          {link.label}
                          {link.external ? (
                            <ArrowUpRight aria-hidden className="size-3" />
                          ) : null}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-xs text-muted-foreground">
          <p>{copyright}</p>
          <span>Thoughtfully made. Ready for what’s next.</span>
        </div>
        <div
          ref={ref}
          onPointerMove={handleMove}
          onPointerLeave={() => opacity.set(0)}
          className="relative mt-6 select-none overflow-hidden"
        >
          <Wordmark text={wordmark} outline />
          {spotlightOn ? (
            <motion.div
              aria-hidden
              className="absolute inset-0 text-primary"
              style={{ opacity, maskImage: mask, WebkitMaskImage: mask }}
            >
              <Wordmark text={wordmark} />
            </motion.div>
          ) : (
            <div aria-hidden className="absolute inset-0 text-foreground/10">
              <Wordmark text={wordmark} />
            </div>
          )}
          <span className="sr-only">{wordmark}</span>
        </div>
      </div>
    </footer>
  );
}

function Wordmark({
  text,
  outline = false,
}: {
  text: string;
  outline?: boolean;
}) {
  const width = Math.max(160, text.length * 78);
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 32 ${width} 104`}
      className="block h-auto w-full"
    >
      <text
        x="0"
        y="136"
        textLength={width}
        lengthAdjust="spacingAndGlyphs"
        fill={outline ? "none" : "currentColor"}
        stroke={outline ? "currentColor" : "none"}
        strokeWidth="0.5"
        className={cn(
          "font-sans text-9xl font-medium",
          outline && "text-foreground/20",
        )}
      >
        {text}
      </text>
    </svg>
  );
}
