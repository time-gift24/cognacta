/**
 * Default sample data for the daily trend. Pass your own `days`,
 * `categories`, and `workflows` props to replace it.
 */
import { CREDIT_CATEGORIES } from "./credit-usage-data";

export type TrendDay = {
  /** Axis and tooltip label, such as "Oct 12". */
  label: string;
  /** Credits used per category id. */
  usage: Record<string, number>;
};

export type TrendWorkflow = {
  id: string;
  name: string;
  /** Category id from the categories list. */
  category: string;
  credits: number;
  /** Percent change versus the previous period. */
  change: number;
  /** Relative values for the sparkline, oldest first. */
  spark: readonly number[];
};

const SHARE: Record<string, number> = {
  drafting: 0.3,
  analysis: 0.36,
  translation: 0.19,
  sync: 0.15,
};

// Deterministic noise so server and client render the same chart.
function noise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43_758.5453;
  return x - Math.floor(x);
}

export const TREND_DAYS: readonly TrendDay[] = Array.from(
  { length: 30 },
  (_, index) => {
    const day = index + 1;
    const weekday = (index + 3) % 7;
    const weekend = weekday === 0 || weekday === 6;
    const growth = 0.82 + index * 0.012;
    const spike = day === 12 || day === 23 ? 1.45 : 1;
    const total =
      (weekend ? 7_200 : 15_400) * growth * spike * (0.88 + noise(day) * 0.24);
    const usage = Object.fromEntries(
      CREDIT_CATEGORIES.map((category, offset) => [
        category.id,
        Math.round(
          total *
            (SHARE[category.id] ?? 0.25) *
            (0.85 + noise(day * 7 + offset) * 0.3),
        ),
      ]),
    );
    return { label: `Oct ${day}`, usage };
  },
);

const spark = (seed: number, rise: number) =>
  Array.from({ length: 14 }, (_, i) =>
    Math.round(40 + i * rise + noise(seed + i) * 26),
  );

export const TREND_WORKFLOWS: readonly TrendWorkflow[] = [
  {
    id: "ticket-triage",
    name: "Ticket triage",
    category: "analysis",
    credits: 46_300,
    change: 18,
    spark: spark(3, 3.2),
  },
  {
    id: "market-scan",
    name: "Market scan",
    category: "analysis",
    credits: 38_120,
    change: 6,
    spark: spark(11, 1.1),
  },
  {
    id: "help-locale",
    name: "Help localizer",
    category: "translation",
    credits: 33_610,
    change: -9,
    spark: spark(19, -1.4),
  },
  {
    id: "crm-enrich",
    name: "CRM enrichment",
    category: "sync",
    credits: 29_480,
    change: 3,
    spark: spark(27, 0.6),
  },
  {
    id: "proposal",
    name: "Proposal drafts",
    category: "drafting",
    credits: 27_950,
    change: 24,
    spark: spark(35, 3.8),
  },
];
