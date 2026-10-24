"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/beui/utils";
import type { BeforeAfterLabels, BeforeAfterScene } from "./before-after-data";
import { sceneVariants } from "./before-after-motion";
import { DividerHandle } from "./divider-handle";
import { SideLabels } from "./side-labels";
import type { DividerState } from "./use-divider";

const IMAGE =
  "absolute inset-0 size-full select-none object-cover pointer-events-none";

export function ComparisonStage({
  scene,
  divider,
  labels,
  className,
}: {
  scene: BeforeAfterScene;
  divider: DividerState;
  labels: BeforeAfterLabels;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const clipPath = useTransform(
    divider.position,
    (p) => `inset(0 ${100 - p}% 0 0)`,
  );
  const variants = sceneVariants(reduce);

  return (
    <div
      ref={divider.stageRef}
      {...divider.stageHandlers}
      className={cn(
        "relative aspect-4/3 w-full cursor-ew-resize touch-pan-y overflow-clip rounded-3xl border border-border bg-background sm:aspect-16/10",
        className,
      )}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={scene.id}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute inset-0"
        >
          {/* biome-ignore lint/performance/noImgElement: Remote Unsplash photo shown at full bleed; next/image would require registry consumers to configure remote patterns. */}
          <img
            src={scene.src}
            alt={`${scene.alt}, ${labels.after.toLowerCase()} auto-grade`}
            draggable={false}
            className={IMAGE}
          />
          <motion.div style={{ clipPath }} className="absolute inset-0">
            {/* biome-ignore lint/performance/noImgElement: Same remote photo as the corrected layer, filtered to simulate the uncorrected capture. */}
            <img
              src={scene.src}
              alt=""
              draggable={false}
              style={{ filter: scene.filter }}
              className={IMAGE}
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>
      <SideLabels
        position={divider.position}
        before={labels.before}
        after={labels.after}
      />
      <DividerHandle
        position={divider.position}
        value={divider.value}
        label={labels.slider}
        beforeLabel={labels.before}
        afterLabel={labels.after}
        dragging={divider.dragging}
        onKeyDown={divider.onKeyDown}
      />
    </div>
  );
}
