"use client";

import { ArrowLeftRight, ArrowUpRight, Send, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import { EASE_OUT, SPRING_SWAP } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import type {
  CryptoAgentLabels,
  CryptoAgentSuggestion,
} from "./crypto-agent-data";
import { CryptoAgentAvatar } from "./crypto-agent-message";

const ICONS = { swap: ArrowLeftRight, send: Send, approve: ShieldCheck };

/*
 * Empty state: the avatar and greeting rise in, then the starter cards
 * cascade 60ms apart. Hovering a card lifts it and slides its arrow out.
 */
export function CryptoAgentWelcome({
  labels,
  suggestions,
  disabled,
  onPick,
}: {
  labels: CryptoAgentLabels;
  suggestions: CryptoAgentSuggestion[];
  disabled: boolean;
  onPick: (prompt: string) => void;
}) {
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const rise = (delay: number) => ({
    initial: reduce
      ? { opacity: 0 }
      : { opacity: 0, y: 12, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 0.5, ease: EASE_OUT, delay },
  });

  return (
    <div className="flex flex-1 flex-col justify-center py-8 sm:py-10">
      <motion.div {...rise(0)}>
        <CryptoAgentAvatar className="size-12" />
      </motion.div>
      <motion.h1
        {...rise(0.06)}
        className="mt-6 text-balance text-3xl font-medium text-foreground"
      >
        {labels.greeting}
      </motion.h1>
      <motion.p
        {...rise(0.12)}
        className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground"
      >
        {labels.greetingBody}
      </motion.p>
      <p className="sr-only">{labels.suggestions}</p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {suggestions.map((item, index) => {
          const Icon = ICONS[item.kind];
          return (
            <motion.li
              key={item.prompt}
              {...rise(0.2 + index * 0.06)}
              whileHover={
                canHover && !reduce && !disabled ? "hover" : undefined
              }
              className="group relative rounded-3xl border border-border bg-background p-4 transition-colors duration-300 hover:border-foreground/25 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background"
            >
              <motion.div
                variants={{ hover: { y: -2 } }}
                transition={SPRING_SWAP}
                className="grid h-full grid-cols-[auto_1fr_auto] items-center gap-3 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-0"
              >
                <span className="grid size-9 place-items-center rounded-full bg-muted sm:col-start-1 sm:row-start-1">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 sm:col-span-2 sm:row-start-2 sm:mt-6">
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {item.prompt}
                  </p>
                </div>
                <motion.span
                  variants={{ hover: { x: 2, y: -2, opacity: 1 } }}
                  initial={{ opacity: 0.4 }}
                  transition={SPRING_SWAP}
                  className="text-muted-foreground sm:col-start-2 sm:row-start-1"
                >
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </motion.span>
              </motion.div>
              <Button
                type="button"
                variant="plain"
                aria-label={item.prompt}
                disabled={disabled}
                onClick={() => onPick(item.prompt)}
                whileHover={undefined}
                whileTap={undefined}
                className="absolute inset-0 size-full outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
