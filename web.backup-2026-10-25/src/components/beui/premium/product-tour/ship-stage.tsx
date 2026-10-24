"use client";

import { motion } from "motion/react";
import type { ProductTourModel } from "./product-tour-data";
import type { StageTransition } from "./product-tour-motion";
import { StageLabel } from "./stage-label";
import { TourCard } from "./tour-card";

/** Step 4: shipped items collapse into release chips; the rest stay queued. */
export function ShipStage({
  model,
  transition,
}: {
  model: ProductTourModel;
  transition: StageTransition;
}) {
  const { shipped, later, labels } = model;

  return (
    <div>
      <StageLabel>{labels.release}</StageLabel>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        className="rounded-2xl border border-border p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium text-xl">{labels.releaseName}</p>
          <span className="rounded-full border border-border px-2.5 py-1 text-xs">
            {labels.releaseStatus}
          </span>
        </div>
        <p className="mt-1 text-muted-foreground text-sm">
          {shipped.length} {labels.improvements} · {labels.releaseAudience}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {shipped.map((item) => (
            <TourCard
              key={item.id}
              item={item}
              variant="chip"
              transition={transition}
            />
          ))}
        </div>
      </motion.div>

      <p className="mt-6 mb-2 font-mono text-muted-foreground text-xs uppercase tracking-widest">
        {labels.upNext}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {later.map((item) => (
          <TourCard
            key={item.id}
            item={item}
            variant="mini"
            transition={transition}
          />
        ))}
      </div>
    </div>
  );
}
