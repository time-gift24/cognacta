/** A named data series and the Tailwind classes that paint it. */
export type ChartSeries = {
  id: string;
  label: string;
  /** Fill class for bars, segments, and dots, such as `bg-blue-500`. */
  color: string;
  /** Stroke class for lines, such as `stroke-blue-500`. */
  stroke?: string;
};

const grouped = new Intl.NumberFormat("en-US");

/** Default number formatter for chart values. */
export function formatChartValue(value: number) {
  return grouped.format(Math.round(value));
}

/** Compact formatter, such as 128.6k or 1.21m. */
export function formatCompactValue(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}m`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(Math.round(value));
}
