"use client";

import { BlurHighlight, type BlurHighlightProps } from "./blur-highlight";

export type ProgressiveBlurHighlightProps = Omit<BlurHighlightProps, "mode">;

export function ProgressiveBlurHighlight({
  highlightInterval = 900,
  ...props
}: ProgressiveBlurHighlightProps) {
  return (
    <BlurHighlight
      {...props}
      highlightInterval={highlightInterval}
      mode="accumulate"
    />
  );
}
