"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCheck,
  Clock3,
  Download,
  EllipsisVertical,
  ListFilter,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
  AnimatedDropdownTrigger,
} from "@/components/beui/premium/animated-dropdown";
import {
  type DataTableColumn,
  PaginatedDataTable,
} from "@/components/beui/premium/data-table-pagination";
import { cn } from "@/lib/beui/utils";
import {
  type FinanceTransaction,
  financeMoney,
} from "./finance-dashboard-data";
import { PlanningFilter, planningDate } from "./planning-ui";

const statusLabels = {
  settled: "Settled",
  pending: "Processing",
  declined: "Declined",
};
export function FinanceTransactionTable({
  transactions,
  currency,
  onExport,
  onTransactionOpen,
}: {
  transactions: readonly FinanceTransaction[];
  currency: string;
  onExport: (transactions: readonly FinanceTransaction[]) => void;
  onTransactionOpen?: (transaction: FinanceTransaction) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [active, setActive] = useState<FinanceTransaction | null>(null);
  const rows = transactions
    .filter(
      (t) =>
        (status === "all" || t.status === status) &&
        `${t.merchant} ${t.category} ${t.id} ${t.note}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
  const picked = rows.filter((t) => selected.includes(t.id));
  const columns: DataTableColumn<FinanceTransaction>[] = [
    {
      key: "merchant",
      header: "Movement",
      sortable: true,
      cell: (t) => (
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            {t.kind === "incoming" ? (
              <ArrowDownLeft aria-hidden className="size-4" />
            ) : (
              <ArrowUpRight aria-hidden className="size-4" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm">{t.merchant}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {t.category}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "at",
      header: "Date",
      sortable: true,
      width: "110px",
      cell: (t) => (
        <span className="text-xs text-muted-foreground">
          {planningDate(t.at.slice(0, 10))}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      sortValue: (t) => (t.kind === "incoming" ? t.amount : -t.amount),
      width: "130px",
      align: "right",
      cell: (t) => (
        <span
          className={cn(
            "whitespace-nowrap text-sm tabular-nums",
            t.kind === "incoming" && t.status === "settled"
              ? "text-success-foreground"
              : "text-foreground",
          )}
        >
          {t.kind === "incoming" ? "+" : "−"}
          {financeMoney(t.amount, currency, 2)}
        </span>
      ),
    },
    {
      key: "status",
      header: "State",
      sortable: true,
      width: "126px",
      cell: (t) => (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-xs",
            t.status === "declined"
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          <span className="size-1 rounded-full bg-current" />
          {statusLabels[t.status]}
        </span>
      ),
    },
    {
      key: "details",
      header: <span className="sr-only">Details</span>,
      width: "72px",
      cell: (t) => (
        <Button
          variant="ghost"
          className="size-9 rounded-full p-0"
          aria-label={`View ${t.id}`}
          onClick={() => {
            setActive(t);
            onTransactionOpen?.(t);
          }}
        >
          <ArrowUpRight aria-hidden className="size-4" />
        </Button>
      ),
    },
  ];
  return (
    <section
      aria-label="Account movements"
      className="min-w-0 overflow-hidden rounded-2xl border border-border bg-background"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 p-5">
        <h2 className="text-xl font-medium">Account movements</h2>
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <Input
            leftIcon={<Search aria-hidden className="size-4" />}
            aria-label="Search movements"
            placeholder="Find a movement…"
            value={query}
            onChange={(e) => {
              setQuery(e);
              setPage(1);
            }}
            className="min-w-0 w-44"
            classNames={{
              input: "text-xs placeholder:text-muted-foreground",
            }}
          />
          <PlanningFilter
            label="Movement state"
            value={status}
            icon={ListFilter}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All states", icon: ListFilter },
              { value: "settled", label: "Settled", icon: CheckCheck },
              { value: "pending", label: "Processing", icon: Clock3 },
              { value: "declined", label: "Declined", icon: X },
            ]}
          />
          <AnimatedDropdown>
            <AnimatedDropdownTrigger
              aria-label="Movement actions"
              className="grid size-9 place-items-center rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <EllipsisVertical aria-hidden className="size-4" />
            </AnimatedDropdownTrigger>
            <AnimatedDropdownContent align="end">
              <AnimatedDropdownItem
                onSelect={() => onExport(rows)}
                disabled={!rows.length}
              >
                <Download aria-hidden className="size-4" />
                Export this view
              </AnimatedDropdownItem>
              <AnimatedDropdownItem
                onSelect={() => onExport(picked)}
                disabled={!picked.length}
              >
                <Download aria-hidden className="size-4" />
                Export selected
              </AnimatedDropdownItem>
              <AnimatedDropdownItem
                onSelect={() => setSelected([])}
                disabled={!picked.length}
              >
                <X aria-hidden className="size-4" />
                Clear selection
              </AnimatedDropdownItem>
            </AnimatedDropdownContent>
          </AnimatedDropdown>
        </div>
      </header>
      <span className="sr-only" aria-live="polite">
        {picked.length} movements selected
      </span>
      <PaginatedDataTable
        data={rows}
        columns={columns}
        getRowId={(t) => t.id}
        selectable
        selectedRowIds={selected}
        onSelectionChange={setSelected}
        page={page}
        onPageChange={setPage}
        defaultPageSize={5}
        pageSizeOptions={[5, 10, 20]}
        rowHeight={64}
        height={364}
        className="border-0 border-t rounded-none"
        tableClassName="rounded-none [&_[role=checkbox]]:relative [&_[role=checkbox]]:size-4 [&_[role=checkbox]]:border [&_[role=checkbox]]:after:absolute [&_[role=checkbox]]:after:-inset-2 [&_[role=checkbox]_svg]:size-2.5"
        emptyState="No movements match this view."
        rangeLabel={(from, to, total) => `${from}–${to} of ${total} movements`}
      />
      <AnimatedModal
        open={Boolean(active)}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
        panelClassName="max-w-md rounded-2xl border border-border p-6"
      >
        {active && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <AnimatedModalTitle className="text-xl font-medium">
                  {active.merchant}
                </AnimatedModalTitle>
                <AnimatedModalDescription className="mt-2 text-sm text-muted-foreground">
                  {active.note}
                </AnimatedModalDescription>
              </div>
              <Button
                variant="ghost"
                aria-label="Close movement details"
                className="size-9 shrink-0 rounded-full p-0"
                onClick={() => setActive(null)}
              >
                <X aria-hidden className="size-4" />
              </Button>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-5 text-sm">
              {[
                ["Reference", active.id],
                ["Amount", financeMoney(active.amount, currency, 2)],
                ["State", statusLabels[active.status]],
                ["Date", planningDate(active.at.slice(0, 10))],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1">{value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </AnimatedModal>
    </section>
  );
}
