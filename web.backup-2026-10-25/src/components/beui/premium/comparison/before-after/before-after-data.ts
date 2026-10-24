export type BeforeAfterMetric = {
  id: string;
  label: string;
  /** Value measured on the uncorrected photo. */
  before: number;
  /** Value measured after the auto-grade. */
  after: number;
  /** Suffix rendered after the rounded value, such as "%". */
  unit?: string;
  /** Tailwind background class for the metric meter. */
  colorClassName?: string;
};

export type BeforeAfterScene = {
  id: string;
  /** Tab label. */
  label: string;
  /** Short note shown under the readout title. */
  summary: string;
  src: string;
  alt: string;
  /** CSS filter that simulates the problem on the "before" layer. */
  filter: string;
  metrics: readonly BeforeAfterMetric[];
  /** Tonal histogram buckets (0–1) before and after the grade. */
  histogram: {
    before: readonly number[];
    after: readonly number[];
  };
};

export type BeforeAfterLabels = {
  eyebrow: string;
  title: string;
  description: string;
  scenes: string;
  before: string;
  after: string;
  slider: string;
  hold: string;
  readout: string;
  histogram: string;
  shadows: string;
  highlights: string;
};

export const DEFAULT_LABELS: BeforeAfterLabels = {
  eyebrow: "Lumen auto-grade",
  title: "One pass fixes the whole frame.",
  description:
    "Lumen reads light, haze, and white balance, then grades every pixel in a single step. Drag the divider to see what changes.",
  scenes: "Sample scenes",
  before: "Before",
  after: "After",
  slider: "Before and after divider",
  hold: "Hold to compare",
  readout: "Live readout",
  histogram: "Tonal range",
  shadows: "Shadows",
  highlights: "Highlights",
};

const BUCKETS = 28;

/** Builds a smooth tonal curve so sample histograms read like real exposures. */
function tones(center: number, spread: number, floor = 0.06) {
  return Array.from({ length: BUCKETS }, (_, index) => {
    const x = index / (BUCKETS - 1);
    const peak = Math.exp(-((x - center) ** 2) / (2 * spread ** 2));
    const texture = 0.08 * Math.sin(index * 1.7) * peak;
    return Math.min(1, Math.max(floor, peak + texture));
  });
}

function photo(id: string) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;
}

export const DEFAULT_SCENES: readonly BeforeAfterScene[] = [
  {
    id: "low-light",
    label: "Low light",
    summary: "Lifted shadows without clipping the sky.",
    src: photo("1555881400-74d7acaacd8b"),
    alt: "Riverside old town with colorful houses and boats moored along the quay",
    filter: "brightness(0.42) contrast(0.82) saturate(0.7)",
    metrics: [
      {
        id: "exposure",
        label: "Exposure",
        before: 27,
        after: 74,
        unit: "%",
        colorClassName: "bg-amber-500",
      },
      {
        id: "contrast",
        label: "Contrast",
        before: 38,
        after: 81,
        unit: "%",
        colorClassName: "bg-sky-500",
      },
      {
        id: "color",
        label: "Color accuracy",
        before: 61,
        after: 96,
        unit: "%",
        colorClassName: "bg-teal-500",
      },
    ],
    histogram: { before: tones(0.16, 0.11), after: tones(0.52, 0.22) },
  },
  {
    id: "haze",
    label: "Haze",
    summary: "Recovered depth in the far ridges.",
    src: photo("1464822759023-fed622ff2c3b"),
    alt: "Snow-capped mountain valley beyond a dense pine forest",
    filter: "contrast(0.55) brightness(1.18) saturate(0.5)",
    metrics: [
      {
        id: "exposure",
        label: "Exposure",
        before: 84,
        after: 71,
        unit: "%",
        colorClassName: "bg-amber-500",
      },
      {
        id: "contrast",
        label: "Contrast",
        before: 21,
        after: 78,
        unit: "%",
        colorClassName: "bg-sky-500",
      },
      {
        id: "color",
        label: "Color accuracy",
        before: 54,
        after: 94,
        unit: "%",
        colorClassName: "bg-teal-500",
      },
    ],
    histogram: { before: tones(0.64, 0.07), after: tones(0.5, 0.24) },
  },
  {
    id: "color-cast",
    label: "Color cast",
    summary: "Neutralized a warm tungsten tint.",
    src: photo("1501785888041-af3ef285b470"),
    alt: "Turquoise alpine lake with a wooden rowboat beneath limestone peaks",
    filter: "sepia(0.6) hue-rotate(-14deg) saturate(1.35) contrast(0.92)",
    metrics: [
      {
        id: "exposure",
        label: "Exposure",
        before: 66,
        after: 72,
        unit: "%",
        colorClassName: "bg-amber-500",
      },
      {
        id: "contrast",
        label: "Contrast",
        before: 57,
        after: 76,
        unit: "%",
        colorClassName: "bg-sky-500",
      },
      {
        id: "color",
        label: "Color accuracy",
        before: 31,
        after: 97,
        unit: "%",
        colorClassName: "bg-teal-500",
      },
    ],
    histogram: { before: tones(0.6, 0.16), after: tones(0.5, 0.22) },
  },
];
