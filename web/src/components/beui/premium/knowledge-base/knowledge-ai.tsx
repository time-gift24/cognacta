"use client";

import {
  ArrowUpRight,
  Database,
  FileText,
  Globe2,
  Plus,
  Search,
  StickyNote,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Checkbox } from "@/components/beui/motion/checkbox";
import { Input } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { KnowledgeSourceEditor } from "./knowledge-source-editor";
import {
  INITIAL_KNOWLEDGE_SOURCES,
  type KnowledgeSource,
} from "./knowledge-sources-data";

const SOURCE_TYPES = [
  { value: "all", label: "All sources" },
  { value: "document", label: "Documents" },
  { value: "link", label: "Links" },
  { value: "note", label: "Notes" },
] as const;
const SOURCE_ICONS = { document: FileText, link: Globe2, note: StickyNote };
export type KnowledgeAIProps = {
  initialSources?: readonly KnowledgeSource[];
  onSourcesChange?: (sources: KnowledgeSource[]) => void | Promise<void>;
  className?: string;
};
export function KnowledgeAI({
  initialSources = INITIAL_KNOWLEDGE_SOURCES,
  onSourcesChange,
  className,
}: KnowledgeAIProps) {
  const [sources, setSources] = useState<KnowledgeSource[]>(() => [
    ...initialSources,
  ]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState<KnowledgeSource | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(" ");
  const [notice, setNotice] = useState(" ");
  const lock = useRef(false);
  const id = useId();
  const reduce = useReducedMotion();
  const included = sources.filter((source) => source.enabled).length;
  const visible = sources.filter(
    (source) =>
      (filter === "all" || source.kind === filter) &&
      `${source.title} ${source.content} ${source.url ?? " "}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  async function persist(
    next: KnowledgeSource[],
    message: string,
    close = false,
  ) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(" ");
    try {
      await onSourcesChange?.(next);
      setSources(next);
      setNotice(
        onSourcesChange ? message : `${message} Saved for this preview.`,
      );
      if (close) setDraft(null);
    } catch {
      setError("Couldn’t save your changes. Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function add(kind: KnowledgeSource["kind"] = "note") {
    setError(" ");
    setDraft({
      id: crypto.randomUUID(),
      title: " ",
      kind,
      content: " ",
      enabled: true,
    });
  }
  return (
    <div
      className={cn(
        "min-h-[var(--preview-viewport-height,100svh)] w-full bg-background px-5 py-8 text-foreground sm:px-10",
        className,
      )}
    >
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              Workspace / AI context
            </p>
            <h2 className="text-xl font-medium">Knowledge base</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Give your assistant the context it needs. Keep documents,
              reference links, and useful notes in one place.
            </p>
          </div>
          <Button
            disabled={busy}
            onClick={() => add()}
            className="text-xs focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
          >
            <Plus size={15} />
            Add source
          </Button>
        </header>
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {(
            [
              {
                kind: "document",
                title: "Documents",
                description: "Playbooks, briefs, and guidelines",
                icon: FileText,
              },
              {
                kind: "link",
                title: "Reference links",
                description: "Useful pages and trusted resources",
                icon: Globe2,
              },
              {
                kind: "note",
                title: "Notes",
                description: "Instructions in your own words",
                icon: StickyNote,
              },
            ] as const
          ).map(({ kind, title, description, icon: Icon }) => (
            <div key={kind} className="rounded-2xl border border-border p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-full border border-border">
                  <Icon size={17} />
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {sources.filter((source) => source.kind === kind).length}{" "}
                  sources
                </span>
              </div>
              <h3 className="text-xl font-medium">{title}</h3>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {description}
                </p>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={busy}
                  aria-label={`Add ${kind}`}
                  onClick={() => add(kind)}
                  className="relative size-9 shrink-0 after:absolute after:-inset-1 focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
                >
                  <Plus size={15} />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <Tabs
            value={filter}
            onValueChange={setFilter}
            variant="underline"
            className="max-w-full overflow-x-auto pb-1"
          >
            <TabsList
              aria-label="Knowledge source types"
              className="min-w-max gap-4"
            >
              {SOURCE_TYPES.map((type, index) => (
                <TabsTrigger
                  key={type.value}
                  value={type.value}
                  id={`${id}-tab-${type.value}`}
                  aria-controls={`${id}-sources`}
                  tabIndex={filter === type.value ? 0 : -1}
                  className="px-1 text-xs focus-visible:outline-2 focus-visible:outline-ring"
                  onKeyDown={(event) => {
                    if (
                      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                        event.key,
                      )
                    )
                      return;
                    event.preventDefault();
                    const next =
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? SOURCE_TYPES.length - 1
                          : (index +
                              (event.key === "ArrowRight" ? 1 : -1) +
                              SOURCE_TYPES.length) %
                            SOURCE_TYPES.length;
                    setFilter(SOURCE_TYPES[next].value);
                    document
                      .getElementById(`${id}-tab-${SOURCE_TYPES[next].value}`)
                      ?.focus();
                  }}
                >
                  {type.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Input
            leftIcon={<Search aria-hidden className="size-4" />}
            type="search"
            aria-label="Search knowledge sources"
            value={query}
            onChange={(event) => setQuery(event)}
            placeholder="Search sources…"
            className="w-full sm:w-60"
            classNames={{ input: "pl-9 pr-3 text-xs" }}
          />
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span aria-live="polite">
            {visible.length} {visible.length === 1 ? "source" : "sources"}
          </span>
          <span>{included} included in assistant context</span>
        </div>
        <div
          role="tabpanel"
          id={`${id}-sources`}
          aria-labelledby={`${id}-tab-${filter}`}
          className="min-h-64"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${filter}-${query}`}
              initial={{ opacity: 0, y: reduce ? 0 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.12, ease: EASE_OUT }}
            >
              {visible.length ? (
                <div className="divide-y divide-border rounded-2xl border border-border px-4 sm:px-5">
                  {visible.map((source) => {
                    const Icon = SOURCE_ICONS[source.kind];
                    return (
                      <div
                        key={source.id}
                        className="flex flex-wrap items-center gap-4 py-4"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border">
                          <Icon size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <Button
                            variant="ghost"
                            disabled={busy}
                            onClick={() => {
                              setError(" ");
                              setDraft({ ...source });
                            }}
                            className="max-w-full justify-start px-0 text-left text-sm text-foreground hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
                          >
                            <span className="truncate">{source.title}</span>
                            <ArrowUpRight
                              size={14}
                              className="shrink-0 text-muted-foreground"
                            />
                          </Button>
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {source.kind === "link"
                              ? source.url
                              : source.content}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {source.kind === "link"
                              ? "Reference link"
                              : `${source.kind === "document" ? "Document" : "Note"} · ${source.content.length.toLocaleString("en-US")} characters`}
                          </p>
                        </div>
                        <div className="ml-14 sm:ml-0">
                          <Checkbox
                            checked={source.enabled}
                            disabled={busy}
                            onCheckedChange={(enabled) =>
                              void persist(
                                sources.map((item) =>
                                  item.id === source.id
                                    ? { ...item, enabled }
                                    : item,
                                ),
                                enabled
                                  ? "Source included."
                                  : "Source excluded.",
                              )
                            }
                            aria-label={`Use ${source.title} in assistant context`}
                            label="Use in AI"
                            className="min-h-11 text-xs [&_button]:relative [&_button]:after:absolute [&_button]:after:-inset-3"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
                  <Database
                    size={25}
                    className="mx-auto text-muted-foreground"
                  />
                  <h3 className="mt-4 text-xl font-medium">
                    {sources.length
                      ? "No matching sources"
                      : "A smarter assistant starts here"}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {sources.length
                      ? "Try another search or choose a different source type."
                      : "Add a note, a document, or a reference link."}
                  </p>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      if (sources.length) {
                        setQuery("");
                        setFilter("all");
                      } else add();
                    }}
                    className="mt-5 text-xs focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
                  >
                    {sources.length ? "Clear filters" : "Add your first source"}
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <footer className="mt-5 flex flex-wrap items-start justify-between gap-3 text-xs text-muted-foreground">
          <p className="max-w-lg leading-relaxed">
            Choose which sources your assistant can use. Only add information
            you’re comfortable sharing with your workspace.
          </p>
          <output aria-live="polite">
            {busy
              ? "Saving changes…"
              : notice ||
                (onSourcesChange
                  ? " "
                  : "Preview workspace · changes stay in this session")}
          </output>
        </footer>
        {error && !draft && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {draft && (
          <KnowledgeSourceEditor
            key={draft.id}
            source={draft}
            existing={sources.some((source) => source.id === draft.id)}
            busy={busy}
            error={error}
            onClose={() => {
              if (!busy) setDraft(null);
            }}
            onSave={async (source) => {
              await persist(
                sources.some((item) => item.id === source.id)
                  ? sources.map((item) =>
                      item.id === source.id ? source : item,
                    )
                  : [source, ...sources],
                "Source saved.",
                true,
              );
            }}
            onDelete={async () => {
              await persist(
                sources.filter((source) => source.id !== draft.id),
                "Source removed.",
                true,
              );
            }}
          />
        )}
      </div>
    </div>
  );
}
