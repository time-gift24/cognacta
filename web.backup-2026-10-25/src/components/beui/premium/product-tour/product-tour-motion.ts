import { EASE_OUT, SPRING_LAYOUT, SPRING_PANEL } from "@/lib/beui/ease";

/** Viewport width where the section pins and scroll drives the steps. */
export const PIN_QUERY = "(min-width: 1024px)";

/** Default height of the pinned scroll track. */
/** Pinned scroll distance given to each step on large screens. */
export const TRACK_HEIGHT_PER_STEP_VH = 80;

/** Shared layout group for card morphs between stages. */
export const LAYOUT_GROUP_ID = "product-tour";

export type CardVariant = "row" | "card" | "focus" | "mini" | "chip";

export const CARD_RADIUS: Record<CardVariant, number> = {
  row: 14,
  card: 16,
  focus: 20,
  mini: 12,
  chip: 999,
};

export const INSTANT = { duration: 0 };

export type StageTransition = typeof SPRING_LAYOUT | typeof INSTANT;

export function layoutTransition(reduce: boolean | null): StageTransition {
  return reduce ? INSTANT : SPRING_LAYOUT;
}

export function panelTransition(reduce: boolean | null) {
  return reduce ? INSTANT : SPRING_PANEL;
}

export const STAGE_LABEL_FADE = { duration: 0.3, ease: EASE_OUT };

export const CARD_CONTENT_FADE = {
  duration: 0.25,
  delay: 0.08,
  ease: EASE_OUT,
};

export function checklistTransition(reduce: boolean | null, index: number) {
  return reduce ? INSTANT : { ...SPRING_PANEL, delay: 0.25 + index * 0.08 };
}
