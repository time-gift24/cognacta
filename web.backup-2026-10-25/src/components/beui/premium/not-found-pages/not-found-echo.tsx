"use client";

import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { SPRING_PANEL } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";
import { usePageStage } from "./use-page-stage";

/* ─────────────────────────────────────────────────────────
 * ECHO STACK STORYBOARD
 *
 *    0ms   navigation and recovery action are available
 *   70ms   repeated 404 layers settle into one stack
 *  240ms   compact error label resolves
 *  hover   layers fan apart to expose the full echo
 * ───────────────────────────────────────────────────────── */
const TIMING = {
  stack: 70,
  layerStagger: 45,
  label: 240,
} as const;

const STAGES = [TIMING.stack, TIMING.label];
const LAYERS = [
  { id: "back", restingY: -28, hoverY: -58, opacity: 0.16 },
  { id: "middle-back", restingY: -14, hoverY: -30, opacity: 0.28 },
  { id: "front", restingY: 0, hoverY: 0, opacity: 1 },
  { id: "middle-front", restingY: 14, hoverY: 30, opacity: 0.28 },
  { id: "bottom", restingY: 28, hoverY: 58, opacity: 0.16 },
] as const;

export type NotFoundEchoProps = {
  homeHref?: string;
  className?: string;
};

export function NotFoundEcho({ homeHref = "/", className }: NotFoundEchoProps) {
  const { stage, reduce } = usePageStage(STAGES);
  const canHover = useHoverCapable();
  const [fanned, setFanned] = useState(false);
  const active = canHover && fanned && !reduce;

  return (
    <section
      className={cn(
        "flex min-h-[680px] w-full flex-col overflow-hidden bg-muted text-foreground [container-type:inline-size]",
        className,
      )}
    >
      <header className="flex min-h-20 items-center justify-between px-5 sm:px-8">
        <a
          href={homeHref}
          className="font-medium text-sm focus-visible:outline-2 focus-visible:outline-ring"
        >
          Home
        </a>
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-[0.18em]">
          No response
        </span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
        <Button
          variant="plain"
          type="button"
          aria-label="404. Hover to fan out the echoes."
          onMouseEnter={() => setFanned(true)}
          onMouseLeave={() => setFanned(false)}
          onFocus={() => setFanned(true)}
          onBlur={() => setFanned(false)}
          className="relative h-[35cqw] max-h-[360px] min-h-48 w-full cursor-default"
        >
          {LAYERS.map((layer, index) => (
            <motion.span
              key={layer.id}
              aria-hidden="true"
              initial={reduce ? false : { opacity: 0, y: 0, scale: 0.96 }}
              animate={{
                opacity: stage >= 1 ? layer.opacity : 0,
                y: stage >= 1 ? (active ? layer.hoverY : layer.restingY) : 0,
                scale: stage >= 1 ? 1 : 0.96,
              }}
              transition={
                reduce
                  ? { duration: 0 }
                  : {
                      ...SPRING_PANEL,
                      delay: (index * TIMING.layerStagger) / 1000,
                    }
              }
              className="absolute inset-0 flex items-center justify-center font-semibold text-9xl leading-none tracking-[-0.1em]"
            >
              404
            </motion.span>
          ))}
        </Button>

        <motion.h1
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: stage >= 2 ? 1 : 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          className="tracking-[-0.03em] text-4xl md:text-5xl font-medium"
        >
          No page answered.
        </motion.h1>
        <ButtonLink href={homeHref} size="lg" className="mt-5 rounded-full h-9">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Return home
        </ButtonLink>
      </div>
    </section>
  );
}
