"use client";

import {
  FileText,
  ListChecks,
  LoaderCircle,
  type LucideIcon,
  Search,
  StickyNote,
  Users,
} from "lucide-react";
import { cn } from "@/lib/beui/utils";

type SearchResult = {
  label: string;
  detail: string;
  shortcut: string;
  icon: LucideIcon;
  muted?: boolean;
};

const results: SearchResult[] = [
  {
    label: "Launch brief",
    detail: "Document",
    shortcut: "↵",
    icon: FileText,
  },
  {
    label: "Campaign notes",
    detail: "Note",
    shortcut: "N",
    icon: StickyNote,
    muted: true,
  },
  {
    label: "Launch checklist",
    detail: "Task list",
    shortcut: "L",
    icon: ListChecks,
  },
  {
    label: "Team workspace",
    detail: "People",
    shortcut: "T",
    icon: Users,
    muted: true,
  },
];

export type SearchCommandLayout = "default" | "card";

export type SearchCommandProps = {
  className?: string;
  layout?: SearchCommandLayout;
  title?: string;
};

export function SearchCommand({
  className,
  layout = "default",
  title = "A command search filters workspace results and moves the active selection",
}: SearchCommandProps) {
  return (
    <div
      role="img"
      aria-label={title}
      data-layout={layout}
      className={cn(
        "search-command relative isolate flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-muted text-foreground",
        layout === "card" ? "p-[7%]" : "p-[9%]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "w-full overflow-hidden rounded-2xl border border-border bg-background",
          layout === "card" ? "max-w-[19rem]" : "max-w-[27rem]",
        )}
      >
        <div
          className={cn(
            "flex items-center border-border border-b",
            layout === "card" ? "h-11 gap-2 px-3" : "h-14 gap-3 px-4",
          )}
        >
          <Search
            aria-hidden="true"
            className={cn(
              "shrink-0 text-muted-foreground",
              layout === "card" ? "size-3.5" : "size-4",
            )}
            strokeWidth={1.8}
          />
          <div
            className={cn(
              "relative min-w-0 flex-1 overflow-hidden font-medium",
              layout === "card" ? "text-[11px]" : "text-sm",
            )}
          >
            <span className="search-command__placeholder text-muted-foreground">
              Search workspace
            </span>
            <span className="search-command__query absolute top-0 left-0 w-fit whitespace-nowrap font-mono">
              launch
              <span className="search-command__caret ml-px inline-block h-[1em] w-px translate-y-[0.12em] bg-foreground" />
            </span>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-md border border-border bg-secondary font-mono text-muted-foreground",
              layout === "card"
                ? "px-1.5 py-0.5 text-[8px]"
                : "px-2 py-1 text-[10px]",
            )}
          >
            ⌘ K
          </span>
        </div>

        <div className={cn(layout === "card" ? "p-2" : "p-3")}>
          <p
            className={cn(
              "font-mono text-muted-foreground uppercase tracking-[0.14em]",
              layout === "card"
                ? "px-2 pb-1.5 text-[7px]"
                : "px-2 pb-2 text-[9px]",
            )}
          >
            Quick actions
          </p>

          <div className="relative">
            <div className="search-command__loading pointer-events-none absolute inset-0 z-20 flex items-center justify-center gap-2 text-muted-foreground">
              <LoaderCircle
                aria-hidden="true"
                className={cn(
                  "search-command__spinner",
                  layout === "card" ? "size-3" : "size-4",
                )}
                strokeWidth={1.8}
              />
              <span className={layout === "card" ? "text-[9px]" : "text-xs"}>
                Searching workspace…
              </span>
            </div>

            <div
              className={cn(
                "search-command__results relative grid",
                layout === "card"
                  ? "gap-1 [--row-height:2rem] [--selection-offset:4.5rem]"
                  : "gap-1 [--row-height:2.5rem] [--selection-offset:5.5rem]",
              )}
            >
              <div className="search-command__selection absolute inset-x-0 top-0 h-(--row-height) rounded-lg bg-secondary" />

              {results.map((result) => {
                const Icon = result.icon;

                return (
                  <div
                    key={result.label}
                    className={cn(
                      "relative z-10 flex h-(--row-height) items-center rounded-lg",
                      layout === "card" ? "gap-2 px-2" : "gap-3 px-2.5",
                      result.muted && "search-command__secondary-result",
                    )}
                  >
                    <span
                      className={cn(
                        "flex shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground",
                        layout === "card" ? "size-6" : "size-8",
                      )}
                    >
                      <Icon
                        aria-hidden="true"
                        className={layout === "card" ? "size-3" : "size-3.5"}
                        strokeWidth={1.8}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate font-medium",
                          layout === "card" ? "text-[10px]" : "text-xs",
                        )}
                      >
                        {result.label}
                      </span>
                      <span
                        className={cn(
                          "block text-muted-foreground",
                          layout === "card" ? "text-[7px]" : "text-[9px]",
                        )}
                      >
                        {result.detail}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex shrink-0 items-center justify-center rounded border border-border bg-background font-mono text-muted-foreground",
                        layout === "card"
                          ? "size-4 text-[7px]"
                          : "size-5 text-[9px]",
                      )}
                    >
                      {result.shortcut}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .search-command__query {
          clip-path: inset(0 100% 0 0);
          opacity: 0;
          animation:
            search-command-type 7s steps(6, end) infinite,
            search-command-query-visibility 7s steps(1, end) infinite;
          will-change: clip-path, opacity;
        }

        .search-command__placeholder {
          animation: search-command-placeholder 7s steps(1, end) infinite;
        }

        .search-command__caret {
          animation: search-command-caret 0.8s steps(1, end) infinite;
        }

        .search-command__loading {
          animation: search-command-loading 7s cubic-bezier(0.23, 1, 0.32, 1)
            infinite;
          will-change: opacity, transform;
        }

        .search-command__spinner {
          animation: search-command-spin 0.8s linear infinite;
          will-change: transform;
        }

        .search-command__results {
          animation: search-command-results 7s cubic-bezier(0.23, 1, 0.32, 1)
            infinite;
          will-change: opacity, transform;
        }

        .search-command__selection {
          animation: search-command-select 7s cubic-bezier(0.77, 0, 0.175, 1)
            infinite;
          will-change: transform;
        }

        .search-command__secondary-result {
          animation: search-command-filter 7s cubic-bezier(0.23, 1, 0.32, 1)
            infinite;
          will-change: opacity, transform;
        }

        @keyframes search-command-type {
          0%,
          8% {
            clip-path: inset(0 100% 0 0);
          }
          24%,
          92% {
            clip-path: inset(0 0 0 0);
          }
          93%,
          100% {
            clip-path: inset(0 100% 0 0);
          }
        }

        @keyframes search-command-query-visibility {
          0%,
          7%,
          94%,
          100% {
            opacity: 0;
          }
          8%,
          93% {
            opacity: 1;
          }
        }

        @keyframes search-command-placeholder {
          0%,
          7%,
          94%,
          100% {
            opacity: 1;
          }
          8%,
          93% {
            opacity: 0;
          }
        }

        @keyframes search-command-loading {
          0%,
          23%,
          48%,
          100% {
            opacity: 0;
            transform: translate3d(0, 4px, 0);
          }
          29%,
          42% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes search-command-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes search-command-results {
          0%,
          41% {
            opacity: 0;
            transform: translate3d(0, 6px, 0);
          }
          49%,
          90% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, -3px, 0);
          }
        }

        @keyframes search-command-caret {
          0%,
          48% {
            opacity: 1;
          }
          49%,
          100% {
            opacity: 0;
          }
        }

        @keyframes search-command-select {
          0%,
          57% {
            transform: translate3d(0, 0, 0);
          }
          68%,
          82% {
            transform: translate3d(0, var(--selection-offset), 0);
          }
          94%,
          100% {
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes search-command-filter {
          0%,
          94%,
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
          48%,
          82% {
            opacity: 0.3;
            transform: translate3d(4px, 0, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .search-command__query,
          .search-command__placeholder,
          .search-command__caret,
          .search-command__loading,
          .search-command__spinner,
          .search-command__results,
          .search-command__selection,
          .search-command__secondary-result {
            animation: none;
          }

          .search-command__query {
            clip-path: inset(0 0 0 0);
            opacity: 1;
          }

          .search-command__placeholder {
            opacity: 0;
          }

          .search-command__secondary-result {
            opacity: 0.35;
          }

          .search-command__loading {
            display: none;
          }

          .search-command__results {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
