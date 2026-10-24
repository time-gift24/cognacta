"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useState } from "react";
import { EASE_OUT, SPRING_PANEL } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";

export type FolderCardProps = {
  media?: ReactNode;
  mediaLabel?: string;
  title?: string;
  subtitle?: string;
  primaryValue?: string;
  primaryLabel?: string;
  secondaryValue?: string;
  className?: string;
};

function DefaultFolderMedia({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      aria-hidden
      animate={active && !reduceMotion ? { scale: 1.035 } : { scale: 1 }}
      transition={SPRING_PANEL}
      className="absolute -inset-2 overflow-hidden bg-[linear-gradient(128deg,#e9b071_0%,#d96b4e_42%,#347d78_100%)]"
    >
      <div className="absolute -top-12 left-[8%] h-48 w-20 rotate-[24deg] rounded-full bg-white/25 blur-xl" />
      <div className="absolute top-4 left-[38%] h-40 w-16 -rotate-[18deg] rounded-full bg-white/20 blur-lg" />
      <div className="absolute -right-12 -bottom-10 size-52 rounded-full border-[30px] border-white/15" />
    </motion.div>
  );
}

export function FolderCard({
  media,
  mediaLabel = "Workspace collection",
  title = "Daily memo",
  subtitle = "Notes & journaling",
  primaryValue = "05",
  primaryLabel = "Docs",
  secondaryValue = "1,270 notes",
  className,
}: FolderCardProps) {
  const reduceMotion = useReducedMotion();
  const canHover = useHoverCapable();
  const [active, setActive] = useState(false);

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.5, ease: EASE_OUT }
      }
      onHoverStart={() => {
        if (canHover) setActive(true);
      }}
      onHoverEnd={() => setActive(false)}
      className={cn(
        "relative aspect-[1.06/1] w-full max-w-md isolate overflow-hidden rounded-3xl border border-border bg-background",
        className,
      )}
    >
      <div aria-hidden className="absolute inset-px overflow-hidden rounded-sm">
        {media ?? <DefaultFolderMedia active={active} />}
      </div>

      <div className="absolute top-[9%] right-[6%] z-10 max-w-[42%] rounded-full border border-border bg-background/85 px-3 py-2 text-right font-medium text-foreground text-xs leading-4 backdrop-blur-sm">
        {mediaLabel}
      </div>

      <motion.div
        aria-hidden
        animate={active && !reduceMotion ? { y: -2 } : { y: 0 }}
        transition={SPRING_PANEL}
        className="pointer-events-none absolute inset-x-0 top-0 bottom-[-2px] z-10"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="size-full"
        >
          <path
            d="M 0 100 V 35 C 0 30.5 2.8 28 7 28 H 38 C 41.5 28 43.5 29.2 46 31.8 L 52.5 38.2 C 54.6 40.2 57 41 61 41 H 94 C 98 41 100 43.4 100 47.5 V 100 Z"
            className="fill-background"
          />
        </svg>
      </motion.div>

      <motion.div
        animate={active && !reduceMotion ? { y: -2 } : { y: 0 }}
        transition={SPRING_PANEL}
        className="pointer-events-none absolute inset-0 z-20"
      >
        <div className="absolute top-[32.5%] left-[5%] max-w-[48%]">
          <h2 className="truncate text-foreground leading-tight tracking-[-0.025em] text-4xl font-medium">
            {title}
          </h2>
          <p className="mt-1 truncate text-muted-foreground text-sm sm:text-base">
            {subtitle}
          </p>
        </div>

        <div className="absolute right-[6%] bottom-[6%] left-[5%] flex items-end justify-between gap-6">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="font-medium text-4xl text-foreground leading-none tracking-[-0.05em] tabular-nums sm:text-5xl">
              {primaryValue}
            </span>
            <span className="text-foreground text-sm sm:text-base">
              {primaryLabel}
            </span>
          </div>
          <span className="truncate text-right font-medium text-foreground text-sm tabular-nums sm:text-base">
            {secondaryValue}
          </span>
        </div>
      </motion.div>
    </motion.article>
  );
}
