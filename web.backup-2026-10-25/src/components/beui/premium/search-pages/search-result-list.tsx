"use client";

import type { LucideIcon } from "lucide-react";
import { AnimatePresence } from "motion/react";
import type {
  SearchLabels,
  SearchResult,
  SearchResultType,
  SearchTypeFilter,
} from "./search-data";
import { SearchEmptyState } from "./search-empty-state";
import type { SearchGroup } from "./search-engine";
import { SearchResultGroup } from "./search-result-group";
import { SearchResultRow } from "./search-result-row";

/** Results region: typed groups of rows, or the empty state. */
export function SearchResultList({
  id,
  query,
  type,
  groups,
  words,
  selectedId,
  typeLabels,
  typeIcons,
  suggestions,
  labels,
  reduce,
  onSelect,
  onOpen,
  onViewType,
  onSuggest,
}: {
  id: string;
  query: string;
  type: SearchTypeFilter;
  groups: readonly SearchGroup[];
  words: readonly string[];
  selectedId: string | null;
  typeLabels: Record<SearchResultType, string>;
  typeIcons: Record<SearchResultType, LucideIcon>;
  suggestions: readonly string[];
  labels: SearchLabels;
  reduce: boolean | null;
  onSelect: (id: string) => void;
  onOpen: (result: SearchResult) => void;
  onViewType: (type: SearchResultType) => void;
  onSuggest: (value: string) => void;
}) {
  const trimmed = query.trim();
  const empty = groups.every((group) => group.items.length === 0);

  return (
    <section id={id} aria-label={labels.resultsRegion} className="min-w-0">
      <AnimatePresence mode="popLayout">
        {empty ? (
          <SearchEmptyState
            key="empty"
            title={trimmed ? labels.emptyTitle(trimmed) : labels.emptyIdle}
            hint={labels.emptyHint}
            suggestions={suggestions}
            reduce={reduce}
            onSuggest={onSuggest}
          />
        ) : (
          groups.map((group) => (
            <SearchResultGroup
              key={`${type}-${group.type}`}
              label={typeLabels[group.type]}
              icon={typeIcons[group.type]}
              count={group.items.length}
              showHeader={type === "all"}
              viewLabel={labels.viewGroup}
              reduce={reduce}
              onView={() => onViewType(group.type)}
            >
              <AnimatePresence mode="popLayout">
                {group.items.map((result, index) => (
                  <SearchResultRow
                    key={result.id}
                    index={index}
                    result={result}
                    words={words}
                    selected={selectedId === result.id}
                    reduce={reduce}
                    onHover={() => onSelect(result.id)}
                    onOpen={() => onOpen(result)}
                  />
                ))}
              </AnimatePresence>
            </SearchResultGroup>
          ))
        )}
      </AnimatePresence>
    </section>
  );
}
