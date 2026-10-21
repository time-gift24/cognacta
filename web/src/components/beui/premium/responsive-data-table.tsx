"use client";

import { Columns3, ListFilter, Search, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useMemo, useState } from "react";
import { Button } from "@/components/beui/motion/button/base";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import {
  AnimatedDropdown,
  AnimatedDropdownCheckboxItem,
  AnimatedDropdownContent,
  AnimatedDropdownLabel,
  AnimatedDropdownSeparator,
  AnimatedDropdownTrigger,
} from "@/components/beui/premium/animated-dropdown";
import {
  DataTable,
  type DataTableColumn,
  type DataTableProps,
} from "@/components/beui/premium/data-table";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

type SortState = NonNullable<DataTableProps<unknown>["sort"]>;

export type ResponsiveDataTableColumn<T> = DataTableColumn<T> & {
  /** Plain-text label used in the column menu and mobile card layout. */
  label?: string;
  /** Set to false for columns that must always remain visible. */
  hideable?: boolean;
  /** Keep a visible desktop column out of the compact mobile card. */
  mobileHidden?: boolean;
};

export type ResponsiveDataTableTab<T> = {
  value: string;
  label: string;
  filter?: (row: T) => boolean;
};

export type ResponsiveDataTableFilter<T> = {
  label: string;
  options: readonly { value: string; label: string }[];
  getValue: (row: T) => string;
};

export type ResponsiveDataTableSearch<T> = {
  placeholder?: string;
  getSearchText: (row: T) => string;
};

export type ResponsiveDataTableProps<T> = {
  data: T[];
  columns: ResponsiveDataTableColumn<T>[];
  getRowId: (row: T, index: number) => string;
  tabs?: ResponsiveDataTableTab<T>[];
  defaultTab?: string;
  filter?: ResponsiveDataTableFilter<T>;
  defaultFilterValues?: string[];
  search?: ResponsiveDataTableSearch<T>;
  defaultVisibleColumns?: string[];
  defaultSort?: SortState | null;
  mobilePageSize?: number;
  emptyState?: ReactNode;
  className?: string;
  tableClassName?: string;
  onTabChange?: (value: string) => void;
  onFilterChange?: (values: string[]) => void;
  onColumnVisibilityChange?: (keys: string[]) => void;
};

function columnLabel<T>(column: ResponsiveDataTableColumn<T>) {
  if (column.label) return column.label;
  return typeof column.header === "string" ? column.header : column.key;
}

function renderCell<T>(row: T, column: ResponsiveDataTableColumn<T>) {
  if (column.cell) return column.cell(row);
  const value = (row as Record<string, unknown>)[column.key];
  return value == null ? "—" : String(value);
}

function readSortValue<T>(row: T, column: ResponsiveDataTableColumn<T>) {
  if (column.sortValue) return column.sortValue(row);
  const value = (row as Record<string, unknown>)[column.key];
  return typeof value === "number" ? value : String(value ?? " ").toLowerCase();
}

export function ResponsiveDataTable<T>({
  data,
  columns,
  getRowId,
  tabs = [],
  defaultTab,
  filter,
  defaultFilterValues,
  search,
  defaultVisibleColumns,
  defaultSort = null,
  mobilePageSize = 8,
  emptyState = "No results match this view.",
  className,
  tableClassName,
  onTabChange,
  onFilterChange,
  onColumnVisibilityChange,
}: ResponsiveDataTableProps<T>) {
  const reduceMotion = useReducedMotion();
  const initialTab = defaultTab ?? tabs[0]?.value ?? "all";
  const initialFilterValues =
    defaultFilterValues ?? filter?.options.map((option) => option.value) ?? [];
  const requiredColumnKeys = columns
    .filter((column) => column.hideable === false)
    .map((column) => column.key);
  const initialVisibleColumns = Array.from(
    new Set([
      ...(defaultVisibleColumns ?? columns.map((column) => column.key)),
      ...requiredColumnKeys,
    ]),
  );

  const [activeTab, setActiveTab] = useState(initialTab);
  const [filterValues, setFilterValues] = useState(initialFilterValues);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(
    initialVisibleColumns,
  );
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState | null>(defaultSort);
  const [mobileRowsShown, setMobileRowsShown] = useState(mobilePageSize);

  const activeFilterValues = useMemo(
    () => new Set(filterValues),
    [filterValues],
  );
  const visibleKeySet = useMemo(
    () => new Set(visibleColumnKeys),
    [visibleColumnKeys],
  );
  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleKeySet.has(column.key)),
    [columns, visibleKeySet],
  );

  const filteredRows = useMemo(() => {
    const tab = tabs.find((item) => item.value === activeTab);
    const normalizedQuery = query.trim().toLowerCase();

    return data.filter((row) => {
      if (tab?.filter && !tab.filter(row)) return false;
      if (filter && !activeFilterValues.has(filter.getValue(row))) {
        return false;
      }
      if (
        normalizedQuery &&
        search &&
        !search.getSearchText(row).toLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }
      return true;
    });
  }, [activeFilterValues, activeTab, data, filter, query, search, tabs]);

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column) return filteredRows;

    return [...filteredRows].sort((leftRow, rightRow) => {
      const left = readSortValue(leftRow, column);
      const right = readSortValue(rightRow, column);
      const result =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), undefined, {
              numeric: true,
              sensitivity: "base",
            });
      return sort.direction === "asc" ? result : -result;
    });
  }, [columns, filteredRows, sort]);

  const mobileColumns = visibleColumns.filter((column) => !column.mobileHidden);
  const primaryMobileColumn = mobileColumns[0];
  const secondaryMobileColumns = mobileColumns.slice(1);
  const filterIsActive = Boolean(
    filter && activeFilterValues.size !== filter.options.length,
  );

  const changeTab = (value: string) => {
    setActiveTab(value);
    setMobileRowsShown(mobilePageSize);
    onTabChange?.(value);
  };

  const changeFilters = (values: string[]) => {
    setFilterValues(values);
    setMobileRowsShown(mobilePageSize);
    onFilterChange?.(values);
  };

  const toggleFilter = (value: string) => {
    const next = new Set(activeFilterValues);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    changeFilters(Array.from(next));
  };

  const toggleColumn = (key: string) => {
    const column = columns.find((item) => item.key === key);
    if (!column || column.hideable === false) return;
    const next = new Set(visibleKeySet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    if (next.size === 0) return;
    const keys = columns
      .map((item) => item.key)
      .filter((columnKey) => next.has(columnKey));
    setVisibleColumnKeys(keys);
    onColumnVisibilityChange?.(keys);
  };

  const tableHeight = Math.min(
    Math.max(filteredRows.length * 56 + 44, 156),
    436,
  );

  return (
    <section
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-border bg-background",
        className,
      )}
    >
      <header className="border-border border-b px-3 pt-3 pb-3 sm:px-4 sm:pt-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {tabs.length > 0 ? (
            <div className="-mx-3 overflow-x-auto px-3 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0">
              <Tabs value={activeTab} onValueChange={changeTab} variant="pill">
                <TabsList className="min-w-max border border-border bg-muted">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="min-h-8 px-3 py-1 text-xs sm:text-sm"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          ) : null}

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:max-w-xl lg:justify-end">
            {search ? (
              <label className="relative min-w-0 flex-1 lg:max-w-64">
                <span className="sr-only">Search table</span>
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setMobileRowsShown(mobilePageSize);
                  }}
                  placeholder={search.placeholder ?? "Search"}
                  className="h-10 w-full rounded-full border border-border bg-background pr-9 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setMobileRowsShown(mobilePageSize);
                    }}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </label>
            ) : null}

            {filter ? (
              <AnimatedDropdown>
                <AnimatedDropdownTrigger
                  aria-label={`Filter by ${filter.label}`}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-3 font-medium text-sm transition-colors hover:bg-muted/45 data-[state=open]:bg-muted/45"
                >
                  <ListFilter className="size-4" />
                  <span className="hidden sm:inline">{filter.label}</span>
                  {filterIsActive ? (
                    <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground text-xs tabular-nums">
                      {activeFilterValues.size}
                    </span>
                  ) : null}
                </AnimatedDropdownTrigger>
                <AnimatedDropdownContent align="end" className="w-52">
                  <AnimatedDropdownLabel>
                    Filter by {filter.label.toLowerCase()}
                  </AnimatedDropdownLabel>
                  {filter.options.map((option) => (
                    <AnimatedDropdownCheckboxItem
                      key={option.value}
                      checked={activeFilterValues.has(option.value)}
                      onCheckedChange={() => toggleFilter(option.value)}
                      onSelect={(event) => event.preventDefault()}
                    >
                      {option.label}
                    </AnimatedDropdownCheckboxItem>
                  ))}
                  {filterIsActive ? (
                    <>
                      <AnimatedDropdownSeparator />
                      <button
                        type="button"
                        onClick={() =>
                          changeFilters(
                            filter.options.map((option) => option.value),
                          )
                        }
                        className="relative z-10 flex min-h-10 w-full items-center rounded-lg px-2.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        Reset filters
                      </button>
                    </>
                  ) : null}
                </AnimatedDropdownContent>
              </AnimatedDropdown>
            ) : null}

            <AnimatedDropdown>
              <AnimatedDropdownTrigger
                aria-label="Choose visible columns"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-3 font-medium text-sm transition-colors hover:bg-muted/45 data-[state=open]:bg-muted/45"
              >
                <Columns3 className="size-4" />
                <span className="hidden sm:inline">Columns</span>
              </AnimatedDropdownTrigger>
              <AnimatedDropdownContent align="end" className="w-52">
                <AnimatedDropdownLabel>Visible columns</AnimatedDropdownLabel>
                {columns.map((column) => (
                  <AnimatedDropdownCheckboxItem
                    key={column.key}
                    checked={visibleKeySet.has(column.key)}
                    disabled={column.hideable === false}
                    onCheckedChange={() => toggleColumn(column.key)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {columnLabel(column)}
                  </AnimatedDropdownCheckboxItem>
                ))}
              </AnimatedDropdownContent>
            </AnimatedDropdown>
          </div>
        </div>
      </header>

      <div className="hidden md:block">
        <DataTable
          data={filteredRows}
          columns={visibleColumns}
          getRowId={getRowId}
          sort={sort}
          onSortChange={setSort}
          rowHeight={56}
          height={tableHeight}
          emptyState={emptyState}
          className={cn("border-0", tableClassName)}
        />
      </div>

      <div className="divide-y divide-border md:hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {sortedRows.length > 0 && primaryMobileColumn
            ? sortedRows.slice(0, mobileRowsShown).map((row, index) => (
                <motion.article
                  layout={!reduceMotion}
                  key={getRowId(row, index)}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                  className="bg-background p-4"
                >
                  <div className="min-w-0">
                    {renderCell(row, primaryMobileColumn)}
                  </div>
                  {secondaryMobileColumns.length > 0 ? (
                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                      {secondaryMobileColumns.map((column) => (
                        <div key={column.key} className="min-w-0">
                          <dt className="mb-1 text-muted-foreground text-xs">
                            {columnLabel(column)}
                          </dt>
                          <dd className="truncate text-sm">
                            {renderCell(row, column)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </motion.article>
              ))
            : null}
        </AnimatePresence>

        {sortedRows.length === 0 || !primaryMobileColumn ? (
          <div className="px-4 py-14 text-center text-muted-foreground text-sm">
            {emptyState}
          </div>
        ) : null}

        {sortedRows.length > mobileRowsShown ? (
          <div className="flex justify-center bg-background p-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setMobileRowsShown((count) => count + mobilePageSize)
              }
            >
              Show{" "}
              {Math.min(mobilePageSize, sortedRows.length - mobileRowsShown)}
              more
            </Button>
          </div>
        ) : null}
      </div>

      <footer className="flex items-center justify-between border-border border-t bg-background px-4 py-3 text-muted-foreground text-xs">
        <span className="tabular-nums">
          {filteredRows.length.toLocaleString()} result
          {filteredRows.length === 1 ? " " : "s"}
        </span>
        <span>{visibleColumns.length} columns visible</span>
      </footer>
    </section>
  );
}
