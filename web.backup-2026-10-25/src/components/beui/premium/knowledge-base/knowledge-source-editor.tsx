"use client";

import { FileText, Trash2, Upload, X } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { type KnowledgeSource, validSourceUrl } from "./knowledge-sources-data";

const TYPES = ["note", "link", "document"] as const;
export function KnowledgeSourceEditor({
  source,
  existing,
  busy,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  source: KnowledgeSource;
  existing: boolean;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (source: KnowledgeSource) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(source);
  const [validation, setValidation] = useState("");
  const [reading, setReading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const readLock = useRef(false);
  const urlHintId = useId();
  const locked = busy || reading;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (locked) return;
    if (!draft.title.trim()) {
      setValidation("Give this source a title.");
      return;
    }
    if (draft.kind === "link" && !validSourceUrl(draft.url ?? "")) {
      setValidation("Enter a complete http or https URL.");
      return;
    }
    if (draft.kind !== "link" && !draft.content.trim()) {
      setValidation("Add some content before saving this source.");
      return;
    }
    setValidation("");
    await onSave({
      ...draft,
      title: draft.title.trim(),
      url: draft.kind === "link" ? draft.url?.trim() : undefined,
    });
  }
  return (
    <AnimatedModal
      open
      onOpenChange={(open) => {
        if (!open && !locked) onClose();
      }}
      panelClassName="max-h-[calc(100dvh-3rem)] max-w-2xl rounded-2xl p-5 sm:max-h-[calc(100dvh-6rem)] sm:p-7"
      viewportClassName="inset-y-6 sm:inset-y-12 [&>div]:items-start"
      backdropClassName="backdrop-blur-sm"
    >
      <div className="mb-5 flex shrink-0 items-start justify-between gap-4">
        <div>
          <AnimatedModalTitle className="text-xl font-medium">
            {existing ? "Source details" : "Add knowledge"}
          </AnimatedModalTitle>
          <AnimatedModalDescription className="mt-2 text-sm text-muted-foreground">
            Give your assistant useful context to work with.
          </AnimatedModalDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close source editor"
          disabled={locked}
          onClick={onClose}
          className="size-9 focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
        >
          <X size={18} />
        </Button>
      </div>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={locked} className="space-y-5">
          {!existing && (
            <Tabs
              value={draft.kind}
              onValueChange={(kind) => {
                setDraft({ ...draft, kind: kind as KnowledgeSource["kind"] });
                setValidation("");
              }}
              variant="pill"
              className="shrink-0"
            >
              <TabsList aria-label="Source type" className="gap-2 bg-muted p-0">
                {TYPES.map((kind, index) => (
                  <TabsTrigger
                    key={kind}
                    value={kind}
                    disabled={locked}
                    tabIndex={draft.kind === kind ? 0 : -1}
                    className="h-9 rounded-full px-4 text-xs capitalize focus-visible:ring-2 focus-visible:ring-ring"
                    onKeyDown={(event) => {
                      if (
                        event.key !== "ArrowLeft" &&
                        event.key !== "ArrowRight"
                      )
                        return;
                      event.preventDefault();
                      const next =
                        TYPES[
                          (index +
                            (event.key === "ArrowRight" ? 1 : -1) +
                            TYPES.length) %
                            TYPES.length
                        ];
                      setDraft({ ...draft, kind: next });
                      const list =
                        event.currentTarget.closest('[role="tablist"]');
                      list
                        ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                        [TYPES.indexOf(next)]?.focus();
                    }}
                  >
                    {kind}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          <div className="space-y-5 px-1 pb-1">
            {draft.kind === "document" && (
              <div className="rounded-2xl border border-dashed border-border p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full border border-border">
                    <FileText size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      Import a text document
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Plain text or Markdown · up to 1 MB
                    </p>
                  </div>
                </div>
                <label className="relative mt-4 inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-border px-4 text-xs focus-within:ring-2 focus-within:ring-ring">
                  <Upload size={14} />
                  {reading ? "Reading file…" : "Choose file"}
                  <input
                    type="file"
                    accept=".txt,.md,text/plain,text/markdown"
                    aria-label="Import text document"
                    className="absolute inset-0 w-full cursor-pointer opacity-0"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file || readLock.current) return;
                      event.target.value = "";
                      if (
                        !/\.(txt|md)$/i.test(file.name) ||
                        file.size > 1024 * 1024
                      ) {
                        setValidation(
                          "Choose a .txt or .md file smaller than 1 MB.",
                        );
                        return;
                      }
                      readLock.current = true;
                      setReading(true);
                      setValidation("");
                      try {
                        const content = await file.text();
                        setDraft((current) => ({
                          ...current,
                          title: file.name,
                          content,
                        }));
                      } catch {
                        setValidation(
                          "Couldn’t read that file. Please try again.",
                        );
                      } finally {
                        readLock.current = false;
                        setReading(false);
                      }
                    }}
                  />
                </label>
              </div>
            )}
            <Input
              label="Title"
              value={draft.title}
              maxLength={120}
              onChange={(event) => setDraft({ ...draft, title: event })}
              placeholder="e.g. Customer support playbook"
              className="w-full"
            />
            {draft.kind === "link" && (
              <div>
                <Input
                  label="Source URL"
                  aria-describedby={urlHintId}
                  type="url"
                  value={draft.url ?? ""}
                  onChange={(value) => setDraft({ ...draft, url: value })}
                  placeholder="https://example.com/help"
                  className="w-full"
                />
                <p
                  id={urlHintId}
                  className="mt-2 text-xs text-muted-foreground"
                >
                  Links are saved as references. Page content is not fetched in
                  this preview.
                </p>
              </div>
            )}
            <label className="block text-sm font-medium">
              {draft.kind === "link"
                ? "Context for this link"
                : "Source content"}
              <textarea
                value={draft.content}
                onChange={(event) =>
                  setDraft({ ...draft, content: event.target.value })
                }
                rows={7}
                placeholder="Add the details your assistant should know…"
                className="mt-2 w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm font-normal leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>
        </fieldset>
        {(validation || error) && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {validation || error}
          </p>
        )}
        {confirmDelete && (
          <div className="mt-5 rounded-xl border border-border p-4">
            <p className="text-sm">
              Remove this source from the knowledge base?
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                disabled={locked}
                variant="ghost"
                className="text-xs rounded-full h-9"
                onClick={() => setConfirmDelete(false)}
              >
                Keep source
              </Button>
              <Button
                disabled={locked}
                variant="outline"
                className="text-xs rounded-full h-9"
                onClick={() => void onDelete()}
              >
                Remove source
              </Button>
            </div>
          </div>
        )}
        <footer className="mt-6 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          {existing ? (
            <Button
              disabled={locked}
              variant="ghost"
              className="text-xs focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} />
              Remove
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              Review your source before adding it.
            </span>
          )}
          <Button
            type="submit"
            disabled={locked}
            className="text-xs focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
          >
            {busy ? "Saving…" : existing ? "Save changes" : "Add source"}
          </Button>
        </footer>
      </form>
    </AnimatedModal>
  );
}
