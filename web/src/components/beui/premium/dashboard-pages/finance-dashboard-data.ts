import type { DateRange } from "@/components/beui/motion/date-range-picker";

export type FinanceTransaction = {
  id: string;
  accountId: string;
  merchant: string;
  category: string;
  note: string;
  at: string;
  amount: number;
  kind: "incoming" | "outgoing";
  status: "settled" | "pending" | "declined";
};

export type FinanceAccount = {
  id: string;
  name: string;
  holder: string;
  lastFour: string;
  expires: string;
  openingBalance: number;
  monthlyBudget: number;
};

export type FinanceDashboardData = {
  asOf: string;
  currency: string;
  accounts: readonly FinanceAccount[];
  transactions: readonly FinanceTransaction[];
};

const merchants = [
  [
    "Northline project",
    "Client payment",
    "Design partnership, monthly retainer",
  ],
  ["Cedar workspace", "Client payment", "Product research engagement"],
  ["Orbit hosting", "Infrastructure", "Application hosting and backups"],
  ["Papertrail tools", "Software", "Team subscriptions"],
  ["Studio lease", "Workspace", "Shared studio and meeting rooms"],
  ["Fieldwork travel", "Travel", "Site visits and local transport"],
] as const;

export const FINANCE_SAMPLE_DATA: FinanceDashboardData = {
  asOf: "2026-09-30",
  currency: "USD",
  accounts: [
    {
      id: "operating",
      name: "Studio account",
      holder: "Avery Brooks",
      lastFour: "4827",
      expires: "08/29",
      openingBalance: 12600,
      monthlyBudget: 6500,
    },
    {
      id: "reserve",
      name: "Project account",
      holder: "Avery Brooks",
      lastFour: "1096",
      expires: "11/29",
      openingBalance: 8400,
      monthlyBudget: 3200,
    },
  ],
  transactions: Array.from({ length: 72 }, (_, i) => {
    const month = Math.floor(i / 6);
    const item = i % 6;
    const [merchant, category, note] = merchants[item];
    const date = new Date(
      Date.UTC(2025, 9 + month, 4 + item * 5, 9 + item, 15),
    );
    const base = [7800, 4600, 820, 490, 2250, 760][item];
    return {
      id: `MV-${7401 + i}`,
      accountId: item === 1 || item === 5 ? "reserve" : "operating",
      merchant,
      category,
      note,
      at: date.toISOString(),
      amount:
        Math.round(
          (base +
            month * (item < 2 ? 180 : 17) +
            Math.sin(month + item) * 180) *
            100,
        ) / 100,
      kind: item < 2 ? "incoming" : "outgoing",
      status: i === 71 ? "pending" : i === 68 ? "declined" : "settled",
    };
  }),
};

export function financeMoney(value: number, currency = "USD", decimals = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function financeTotals(transactions: readonly FinanceTransaction[]) {
  return transactions.reduce(
    (totals, transaction) => {
      if (transaction.status === "settled")
        totals[transaction.kind] += transaction.amount;
      return totals;
    },
    { incoming: 0, outgoing: 0 },
  );
}

export function financeInRange(
  transaction: FinanceTransaction,
  range: DateRange & { to: string },
) {
  const day = transaction.at.slice(0, 10);
  return day >= range.from && day <= range.to;
}

export function downloadFinanceCsv(
  transactions: readonly FinanceTransaction[],
  currency: string,
) {
  const rows = [
    [
      "ID",
      "Merchant",
      "Date",
      "Direction",
      "Amount",
      "Currency",
      "Status",
      "Note",
    ],
    ...transactions.map((t) => [
      t.id,
      t.merchant,
      t.at,
      t.kind,
      String(t.amount),
      currency,
      t.status,
      t.note,
    ]),
  ];
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "account-movements.csv";
  link.click();
  URL.revokeObjectURL(url);
}
