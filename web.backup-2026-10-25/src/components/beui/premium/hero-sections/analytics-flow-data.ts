export type AnalyticsFlowReport = {
  id: string;
  label: string;
  title: string;
  unit: string;
  currency?: boolean;
  values: readonly number[];
  previous: readonly number[];
  supportingMetrics: readonly {
    label: string;
    value: number;
    suffix?: string;
  }[];
  breakdownTitle: string;
  sources: readonly { name: string; share: number }[];
  insight: string;
  nextStep: string;
};

export const REPORT_DATES = [
  "Sep 26",
  "Sep 27",
  "Sep 28",
  "Sep 29",
  "Sep 30",
  "Oct 1",
  "Oct 2",
  "Oct 3",
  "Oct 4",
  "Oct 5",
  "Oct 6",
  "Oct 7",
  "Oct 8",
  "Oct 9",
] as const;

export const ANALYTICS_REPORTS: readonly AnalyticsFlowReport[] = [
  {
    id: "reach",
    label: "Reach",
    title: "A steady stream of new visitors",
    unit: "sessions",
    values: [
      870, 950, 1040, 780, 1250, 1190, 1560, 1310, 1610, 1390, 1700, 1850, 1570,
      1770,
    ],
    previous: [
      710, 820, 890, 840, 980, 1040, 1120, 990, 1250, 1160, 1310, 1270, 1400,
      1460,
    ],
    supportingMetrics: [
      { label: "Engaged sessions", value: 13753 },
      { label: "Returning visitors", value: 4145 },
    ],
    breakdownTitle: "Where they found you",
    sources: [
      { name: "Search", share: 40 },
      { name: "Community", share: 25 },
      { name: "Email", share: 20 },
      { name: "Bookmarks", share: 15 },
    ],
    insight:
      "Search brings the largest share of visits. The latest content update is worth a closer look.",
    nextStep:
      "Compare the pages people discover through search with the pages that bring them back.",
  },
  {
    id: "activation",
    label: "Activation",
    title: "Small actions, lasting momentum",
    unit: "new accounts",
    values: [42, 54, 51, 38, 63, 58, 78, 69, 85, 74, 92, 103, 86, 97],
    previous: [38, 42, 46, 40, 51, 47, 58, 55, 67, 62, 71, 75, 73, 80],
    supportingMetrics: [
      { label: "First projects created", value: 673 },
      { label: "Teammates invited", value: 412 },
    ],
    breakdownTitle: "Their first useful action",
    sources: [
      { name: "Created a project", share: 45 },
      { name: "Invited a teammate", share: 27 },
      { name: "Connected a source", share: 18 },
      { name: "Saved a view", share: 10 },
    ],
    insight:
      "Project creation is the most common first step. Team invitations follow soon after.",
    nextStep:
      "Make the path from a new account to its first project shorter, then compare the next cohort.",
  },
  {
    id: "revenue",
    label: "Revenue",
    title: "The visits that turn into value",
    unit: "sales",
    currency: true,
    values: [
      1260, 1380, 1140, 1080, 1560, 1440, 1980, 1740, 2160, 1860, 2400, 2760,
      2220, 2580,
    ],
    previous: [
      1020, 1140, 1080, 960, 1260, 1320, 1500, 1440, 1680, 1560, 1800, 1920,
      1860, 2040,
    ],
    supportingMetrics: [
      { label: "Paid orders", value: 426 },
      { label: "Average order", value: 60 },
    ],
    breakdownTitle: "What brought the order",
    sources: [
      { name: "Product guides", share: 38 },
      { name: "Weekly digest", share: 29 },
      { name: "Partner stories", share: 21 },
      { name: "Direct visits", share: 12 },
    ],
    insight:
      "Product guides lead attributed sales. The weekly digest contributes nearly a third of orders.",
    nextStep:
      "Review the guide-to-order path and carry its clearest examples into the next digest.",
  },
];

export function reportTotal(report: AnalyticsFlowReport) {
  return report.values.reduce((total, value) => total + value, 0);
}

export function reportChange(report: AnalyticsFlowReport) {
  const previous = report.previous.reduce((total, value) => total + value, 0);
  return ((reportTotal(report) - previous) / previous) * 100;
}

export function formatReportValue(report: AnalyticsFlowReport, value: number) {
  return `${report.currency ? "$" : ""}${value.toLocaleString("en-US")}`;
}
