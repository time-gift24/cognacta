"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import type { RefObject } from "react";
import { SPRING_GLIDE, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { type DocsSection, docsSectionId } from "./docs-data";

/* ─────────────────────────────────────────────────────────
 * OUTLINE
 *
 *  ring     fills with reading progress through the article,
 *           smoothed by SPRING_GLIDE (raw progress when reduced)
 *  dot      glides to the section being read via layoutId
 *  reduced  the dot jumps instead of gliding
 * ───────────────────────────────────────────────────────── */
const RING = 2 * Math.PI * 9;

export type DocsOutlineProps = {
  sections: readonly DocsSection[];
  activeSection: string | undefined;
  /** The article whose scroll progress fills the ring. */
  targetRef: RefObject<HTMLElement | null>;
  label: string;
};

export function DocsOutline({
  sections,
  activeSection,
  targetRef,
  label,
}: DocsOutlineProps) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, SPRING_GLIDE);
  // Dash offset renders correctly on the server, unlike pathLength.
  const dashOffset = useTransform(
    reduce ? scrollYProgress : progress,
    (value) => RING * (1 - value),
  );

  return (
    <div className="sticky top-14 py-12">
      <div className="flex items-center gap-2.5">
        <svg
          viewBox="0 0 22 22"
          className="size-5 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="11"
            cy="11"
            r="9"
            fill="none"
            strokeWidth="2"
            className="stroke-border"
          />
          <motion.circle
            cx="11"
            cy="11"
            r="9"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={RING}
            className="stroke-foreground"
            strokeDashoffset={RING}
            style={{ strokeDashoffset: dashOffset }}
          />
        </svg>
        <p className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
          {label}
        </p>
      </div>
      <ul className="mt-4 space-y-1">
        {sections.map((item) => {
          const active = item.id === activeSection;
          return (
            <li key={item.id} className="relative flex items-center">
              <span className="grid w-5 shrink-0 place-items-center">
                {active ? (
                  <motion.span
                    layoutId="docs-toc-dot"
                    transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                    className="size-1.5 rounded-full bg-foreground"
                  />
                ) : null}
              </span>
              <a
                href={`#${docsSectionId(item.id)}`}
                aria-current={active ? "location" : undefined}
                className={cn(
                  "flex min-h-8 items-center rounded-full px-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-foreground",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
