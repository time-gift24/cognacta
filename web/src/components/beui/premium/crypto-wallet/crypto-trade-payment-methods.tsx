// biome-ignore-all lint/a11y/useSemanticElements: Rich radio rows use shared Buttons for the animated selection surface, matching the shared Radio.
"use client";

import { Check, CreditCard, Landmark, Smartphone } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useId } from "react";
import { Button } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { SPRING_LAYOUT, SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { type CryptoTradePaymentMethod, tradeUsd } from "./crypto-trade-data";

const KIND_ICONS = {
  card: CreditCard,
  bank: Landmark,
  wallet: Smartphone,
} as const;

/**
 * Radio list of payment methods. Each row shows its fee for the current
 * amount so methods are easy to compare; the selected surface glides between
 * rows and the check pops in.
 */
export function TradePaymentMethods({
  methods,
  value,
  onValueChange,
  usdAmount,
  label,
  feeLabel,
}: {
  methods: readonly CryptoTradePaymentMethod[];
  value: string;
  onValueChange: (value: string) => void;
  usdAmount: number;
  label: string;
  feeLabel: string;
}) {
  const id = useId();
  const reduce = useReducedMotion();

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const step =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = methods[(index + step + methods.length) % methods.length];
    onValueChange(next.id);
    document.getElementById(`${id}-${next.id}`)?.focus();
  };

  return (
    <div className="mt-3">
      <p id={`${id}-label`} className="px-2 text-sm text-muted-foreground">
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className="mt-2 rounded-3xl border border-border bg-background p-1.5"
      >
        {methods.map((method, index) => {
          const selected = method.id === value;
          const Icon = KIND_ICONS[method.kind ?? "card"];
          const fee = usdAmount * (method.feePercent / 100);
          return (
            <Button
              key={method.id}
              id={`${id}-${method.id}`}
              type="button"
              variant="plain"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onValueChange(method.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              whileHover={undefined}
              whileTap={undefined}
              className="group/method relative flex w-full items-center gap-3 px-3 py-2.5 text-left focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              {/* The shared Button is always pill-shaped, so the focus ring is drawn here. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-2xl ring-ring ring-offset-2 ring-offset-background group-focus-visible/method:ring-2"
              />
              {selected ? (
                <motion.span
                  layoutId={reduce ? undefined : `${id}-surface`}
                  transition={SPRING_LAYOUT}
                  className="absolute inset-0 rounded-2xl bg-muted"
                />
              ) : null}
              <span
                className={cn(
                  "relative flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                  selected ? "bg-background" : "bg-muted",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {method.label}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {method.detail}
                </span>
              </span>
              <span className="relative text-right tabular-nums">
                <span className="block text-sm font-medium">
                  <DigitSwap value={tradeUsd(fee)} />
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {method.feePercent}% {feeLabel}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "relative flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border",
                )}
              >
                <AnimatePresence initial={false}>
                  {selected ? (
                    <motion.span
                      initial={{ opacity: 0, scale: reduce ? 1 : 0.4 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: reduce ? 1 : 0.4 }}
                      transition={SPRING_SWAP}
                      className="flex"
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
