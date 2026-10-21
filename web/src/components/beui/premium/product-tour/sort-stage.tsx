"use client";

import type { ProductTourModel } from "./product-tour-data";
import type { StageTransition } from "./product-tour-motion";
import { StageLabel } from "./stage-label";
import { TourCard } from "./tour-card";

/** Step 2: items lift into planning lanes. */
export function SortStage({
  model,
  transition,
}: {
  model: ProductTourModel;
  transition: StageTransition;
}) {
  return (
    <div className="grid h-full grid-cols-3 gap-3">
      {model.lanes.map((lane) => (
        <div key={lane.title} className="min-w-0">
          <StageLabel>
            {lane.title} · {lane.items.length}
          </StageLabel>
          <div className="flex flex-col gap-2">
            {lane.items.map((item) => (
              <TourCard
                key={item.id}
                item={item}
                variant="card"
                transition={transition}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
