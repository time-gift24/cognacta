"use client";

import { useReducedMotion } from "motion/react";
import { type CSSProperties, useEffect, useId, useMemo, useRef } from "react";
import { cn } from "@/lib/beui/utils";
import {
  DEFAULT_PRODUCT_TOUR_LABELS,
  PRODUCT_TOUR_CHECKLIST,
  PRODUCT_TOUR_FOCUS_ID,
  PRODUCT_TOUR_ITEMS,
  PRODUCT_TOUR_LANES,
  PRODUCT_TOUR_REVIEWERS,
  PRODUCT_TOUR_SHIPPED,
  PRODUCT_TOUR_STEPS,
  type ProductTourItem,
  type ProductTourLabels,
  type ProductTourLane,
  type ProductTourModel,
  type ProductTourStep,
} from "./product-tour-data";
import { PIN_QUERY, TRACK_HEIGHT_PER_STEP_VH } from "./product-tour-motion";
import { StepRow } from "./step-row";
import { StepTabs } from "./step-tabs";
import { TourWindow } from "./tour-window";
import { usePinned } from "./use-pinned";
import { useScrollStep } from "./use-scroll-step";

/* ─────────────────────────────────────────────────────────
 * PRODUCT TOUR STORYBOARD
 *
 * Desktop pins the section while the page scrolls through four
 * equal scroll ranges. One set of cards morphs between layouts
 * through shared layout ids:
 *
 *   collect   six requests stack as inbox rows
 *   sort      rows lift into Now / Next / Later lanes
 *   review    "Faster search" grows into a detail card while the
 *             rest shrink into a side queue
 *   ship      finished work collapses into release chips; later
 *             work stays queued underneath
 *
 * Step rows show scroll progress and jump to their range on click.
 * Small screens skip pinning and switch steps with tabs.
 *
 * Parts: StepRow (desktop steps), StepTabs (small screens),
 * TourWindow (frame + stage switch), CollectStage, SortStage,
 * ReviewStage, ShipStage, TourCard (shared layoutId card),
 * usePinned, useScrollStep. Motion tokens live in
 * product-tour-motion.ts; data shapes in product-tour-data.ts.
 * ───────────────────────────────────────────────────────── */

export type ProductTourScrollProps = {
  className?: string;
  /** Steps in order. Each step id selects its stage in the window. */
  steps?: readonly ProductTourStep[];
  /** Items that morph between stages. */
  items?: readonly ProductTourItem[];
  /** Planning lanes for the sort stage, referencing item ids. */
  lanes?: readonly ProductTourLane[];
  /** Item id expanded into the detail card in the review stage. */
  focusId?: string;
  /** Checklist shown on the review card. */
  checklist?: readonly string[];
  /** Reviewer initials shown on the review card. */
  reviewers?: readonly string[];
  /** Item ids bundled into the release in the ship stage. */
  shippedIds?: readonly string[];
  /** Override any interface copy. */
  labels?: Partial<ProductTourLabels>;
  /**
   * Height of the pinned scroll track on large screens, e.g. "320vh".
   * Defaults to 80vh per step.
   */
  trackHeight?: string;
  /** Called when the active step changes. */
  onStepChange?: (step: ProductTourStep, index: number) => void;
};

function pick(ids: readonly string[], byId: Map<string, ProductTourItem>) {
  return ids.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}

export function ProductTourScroll({
  className,
  steps = PRODUCT_TOUR_STEPS,
  items = PRODUCT_TOUR_ITEMS,
  lanes = PRODUCT_TOUR_LANES,
  focusId = PRODUCT_TOUR_FOCUS_ID,
  checklist = PRODUCT_TOUR_CHECKLIST,
  reviewers = PRODUCT_TOUR_REVIEWERS,
  shippedIds = PRODUCT_TOUR_SHIPPED,
  labels: labelOverrides,
  trackHeight: trackHeightProp,
  onStepChange,
}: ProductTourScrollProps) {
  const reduce = useReducedMotion();
  const pinned = usePinned(PIN_QUERY);
  const titleId = useId();
  const count = steps.length;
  const trackHeight =
    trackHeightProp ?? `${Math.max(count, 1) * TRACK_HEIGHT_PER_STEP_VH}vh`;
  const { trackRef, step, scrollYProgress, goTo } = useScrollStep({
    count,
    pinned,
    reduce,
  });

  const labels = useMemo(
    () => ({ ...DEFAULT_PRODUCT_TOUR_LABELS, ...labelOverrides }),
    [labelOverrides],
  );

  const model = useMemo<ProductTourModel>(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    const shipped = pick(shippedIds, byId);
    const shippedSet = new Set(shipped.map((item) => item.id));
    return {
      items,
      lanes: lanes.map((lane) => ({
        title: lane.title,
        items: pick(lane.ids, byId),
      })),
      focus: byId.get(focusId),
      queue: items.filter((item) => item.id !== focusId),
      shipped,
      later: items.filter((item) => !shippedSet.has(item.id)),
      checklist,
      reviewers,
      labels,
    };
  }, [items, lanes, focusId, shippedIds, checklist, reviewers, labels]);

  const active = steps[step];

  const onStepChangeRef = useRef(onStepChange);
  onStepChangeRef.current = onStepChange;
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (active) onStepChangeRef.current?.(active, step);
  }, [active, step]);

  if (!active) return null;

  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-16 font-sans text-foreground sm:px-8 sm:py-20 lg:py-0",
        className,
      )}
      aria-labelledby={titleId}
    >
      <div
        ref={trackRef}
        style={{ "--product-tour-track": trackHeight } as CSSProperties}
        className="mx-auto w-full max-w-6xl lg:h-(--product-tour-track)"
      >
        <div className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
            <div>
              <p className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
                {labels.eyebrow}
              </p>
              <h2
                id={titleId}
                className="mt-4 text-balance font-medium text-4xl tracking-tight"
              >
                {labels.title}
              </h2>
              <p className="mt-4 max-w-md text-pretty text-muted-foreground leading-7">
                {labels.description}
              </p>

              <ol className="mt-10 hidden lg:block">
                {steps.map((item, index) => (
                  <StepRow
                    key={item.id}
                    index={index}
                    count={count}
                    title={item.title}
                    description={item.description}
                    active={index === step}
                    progress={scrollYProgress}
                    onSelect={() => goTo(index)}
                  />
                ))}
              </ol>

              <StepTabs
                steps={steps}
                active={active}
                ariaLabel={labels.stepsLabel}
                reduce={reduce}
                onSelect={goTo}
              />
            </div>

            <TourWindow
              current={active}
              index={step}
              count={count}
              model={model}
              reduce={reduce}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
