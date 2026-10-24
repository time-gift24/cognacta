"use client";

import type { ProductTourModel } from "./product-tour-data";
import type { StageTransition } from "./product-tour-motion";
import { StageLabel } from "./stage-label";
import { TourCard } from "./tour-card";

/** Step 3: the focus item grows into a detail card beside the queue. */
export function ReviewStage({
  model,
  transition,
  reduce,
}: {
  model: ProductTourModel;
  transition: StageTransition;
  reduce: boolean | null;
}) {
  const { focus, queue, labels } = model;

  return (
    <div className="grid h-full gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
      <div className="min-w-0">
        <StageLabel>{labels.inReview}</StageLabel>
        {focus ? (
          <TourCard
            item={focus}
            variant="focus"
            transition={transition}
            reduce={reduce}
            focus={{
              checklist: model.checklist,
              reviewers: model.reviewers,
              approvals: labels.approvals,
              readyToShip: labels.readyToShip,
            }}
          />
        ) : null}
      </div>
      <div className="hidden min-w-0 sm:block">
        <StageLabel>{labels.queue}</StageLabel>
        <div className="flex flex-col gap-1.5">
          {queue.map((item) => (
            <TourCard
              key={item.id}
              item={item}
              variant="mini"
              transition={transition}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
