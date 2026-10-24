import {
  formatReportValue,
  type ReportValueFormat,
  reportChange,
} from "./format";

export type ComparisonRange = { from: string; to: string };
export type ComparisonMode = "previous" | "year" | "none";
export type ComparisonMetric = {
  id: string;
  label: string;
  format?: ReportValueFormat;
  aggregation?: "sum" | "average";
  increaseIsPositive?: boolean;
};
/** One observation per UTC date. Missing values are gaps, never assumed zero. */
export type ComparisonRecord = {
  date: string;
  values: Record<string, number | null>;
};
export type ComparisonPoint = {
  day: number;
  date: string;
  previousDate?: string;
  current: number | null;
  previous: number | null;
};
export function shiftComparisonDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function comparisonDays(range: ComparisonRange) {
  return (
    Math.round((Date.parse(range.to) - Date.parse(range.from)) / 86400000) + 1
  );
}
export function comparisonDateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
export function comparisonRangeLabel(range: ComparisonRange) {
  const short = (date: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`));
  return `${short(range.from)}${range.from.slice(0, 4) !== range.to.slice(0, 4) ? `, ${range.from.slice(0, 4)}` : ""} – ${short(range.to)}, ${range.to.slice(0, 4)}`;
}
/** Both comparisons use equal day counts, aligned by position in the period. */
export function resolveComparisonRange(
  range: ComparisonRange,
  mode: ComparisonMode,
): ComparisonRange | null {
  if (mode === "none") return null;
  const days = comparisonDays(range);
  if (mode === "previous")
    return {
      from: shiftComparisonDate(range.from, -days),
      to: shiftComparisonDate(range.from, -1),
    };
  const date = new Date(`${range.from}T00:00:00Z`);
  const month = date.getUTCMonth();
  date.setUTCFullYear(date.getUTCFullYear() - 1);
  if (date.getUTCMonth() !== month) date.setUTCDate(0);
  const from = date.toISOString().slice(0, 10);
  return { from, to: shiftComparisonDate(from, days - 1) };
}
export function buildComparison(
  records: readonly ComparisonRecord[],
  metric: ComparisonMetric,
  range: ComparisonRange,
  mode: ComparisonMode,
) {
  const lookup = new Map(
    records.map((record) => [record.date, record.values[metric.id]]),
  );
  const prior = resolveComparisonRange(range, mode);
  const read = (date: string) => {
    const value = lookup.get(date);
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  };
  const points: ComparisonPoint[] = Array.from(
    { length: Math.max(0, comparisonDays(range)) },
    (_, index) => {
      const date = shiftComparisonDate(range.from, index);
      const previousDate = prior
        ? shiftComparisonDate(prior.from, index)
        : undefined;
      return {
        day: index + 1,
        date,
        previousDate,
        current: read(date),
        previous: previousDate ? read(previousDate) : null,
      };
    },
  );
  const aggregate = (key: "current" | "previous") => {
    const values = points
      .map((point) => point[key])
      .filter((value): value is number => value !== null);
    return {
      count: values.length,
      value: values.length
        ? values.reduce((sum, value) => sum + value, 0) /
          (metric.aggregation === "average" ? values.length : 1)
        : null,
    };
  };
  const current = aggregate("current");
  const previous = aggregate("previous");
  const complete =
    current.count === points.length &&
    previous.count === points.length &&
    points.length > 0;
  const change =
    prior && complete && current.value !== null && previous.value !== null
      ? metric.format?.style === "percent"
        ? current.value - previous.value
        : reportChange(current.value, previous.value)
      : null;
  return { points, prior, current, previous, complete, change };
}
export function comparisonChangeLabel(value: number, metric: ComparisonMetric) {
  return `${value > 0 ? "+" : ""}${formatReportValue(value, { decimals: 1 })}${metric.format?.style === "percent" ? " pp" : "%"}`;
}
