"use client";

import { ArrowUpRight, BookOpen, Check, Search } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type ResearchSource = {
  id: string;
  title: string;
  publisher: string;
  kind: "Documentation" | "Article" | "Paper";
  excerpt: string;
  url: string;
  updated: string;
};
export type ResearchSourcesProps = {
  sources: readonly ResearchSource[];
  title?: string;
  onSelectionChange?: (ids: string[]) => void;
  className?: string;
};

export function ResearchSources({
  sources,
  title = "Research library",
  onSelectionChange,
  className,
}: ResearchSourcesProps) {
  const tabsId = useId();
  const kinds = ["All", ...new Set(sources.map((source) => source.kind))];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<string[]>([]);
  const reduce = useReducedMotion();
  const visible = sources.filter(
    (source) =>
      (filter === "All" || source.kind === filter) &&
      `${source.title} ${source.publisher} ${source.excerpt}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((item) => item !== id)
      : [...selected, id];
    setSelected(next);
    onSelectionChange?.(next);
  }
  return (
    <section
      aria-label="Research sources"
      className={cn(
        "w-full max-w-2xl rounded-3xl border border-border bg-background p-5 sm:p-6",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">
            Sources & references
          </p>
          <h2 className="text-4xl font-medium">{title}</h2>
        </div>
        <span className="flex size-10 items-center justify-center rounded-full bg-muted">
          <BookOpen className="size-4" />
        </span>
      </header>
      <Input
        leftIcon={<Search aria-hidden className="size-4" />}
        aria-label="Search sources"
        placeholder="Search your sources…"
        value={query}
        onChange={(event) => setQuery(event)}
        className="w-full my-5"
        classNames={{ input: "pl-10 pr-4 text-sm" }}
      />
      <Tabs
        value={filter}
        onValueChange={setFilter}
        variant="pill"
        className="mb-3"
      >
        <TabsList
          aria-label="Source type"
          className="flex flex-wrap justify-start bg-muted p-0"
        >
          {kinds.map((kind, index) => (
            <TabsTrigger
              key={kind}
              value={kind}
              id={`${tabsId}-${index}`}
              aria-controls={`${tabsId}-results`}
              tabIndex={filter === kind ? 0 : -1}
              className="h-8 rounded-full px-3 py-0 text-xs focus-visible:ring-2 focus-visible:ring-ring"
              onKeyDown={(event) => {
                let next = index;
                if (event.key === "ArrowRight")
                  next = (index + 1) % kinds.length;
                else if (event.key === "ArrowLeft")
                  next = (index - 1 + kinds.length) % kinds.length;
                else if (event.key === "Home") next = 0;
                else if (event.key === "End") next = kinds.length - 1;
                else return;
                event.preventDefault();
                setFilter(kinds[next]);
                document.getElementById(`${tabsId}-${next}`)?.focus();
              }}
            >
              {kind}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div
        role="tabpanel"
        id={`${tabsId}-results`}
        aria-labelledby={`${tabsId}-${kinds.indexOf(filter)}`}
        className="min-h-60 divide-y divide-border"
      >
        {visible.map((source) => (
          <motion.article
            key={source.id}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="py-4"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {source.publisher} <span className="mx-1">·</span> {source.kind}
              </p>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`${selected.includes(source.id) ? "Remove" : "Add"} ${source.title} ${selected.includes(source.id) ? "from" : "to"} context`}
                aria-pressed={selected.includes(source.id)}
                onClick={() => toggle(source.id)}
                className={cn(
                  "size-9 border border-border rounded-full h-9",
                  selected.includes(source.id) && "bg-muted",
                )}
              >
                <Check
                  className={cn(
                    "size-3.5",
                    !selected.includes(source.id) && "opacity-25",
                  )}
                />
              </Button>
            </div>
            <a
              href={/^https?:\/\//.test(source.url) ? source.url : undefined}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex max-w-full items-center gap-2 rounded-lg text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {source.title}
              <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
            </a>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {source.excerpt}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {source.updated}
            </p>
          </motion.article>
        ))}
        {visible.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No matching sources. Try another search.
          </p>
        )}
      </div>
      <footer className="mt-3 flex items-center justify-between border-t border-border pt-4">
        <output className="text-xs text-muted-foreground">
          {selected.length} sources in context
        </output>
        <Button
          variant="ghost"
          disabled={selected.length === 0}
          onClick={() => {
            setSelected([]);
            onSelectionChange?.([]);
          }}
          className="px-3 text-xs rounded-full h-9"
        >
          Clear selection
        </Button>
      </footer>
    </section>
  );
}
