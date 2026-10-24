"use client";

import type { ProductTourModel } from "./product-tour-data";
import type { StageTransition } from "./product-tour-motion";
import { StageLabel } from "./stage-label";
import { TourCard } from "./tour-card";

/** Step 1: every item stacked as an inbox row. */
export function CollectStage({
  model,
  transition,
}: {
  model: ProductTourModel;
  transition: StageTransition;
}) {
  return (
    <div>
      <StageLabel>
        {model.labels.inbox} · {model.items.length} {model.labels.inboxNew}
      </StageLabel>
      <div className="flex flex-col gap-2">
        {model.items.map((item) => (
          <TourCard
            key={item.id}
            item={item}
            variant="row"
            transition={transition}
          />
        ))}
      </div>
    </div>
  );
}
