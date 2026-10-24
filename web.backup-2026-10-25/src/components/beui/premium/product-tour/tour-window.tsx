"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { CollectStage } from "./collect-stage";
import type { ProductTourModel, ProductTourStep } from "./product-tour-data";
import {
  LAYOUT_GROUP_ID,
  layoutTransition,
  panelTransition,
} from "./product-tour-motion";
import { ReviewStage } from "./review-stage";
import { ShipStage } from "./ship-stage";
import { SortStage } from "./sort-stage";

export type TourWindowProps = {
  current: ProductTourStep;
  index: number;
  count: number;
  model: ProductTourModel;
  reduce: boolean | null;
};

/** Product window frame: chrome dots, step counter, and the active stage. */
export function TourWindow({
  current,
  index,
  count,
  model,
  reduce,
}: TourWindowProps) {
  const transition = layoutTransition(reduce);

  return (
    <div
      role="img"
      aria-label={`${current.label}: ${current.description}`}
      className="relative rounded-3xl border border-border bg-background p-2"
    >
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-muted" />
          <span className="size-2.5 rounded-full bg-muted" />
          <span className="size-2.5 rounded-full bg-muted" />
        </div>
        <div className="relative h-5 w-40 overflow-hidden text-right">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={current.id}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={panelTransition(reduce)}
              className="absolute inset-0 whitespace-nowrap font-mono text-muted-foreground text-xs"
            >
              {current.label.toLowerCase()} · {model.labels.stepCounter}{" "}
              {index + 1}/{count}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      <div className="relative h-[26rem] overflow-hidden rounded-2xl border border-border p-4 sm:p-5">
        <LayoutGroup id={LAYOUT_GROUP_ID}>
          {current.id === "collect" ? (
            <CollectStage model={model} transition={transition} />
          ) : null}
          {current.id === "sort" ? (
            <SortStage model={model} transition={transition} />
          ) : null}
          {current.id === "review" ? (
            <ReviewStage
              model={model}
              transition={transition}
              reduce={reduce}
            />
          ) : null}
          {current.id === "ship" ? (
            <ShipStage model={model} transition={transition} />
          ) : null}
        </LayoutGroup>
      </div>
    </div>
  );
}
