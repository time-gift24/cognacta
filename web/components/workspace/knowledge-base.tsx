"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input, Textarea } from "@/components/form-fields";
import { useKnowledge } from "./knowledge-provider";
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe2,
  Plus,
  Search,
  Trash,
  X,
} from "@/components/icons";
import { Button } from "@/components/motion/button/base";
import {
  AnimatedModal,
  AnimatedModalTitle,
  AnimatedModalDescription,
} from "@/components/motion/animated-modal";
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownRadioGroup,
  AnimatedDropdownRadioItem,
  AnimatedDropdownTrigger,
} from "@/components/premium/animated-dropdown";
import { isReferenceUrl, type KnowledgeEntry } from "./knowledge-data";

const EMPTY: KnowledgeEntry = { id: "", title: "", content: "", url: "" };
const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function KnowledgeBase() {
  const { entries, ready, loadError, save } = useKnowledge();
  const t = useTranslations("Knowledge");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "notes" | "links">("all");
  const filterLabel = (value: "all" | "notes" | "links") =>
    value === "all" ? t("allSources") : value === "notes" ? t("notes") : t("links");
  const [draft, setDraft] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function persist(next: KnowledgeEntry[], message: string) {
    try {
      save(next);
      setOpen(false);
      setConfirmDelete(false);
      setNotice(message);
    } catch {
      setError(t("errorSave"));
    }
  }

  function edit(entry: KnowledgeEntry) {
    setDraft(entry);
    setError("");
    setConfirmDelete(false);
    setOpen(true);
  }

  const visible = entries.filter(
    (entry) =>
      (filter === "all" ||
        (filter === "links" ? !!entry.url : !entry.url)) &&
      `${entry.title} ${entry.content} ${entry.url}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pt-20 pb-10 sm:px-8 lg:pt-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            {t("breadcrumb")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button
          disabled={!ready}
          onClick={() => edit(EMPTY)}
          className={`h-11 ${focus}`}
        >
          <Plus className="size-4" />
          {t("add")}
        </Button>
      </header>

      <div className="mt-8 flex items-center gap-2">
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <span className="sr-only">{t("search")}</span>
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search")}
            className="h-10 rounded-full pl-10"
          />
        </label>
        <AnimatedDropdown>
          <AnimatedDropdownTrigger asChild>
            <button
              type="button"
              aria-label={t("sourceType", { type: filterLabel(filter) })}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border px-3 text-xs hover:bg-surface-raised ${focus}`}
            >
              {filterLabel(filter)}
              <ChevronDown className="size-3.5" />
            </button>
          </AnimatedDropdownTrigger>
          <AnimatedDropdownContent align="end" className="w-40 min-w-0">
            <AnimatedDropdownRadioGroup
              value={filter}
              onValueChange={(value) => {
                if (value === "all" || value === "notes" || value === "links")
                  setFilter(value);
              }}
            >
              {(["all", "notes", "links"] as const).map((value) => (
                <AnimatedDropdownRadioItem key={value} value={value}>
                  {filterLabel(value)}
                </AnimatedDropdownRadioItem>
              ))}
            </AnimatedDropdownRadioGroup>
          </AnimatedDropdownContent>
        </AnimatedDropdown>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        {visible.map((entry) => {
          const Icon = entry.url ? Globe2 : FileText;
          return (
            <button
              key={entry.id}
              type="button"
              disabled={!ready}
              onClick={() => edit(entry)}
              className={`flex w-full items-center gap-3 border-b border-border p-4 text-left last:border-0 hover:bg-surface-raised ${focus}`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-raised">
                <Icon className="size-5 text-muted-foreground" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {entry.title}
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {entry.url || entry.content}
                </span>
              </span>
              <span className="hidden rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground sm:inline-flex">
                {entry.url ? t("link") : t("note")}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
        {!visible.length && (
          <div className="px-4 py-12 text-center">
            <BookOpen className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm">
              {entries.length ? t("noMatchTitle") : t("emptyTitle")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {entries.length ? t("noMatchHint") : t("emptyHint")}
            </p>
            <Button
              variant="ghost"
              className={`mt-3 ${focus}`}
              onClick={() => {
                if (entries.length) {
                  setQuery("");
                  setFilter("all");
                } else edit(EMPTY);
              }}
            >
              {entries.length ? t("clearFilters") : t("add")}
            </Button>
          </div>
        )}
      </div>
      <p role="status" className="mt-4 text-sm text-muted-foreground">
        {notice || loadError}
      </p>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">
        {t("footnote")}
      </p>

      <AnimatedModal
        open={open}
        onOpenChange={setOpen}
        backdropClassName="bg-black/40 backdrop-blur-none"
        panelClassName="relative max-w-xl rounded-2xl border border-border bg-background p-5 sm:p-6"
      >
        <Button
          variant="ghost"
          aria-label={t("close")}
          onClick={() => setOpen(false)}
          className={`absolute top-3 right-3 size-10 p-0 ${focus}`}
        >
          <X className="size-4" />
        </Button>
        <AnimatedModalTitle className="pr-10 text-xl font-semibold">
          {draft.id ? t("editTitle") : t("addTitle")}
        </AnimatedModalTitle>
        <AnimatedModalDescription className="mt-2 text-sm text-muted-foreground">
          {t("modalDescription")}
        </AnimatedModalDescription>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const cleaned = {
              ...draft,
              title: draft.title.trim(),
              url: draft.url.trim(),
              content: draft.content.trim(),
            };
            if (!cleaned.title || (!cleaned.content && !cleaned.url)) {
              setError(t("errorTitle"));
              return;
            }
            if (!isReferenceUrl(cleaned.url)) {
              setError(t("errorUrl"));
              return;
            }
            const entry = { ...cleaned, id: draft.id || crypto.randomUUID() };
            persist(
              draft.id
                ? entries.map((item) => (item.id === draft.id ? entry : item))
                : [entry, ...entries],
              t("saved"),
            );
          }}
        >
          <label className="block text-sm">
            {t("titleLabel")}
            <Input
              required
              maxLength={120}
              value={draft.title}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
              placeholder={t("titlePlaceholder")}
              className="mt-2"
            />
          </label>
          <label className="block text-sm">
            {t("urlLabel")}{" "}
            <span className="text-xs text-muted-foreground">
              {t("optional")}
            </span>
            <Input
              type="url"
              maxLength={2000}
              value={draft.url}
              onChange={(event) =>
                setDraft({ ...draft, url: event.target.value })
              }
              placeholder="https://"
              className="mt-2"
            />
          </label>
          <div className="text-sm">
            <label htmlFor="knowledge-source-notes">{t("notesLabel")}</label>
            <Textarea
              id="knowledge-source-notes"
              rows={5}
              maxLength={20000}
              value={draft.content}
              onChange={(event) =>
                setDraft({ ...draft, content: event.target.value })
              }
              placeholder={t("notesPlaceholder")}
              className="mt-2"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              {draft.id && (
                <Button
                  variant="ghost"
                  aria-label={t("delete")}
                  onClick={() => {
                    setError("");
                    setConfirmDelete(true);
                  }}
                  className={`size-10 p-0 text-danger ${focus}`}
                >
                  <Trash className="size-4" />
                </Button>
              )}
              {draft.url && isReferenceUrl(draft.url) && (
                <a
                  href={draft.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={`inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs text-muted-foreground ${focus}`}
                >
                  {t("visit")}
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit">{t("save")}</Button>
            </div>
          </div>
        </form>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
        <DeleteConfirmationModal
          open={open && confirmDelete}
          onOpenChange={setConfirmDelete}
          itemName={
            entries.find((entry) => entry.id === draft.id)?.title ?? draft.title
          }
          error={error}
          onConfirm={() =>
            persist(
              entries.filter((entry) => entry.id !== draft.id),
              t("deleted"),
            )
          }
        />
      </AnimatedModal>
    </div>
  );
}
