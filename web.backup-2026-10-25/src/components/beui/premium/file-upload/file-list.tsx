"use client";

import { AnimatePresence } from "motion/react";
import { FileRow } from "./file-row";
import type { FileRowHandlers } from "./file-row-actions";
import type { FileUploadLabels, UploadItem } from "./file-upload-data";
import { ROW_STAGGER } from "./file-upload-motion";

/** Upload rows. Rows cascade within their batch. */
export function FileList({
  items,
  labels,
  batchIndex,
  handlers,
  onPreview,
}: {
  items: UploadItem[];
  labels: FileUploadLabels;
  batchIndex: ReadonlyMap<string, number>;
  handlers: FileRowHandlers;
  onPreview: (item: UploadItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2 pb-1">
      <ul className="flex flex-col">
        <AnimatePresence>
          {items.map((item) => (
            <FileRow
              key={item.id}
              item={item}
              labels={labels}
              delay={(batchIndex.get(item.id) ?? 0) * ROW_STAGGER}
              handlers={handlers}
              onPreview={onPreview}
            />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
