import type {
  SearchArea,
  SearchResult,
  SearchResultType,
  SearchTypeFilter,
} from "./search-data";

/** Ranks results for a query. Return only the matches, best first. */
export type SearchFn = (
  results: readonly SearchResult[],
  query: string,
) => readonly SearchResult[];

export type SearchGroup = {
  type: SearchResultType;
  items: readonly SearchResult[];
};

/** Lowercase words of a query, used for scoring and highlighting. */
export function terms(query: string) {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/** Title hits score 3, body or path hits 1; any missing word scores 0. */
export function score(result: SearchResult, words: readonly string[]) {
  if (words.length === 0) return 1;
  const title = result.title.toLowerCase();
  const body = `${result.snippet} ${result.path.join(" ")}`.toLowerCase();
  let total = 0;
  for (const word of words) {
    if (title.includes(word)) total += 3;
    else if (body.includes(word)) total += 1;
    else return 0;
  }
  return total;
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Default search: keep results that match every word, best score first. */
export const rankResults: SearchFn = (results, query) => {
  const words = terms(query);
  return results
    .map((result) => ({ result, rank: score(result, words) }))
    .filter(({ rank }) => rank > 0)
    .sort((a, b) => b.rank - a.rank)
    .map(({ result }) => result);
};

/** An empty area set means no area filter. */
export function filterByAreas(
  results: readonly SearchResult[],
  areas: ReadonlySet<SearchArea>,
) {
  return areas.size === 0
    ? results
    : results.filter((result) => areas.has(result.area));
}

export function filterByType(
  results: readonly SearchResult[],
  type: SearchTypeFilter,
) {
  return type === "all"
    ? results
    : results.filter((result) => result.type === type);
}

export function countByType(
  results: readonly SearchResult[],
  type: SearchTypeFilter,
) {
  return filterByType(results, type).length;
}

/**
 * Groups visible results by type in `order` for the "all" tab, or returns
 * a single group for a specific type. Empty groups are dropped.
 */
export function groupResults(
  results: readonly SearchResult[],
  type: SearchTypeFilter,
  order: readonly SearchResultType[],
): SearchGroup[] {
  if (type !== "all") return [{ type, items: results }];
  return order
    .map((key) => ({
      type: key,
      items: results.filter((result) => result.type === key),
    }))
    .filter((group) => group.items.length > 0);
}
