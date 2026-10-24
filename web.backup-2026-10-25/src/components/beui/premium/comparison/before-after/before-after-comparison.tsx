"use client";

/*
 * Storyboard
 * 1. Header, stage, and readout blur-rise in sequence (~70ms apart).
 * 2. Once the stage is half in view, the divider sweeps 50% → 20% → 50% to
 *    invite a drag. Any interaction cancels the sweep.
 * 3. Dragging, clicking, or arrow keys move the divider; the "before" layer
 *    is clipped with clip-path, side pills fade as their half is covered, and
 *    metrics plus histogram bars blend between before and after readings.
 * 4. Switching scenes cross-fades the photo out of a soft blur while metric
 *    and histogram targets morph to the new scene.
 * 5. "Hold to compare" glides the divider to full before and back on release.
 * Reduced motion: no sweep or blur, divider moves instantly, scenes fade, and
 * readouts update without easing.
 */

import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/beui/utils";
import {
  type BeforeAfterLabels,
  type BeforeAfterScene,
  DEFAULT_LABELS,
  DEFAULT_SCENES,
} from "./before-after-data";
import { riseVariants } from "./before-after-motion";
import { ComparisonStage } from "./comparison-stage";
import { Histogram } from "./histogram";
import { HoldButton } from "./hold-button";
import { MetricsPanel } from "./metrics-panel";
import { SceneTabs } from "./scene-tabs";
import { useDivider } from "./use-divider";

export type BeforeAfterComparisonProps = {
  scenes?: readonly BeforeAfterScene[];
  defaultSceneId?: string;
  /** Initial divider position, as a percent of the frame showing "before". */
  defaultPosition?: number;
  labels?: Partial<BeforeAfterLabels>;
  /** Called with the rounded divider position whenever it changes. */
  onPositionChange?: (position: number) => void;
  className?: string;
};

export function BeforeAfterComparison({
  scenes = DEFAULT_SCENES,
  defaultSceneId,
  defaultPosition = 50,
  labels: labelOverrides,
  onPositionChange,
  className,
}: BeforeAfterComparisonProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const reduce = useReducedMotion();
  const [sceneId, setSceneId] = useState(defaultSceneId ?? scenes[0]?.id ?? "");
  const scene = scenes.find((item) => item.id === sceneId) ?? scenes[0];
  const divider = useDivider({ defaultPosition, onPositionChange, reduce });
  const inView = useInView(divider.stageRef, { once: true, amount: 0.5 });
  const { sweep } = divider;

  useEffect(() => {
    if (inView) sweep();
  }, [inView, sweep]);

  if (!scene) return null;

  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-20 text-foreground sm:px-8 sm:py-24",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          {...riseVariants(reduce, 0)}
          className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-xl">
            <p className="text-sm font-medium text-muted-foreground">
              {labels.eyebrow}
            </p>
            <h2 className="mt-4 text-balance text-4xl font-medium tracking-tight">
              {labels.title}
            </h2>
            <p className="mt-5 text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
              {labels.description}
            </p>
          </div>
          <SceneTabs
            scenes={scenes}
            value={scene.id}
            onValueChange={setSceneId}
            label={labels.scenes}
          />
        </motion.div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <motion.div {...riseVariants(reduce, 1)}>
            <ComparisonStage scene={scene} divider={divider} labels={labels} />
          </motion.div>
          <motion.aside
            {...riseVariants(reduce, 2)}
            aria-label={labels.readout}
            className="flex flex-col gap-6 rounded-3xl border border-border bg-background p-5 sm:p-6"
          >
            <div>
              <h3 className="text-xl font-medium">{labels.readout}</h3>
              <p
                aria-live="polite"
                className="mt-1 text-sm text-muted-foreground"
              >
                {scene.label}: {scene.summary}
              </p>
            </div>
            <MetricsPanel
              metrics={scene.metrics}
              afterShare={divider.afterShare}
              beforeLabel={labels.before}
              afterLabel={labels.after}
            />
            <Histogram
              afterShare={divider.afterShare}
              before={scene.histogram.before}
              after={scene.histogram.after}
              title={labels.histogram}
              shadows={labels.shadows}
              highlights={labels.highlights}
            />
            <HoldButton
              label={labels.hold}
              onHold={divider.hold}
              className="mt-auto"
            />
          </motion.aside>
        </div>
      </div>
    </section>
  );
}
