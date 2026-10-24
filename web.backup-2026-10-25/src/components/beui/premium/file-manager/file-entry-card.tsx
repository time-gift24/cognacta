"use client";

import {
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/beui/motion/button";
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
  AnimatedDropdownTrigger,
} from "@/components/beui/premium/animated-dropdown";
import { cn } from "@/lib/beui/utils";
import { type FileManagerEntry, fileSize } from "./file-manager-data";

export function FileEntryIcon({
  entry,
  className,
}: {
  entry: FileManagerEntry;
  className?: string;
}) {
  const Icon =
    entry.kind === "folder"
      ? Folder
      : entry.mimeType?.startsWith("image/")
        ? FileImage
        : entry.name.endsWith(".csv")
          ? FileSpreadsheet
          : entry.content !== undefined
            ? FileText
            : File;
  return <Icon className={cn("size-5", className)} aria-hidden="true" />;
}
export function FileEntryCard({
  entry,
  list,
  childCount,
  onOpen,
  onStar,
  onRename,
  onDelete,
}: {
  entry: FileManagerEntry;
  list: boolean;
  childCount: number;
  onOpen: () => void;
  onStar: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const folder = entry.kind === "folder";
  return (
    <article
      className={cn(
        "relative min-w-0",
        list
          ? "flex items-center gap-3 border-b border-border/60 py-3"
          : "rounded-2xl border border-border/60 bg-background p-4",
      )}
    >
      <div
        className={cn(
          "relative min-w-0 text-left has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
          list
            ? "flex flex-1 items-center gap-3 rounded-full"
            : "block w-full rounded-xl",
        )}
      >
        {!list && !folder ? (
          <div className="mb-4 flex h-32 items-center justify-center overflow-hidden rounded-xl bg-muted/50">
            {entry.mimeType?.startsWith("image/") && entry.sourceUrl ? (
              // biome-ignore lint/performance/noImgElement: Preview uses local blob URLs or host-provided image URLs.
              <img
                src={entry.sourceUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : entry.content ? (
              <div
                aria-hidden="true"
                className="h-24 w-4/5 overflow-hidden rounded-lg bg-background p-3 text-xs leading-5 text-muted-foreground"
              >
                <span className="mb-2 block h-1 w-8 rounded-full bg-accent/40" />
                <p className="whitespace-pre-wrap">
                  {entry.content.slice(0, 220)}
                </p>
              </div>
            ) : (
              <span className="flex size-12 items-center justify-center rounded-full bg-background">
                <FileEntryIcon entry={entry} />
              </span>
            )}
          </div>
        ) : (
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full bg-muted",
              !list && "mb-4",
            )}
          >
            <FileEntryIcon entry={entry} />
          </span>
        )}
        <div className={cn("min-w-0", !list && "pr-8")}>
          <h3
            title={entry.name}
            className={cn(
              "truncate font-medium",
              folder && !list ? "text-xl font-medium" : "text-xl font-medium",
            )}
          >
            {entry.name}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {folder
              ? `${childCount} ${childCount === 1 ? "item" : "items"}`
              : fileSize(entry.size)}
          </p>
        </div>
        {/* The shared Button is always pill-shaped, so the preview keeps its
            own radius and this sits on top. */}
        <Button
          variant="plain"
          type="button"
          aria-label={`Open ${entry.name}`}
          onClick={onOpen}
          whileHover={undefined}
          whileTap={undefined}
          className="absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
      {entry.starred && (
        <Star
          className={cn(
            "size-3.5 shrink-0 fill-current text-muted-foreground",
            !list && "absolute right-5 top-5",
          )}
          aria-label="Starred"
        />
      )}
      <AnimatedDropdown>
        <AnimatedDropdownTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${entry.name}`}
            className={cn(
              "size-9 shrink-0 focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9",
              !list && "absolute bottom-3 right-2 rounded-full h-9",
            )}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </AnimatedDropdownTrigger>
        <AnimatedDropdownContent
          align="end"
          className="w-48 rounded-2xl shadow-none"
        >
          <AnimatedDropdownItem onSelect={onOpen}>
            Open {folder ? "folder" : "preview"}
          </AnimatedDropdownItem>
          <AnimatedDropdownItem onSelect={onStar}>
            <Star className="size-4" />
            {entry.starred ? "Unstar" : "Add to starred"}
          </AnimatedDropdownItem>
          <AnimatedDropdownItem onSelect={onRename}>
            <Pencil className="size-4" />
            Rename
          </AnimatedDropdownItem>
          <AnimatedDropdownItem onSelect={onDelete} destructive>
            <Trash2 className="size-4" />
            Delete
          </AnimatedDropdownItem>
        </AnimatedDropdownContent>
      </AnimatedDropdown>
    </article>
  );
}
