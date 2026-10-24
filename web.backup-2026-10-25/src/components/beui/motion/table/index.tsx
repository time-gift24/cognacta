"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { Checkbox } from "@/components/beui/motion/checkbox";
import { cn } from "@/lib/beui/utils";

export type SortDirection = "asc" | "desc";

export type SortState = {
  key: string;
  direction: SortDirection;
};

export type TableColumn<T> = {
  key: string;
  header: ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  cell?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
};

export type TableProps<T> = {
  data: T[];
  columns: TableColumn<T>[];
  getRowId?: (row: T, index: number) => string;
  selectable?: boolean;
  selectedRowIds?: string[];
  defaultSelectedRowIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  sort?: SortState | null;
  defaultSort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  rowHeight?: number;
  height?: number;
  overscan?: number;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
};

function readCell<T>(row: T, column: TableColumn<T>) {
  if (column.cell) return column.cell(row);
  return (row as Record<string, ReactNode>)[column.key];
}

function readSortValue<T>(row: T, column: TableColumn<T>) {
  if (column.sortValue) return column.sortValue(row);
  const value = (row as Record<string, unknown>)[column.key];
  return typeof value === "number" ? value : String(value ?? "").toLowerCase();
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction?: SortDirection;
}) {
  if (!active) return <ChevronsUpDown className="size-3.5 opacity-45" />;
  return direction === "asc" ? (
    <ChevronUp className="size-3.5" />
  ) : (
    <ChevronDown className="size-3.5" />
  );
}

export function Table<T>({
  data,
  columns,
  getRowId,
  selectable = false,
  selectedRowIds,
  defaultSelectedRowIds = [],
  onSelectionChange,
  sort: controlledSort,
  defaultSort = null,
  onSortChange,
  rowHeight = 52,
  height = 440,
  overscan = 8,
  emptyState = "No results found",
  onRowClick,
  className,
}: TableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [internalSort, setInternalSort] = useState<SortState | null>(
    defaultSort,
  );
  const [internalSelection, setInternalSelection] = useState(
    () => new Set(defaultSelectedRowIds),
  );
  const sort = controlledSort === undefined ? internalSort : controlledSort;
  const selected = useMemo(
    () =>
      selectedRowIds === undefined
        ? internalSelection
        : new Set(selectedRowIds),
    [internalSelection, selectedRowIds],
  );

  const rows = useMemo(() => {
    const entries = data.map((row, index) => ({
      row,
      id: getRowId?.(row, index) ?? String(index),
      index,
    }));
    if (!sort) return entries;
    const column = columns.find((item) => item.key === sort.key);
    if (!column) return entries;

    return [...entries].sort((a, b) => {
      const left = readSortValue(a.row, column);
      const right = readSortValue(b.row, column);
      const result =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), undefined, {
              numeric: true,
              sensitivity: "base",
            });
      return sort.direction === "asc" ? result : -result;
    });
  }, [columns, data, getRowId, sort]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const paddingTop = virtualRows[0]?.start ?? 0;
  const paddingBottom = virtualRows.length
    ? virtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
    : 0;

  const publishSelection = (next: Set<string>) => {
    if (selectedRowIds === undefined) setInternalSelection(next);
    onSelectionChange?.([...next]);
  };

  const toggleAll = () => {
    const allVisibleSelected =
      rows.length > 0 && rows.every((entry) => selected.has(entry.id));
    const next = new Set(selected);
    for (const entry of rows) {
      if (allVisibleSelected) next.delete(entry.id);
      else next.add(entry.id);
    }
    publishSelection(next);
  };

  const toggleRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    publishSelection(next);
  };

  const toggleSort = (column: TableColumn<T>) => {
    if (!column.sortable) return;
    const next: SortState =
      sort?.key === column.key
        ? {
            key: column.key,
            direction: sort.direction === "asc" ? "desc" : "asc",
          }
        : { key: column.key, direction: "asc" };
    if (controlledSort === undefined) setInternalSort(next);
    onSortChange?.(next);
  };

  const align = (value?: TableColumn<T>["align"]) =>
    value === "right"
      ? "text-right"
      : value === "center"
        ? "text-center"
        : "text-left";
  const justify = (value?: TableColumn<T>["align"]) =>
    value === "right"
      ? "justify-end"
      : value === "center"
        ? "justify-center"
        : "justify-start";
  const visibleIds = rows.map((entry) => entry.id);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someSelected =
    !allSelected && visibleIds.some((id) => selected.has(id));
  const columnCount = columns.length + (selectable ? 1 : 0);

  return (
    <div
      className={cn(
        "w-full overflow-hidden border border-border bg-background text-sm",
        className,
      )}
    >
      <div
        ref={scrollRef}
        className="overflow-auto [scrollbar-gutter:stable]"
        style={{ height }}
      >
        <table className="min-w-[760px] w-full table-fixed border-collapse">
          <colgroup>
            {selectable ? <col className="w-11" /> : null}
            {columns.map((column) => (
              <col
                key={column.key}
                style={column.width ? { width: column.width } : undefined}
              />
            ))}
          </colgroup>
          <thead>
            <tr>
              {selectable ? (
                <th className="sticky top-0 z-10 h-11 border-border border-b bg-muted px-3 text-center">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      aria-label="Select all visible rows"
                      onCheckedChange={toggleAll}
                    />
                  </div>
                </th>
              ) : null}
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "sticky top-0 z-10 h-11 border-border border-b bg-muted px-4 font-medium text-muted-foreground text-xs",
                    align(column.align),
                  )}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className={cn(
                        "inline-flex min-h-10 items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        column.align === "right" && "ml-auto",
                      )}
                    >
                      {column.header}
                      <SortIcon
                        active={sort?.key === column.key}
                        direction={sort?.direction}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="h-48 px-6 text-center text-muted-foreground"
                >
                  {emptyState}
                </td>
              </tr>
            ) : (
              <>
                {paddingTop > 0 ? (
                  <tr aria-hidden style={{ height: paddingTop }}>
                    <td colSpan={columnCount} />
                  </tr>
                ) : null}
                {virtualRows.map((virtualRow) => {
                  const entry = rows[virtualRow.index];
                  const isSelected = selected.has(entry.id);
                  return (
                    <tr
                      key={entry.id}
                      data-selected={isSelected || undefined}
                      style={{ height: rowHeight }}
                      onClick={(event) => {
                        if (
                          (event.target as HTMLElement).closest(
                            '[role="checkbox"]',
                          )
                        ) {
                          return;
                        }
                        onRowClick?.(entry.row);
                      }}
                      className={cn(
                        "border-border/70 border-b transition-colors last:border-b-0 hover:bg-muted/45 data-[selected]:bg-muted/70",
                        onRowClick && "cursor-pointer",
                      )}
                    >
                      {selectable ? (
                        <td className="relative p-0 text-center">
                          <div className="absolute inset-0 flex items-center justify-center px-3">
                            <Checkbox
                              checked={isSelected}
                              aria-label={`Select row ${entry.index + 1}`}
                              onCheckedChange={() => toggleRow(entry.id)}
                            />
                          </div>
                        </td>
                      ) : null}
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            "relative p-0 text-foreground",
                            align(column.align),
                          )}
                        >
                          <div
                            className={cn(
                              "absolute inset-0 flex min-w-0 items-center overflow-hidden px-4",
                              justify(column.align),
                            )}
                          >
                            {readCell(entry.row, column)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {paddingBottom > 0 ? (
                  <tr aria-hidden style={{ height: paddingBottom }}>
                    <td colSpan={columnCount} />
                  </tr>
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
