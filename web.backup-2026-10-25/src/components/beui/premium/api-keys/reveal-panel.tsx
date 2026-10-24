"use client";

import { Check, Copy, KeyRound, TriangleAlert } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  ActionSwapIcon,
  ActionSwapText,
} from "@/components/beui/motion/action-swap";
import {
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";
import type { ApiKeysLabels } from "./api-keys-data";
import { useCopy } from "./use-copy";

/**
 * One-time secret reveal. The secret resolves from a blur in chunks so the
 * eye lands on it; reduced motion shows it immediately.
 */
export function RevealPanel({
  secret,
  labels,
  onDone,
}: {
  secret: string;
  labels: ApiKeysLabels;
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  const { copied, copy } = useCopy(2000);
  const chunks = secret.match(/.{1,8}/g) ?? [secret];

  return (
    <div className="p-6">
      <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
        <KeyRound aria-hidden className="size-4" />
      </span>
      <AnimatedModalTitle className="mt-4 font-medium text-xl">
        {labels.revealTitle}
      </AnimatedModalTitle>
      <AnimatedModalDescription className="mt-1 text-muted-foreground text-sm">
        {labels.revealDescription}
      </AnimatedModalDescription>

      <div className="mt-5 flex items-start gap-2 rounded-2xl border border-border bg-background p-2 pl-4">
        <code className="min-w-0 flex-1 break-all py-1.5 font-mono text-sm leading-6">
          <span className="sr-only">{secret}</span>
          <span aria-hidden>
            {chunks.map((chunk, index) => (
              <motion.span
                // biome-ignore lint/suspicious/noArrayIndexKey: chunk position is its identity.
                key={index}
                initial={reduce ? false : { opacity: 0, filter: "blur(6px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{
                  duration: 0.4,
                  ease: EASE_OUT,
                  delay: 0.15 + index * 0.05,
                }}
              >
                {chunk}
              </motion.span>
            ))}
          </span>
        </code>
        <Button
          variant="outline"
          size="sm"
          onClick={() => copy(secret)}
          className="h-9 shrink-0 px-3"
        >
          <ActionSwapIcon value={copied ? "check" : "copy"} className="size-4">
            {copied ? (
              <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="size-4" />
            )}
          </ActionSwapIcon>
          <ActionSwapText value={copied ? "copied" : "copy"}>
            {copied ? labels.secretCopied : labels.copySecret}
          </ActionSwapText>
        </Button>
      </div>

      <p
        role="note"
        className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-amber-700 text-sm dark:text-amber-300"
      >
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        {labels.revealWarning}
      </p>

      <div className="mt-6 flex justify-end">
        <Button onClick={onDone}>{labels.done}</Button>
      </div>
    </div>
  );
}
