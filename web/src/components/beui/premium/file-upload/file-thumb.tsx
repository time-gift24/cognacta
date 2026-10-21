"use client";

import {
  File,
  FileArchive,
  FileImage,
  FileMusic,
  FileSpreadsheet,
  FileText,
  FileVideoCamera,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/beui/utils";
import { isImage, type UploadItem } from "./file-upload-data";

export function iconFor(item: Pick<UploadItem, "name" | "type">): LucideIcon {
  const name = item.name.toLowerCase();
  if (isImage(item)) return FileImage;
  if (item.type.startsWith("video/")) return FileVideoCamera;
  if (item.type.startsWith("audio/")) return FileMusic;
  if (/\.(csv|xlsx?|numbers)$/.test(name)) return FileSpreadsheet;
  if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return FileArchive;
  if (/\.(pdf|docx?|txt|md|rtf)$/.test(name) || item.type.startsWith("text/"))
    return FileText;
  return File;
}

/** Image thumbnail when a preview URL exists, otherwise a type icon badge. */
export function FileThumb({
  item,
  className,
}: {
  item: UploadItem;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (item.previewUrl && !broken) {
    return (
      // biome-ignore lint/performance/noImgElement: object URLs and remote previews cannot go through next/image.
      <img
        src={item.previewUrl}
        alt=""
        onError={() => setBroken(true)}
        className={cn(
          "size-10 shrink-0 rounded-xl border border-border object-cover",
          className,
        )}
      />
    );
  }
  const Icon = iconFor(item);
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}
