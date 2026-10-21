"use client";

import { ArrowDownLeft, ArrowUpRight, Download, Wallet } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/beui/motion/button";
import type { DateRange } from "@/components/beui/motion/date-range-picker";
import { KpiHeaderCards } from "@/components/beui/premium/dashboard/kpi-header-cards";
import { FinanceAccountPanel } from "./finance-account-panel";
import { FinanceCashflowChart } from "./finance-cashflow-chart";
import {
  downloadFinanceCsv,
  FINANCE_SAMPLE_DATA,
  type FinanceDashboardData,
  type FinanceTransaction,
  financeInRange,
  financeTotals,
} from "./finance-dashboard-data";
import { FinancePeriodControl } from "./finance-period-control";
import { FinanceTransactionTable } from "./finance-transaction-table";
import { PlanningShell } from "./planning-ui";

export type FinanceDashboardProps = {
  data?: FinanceDashboardData;
  name?: string;
  defaultRange?: DateRange & { to: string };
  onRangeChange?: (range: DateRange & { to: string }) => void;
  onAccountChange?: (accountId: string) => void;
  onCardStateChange?: (accountId: string, paused: boolean) => void;
  onTransactionOpen?: (transaction: FinanceTransaction) => void;
  onExport?: (transactions: readonly FinanceTransaction[]) => void;
  className?: string;
};

/** Connected period reporting with a separate account snapshot and monthly spending allowance. */
export function FinanceDashboard({
  data = FINANCE_SAMPLE_DATA,
  name = "Avery",
  defaultRange,
  onRangeChange,
  onAccountChange,
  onCardStateChange,
  onTransactionOpen,
  onExport,
  className,
}: FinanceDashboardProps) {
  const min =
    [...data.transactions]
      .sort((a, b) => a.at.localeCompare(b.at))[0]
      ?.at.slice(0, 10) ?? `${data.asOf.slice(0, 4)}-01-01`;
  const [range, setRange] = useState(
    defaultRange ?? { from: min, to: data.asOf },
  );
  const [accountId, setAccountId] = useState(data.accounts[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const account = data.accounts.find((item) => item.id === accountId);
  const all = data.transactions.filter(
    (t) => t.accountId === accountId && t.at.slice(0, 10) <= data.asOf,
  );
  const transactions = all.filter((t) => financeInRange(t, range));
  const totals = financeTotals(transactions);
  const lifetime = financeTotals(all);
  const month = financeTotals(
    all.filter((t) => t.at.startsWith(data.asOf.slice(0, 7))),
  );
  const exportRows = (rows: readonly FinanceTransaction[]) => {
    if (onExport) onExport(rows);
    else downloadFinanceCsv(rows, data.currency);
    setMessage(`${rows.length} movements exported.`);
  };
  return (
    <PlanningShell
      eyebrow="Accounts & cash flow"
      title="Your finances"
      name={name}
      description="Follow your cash flow, spending, and account movements in one place."
      asOf={data.asOf}
      className={className}
      controls={
        <>
          <FinancePeriodControl
            range={range}
            min={min}
            max={data.asOf}
            onChange={(next) => {
              setRange(next);
              onRangeChange?.(next);
            }}
          />
          <Button
            variant="outline"
            className="h-9 rounded-full"
            disabled={!transactions.length}
            onClick={() => exportRows(transactions)}
          >
            <Download aria-hidden className="size-4" />
            Export
          </Button>
        </>
      }
    >
      <div className="grid items-start gap-5 @5xl/planning:grid-cols-[minmax(0,2.25fr)_minmax(320px,1fr)]">
        <div className="min-w-0 space-y-5">
          <KpiHeaderCards
            compact
            className="[&>dl>div]:bg-muted @lg:[&>dl]:grid-cols-3"
            metrics={[
              {
                id: "incoming",
                label: "Money in",
                value: totals.incoming,
                format: { style: "currency", currency: data.currency },
                icon: <ArrowDownLeft />,
                note: "Settled incoming payments",
              },
              {
                id: "outgoing",
                label: "Money out",
                value: totals.outgoing,
                format: { style: "currency", currency: data.currency },
                icon: <ArrowUpRight />,
                note: "Settled account spending",
              },
              {
                id: "net",
                label: "Net flow",
                value: totals.incoming - totals.outgoing,
                format: { style: "currency", currency: data.currency },
                icon: <Wallet />,
                note: "Incoming less outgoing",
              },
            ]}
          />
          <FinanceCashflowChart
            transactions={transactions}
            range={range}
            currency={data.currency}
          />
          <FinanceTransactionTable
            key={`${accountId}:${range.from}:${range.to}`}
            transactions={transactions}
            currency={data.currency}
            onExport={exportRows}
            onTransactionOpen={onTransactionOpen}
          />
        </div>
        {account ? (
          <FinanceAccountPanel
            accounts={data.accounts}
            account={account}
            currency={data.currency}
            balance={
              account.openingBalance + lifetime.incoming - lifetime.outgoing
            }
            spent={month.outgoing}
            updates={[...transactions].sort((a, b) => b.at.localeCompare(a.at))}
            asOf={data.asOf}
            onAccountChange={(id) => {
              setAccountId(id);
              onAccountChange?.(id);
            }}
            onCardStateChange={(paused) =>
              onCardStateChange?.(accountId, paused)
            }
          />
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Add an account to see its balance and card.
          </p>
        )}
      </div>
      <output aria-live="polite" className="sr-only">
        {message}
      </output>
    </PlanningShell>
  );
}
