"use client";

import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/beui/utils";
import { SearchAreaFilter } from "./search-area-filter";
import {
  DEFAULT_LABELS,
  SEARCH_AREAS,
  SEARCH_RESULTS,
  SEARCH_SUGGESTIONS,
  SEARCH_TYPE_ICON,
  SEARCH_TYPE_LABEL,
  SEARCH_TYPE_ORDER,
  type SearchArea,
  type SearchLabels,
  type SearchResult,
  type SearchResultType,
  type SearchTypeFilter,
} from "./search-data";
import {
  countByType,
  filterByAreas,
  filterByType,
  groupResults,
  rankResults,
  type SearchFn,
  terms,
} from "./search-engine";
import { SearchHeader } from "./search-header";
import { PAGE, RISE } from "./search-motion";
import { SearchPreview } from "./search-preview";
import { SearchPreviewDialog } from "./search-preview-dialog";
import { SearchPreviewPanel } from "./search-preview-panel";
import { SearchResultList } from "./search-result-list";
import { resultRowId } from "./search-result-row";
import { SearchTypeTabs } from "./search-type-tabs";

/* ─────────────────────────────────────────────────────────
 * SEARCH RESULTS STORYBOARD
 *
 *  type     results re-rank live; rows leave with a blur and the
 *           rest glide into place; the count rolls
 *  filter   type tabs and area checkboxes narrow the list
 *  select   arrow keys or hover move a ring that glides between
 *           rows; the preview pane cross-fades to the selection
 *  empty    a magnifier orbit animates beside suggested searches
 *
 *  load     header, tabs, filters, and results rise through a soft
 *           blur in sequence; rows cascade 45ms apart
 *  exits    rows leave in 160ms so survivors glide without overlap
 *  preview  one panel morphs its height while content cross-fades
 *  reduced  no rise, cascade, ring glide, or orbit; state swaps instantly
 *
 *  parts    search-header (input + rolling count) · search-type-tabs ·
 *           search-area-filter · search-result-list (groups or empty) ·
 *           search-result-group (cascade window) ·
 *           search-result-row (selection ring) · search-preview-panel
 *           (height morph) · search-preview-dialog · search-preview ·
 *           search-empty-state (magnifier) · search-engine · search-motion
 * ───────────────────────────────────────────────────────── */

const LIST_ID = "search-results-list";
const DESKTOP_PREVIEW_QUERY = "(min-width: 1280px)";

export type SearchPreviewContext = {
  words: readonly string[];
  /** True inside the small-screen dialog; render an `AnimatedModalTitle`. */
  inDialog: boolean;
  onClose?: () => void;
};

export type SearchResultsProps = {
  results?: readonly SearchResult[];
  areas?: readonly SearchArea[];
  /** Type tab and group order. */
  typeOrder?: readonly SearchResultType[];
  typeLabels?: Partial<Record<SearchResultType, string>>;
  typeIcons?: Partial<Record<SearchResultType, LucideIcon>>;
  /** Searches offered by the empty state. */
  suggestions?: readonly string[];
  defaultQuery?: string;
  labels?: Partial<SearchLabels>;
  /** Replaces the default ranking. Area and type filters still apply. */
  search?: SearchFn;
  /** Called when a result is opened by click or Enter. */
  onOpenResult?: (result: SearchResult) => void;
  /** Replaces the preview content in both the pane and the dialog. */
  renderPreview?: (
    result: SearchResult,
    context: SearchPreviewContext,
  ) => ReactNode;
  className?: string;
};

export function SearchResults({
  results = SEARCH_RESULTS,
  areas: areaOptions = SEARCH_AREAS,
  typeOrder = SEARCH_TYPE_ORDER,
  typeLabels: typeLabelOverrides,
  typeIcons: typeIconOverrides,
  suggestions = SEARCH_SUGGESTIONS,
  defaultQuery = "webhook",
  labels: labelOverrides,
  search = rankResults,
  onOpenResult,
  renderPreview,
  className,
}: SearchResultsProps) {
  const reduce = useReducedMotion();
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const typeLabels = { ...SEARCH_TYPE_LABEL, ...typeLabelOverrides };
  const typeIcons = { ...SEARCH_TYPE_ICON, ...typeIconOverrides };

  const [query, setQuery] = useState(defaultQuery);
  const [type, setType] = useState<SearchTypeFilter>("all");
  const [areas, setAreas] = useState<ReadonlySet<SearchArea>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const words = useMemo(() => terms(query), [query]);

  // Matches for the query and area filters, before the type tab.
  const matches = useMemo(
    () => filterByAreas(search(results, query), areas),
    [search, results, query, areas],
  );
  const visible = useMemo(() => filterByType(matches, type), [matches, type]);

  // Keep the selection on a visible row.
  const selected =
    visible.find((result) => result.id === selectedId) ?? visible[0] ?? null;

  useEffect(() => {
    if (!previewOpen || selected) return;
    setPreviewOpen(false);
  }, [previewOpen, selected]);

  const groups = groupResults(visible, type, typeOrder);
  const ordered = groups.flatMap((group) => group.items);

  const openResult = (result: SearchResult) => {
    setSelectedId(result.id);
    onOpenResult?.(result);
    if (!window.matchMedia(DESKTOP_PREVIEW_QUERY).matches) setPreviewOpen(true);
  };

  const move = (step: number) => {
    if (ordered.length === 0) return;
    const index = selected
      ? ordered.findIndex((r) => r.id === selected.id)
      : -1;
    const next = ordered[(index + step + ordered.length) % ordered.length];
    setSelectedId(next.id);
    document.getElementById(resultRowId(next.id))?.scrollIntoView({
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter" && selected) {
      event.preventDefault();
      openResult(selected);
    }
  };

  const toggleArea = (area: SearchArea, checked: boolean) =>
    setAreas((current) => {
      const next = new Set(current);
      if (checked) next.add(area);
      else next.delete(area);
      return next;
    });

  const preview = (result: SearchResult, inDialog: boolean) => {
    const onClose = inDialog ? () => setPreviewOpen(false) : undefined;
    if (renderPreview)
      return renderPreview(result, { words, inDialog, onClose });
    return (
      <SearchPreview
        result={result}
        words={words}
        typeLabel={typeLabels[result.type]}
        icon={typeIcons[result.type]}
        openLabel={labels.openResult(typeLabels[result.type])}
        closeLabel={labels.closePreview}
        inDialog={inDialog}
        onClose={onClose}
      />
    );
  };

  return (
    <main
      className={cn(
        "min-h-screen w-full bg-background px-4 py-12 font-sans text-foreground sm:px-8 sm:py-16",
        className,
      )}
    >
      <motion.div
        initial={reduce ? false : "hidden"}
        animate="show"
        variants={PAGE}
        className="mx-auto w-full max-w-6xl"
      >
        <motion.div variants={RISE} className="max-w-2xl">
          <SearchHeader
            query={query}
            count={visible.length}
            listId={LIST_ID}
            labels={labels}
            onQueryChange={setQuery}
            onKeyDown={onKeyDown}
          />
        </motion.div>

        <motion.div variants={RISE}>
          <SearchTypeTabs
            value={type}
            order={typeOrder}
            typeLabels={typeLabels}
            labels={labels}
            countFor={(value) => countByType(matches, value)}
            onValueChange={setType}
          />
        </motion.div>

        <motion.div
          variants={RISE}
          className="mt-8 grid gap-10 lg:grid-cols-[12rem_minmax(0,1fr)] xl:grid-cols-[12rem_minmax(0,1fr)_20rem]"
        >
          <SearchAreaFilter
            areas={areaOptions}
            selected={areas}
            labels={labels}
            reduce={reduce}
            onToggle={toggleArea}
            onClear={() => setAreas(new Set())}
          />

          <SearchResultList
            id={LIST_ID}
            query={query}
            type={type}
            groups={groups}
            words={words}
            selectedId={selected?.id ?? null}
            typeLabels={typeLabels}
            typeIcons={typeIcons}
            suggestions={suggestions}
            labels={labels}
            reduce={reduce}
            onSelect={setSelectedId}
            onOpen={openResult}
            onViewType={setType}
            onSuggest={(value) => {
              setQuery(value);
              setType("all");
              setAreas(new Set());
            }}
          />

          <SearchPreviewPanel
            selectionKey={selected?.id ?? null}
            reduce={reduce}
          >
            {selected ? preview(selected, false) : null}
          </SearchPreviewPanel>
        </motion.div>
      </motion.div>

      <SearchPreviewDialog
        open={previewOpen && selected !== null}
        onOpenChange={setPreviewOpen}
      >
        {selected ? preview(selected, true) : null}
      </SearchPreviewDialog>
    </main>
  );
}
