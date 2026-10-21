"use client";

import { Search, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import { Button } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { Input } from "@/components/beui/motion/input";
import type { SearchLabels } from "./search-data";

/** Title, query input with clear action, and the rolling result count. */
export function SearchHeader({
  query,
  count,
  listId,
  labels,
  onQueryChange,
  onKeyDown,
}: {
  query: string;
  count: number;
  listId: string;
  labels: SearchLabels;
  onQueryChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  const trimmed = query.trim();

  return (
    <>
      <h1 className="font-medium text-4xl tracking-tight md:text-5xl">
        {labels.title}
      </h1>
      <Input
        value={query}
        onChange={onQueryChange}
        onKeyDown={onKeyDown}
        placeholder={labels.placeholder}
        aria-label={labels.inputLabel}
        aria-controls={listId}
        className="mt-6"
        leftIcon={<Search className="size-4" aria-hidden="true" />}
        rightIcon={
          query ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={labels.clearSearch}
              onClick={() => onQueryChange("")}
              className="size-7"
            >
              <X className="size-3.5" aria-hidden="true" />
            </Button>
          ) : null
        }
      />
      <p
        className="mt-4 flex flex-wrap items-center gap-1 text-muted-foreground text-sm"
        aria-live="polite"
      >
        <DigitSwap
          value={count}
          className="font-medium text-foreground tabular-nums"
        />
        {count === 1 ? labels.resultSingular : labels.resultPlural}
        {trimmed ? (
          <>
            {" "}
            {labels.resultsFor}{" "}
            <span className="text-foreground">“{trimmed}”</span>
          </>
        ) : null}
        <span className="hidden sm:inline"> · {labels.keyboardHint}</span>
      </p>
    </>
  );
}
