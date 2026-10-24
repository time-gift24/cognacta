"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_OUT, SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type { CryptoAgentStep } from "./crypto-agent-data";

function StepMark({ running }: { running: boolean }) {
  return (
    <span className="grid size-4 shrink-0 place-items-center">
      <AnimatePresence mode="popLayout" initial={false}>
        {running ? (
          <motion.span
            key="spin"
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="size-3 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground motion-reduce:animate-none"
          />
        ) : (
          <motion.span
            key="done"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={SPRING_SWAP}
            className="grid size-4 place-items-center rounded-full bg-foreground text-background"
          >
            <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/**
 * Tool calls the agent ran before answering. Each row rises in with a
 * spinner that pops to a check when it resolves.
 */
export function CryptoAgentSteps({ steps }: { steps?: CryptoAgentStep[] }) {
  const reduce = useReducedMotion();
  if (!steps?.length) return null;
  return (
    <ol className="grid min-w-0 gap-1.5">
      {steps.map((step) => {
        const running = step.state === "running";
        return (
          <motion.li
            key={step.label}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="flex min-w-0 items-center gap-2 text-xs"
          >
            <StepMark running={running} />
            <span
              className={cn(
                "shrink-0 font-medium transition-colors duration-300",
                running ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {step.label}
            </span>
            {step.detail ? (
              <span className="min-w-0 truncate text-muted-foreground">
                {step.detail}
              </span>
            ) : null}
          </motion.li>
        );
      })}
    </ol>
  );
}
