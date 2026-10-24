"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/beui/utils";
import { Dropzone } from "./dropzone";
import { FileList } from "./file-list";
import {
  DEFAULT_ACCEPT,
  DEFAULT_LABELS,
  DEFAULT_MAX_FILES,
  DEFAULT_MAX_SIZE,
  type FileUploadInitialFile,
  type FileUploadLabels,
  formatBytes,
  type UploadFn,
  type UploadItem,
} from "./file-upload-data";
import { SECTION_RISE, SECTION_STAGGER } from "./file-upload-motion";
import {
  type FileRejection,
  parseAccept,
  partitionFiles,
} from "./file-validation";
import { ImagePreviewDialog } from "./image-preview-dialog";
import { RejectionNotice } from "./rejection-notice";
import { createSimulatedUpload } from "./simulated-upload";
import { useDropzone } from "./use-dropzone";
import { usePasteFiles } from "./use-paste-files";
import { type UploadQueueEvent, useUploadQueue } from "./use-upload-queue";

/* ─────────────────────────────────────────────────────────
 * FILE UPLOAD
 *
 *  load      header, dropzone, and list blur-rise 70ms apart;
 *            prefilled rows cascade 45ms apart
 *  idle      the document stack floats gently while visible
 *  drag      zone scales 1.5% and darkens; the stack fans out and
 *            "Drop to upload" swaps in. Wrong type → amber + reason
 *  add       each dropped batch cascades in on its own; progress
 *            springs forward, the percentage rolls
 *  settle    done draws an emerald check, failed swaps to a rose
 *            pill; removal exits in 150ms and the rows glide up
 *  footer    counts roll, total size swaps, overall bar springs
 *  reduced   no transforms, blur, or float; opacity-only swaps
 * ───────────────────────────────────────────────────────── */

export type FileUploadProps = {
  /** Same format as the native `accept` attribute. Empty accepts anything. */
  accept?: string;
  /** Maximum size per file, in bytes. */
  maxSize?: number;
  /** Maximum number of rows in the list. */
  maxFiles?: number;
  /** Uploads one file. Defaults to a deterministic simulated uploader. */
  upload?: UploadFn;
  /** Parallel uploads. */
  concurrency?: number;
  /** Called when a batch settles, with every uploaded row. */
  onComplete?: (items: UploadItem[]) => void;
  /** Called when a row is cancelled, removed, or cleared. */
  onRemove?: (id: string) => void;
  labels?: Partial<FileUploadLabels>;
  /** Rows to show on mount, such as files already attached. */
  initialFiles?: FileUploadInitialFile[];
  disabled?: boolean;
  className?: string;
};

export function FileUpload({
  accept = DEFAULT_ACCEPT,
  maxSize = DEFAULT_MAX_SIZE,
  maxFiles = DEFAULT_MAX_FILES,
  upload,
  concurrency = 3,
  onComplete,
  onRemove,
  labels: labelOverrides,
  initialFiles = [],
  disabled = false,
  className,
}: FileUploadProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const reduce = useReducedMotion();
  const titleId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const [simulated] = useState(() =>
    createSimulatedUpload({ failMessage: labels.uploadFailed }),
  );
  const [announcement, setAnnouncement] = useState("");
  const [rejections, setRejections] = useState<
    { id: string; name: string; reason: string }[]
  >([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  // Index of each row within the batch it arrived in, for the cascade.
  const batchIndex = useRef(
    new Map(initialFiles.map((file, index) => [file.id, index])),
  );

  const announceRef = useRef(labels);
  announceRef.current = labels;
  const onEvent = useCallback((event: UploadQueueEvent) => {
    const copy = announceRef.current;
    setAnnouncement(
      event.kind === "done"
        ? copy.announceDone(event.item.name)
        : copy.announceFailed(event.item.name, event.reason),
    );
  }, []);

  const queue = useUploadQueue({
    initialFiles,
    upload: upload ?? simulated,
    concurrency,
    fallbackError: labels.uploadFailed,
    onEvent,
    onComplete,
    onRemove,
  });
  const acceptTokens = useMemo(() => parseAccept(accept), [accept]);
  const remaining = Math.max(0, maxFiles - queue.items.length);
  const maxSizeLabel = formatBytes(maxSize);

  const reasonText = (reason: FileRejection) =>
    reason === "type"
      ? labels.wrongType
      : reason === "size"
        ? labels.tooLarge(maxSizeLabel)
        : labels.tooMany(maxFiles);

  const { addFiles } = queue;
  const handleFiles = (files: File[]) => {
    const { accepted, rejected } = partitionFiles(files, {
      accept: acceptTokens,
      maxSize,
      remaining,
    });
    const added = addFiles(accepted);
    for (const [index, item] of added.entries())
      batchIndex.current.set(item.id, index);
    const skipped = rejected.map(({ file, reason }, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      reason: reasonText(reason),
    }));
    setRejections(skipped);
    const messages = [
      added.length ? labels.announceAdded(added.length) : "",
      ...skipped.map((entry) =>
        labels.announceRejected(entry.name, entry.reason),
      ),
    ].filter(Boolean);
    if (messages.length) setAnnouncement(messages.join(". "));
  };

  useEffect(() => {
    if (rejections.length === 0) return;
    const timer = window.setTimeout(() => setRejections([]), 6000);
    return () => window.clearTimeout(timer);
  }, [rejections]);

  const dropzone = useDropzone({
    accept: acceptTokens,
    remaining,
    disabled,
    onFiles: handleFiles,
  });
  usePasteFiles(rootRef, handleFiles, !disabled);

  const handlers = {
    onPause: queue.pause,
    onResume: queue.resume,
    onRetry: queue.retry,
    onRemove: queue.remove,
  };
  const previewItem =
    queue.items.find((item) => item.id === previewId && item.previewUrl) ??
    null;
  const invalidMessage =
    dropzone.state.kind === "invalid" ? reasonText(dropzone.state.reason) : "";

  return (
    <motion.section
      ref={rootRef}
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={SECTION_STAGGER}
      aria-labelledby={titleId}
      className={cn(
        "w-full bg-background px-4 py-12 font-sans text-foreground sm:px-8 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-2xl">
        <motion.header variants={SECTION_RISE}>
          <h2 id={titleId} className="font-medium text-4xl tracking-tight">
            {labels.title}
          </h2>
          <p className="mt-2 text-muted-foreground text-sm sm:text-base">
            {labels.description}
          </p>
        </motion.header>

        <motion.div
          variants={SECTION_RISE}
          className="mt-8 rounded-3xl border border-border bg-background p-2 sm:p-3"
        >
          <Dropzone
            state={dropzone.state}
            labels={labels}
            hint={labels.hint(maxSizeLabel)}
            invalidMessage={invalidMessage}
            accept={accept}
            multiple={maxFiles > 1}
            disabled={disabled}
            inputRef={dropzone.inputRef}
            rootProps={dropzone.rootProps}
            inputProps={dropzone.inputProps}
            onOpen={dropzone.open}
          />

          <RejectionNotice entries={rejections} />

          <FileList
            items={queue.items}
            labels={labels}
            batchIndex={batchIndex.current}
            handlers={handlers}
            onPreview={(row) => setPreviewId(row.id)}
          />
        </motion.div>
      </div>

      <output aria-live="polite" className="sr-only">
        {announcement}
      </output>

      <ImagePreviewDialog
        item={previewItem}
        labels={labels}
        onClose={() => setPreviewId(null)}
      />
    </motion.section>
  );
}
