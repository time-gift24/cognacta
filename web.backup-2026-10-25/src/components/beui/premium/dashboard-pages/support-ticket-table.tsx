"use client";

import {
  CheckCheck,
  CircleDot,
  Clock3,
  Download,
  EllipsisVertical,
  Eye,
  ListFilter,
  LoaderCircle,
  RotateCcw,
  Search,
  UserRoundPlus,
  X,
} from "lucide-react";
import { useId, useState } from "react";
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
  AnimatedDropdownRadioGroup,
  AnimatedDropdownRadioItem,
  AnimatedDropdownTrigger,
} from "@/components/beui/premium/animated-dropdown";
import {
  type DataTableColumn,
  PaginatedDataTable,
} from "@/components/beui/premium/data-table-pagination";
import { cn } from "@/lib/beui/utils";
import { type SupportTicket, supportDate } from "./support-dashboard-data";

const STATUS_LABELS: Record<SupportTicket["status"], string> = {
  "in-review": "Under review",
  "in-progress": "Being handled",
  waiting: "Awaiting reply",
  resolved: "Closed",
};
const STATUS_ICONS = {
  "in-review": Eye,
  "in-progress": LoaderCircle,
  waiting: Clock3,
  resolved: CheckCheck,
};
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function SupportTicketStatus({
  status,
}: {
  status: SupportTicket["status"];
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-1 text-xs",
        status === "resolved"
          ? "border-success/20 bg-success/10 text-success-foreground"
          : status === "waiting"
            ? "border-warning/20 bg-warning/10 text-warning-foreground"
            : "border-border text-muted-foreground",
      )}
    >
      <span aria-hidden className="size-1 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}

function timeRemaining(ticket: SupportTicket, asOf: string) {
  if (ticket.status === "resolved") return "Closed";
  const minutes = Math.ceil(
    (Date.parse(ticket.dueAt) - Date.parse(asOf)) / 60000,
  );
  if (minutes <= 0) return "Overdue";
  if (minutes < 60) return `${minutes}m left`;
  if (minutes < 1440)
    return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""} left`;
  return `${Math.floor(minutes / 1440)}d left`;
}

export function SupportTicketTable({
  tickets,
  asOf,
  currentUser,
  onUpdate,
  onExport,
}: {
  tickets: readonly SupportTicket[];
  asOf: string;
  currentUser: string;
  onUpdate: (ticket: SupportTicket) => void;
  onExport: (tickets: readonly SupportTicket[]) => void;
}) {
  const heading = useId();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = tickets.find((ticket) => ticket.id === activeId);
  const normalized = query.trim().toLowerCase();
  const rows = tickets.filter(
    (ticket) =>
      (status === "all" || ticket.status === status) &&
      [ticket.id, ticket.subject, ticket.customer, ticket.owner].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
  );
  const selectedRows = rows.filter((ticket) => selected.includes(ticket.id));
  const actionable = selectedRows.filter(
    (ticket) => ticket.status !== "resolved",
  );
  const columns: DataTableColumn<SupportTicket>[] = [
    {
      key: "subject",
      header: "Request",
      sortable: true,
      cell: (ticket) => (
        <Button
          variant="plain"
          type="button"
          onClick={() => setActiveId(ticket.id)}
          className={cn("min-w-0 text-left", FOCUS)}
        >
          <span className="block truncate text-sm">{ticket.subject}</span>
          <span className="mt-1 block font-mono text-xs text-muted-foreground">
            {ticket.id}
          </span>
        </Button>
      ),
    },
    {
      key: "customer",
      header: "Account",
      sortable: true,
      width: "150px",
      cell: (ticket) => (
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs text-muted-foreground"
          >
            {ticket.customer.slice(0, 1)}
          </span>
          <span className="truncate">{ticket.customer}</span>
        </span>
      ),
    },
    {
      key: "owner",
      header: "Assigned to",
      sortable: true,
      width: "145px",
      cell: (ticket) => (
        <span className="truncate text-muted-foreground">{ticket.owner}</span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      sortValue: (ticket) => ({ high: 0, medium: 1, low: 2 })[ticket.priority],
      width: "100px",
      cell: (ticket) => (
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs capitalize",
            ticket.priority === "high"
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          <span aria-hidden className="flex h-3 items-end gap-0.5">
            {["h-1", "h-2", "h-3"].map((height, i) => (
              <span
                key={height}
                className={cn(
                  "w-0.5 rounded-full bg-current",
                  height,
                  i >= { high: 3, medium: 2, low: 1 }[ticket.priority] &&
                    "opacity-25",
                )}
              />
            ))}
          </span>
          {ticket.priority}
        </span>
      ),
    },
    {
      key: "status",
      header: "Stage",
      sortable: true,
      width: "145px",
      cell: (ticket) => <SupportTicketStatus status={ticket.status} />,
    },
    {
      key: "createdAt",
      header: "Opened",
      sortable: true,
      width: "105px",
      cell: (ticket) => (
        <time
          dateTime={ticket.createdAt}
          className="whitespace-nowrap text-xs text-muted-foreground"
        >
          {supportDate(ticket.createdAt)}
        </time>
      ),
    },
    {
      key: "dueAt",
      header: "Next reply",
      sortable: true,
      width: "135px",
      cell: (ticket) => (
        <span
          className={cn(
            "whitespace-nowrap text-xs tabular-nums",
            ticket.status === "resolved"
              ? "text-success-foreground"
              : Date.parse(ticket.dueAt) < Date.parse(asOf)
                ? "text-destructive"
                : "text-muted-foreground",
          )}
        >
          {timeRemaining(ticket, asOf)}
        </span>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      width: "72px",
      align: "right",
      cell: (ticket) => (
        <AnimatedDropdown>
          <AnimatedDropdownTrigger
            aria-label={`Actions for ${ticket.id}`}
            className={cn(
              "ml-auto grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted",
              FOCUS,
            )}
          >
            <EllipsisVertical aria-hidden className="size-4" />
          </AnimatedDropdownTrigger>
          <AnimatedDropdownContent align="end">
            <AnimatedDropdownItem onSelect={() => setActiveId(ticket.id)}>
              <Eye aria-hidden className="size-4 text-muted-foreground" />
              View request
            </AnimatedDropdownItem>
            <AnimatedDropdownItem
              disabled={ticket.owner === currentUser}
              onSelect={() => onUpdate({ ...ticket, owner: currentUser })}
            >
              <UserRoundPlus
                aria-hidden
                className="size-4 text-muted-foreground"
              />
              Assign to me
            </AnimatedDropdownItem>
            <AnimatedDropdownItem
              onSelect={() =>
                onUpdate({
                  ...ticket,
                  status:
                    ticket.status === "resolved" ? "in-progress" : "resolved",
                })
              }
            >
              {ticket.status === "resolved" ? (
                <RotateCcw
                  aria-hidden
                  className="size-4 text-muted-foreground"
                />
              ) : (
                <CheckCheck
                  aria-hidden
                  className="size-4 text-muted-foreground"
                />
              )}
              {ticket.status === "resolved"
                ? "Reopen request"
                : "Close request"}
            </AnimatedDropdownItem>
          </AnimatedDropdownContent>
        </AnimatedDropdown>
      ),
    },
  ];

  return (
    <section
      aria-labelledby={heading}
      className="min-w-0 overflow-hidden rounded-2xl border border-border bg-background"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div>
          <h2
            id={heading}
            className="flex items-center gap-2 text-xl font-medium"
          >
            <CircleDot aria-hidden className="size-4 text-muted-foreground" />
            Response queue
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Keep ownership and reply deadlines in view.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input
            leftIcon={<Search aria-hidden className="size-4" />}
            aria-label="Search requests"
            value={query}
            onChange={(event) => {
              setQuery(event);
              setPage(1);
              setSelected([]);
            }}
            placeholder="Find a request…"
            className="w-full min-w-0 flex-1 sm:w-64"
            classNames={{
              input: "text-sm placeholder:text-muted-foreground",
            }}
          />
          <AnimatedDropdown>
            <AnimatedDropdownTrigger
              aria-label="Filter request stage"
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-full border border-border",
                FOCUS,
                status !== "all" && "border-primary text-primary",
              )}
            >
              <ListFilter aria-hidden className="size-4" />
            </AnimatedDropdownTrigger>
            <AnimatedDropdownContent align="end">
              <AnimatedDropdownRadioGroup
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setSelected([]);
                  setPage(1);
                }}
              >
                {[["all", "All stages"], ...Object.entries(STATUS_LABELS)].map(
                  ([value, label]) => {
                    const Icon =
                      value === "all"
                        ? ListFilter
                        : STATUS_ICONS[value as SupportTicket["status"]];
                    return (
                      <AnimatedDropdownRadioItem key={value} value={value}>
                        <Icon
                          aria-hidden
                          className="size-4 text-muted-foreground"
                        />
                        {label}
                      </AnimatedDropdownRadioItem>
                    );
                  },
                )}
              </AnimatedDropdownRadioGroup>
            </AnimatedDropdownContent>
          </AnimatedDropdown>
          <AnimatedDropdown>
            <AnimatedDropdownTrigger
              aria-label="Queue actions"
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground",
                FOCUS,
              )}
            >
              <EllipsisVertical aria-hidden className="size-4" />
            </AnimatedDropdownTrigger>
            <AnimatedDropdownContent align="end">
              <AnimatedDropdownItem
                disabled={!actionable.length}
                onSelect={() => {
                  actionable.forEach((ticket) => {
                    onUpdate({ ...ticket, status: "resolved" });
                  });
                  setSelected([]);
                }}
              >
                <CheckCheck aria-hidden className="size-4" />
                Close selected
              </AnimatedDropdownItem>
              <AnimatedDropdownItem
                disabled={!selectedRows.length}
                onSelect={() => onExport(selectedRows)}
              >
                <Download
                  aria-hidden
                  className="size-4 text-muted-foreground"
                />
                Export selected
              </AnimatedDropdownItem>
              <AnimatedDropdownItem
                disabled={!selectedRows.length}
                onSelect={() => setSelected([])}
              >
                <X aria-hidden className="size-4 text-muted-foreground" />
                Clear selection
              </AnimatedDropdownItem>
            </AnimatedDropdownContent>
          </AnimatedDropdown>
        </div>
      </header>
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {selectedRows.length}{" "}
        {selectedRows.length === 1 ? "request" : "requests"} selected
      </span>
      {rows.length ? (
        <PaginatedDataTable
          data={rows}
          columns={columns}
          getRowId={(ticket) => ticket.id}
          selectable
          selectedRowIds={selected}
          onSelectionChange={setSelected}
          page={page}
          onPageChange={setPage}
          defaultPageSize={6}
          pageSizeOptions={[6, 12, 24]}
          rowHeight={64}
          height={Math.min(6, Math.max(1, rows.length)) * 64 + 44}
          className="rounded-b-2xl border-0 border-t"
          tableClassName="rounded-none [&_table]:min-w-6xl [&_th]:bg-background [&_th_label]:justify-center [&_[role=checkbox]]:relative [&_[role=checkbox]]:size-4 [&_[role=checkbox]]:border [&_[role=checkbox]]:after:absolute [&_[role=checkbox]]:after:-inset-2 [&_[role=checkbox]_svg]:size-2.5"
          emptyState="No requests found. Adjust the search, stage, or date range."
          rangeLabel={(from, to, total) => `${from}–${to} of ${total} requests`}
        />
      ) : (
        <output className="block border-t border-border px-6 py-12 text-center text-sm text-muted-foreground">
          No requests found. Adjust the search, stage, or date range.
        </output>
      )}
      <AnimatedModal
        open={Boolean(active)}
        onOpenChange={(open) => {
          if (!open) setActiveId(null);
        }}
        panelClassName="max-w-lg rounded-3xl border border-border p-6"
      >
        {active && (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-muted-foreground">
                {active.id}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close request details"
                className={cn("size-9 rounded-full", FOCUS)}
                onClick={() => setActiveId(null)}
              >
                <X aria-hidden className="size-4" />
              </Button>
            </div>
            <AnimatedModalTitle className="mt-3 text-xl font-medium">
              {active.subject}
            </AnimatedModalTitle>
            <AnimatedModalDescription className="mt-2 text-sm leading-6 text-muted-foreground">
              {active.description}
            </AnimatedModalDescription>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {[
                ["Account", active.customer],
                ["Assigned to", active.owner],
                ["Priority", active.priority],
                ["Next reply", timeRemaining(active, asOf)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 capitalize">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <SupportTicketStatus status={active.status} />
              <Button
                className={cn("h-9 rounded-full px-4", FOCUS)}
                onClick={() =>
                  onUpdate({
                    ...active,
                    status:
                      active.status === "resolved" ? "in-progress" : "resolved",
                  })
                }
              >
                {active.status === "resolved"
                  ? "Reopen request"
                  : "Close request"}
              </Button>
            </div>
          </>
        )}
      </AnimatedModal>
    </section>
  );
}
