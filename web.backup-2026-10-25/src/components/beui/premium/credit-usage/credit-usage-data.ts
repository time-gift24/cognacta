import type { ChartSeries } from "@/components/beui/charts/chart-series";

/**
 * Default sample data for the credit usage blocks. Every component accepts
 * these shapes as props, so swap in your own categories, periods, and rows
 * without touching the component source.
 */

export type CreditCategory = ChartSeries & {
  /** Stroke class for sparklines, such as `stroke-blue-500`. */
  stroke: string;
  /** Classes for the tinted category pill in tables. */
  badge: string;
};

export type CreditStat = {
  label: string;
  value: number;
};

export type CreditUsagePeriod = {
  id: string;
  /** Tab label, such as "30 days". */
  label: string;
  /** Credits included in the plan for this period. */
  limit: number;
  /** Short note shown under the meter, such as "Renews Nov 1". */
  renews: string;
  /** Credits used per category id. */
  usage: Record<string, number>;
  /** Up to four headline numbers shown under the meter. */
  stats: readonly CreditStat[];
  /** Multiplier applied to table rows, which are authored for one period. */
  rowScale?: number;
};

export type CreditRow = {
  id: string;
  name: string;
  detail: string;
  /** Category id from the categories list. */
  category: string;
  runs: number;
  hours: number;
  credits: number;
  /** Optional photo shown before the name. */
  avatar?: string;
};

export const CREDIT_CATEGORIES: readonly CreditCategory[] = [
  {
    id: "drafting",
    label: "Drafting",
    color: "bg-blue-500",
    stroke: "stroke-blue-500",
    badge: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  {
    id: "analysis",
    label: "Analysis",
    color: "bg-orange-500",
    stroke: "stroke-orange-500",
    badge:
      "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  {
    id: "translation",
    label: "Translation",
    color: "bg-teal-500",
    stroke: "stroke-teal-500",
    badge: "border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
  {
    id: "sync",
    label: "Data sync",
    color: "bg-lime-500",
    stroke: "stroke-lime-500",
    badge: "border-lime-500/30 bg-lime-500/10 text-lime-700 dark:text-lime-300",
  },
];

export const CREDIT_PERIODS: readonly CreditUsagePeriod[] = [
  {
    id: "week",
    label: "7 days",
    limit: 125_000,
    renews: "Renews Monday",
    usage: {
      drafting: 31_400,
      analysis: 38_900,
      translation: 19_200,
      sync: 14_700,
    },
    stats: [
      { label: "Tasks completed", value: 1_184 },
      { label: "Active workflows", value: 11 },
      { label: "Hours returned", value: 268 },
      { label: "Credits per task", value: 87 },
    ],
    rowScale: 0.24,
  },
  {
    id: "month",
    label: "30 days",
    limit: 500_000,
    renews: "Renews Nov 1",
    usage: {
      drafting: 128_600,
      analysis: 154_300,
      translation: 81_900,
      sync: 62_400,
    },
    stats: [
      { label: "Tasks completed", value: 4_912 },
      { label: "Active workflows", value: 17 },
      { label: "Hours returned", value: 1_096 },
      { label: "Credits per task", value: 87 },
    ],
    rowScale: 1,
  },
  {
    id: "quarter",
    label: "Quarter",
    limit: 1_500_000,
    renews: "Renews Jan 1",
    usage: {
      drafting: 371_200,
      analysis: 412_800,
      translation: 236_500,
      sync: 188_100,
    },
    stats: [
      { label: "Tasks completed", value: 14_260 },
      { label: "Active workflows", value: 21 },
      { label: "Hours returned", value: 3_310 },
      { label: "Credits per task", value: 85 },
    ],
    rowScale: 2.85,
  },
];

const avatar = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&fm=webp&q=80&w=96&h=96`;

export const CREDIT_WORKFLOWS: readonly CreditRow[] = [
  {
    id: "release-notes",
    name: "Release notes writer",
    detail: "Runs on merge",
    category: "drafting",
    runs: 864,
    hours: 172,
    credits: 21_840,
  },
  {
    id: "market-scan",
    name: "Weekly market scan",
    detail: "Mondays 08:00",
    category: "analysis",
    runs: 1_310,
    hours: 341,
    credits: 38_120,
  },
  {
    id: "ticket-triage",
    name: "Support ticket triage",
    detail: "On new ticket",
    category: "analysis",
    runs: 2_975,
    hours: 488,
    credits: 46_300,
  },
  {
    id: "help-locale",
    name: "Help center localizer",
    detail: "6 languages",
    category: "translation",
    runs: 742,
    hours: 205,
    credits: 33_610,
  },
  {
    id: "crm-enrich",
    name: "CRM record enrichment",
    detail: "Every hour",
    category: "sync",
    runs: 3_420,
    hours: 96,
    credits: 29_480,
  },
  {
    id: "proposal",
    name: "Proposal first drafts",
    detail: "On request",
    category: "drafting",
    runs: 418,
    hours: 236,
    credits: 27_950,
  },
  {
    id: "invoice-sync",
    name: "Invoice reconciliation",
    detail: "Nightly",
    category: "sync",
    runs: 930,
    hours: 74,
    credits: 18_220,
  },
  {
    id: "ui-strings",
    name: "Product string translation",
    detail: "On pull request",
    category: "translation",
    runs: 1_115,
    hours: 118,
    credits: 24_730,
  },
];

export const CREDIT_TEAMMATES: readonly CreditRow[] = [
  {
    id: "maya",
    name: "Maya Chen",
    detail: "Product marketing",
    category: "drafting",
    runs: 1_240,
    hours: 296,
    credits: 41_200,
    avatar: avatar("1494790108377-be9c29b29330"),
  },
  {
    id: "leo",
    name: "Leo Martin",
    detail: "Support lead",
    category: "analysis",
    runs: 2_105,
    hours: 402,
    credits: 52_870,
    avatar: avatar("1500648767791-00dcc994a43e"),
  },
  {
    id: "ines",
    name: "Ines Ward",
    detail: "Localization",
    category: "translation",
    runs: 1_032,
    hours: 214,
    credits: 36_400,
    avatar: avatar("1438761681033-6461ffad8d80"),
  },
  {
    id: "omar",
    name: "Omar Reyes",
    detail: "Revenue operations",
    category: "sync",
    runs: 2_684,
    hours: 121,
    credits: 31_950,
    avatar: avatar("1507003211169-0a1dd7228f2d"),
  },
  {
    id: "nina",
    name: "Nina Brooks",
    detail: "Research",
    category: "analysis",
    runs: 870,
    hours: 233,
    credits: 29_640,
    avatar: avatar("1529626455594-4ff0802cfb7e"),
  },
  {
    id: "tom",
    name: "Tom Okafor",
    detail: "Content design",
    category: "drafting",
    runs: 512,
    hours: 148,
    credits: 19_380,
    avatar: avatar("1506794778202-cad84cf45f1d"),
  },
];

export { formatCompactValue as formatCompact } from "@/components/beui/charts/chart-series";
