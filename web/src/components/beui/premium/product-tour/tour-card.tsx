"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/beui/utils";
import type { ProductTourItem } from "./product-tour-data";
import {
  CARD_CONTENT_FADE,
  CARD_RADIUS,
  type CardVariant,
  checklistTransition,
  type StageTransition,
} from "./product-tour-motion";

function Avatar({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full bg-muted font-medium text-xs",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export type TourCardFocus = {
  checklist: readonly string[];
  reviewers: readonly string[];
  approvals: string;
  readyToShip: string;
};

export type TourCardProps = {
  item: ProductTourItem;
  variant: CardVariant;
  transition: StageTransition;
  reduce?: boolean | null;
  /** Detail content for the `focus` variant. */
  focus?: TourCardFocus;
};

/**
 * One item rendered in any stage. The shared layoutId lets the same
 * card morph between row, card, focus, mini, and chip layouts.
 */
export function TourCard({
  item,
  variant,
  transition,
  reduce,
  focus,
}: TourCardProps) {
  return (
    <motion.div
      layoutId={`product-tour-${item.id}`}
      transition={transition}
      style={{ borderRadius: CARD_RADIUS[variant] }}
      className={cn(
        "overflow-hidden border border-border bg-background",
        variant === "chip" && "border-foreground/20",
      )}
    >
      <motion.div
        key={variant}
        layout="position"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={CARD_CONTENT_FADE}
      >
        {variant === "row" ? (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Avatar initials={item.owner} />
            <span className="min-w-0 flex-1 truncate text-sm">
              {item.title}
            </span>
            <span className="text-muted-foreground text-xs">{item.tag}</span>
          </div>
        ) : null}

        {variant === "card" ? (
          <div className="p-3">
            <p className="text-muted-foreground text-xs">{item.tag}</p>
            <p className="mt-1 font-medium text-sm leading-5">{item.title}</p>
            <div className="mt-3 flex justify-end">
              <Avatar initials={item.owner} />
            </div>
          </div>
        ) : null}

        {variant === "focus" && focus ? (
          <div className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs">{item.tag}</p>
              <div className="flex -space-x-1">
                {focus.reviewers.map((initials) => (
                  <Avatar
                    key={initials}
                    initials={initials}
                    className="ring-2 ring-background"
                  />
                ))}
              </div>
            </div>
            <p className="mt-2 font-medium text-xl">{item.title}</p>
            <ul className="mt-5 space-y-3">
              {focus.checklist.map((entry, index) => (
                <motion.li
                  key={entry}
                  initial={reduce ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={checklistTransition(reduce ?? null, index)}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  {entry}
                </motion.li>
              ))}
            </ul>
            <div className="mt-6 flex items-center justify-between gap-3 border-border border-t pt-4 text-sm">
              <span className="text-muted-foreground">{focus.approvals}</span>
              <span className="rounded-full bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs">
                {focus.readyToShip}
              </span>
            </div>
          </div>
        ) : null}

        {variant === "mini" ? (
          <p className="truncate px-3 py-2 text-muted-foreground text-xs">
            {item.title}
          </p>
        ) : null}

        {variant === "chip" ? (
          <p className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs">
            <Check className="size-3" aria-hidden="true" />
            {item.title}
          </p>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
