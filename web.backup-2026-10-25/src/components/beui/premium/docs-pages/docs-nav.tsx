"use client";

import { ChevronDown, Search } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { EASE_OUT_CSS, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  DOCS_LABELS,
  DOCS_NAV,
  type DocsArticleLabels,
  type DocsNavGroup,
} from "./docs-data";

export type DocsNavLabels = Pick<
  DocsArticleLabels,
  "navLabel" | "searchPlaceholder" | "searchLabel" | "noMatches"
>;

export type DocsNavProps = {
  groups?: readonly DocsNavGroup[];
  activePage: string;
  onSelect: (id: string) => void;
  /** Distinguishes shared layout ids when the nav renders twice. */
  layoutScope: string;
  labels?: Partial<DocsNavLabels>;
  className?: string;
};

function Highlight({ text, query }: { text: string; query: string }) {
  const index = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-transparent font-medium text-foreground underline decoration-foreground/30 underline-offset-4">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}

export function DocsNav({
  groups: navGroups = DOCS_NAV,
  activePage,
  onSelect,
  layoutScope,
  labels,
  className,
}: DocsNavProps) {
  const copy = { ...DOCS_LABELS, ...labels };
  const reduce = useReducedMotion();
  const baseId = useId();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const trimmed = query.trim();

  const groups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            item.label.toLowerCase().includes(trimmed.toLowerCase()),
          ),
        }))
        .filter((group) => group.items.length > 0),
    [navGroups, trimmed],
  );

  const toggle = (title: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  const transition = reduce ? { duration: 0 } : SPRING_LAYOUT;

  return (
    <nav aria-label={copy.navLabel} className={className}>
      <Input
        value={query}
        onChange={setQuery}
        placeholder={copy.searchPlaceholder}
        aria-label={copy.searchLabel}
        leftIcon={<Search className="size-4" aria-hidden="true" />}
      />

      <div className="mt-6 space-y-5">
        <AnimatePresence initial={false} mode="popLayout">
          {groups.map((group) => {
            const open = trimmed !== "" || !collapsed.has(group.title);
            const listId = `${baseId}-${group.title}`;
            return (
              <motion.div
                key={group.title}
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={transition}
              >
                <Button
                  variant="plain"
                  type="button"
                  aria-expanded={open}
                  aria-controls={listId}
                  onClick={() => toggle(group.title)}
                  whileHover={undefined}
                  whileTap={undefined}
                  className="flex w-full items-center justify-between px-3 py-1 font-mono text-muted-foreground text-xs uppercase tracking-widest hover:text-foreground"
                >
                  {group.title}
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      !open && "-rotate-90",
                    )}
                  />
                </Button>
                <div
                  id={listId}
                  style={{ transitionTimingFunction: EASE_OUT_CSS }}
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none",
                    open
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <ul className="min-h-0 overflow-hidden pt-2">
                    {group.items.map((item) => {
                      const active = item.id === activePage;
                      return (
                        <motion.li
                          key={item.id}
                          layout="position"
                          transition={transition}
                          className="relative"
                        >
                          {active ? (
                            <motion.span
                              layoutId={`docs-nav-active-${layoutScope}`}
                              transition={transition}
                              className="absolute inset-0 rounded-full bg-muted"
                            />
                          ) : null}
                          <a
                            href={`#${item.id}`}
                            aria-current={active ? "page" : undefined}
                            tabIndex={open ? undefined : -1}
                            onClick={(event) => {
                              event.preventDefault();
                              onSelect(item.id);
                            }}
                            className={cn(
                              "relative flex min-h-9 items-center rounded-full px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-foreground",
                              active
                                ? "font-medium text-foreground"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <Highlight text={item.label} query={trimmed} />
                          </a>
                        </motion.li>
                      );
                    })}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {groups.length === 0 ? (
          <p className="px-3 text-muted-foreground text-sm" aria-live="polite">
            {copy.noMatches(trimmed)}
          </p>
        ) : null}
      </div>
    </nav>
  );
}
