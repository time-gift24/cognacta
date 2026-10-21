"use client";

import {
  animate,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect } from "react";
import { MORPH } from "./before-after-motion";

/** A motion value that eases to `target` whenever it changes. */
export function useMorphValue(target: number) {
  const reduce = useReducedMotion();
  const value = useMotionValue(target);
  useEffect(() => {
    if (reduce) {
      value.set(target);
      return;
    }
    const controls = animate(value, target, MORPH);
    return () => controls.stop();
  }, [reduce, target, value]);
  return value;
}

/**
 * Interpolates between a before and after reading by the share of the frame
 * showing the corrected photo. Both ends morph when the scene changes.
 */
export function useBlendedValue(
  afterShare: MotionValue<number>,
  before: number,
  after: number,
) {
  const from = useMorphValue(before);
  const to = useMorphValue(after);
  return useTransform(
    [afterShare, from, to] as MotionValue<number>[],
    ([share = 0, start = 0, end = 0]: number[]) =>
      // Rounded so server and client render identical transform strings.
      Math.round((start + (end - start) * share) * 1000) / 1000,
  );
}
