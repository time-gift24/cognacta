"use client";

import { Check, ExternalLink } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/beui/motion/button";
import { EASE_OUT, SPRING_BOUNCE } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { shortAddress } from "../crypto-wallet/crypto-trade-data";
import type { CryptoAgentLabels } from "./crypto-agent-data";

/**
 * Sign → Submitted → Confirmed. The track fills from the left as each step
 * lands, the live step pulses, and the explorer link rises in at the end.
 */
export function CryptoAgentTxSteps({
  step,
  hash,
  explorerUrl,
  labels,
}: {
  /** Index of the step in progress; 3 means every step is done. */
  step: number;
  hash?: string;
  explorerUrl?: (hash: string) => string;
  labels: CryptoAgentLabels;
}) {
  const reduce = useReducedMotion();
  const done = step >= labels.steps.length;

  return (
    <div>
      <ol className="relative grid grid-cols-3">
        <span
          aria-hidden="true"
          className="absolute top-3 right-[16.66%] left-[16.66%] h-px bg-border"
        >
          <motion.span
            initial={false}
            animate={{ scaleX: Math.min(step, 2) / 2 }}
            transition={{ duration: reduce ? 0 : 0.6, ease: EASE_OUT }}
            className="absolute inset-0 origin-left bg-foreground"
          />
        </span>
        {labels.steps.map((label, index) => {
          const complete = index < step;
          const current = index === step;
          return (
            <li
              key={label}
              aria-current={current ? "step" : undefined}
              className="relative flex flex-col items-center gap-2"
            >
              <span className="relative grid size-6 place-items-center">
                {current && !reduce ? (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-foreground/15"
                    animate={{ scale: [1, 1.7], opacity: [0.8, 0] }}
                    transition={{
                      duration: 1.2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: EASE_OUT,
                    }}
                  />
                ) : null}
                <span
                  className={cn(
                    "relative grid size-6 place-items-center rounded-full border transition-colors duration-300",
                    complete
                      ? "border-foreground bg-foreground text-background"
                      : current
                        ? "border-foreground bg-background"
                        : "border-border bg-background",
                  )}
                >
                  <AnimatePresence initial={false}>
                    {complete ? (
                      <motion.span
                        key="check"
                        initial={
                          reduce ? { opacity: 0 } : { scale: 0, opacity: 0 }
                        }
                        animate={{ scale: 1, opacity: 1 }}
                        transition={SPRING_BOUNCE}
                      >
                        <Check
                          className="size-3.5"
                          strokeWidth={2.5}
                          aria-hidden="true"
                        />
                      </motion.span>
                    ) : current ? (
                      <span className="size-1.5 rounded-full bg-foreground" />
                    ) : null}
                  </AnimatePresence>
                </span>
              </span>
              <span
                className={cn(
                  "text-xs transition-colors duration-300",
                  complete || current
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      {hash ? (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
          className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-2.5"
        >
          <span className="font-mono text-xs text-muted-foreground">
            {shortAddress(hash)}
          </span>
          {done && explorerUrl ? (
            <ButtonLink
              href={explorerUrl(hash)}
              target="_blank"
              rel="noreferrer"
              variant="ghost"
              className="h-8 gap-1.5 px-3 text-xs"
            >
              {labels.viewTx}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </ButtonLink>
          ) : null}
        </motion.div>
      ) : null}
    </div>
  );
}
