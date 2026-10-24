"use client";

import { Download, X } from "lucide-react";
import { useState } from "react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { FileEntryIcon } from "./file-entry-card";
import { type FileManagerEntry, fileSize } from "./file-manager-data";

export type FileManagerDialogState =
  | { mode: "new-folder" }
  | { mode: "rename" | "preview"; entry: FileManagerEntry };
export function FileManagerDialog({
  dialog,
  onClose,
  onSave,
}: {
  dialog: FileManagerDialogState;
  onClose: () => void;
  onSave: (name: string) => string | null;
}) {
  const [name, setName] = useState(
    dialog.mode === "rename" ? dialog.entry.name : "",
  );
  const [error, setError] = useState("");
  const entry = dialog.mode !== "new-folder" ? dialog.entry : null;
  const preview = dialog.mode === "preview";
  function download() {
    if (!entry) return;
    const created = entry.content !== undefined && !entry.sourceUrl;
    const url =
      entry.sourceUrl ??
      (created
        ? URL.createObjectURL(
            new Blob([entry.content ?? ""], {
              type: entry.mimeType ?? "text/plain",
            }),
          )
        : null);
    if (!url) return;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = entry.name;
    anchor.rel = "noopener noreferrer";
    anchor.target = "_blank";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    if (created) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <AnimatedModal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      panelClassName={
        preview
          ? "max-w-2xl rounded-3xl p-5 sm:p-7"
          : "max-w-sm rounded-2xl p-5"
      }
      backdropClassName="backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <AnimatedModalTitle className="break-words text-xl font-medium">
            {preview
              ? entry?.name
              : dialog.mode === "rename"
                ? "Rename item"
                : "New folder"}
          </AnimatedModalTitle>
          <AnimatedModalDescription className="mt-2 text-sm text-muted-foreground">
            {preview && entry
              ? `${fileSize(entry.size)} · File preview`
              : "Give it a name that’s easy to find."}
          </AnimatedModalDescription>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Close dialog"
          className="size-9 shrink-0 focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
        >
          <X className="size-4" />
        </Button>
      </div>
      {preview && entry ? (
        <>
          <div className="mt-6 max-h-96 overflow-auto rounded-2xl bg-background p-4">
            {entry.mimeType?.startsWith("image/") && entry.sourceUrl ? (
              // biome-ignore lint/performance/noImgElement: Local uploaded images are previewed from their blob URLs.
              <img
                src={entry.sourceUrl}
                alt={entry.name}
                className="mx-auto max-h-80 object-contain"
              />
            ) : entry.content !== undefined ? (
              <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6">
                {entry.content}
              </pre>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <FileEntryIcon entry={entry} />
                </span>
                <p className="text-sm text-muted-foreground">
                  Preview isn’t available for this file type.
                </p>
              </div>
            )}
          </div>
          <div className="mt-5 flex justify-end">
            <Button
              onClick={download}
              disabled={!entry.sourceUrl && entry.content === undefined}
              className="focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
            >
              <Download className="size-4" />
              Download file
            </Button>
          </div>
        </>
      ) : (
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            const result = onSave(name);
            if (result) setError(result);
          }}
        >
          <label className="text-sm font-medium" htmlFor="file-entry-name">
            Name
          </label>
          <Input
            id="file-entry-name"
            value={name}
            onChange={(event) => setName(event)}
            maxLength={120}
            className="mt-2 w-full"
            classNames={{ input: "px-4 text-sm" }}
          />
          <p role="alert" className="mt-2 text-xs text-destructive">
            {error}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              type="button"
              className="rounded-full h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
            >
              {dialog.mode === "rename" ? "Save name" : "Create folder"}
            </Button>
          </div>
        </form>
      )}
    </AnimatedModal>
  );
}
