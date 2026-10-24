"use client";

import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import { Checkbox } from "@/components/beui/motion/checkbox";
import { SPRING_PANEL } from "@/lib/beui/ease";
import type { SearchArea, SearchLabels } from "./search-data";
import { INSTANT } from "./search-motion";

/** Product-area checkboxes; a clear action springs in once any is checked. */
export function SearchAreaFilter({
  areas,
  selected,
  labels,
  reduce,
  onToggle,
  onClear,
}: {
  areas: readonly SearchArea[];
  selected: ReadonlySet<SearchArea>;
  labels: SearchLabels;
  reduce: boolean | null;
  onToggle: (area: SearchArea, checked: boolean) => void;
  onClear: () => void;
}) {
  return (
    <aside className="lg:pt-1">
      <fieldset>
        <legend className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
          {labels.areaLegend}
        </legend>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 lg:flex-col">
          {areas.map((area) => (
            <Checkbox
              key={area}
              checked={selected.has(area)}
              onCheckedChange={(checked) => onToggle(area, checked)}
              label={area}
              className="min-h-10 text-sm"
            />
          ))}
        </div>
      </fieldset>
      <AnimatePresence initial={false}>
        {selected.size > 0 ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={reduce ? INSTANT : SPRING_PANEL}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="mt-2 -ml-3"
            >
              {labels.clearFilters}
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </aside>
  );
}
