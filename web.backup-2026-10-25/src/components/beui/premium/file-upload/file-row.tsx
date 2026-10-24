"use client";

import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import { FileRowActions, type FileRowHandlers } from "./file-row-actions";
import { FileThumb } from "./file-thumb";
import {
  type FileUploadLabels,
  formatBytes,
  formatDuration,
  type UploadItem,
} from "./file-upload-data";
import { ROW_EXIT, ROW_INITIAL, rowTransition } from "./file-upload-motion";
import { UploadProgress } from "./upload-progress";
import { UploadStatusSlot } from "./upload-status";

function metaText(item: UploadItem, labels: FileUploadLabels) {
  const total = formatBytes(item.size);
  const loaded = formatBytes(Math.round(item.progress * item.size));
  switch (item.status) {
    case "uploading": {
      if (!item.speed) return `${loaded} ${labels.of} ${total}`;
      const eta = formatDuration(
        ((1 - item.progress) * item.size) / item.speed,
      );
      return `${loaded} ${labels.of} ${total} · ${formatBytes(Math.round(item.speed))}/s${eta ? ` · ${eta} ${labels.left}` : ""}`;
    }
    case "paused":
      return `${loaded} ${labels.of} ${total}`;
    default:
      return total;
  }
}

/**
 * One upload. Rows rise in (staggered only when mounted together), progress
 * springs forward, the status swaps in place, and removal exits in 150ms
 * while the layout spring closes the gap. Image rows open a preview.
 */
export function FileRow({
  item,
  labels,
  delay,
  handlers,
  onPreview,
}: {
  item: UploadItem;
  labels: FileUploadLabels;
  delay: number;
  handlers: FileRowHandlers;
  onPreview?: (item: UploadItem) => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const previewable = Boolean(item.previewUrl && onPreview);
  const failed = item.status === "failed";

  return (
    <motion.li
      layout={reduce ? false : "position"}
      initial={reduce ? false : ROW_INITIAL}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, transition: reduce ? { duration: 0 } : ROW_EXIT }}
      transition={rowTransition(delay, reduce)}
      className={cn(
        "relative flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        previewable && "hover:bg-foreground/[0.03]",
      )}
    >
      <FileThumb item={item} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          {previewable ? (
            <Button
              type="button"
              variant="plain"
              whileHover={undefined}
              whileTap={undefined}
              onClick={() => onPreview?.(item)}
              aria-label={`${labels.preview}: ${item.name}`}
              className="min-w-0 truncate text-left font-medium text-foreground text-sm after:absolute after:inset-0 after:rounded-2xl focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              {item.name}
            </Button>
          ) : (
            <p className="min-w-0 truncate font-medium text-foreground text-sm">
              {item.name}
            </p>
          )}
          <UploadStatusSlot item={item} labels={labels} />
        </div>

        <UploadProgress
          value={item.progress}
          status={item.status}
          label={item.name}
          className="mt-2"
        />

        <p
          className={cn(
            "mt-1.5 truncate font-mono text-xs tabular-nums",
            failed
              ? "text-rose-700 dark:text-rose-300"
              : "text-muted-foreground",
          )}
        >
          {failed
            ? `${formatBytes(item.size)} · ${item.error ?? labels.uploadFailed}`
            : metaText(item, labels)}
        </p>
      </div>

      <FileRowActions item={item} labels={labels} handlers={handlers} />
    </motion.li>
  );
}
