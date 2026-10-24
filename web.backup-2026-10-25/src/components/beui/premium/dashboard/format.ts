export type ReportValueFormat = {
  style?: "number" | "currency" | "percent";
  currency?: string;
  decimals?: number;
  locale?: string;
  suffix?: string;
};

/** Percentage inputs are percentage points: 94.5 renders as 94.5%. */
export function formatReportValue(
  value: number,
  format: ReportValueFormat = {},
) {
  const {
    style = "number",
    currency = "USD",
    decimals = 0,
    locale = "en-US",
  } = format;
  const formatted = new Intl.NumberFormat(locale, {
    style: style === "number" ? "decimal" : style,
    ...(style === "currency" ? { currency } : {}),
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(style === "percent" ? value / 100 : value);
  return `${formatted}${format.suffix ?? ""}`;
}

export function reportChange(value: number, previous?: number) {
  if (previous === undefined || previous === 0) return null;
  return ((value - previous) / Math.abs(previous)) * 100;
}
