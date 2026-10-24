"use client";

import {
  ChevronRight,
  FolderPlus,
  Grid2X2,
  HardDrive,
  List,
  Search,
  Upload,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { Select } from "@/components/beui/premium/select/select";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { FileEntryCard } from "./file-entry-card";
import {
  FILE_MANAGER_ENTRIES,
  type FileManagerEntry,
  fileSize,
  uniqueFileName,
} from "./file-manager-data";
import {
  FileManagerDialog,
  type FileManagerDialogState,
} from "./file-manager-dialog";

export type FileManagerProps = {
  initialEntries?: readonly FileManagerEntry[];
  /** Notifies the host of local changes. Upload blob URLs are valid only for this mounted session. */
  onEntriesChange?: (entries: FileManagerEntry[]) => void;
  className?: string;
};
const SCOPES = [
  { id: "files", label: "All files" },
  { id: "starred", label: "Starred" },
  { id: "recent", label: "Recent" },
];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export function FileManager({
  initialEntries = FILE_MANAGER_ENTRIES,
  onEntriesChange,
  className,
}: FileManagerProps) {
  const [entries, setEntries] = useState<FileManagerEntry[]>(() => [
    ...initialEntries,
  ]);
  const entriesRef = useRef(entries);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [scope, setScope] = useState("files");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [view, setView] = useState("grid");
  const [dialog, setDialog] = useState<FileManagerDialogState | null>(null);
  const [removed, setRemoved] = useState<FileManagerEntry[]>([]);
  const [notice, setNotice] = useState(" ");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const urls = useRef(new Set<string>());
  const uploadLock = useRef(false);
  const mounted = useRef(true);
  const id = useId();
  const reduce = useReducedMotion();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      for (const url of urls.current) URL.revokeObjectURL(url);
      urls.current.clear();
    };
  }, []);
  function update(next: FileManagerEntry[]) {
    entriesRef.current = next;
    setEntries(next);
    onEntriesChange?.(next);
  }
  function openFolder(next: string | null) {
    setFolderId(next);
    setScope("files");
    setQuery("");
  }
  const breadcrumbs: FileManagerEntry[] = [];
  const visited = new Set<string>();
  let parent = folderId;
  while (parent && !visited.has(parent)) {
    visited.add(parent);
    const entry = entries.find((item) => item.id === parent);
    if (!entry) break;
    breadcrumbs.unshift(entry);
    parent = entry.parentId;
  }
  const visible = entries
    .filter(
      (entry) =>
        (scope === "starred"
          ? entry.starred
          : scope === "recent"
            ? entry.kind === "file"
            : entry.parentId === folderId) &&
        entry.name.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      return scope === "recent" || sort === "recent"
        ? b.modifiedAt.localeCompare(a.modifiedAt)
        : a.name.localeCompare(b.name);
    });
  const totalFiles = entries.filter((entry) => entry.kind === "file");
  function remove(entry: FileManagerEntry) {
    const ids = new Set([entry.id]);
    let added = true;
    while (added) {
      added = false;
      for (const item of entriesRef.current) {
        if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) {
          ids.add(item.id);
          added = true;
        }
      }
    }
    const deleted = entriesRef.current.filter((item) => ids.has(item.id));
    setRemoved(deleted);
    update(entriesRef.current.filter((item) => !ids.has(item.id)));
    setNotice(
      `${entry.name} deleted${deleted.length > 1 ? ` with ${deleted.length - 1} nested items` : " "}.`,
    );
  }
  function saveName(name: string) {
    const cleaned = name.trim();
    if (
      !cleaned ||
      cleaned.includes("/") ||
      cleaned.includes("\\") ||
      Array.from(cleaned).some((character) => character.charCodeAt(0) < 32)
    )
      return "Enter a name without slashes or control characters.";
    const target = dialog?.mode === "rename" ? dialog.entry : null;
    const parentId = target ? target.parentId : folderId;
    if (
      entriesRef.current.some(
        (entry) =>
          entry.parentId === parentId &&
          entry.id !== target?.id &&
          entry.name.toLowerCase() === cleaned.toLowerCase(),
      )
    )
      return "There’s already an item with that name here.";
    if (target)
      update(
        entriesRef.current.map((entry) =>
          entry.id === target.id
            ? { ...entry, name: cleaned, modifiedAt: new Date().toISOString() }
            : entry,
        ),
      );
    else {
      update([
        ...entriesRef.current,
        {
          id: crypto.randomUUID(),
          parentId,
          name: cleaned,
          kind: "folder",
          size: 0,
          modifiedAt: new Date().toISOString(),
        },
      ]);
      setScope("files");
      setQuery("");
    }
    setDialog(null);
    setNotice(target ? "Name updated." : "Folder created.");
    return null;
  }
  async function upload(files: FileList | File[]) {
    if (uploadLock.current) return;
    uploadLock.current = true;
    setUploading(true);
    setNotice(" ");
    const destination = folderId;
    let skipped = Math.max(0, files.length - 20);
    const additions: FileManagerEntry[] = [];
    for (const file of Array.from(files).slice(0, 20)) {
      if (file.size > MAX_FILE_SIZE) {
        skipped++;
        continue;
      }
      try {
        const text =
          (file.type.startsWith("text/") ||
            /\.(md|csv|json|txt)$/i.test(file.name)) &&
          file.size <= 1024 * 1024
            ? await file.text()
            : undefined;
        if (!mounted.current) return;
        const sourceUrl = URL.createObjectURL(file);
        urls.current.add(sourceUrl);
        additions.push({
          id: crypto.randomUUID(),
          parentId: destination,
          name: uniqueFileName(file.name, [
            ...entriesRef.current.filter(
              (entry) => entry.parentId === destination,
            ),
            ...additions,
          ]),
          kind: "file",
          size: file.size,
          mimeType: file.type,
          content: text,
          sourceUrl,
          modifiedAt: new Date().toISOString(),
        });
      } catch {
        skipped++;
      }
    }
    if (!mounted.current) return;
    if (additions.length) {
      const target =
        destination &&
        entriesRef.current.some(
          (entry) => entry.id === destination && entry.kind === "folder",
        )
          ? destination
          : null;
      const next = [...entriesRef.current];
      for (const entry of additions) {
        next.push({
          ...entry,
          parentId: target,
          name: uniqueFileName(
            entry.name,
            next.filter((item) => item.parentId === target),
          ),
        });
      }
      update(next);
      openFolder(target);
    }
    setNotice(
      `${additions.length} ${additions.length === 1 ? "file" : "files"} added locally.${skipped ? ` ${skipped} skipped; limit 20 files, 25 MB each.` : " "}`,
    );
    uploadLock.current = false;
    setUploading(false);
  }
  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-12 text-foreground sm:px-8 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm text-muted-foreground">
              Your workspace, organized
            </p>
            <h2 className="mt-3 tracking-tight text-xl font-medium">Files</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              A home for the work you want to keep close.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={uploading}
              onClick={() => setDialog({ mode: "new-folder" })}
              className="focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
            >
              <FolderPlus className="size-4" />
              New folder
            </Button>
            <Button
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
              className="focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
            >
              <Upload className="size-4" />
              {uploading ? "Adding files…" : "Upload files"}
            </Button>
          </div>
        </header>
        <input
          ref={fileInput}
          type="file"
          multiple
          aria-label="Upload files"
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void upload(event.target.files);
            event.target.value = " ";
          }}
        />
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <Tabs
            value={scope}
            onValueChange={(value) => {
              setScope(value);
              setQuery("");
            }}
            variant="underline"
          >
            <TabsList aria-label="File views" className="gap-4">
              {SCOPES.map((item, index) => (
                <TabsTrigger
                  key={item.id}
                  id={`${id}-${item.id}`}
                  value={item.id}
                  aria-controls={`${id}-content`}
                  tabIndex={scope === item.id ? 0 : -1}
                  className="h-9 min-h-9 rounded-full focus-visible:ring-2 focus-visible:ring-ring"
                  onKeyDown={(event) => {
                    let next = index;
                    if (event.key === "ArrowRight")
                      next = (index + 1) % SCOPES.length;
                    else if (event.key === "ArrowLeft")
                      next = (index - 1 + SCOPES.length) % SCOPES.length;
                    else if (event.key === "Home") next = 0;
                    else if (event.key === "End") next = SCOPES.length - 1;
                    else return;
                    event.preventDefault();
                    setScope(SCOPES[next].id);
                    setQuery("");
                    document
                      .getElementById(`${id}-${SCOPES[next].id}`)
                      ?.focus();
                  }}
                >
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <Input
              rightIcon={
                query && (
                  <Button
                    variant="plain"
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-3" />
                  </Button>
                )
              }
              leftIcon={<Search aria-hidden className="size-4" />}
              value={query}
              onChange={(event) => setQuery(event)}
              aria-label="Search files"
              placeholder="Search files…"
              className="w-48 sm:w-56"
              classNames={{ input: "pl-9 pr-8 text-sm" }}
            />
            <div className="flex rounded-full bg-muted/60 p-1">
              {[
                { id: "grid", icon: Grid2X2 },
                { id: "list", icon: List },
              ].map(({ id: mode, icon: Icon }) => (
                <Button
                  key={mode}
                  size="icon"
                  variant="ghost"
                  aria-label={`${mode} view`}
                  aria-pressed={view === mode}
                  onClick={() => setView(mode)}
                  className={cn(
                    "size-9 focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9",
                    view === mode &&
                      "bg-background text-foreground rounded-full h-9",
                  )}
                >
                  <Icon className="size-4" />
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label="Folder path"
            className="flex min-w-0 flex-wrap items-center gap-1 text-sm"
          >
            <Button
              variant="ghost"
              onClick={() => openFolder(null)}
              className="px-2 text-sm rounded-full h-9"
            >
              My files
            </Button>
            {scope === "files" &&
              breadcrumbs.map((entry) => (
                <span
                  key={entry.id}
                  className="flex min-w-0 items-center gap-1"
                >
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                  <Button
                    variant="ghost"
                    onClick={() => openFolder(entry.id)}
                    className="max-w-48 px-2 rounded-full h-9"
                  >
                    <span className="truncate">{entry.name}</span>
                  </Button>
                </span>
              ))}
          </nav>
          <Select
            label="Sort files"
            value={scope === "recent" ? "recent" : sort}
            disabled={scope === "recent"}
            onValueChange={setSort}
            options={[
              { id: "name", label: "Name: A to Z" },
              { id: "recent", label: "Last modified" },
            ]}
            align="end"
            portal
            buttonClassName="h-10 rounded-full bg-background focus-visible:ring-2 focus-visible:ring-ring"
            optionsClassName="w-48 shadow-none"
          />
        </div>
        <div
          role="tabpanel"
          id={`${id}-content`}
          aria-labelledby={`${id}-${scope}`}
          onDragEnter={(event) => {
            if (event.dataTransfer.types.includes("Files")) {
              event.preventDefault();
              depth.current++;
              setDragging(true);
            }
          }}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes("Files"))
              event.preventDefault();
          }}
          onDragLeave={() => {
            depth.current = Math.max(0, depth.current - 1);
            if (!depth.current) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            depth.current = 0;
            setDragging(false);
            void upload(event.dataTransfer.files);
          }}
          className={cn(
            "relative mt-4 min-h-80 rounded-2xl",
            dragging &&
              "ring-2 ring-accent ring-offset-4 ring-offset-background",
          )}
        >
          <div className="space-y-8">
            {[
              {
                label: "Folder",
                items: visible.filter((entry) => entry.kind === "folder"),
              },
              {
                label: "Files",
                items: visible.filter((entry) => entry.kind === "file"),
              },
            ]
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <section key={group.label} aria-label={group.label}>
                  <h3 className="mb-4 text-muted-foreground text-xl font-medium">
                    {group.label}
                  </h3>
                  <div
                    className={
                      view === "grid"
                        ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                        : "space-y-1"
                    }
                  >
                    {group.items.map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={reduce ? false : { opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: reduce ? 0 : 0.18,
                          ease: EASE_OUT,
                        }}
                      >
                        <FileEntryCard
                          entry={entry}
                          list={view === "list"}
                          childCount={
                            entries.filter((item) => item.parentId === entry.id)
                              .length
                          }
                          onOpen={() =>
                            entry.kind === "folder"
                              ? openFolder(entry.id)
                              : setDialog({ mode: "preview", entry })
                          }
                          onStar={() =>
                            update(
                              entriesRef.current.map((item) =>
                                item.id === entry.id
                                  ? { ...item, starred: !item.starred }
                                  : item,
                              ),
                            )
                          }
                          onRename={() => setDialog({ mode: "rename", entry })}
                          onDelete={() => remove(entry)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </section>
              ))}
          </div>
          {!visible.length && (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Search className="size-5" />
              </span>
              <h3 className="mt-4 text-xl font-medium">
                {query
                  ? "No matching files"
                  : scope === "starred"
                    ? "Keep your favorites close"
                    : "A fresh space for your files"}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {query
                  ? "Try a different name or clear your search."
                  : scope === "starred"
                    ? "Star a file or folder from its action menu."
                    : "Drop files here or use Upload files to get started."}
              </p>
            </div>
          )}
          {dragging && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-background/95">
              <Upload className="size-8 text-muted-foreground" />
              <p className="mt-4 text-xl font-medium">Drop files to add them</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Up to 20 files · 25 MB each
              </p>
            </div>
          )}
        </div>
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <HardDrive className="size-3.5" />
            {totalFiles.length} files ·{" "}
            {fileSize(totalFiles.reduce((sum, entry) => sum + entry.size, 0))}
          </span>
          <span>Files stay in this browser session.</span>
        </footer>
        <div className="mt-3 flex min-h-9 items-center gap-3">
          <output className="text-sm text-muted-foreground">{notice}</output>
          {removed.length > 0 && (
            <Button
              variant="ghost"
              className="text-sm rounded-full h-9"
              onClick={() => {
                const currentIds = new Set(
                  entriesRef.current.map((entry) => entry.id),
                );
                const restoredIds = new Set([
                  ...currentIds,
                  ...removed.map((entry) => entry.id),
                ]);
                const next = [...entriesRef.current];
                for (const entry of removed) {
                  if (currentIds.has(entry.id)) continue;
                  const parentId =
                    entry.parentId && restoredIds.has(entry.parentId)
                      ? entry.parentId
                      : null;
                  next.push({
                    ...entry,
                    parentId,
                    name: uniqueFileName(
                      entry.name,
                      next.filter((item) => item.parentId === parentId),
                    ),
                  });
                }
                update(next);
                setRemoved([]);
                setNotice("Deleted items restored.");
              }}
            >
              Undo delete
            </Button>
          )}
        </div>
        {dialog && (
          <FileManagerDialog
            key={
              dialog.mode === "new-folder"
                ? "new-folder"
                : `${dialog.mode}-${dialog.entry.id}`
            }
            dialog={dialog}
            onClose={() => setDialog(null)}
            onSave={saveName}
          />
        )}
      </div>
    </section>
  );
}
