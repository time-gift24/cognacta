"use client";

import { Download, Search, SlidersHorizontal, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import {
  Button,
  type ButtonState,
  StatefulButton,
} from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { SPRING_PANEL } from "@/lib/beui/ease";
import type { CreditCategory } from "./credit-usage-data";

export type BreakdownView = "primary" | "secondary";

export type BreakdownToolbarProps = {
  view: BreakdownView;
  onViewChange: (view: BreakdownView) => void;
  tabLabels: { primary: string; secondary: string };
  query: string;
  onQueryChange: (query: string) => void;
  categories: readonly CreditCategory[];
  selectedCategory: string | null;
  onSelectCategory: (id: string) => void;
  onClearCategory: () => void;
  exportState: ButtonState;
  onExport: () => void;
  labels: { export: string; filter: string; category: string };
};

/** Table tabs, search, export, and a category filter tray. */
export function BreakdownToolbar({
  view,
  onViewChange,
  tabLabels,
  query,
  onQueryChange,
  categories,
  selectedCategory,
  onSelectCategory,
  onClearCategory,
  exportState,
  onExport,
  labels,
}: BreakdownToolbarProps) {
  const reduce = useReducedMotion();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const selected = categories.find((c) => c.id === selectedCategory);
  const panel = reduce ? { duration: 0 } : SPRING_PANEL;

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          value={view}
          onValueChange={(value) => onViewChange(value as BreakdownView)}
          variant="pill"
        >
          <TabsList aria-label="Breakdown">
            <TabsTrigger value="primary">{tabLabels.primary}</TabsTrigger>
            <TabsTrigger value="secondary">{tabLabels.secondary}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={onQueryChange}
            placeholder={`Search ${tabLabels[view].toLowerCase()}`}
            aria-label="Search breakdown"
            leftIcon={<Search className="size-4" aria-hidden="true" />}
            className="w-full basis-full md:w-64 md:basis-auto"
          />
          <StatefulButton
            type="button"
            variant="outline"
            state={exportState}
            loadingText="Exporting"
            successText="Exported"
            errorText="Try again"
            onClick={onExport}
            className="h-10"
          >
            <Download className="size-4" aria-hidden="true" />
            {labels.export}
          </StatefulButton>
          <Button
            type="button"
            variant="outline"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
            className="h-10"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {labels.filter}
            {selected ? (
              <span className="grid size-5 place-items-center rounded-full bg-muted font-medium text-xs">
                1
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {filtersOpen ? (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={panel}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2 pt-4">
              <span className="mr-1 text-muted-foreground text-sm">
                {labels.category}
              </span>
              {categories.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={selectedCategory === item.id ? "primary" : "outline"}
                  aria-pressed={selectedCategory === item.id}
                  onClick={() => onSelectCategory(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {selected ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={panel}
            className="mt-4"
          >
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClearCategory}
              aria-label={`Clear ${selected.label} filter`}
            >
              {selected.label}
              <X className="size-3.5" aria-hidden="true" />
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
