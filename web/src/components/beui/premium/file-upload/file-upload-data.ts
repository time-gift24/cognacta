export type UploadStatus =
  | "queued"
  | "uploading"
  | "paused"
  | "failed"
  | "done";

export type UploadContext = {
  /** Report progress as a fraction from 0 to 1. */
  onProgress: (fraction: number) => void;
  /** Aborted when the row is paused, cancelled, or removed. */
  signal: AbortSignal;
  /**
   * Fraction already uploaded before a pause. Resumable uploaders can continue
   * from here; others may ignore it and the row restarts from zero.
   */
  resumeFrom: number;
};

/** Uploads one file. Resolve when stored, reject (or throw) to fail the row. */
export type UploadFn = (file: File, context: UploadContext) => Promise<unknown>;

export type UploadItem = {
  id: string;
  name: string;
  size: number;
  type: string;
  status: UploadStatus;
  /** 0–1 */
  progress: number;
  /** Bytes per second, smoothed. */
  speed: number;
  error?: string;
  /** Object URL or remote URL used for image thumbnails and the preview. */
  previewUrl?: string;
  file?: File;
};

/** Rows to show before anything is dropped, e.g. files already attached. */
export type FileUploadInitialFile = Pick<UploadItem, "id" | "name" | "size"> &
  Partial<
    Pick<UploadItem, "type" | "status" | "progress" | "error" | "previewUrl">
  > & { file?: File };

export type FileUploadLabels = {
  title: string;
  description: string;
  idle: string;
  hint: (maxSize: string) => string;
  dragOver: string;
  browse: string;
  pasteHint: string;
  dropzoneLabel: string;
  queued: string;
  paused: string;
  failed: string;
  done: string;
  pause: string;
  resume: string;
  cancel: string;
  retry: string;
  remove: string;
  preview: string;
  of: string;
  left: string;
  closePreview: string;
  tooLarge: (max: string) => string;
  wrongType: string;
  tooMany: (max: number) => string;
  uploadFailed: string;
  announceAdded: (count: number) => string;
  announceDone: (name: string) => string;
  announceFailed: (name: string, reason: string) => string;
  announceRejected: (name: string, reason: string) => string;
};

export const DEFAULT_LABELS: FileUploadLabels = {
  title: "Add files to this project",
  description:
    "Drop in briefs, photos, and exports. Uploads keep running while you work.",
  idle: "Drag files here",
  hint: (maxSize) => `Images, PDFs, docs, CSV, or ZIP up to ${maxSize}`,
  dragOver: "Drop to upload",
  browse: "Browse files",
  pasteHint: "or paste an image",
  dropzoneLabel: "Upload files. Press Enter to choose files.",
  queued: "Waiting",
  paused: "Paused",
  failed: "Failed",
  done: "Uploaded",
  pause: "Pause upload",
  resume: "Resume upload",
  cancel: "Cancel upload",
  retry: "Retry upload",
  remove: "Remove file",
  preview: "Preview",
  of: "of",
  left: "left",
  closePreview: "Close preview",
  tooLarge: (max) => `Larger than ${max}`,
  wrongType: "This file type is not supported",
  tooMany: (max) => `Only ${max} files per upload`,
  uploadFailed: "Connection dropped",
  announceAdded: (count) => `${count} ${count === 1 ? "file" : "files"} added`,
  announceDone: (name) => `${name} uploaded`,
  announceFailed: (name, reason) => `${name} failed: ${reason}`,
  announceRejected: (name, reason) => `${name} skipped: ${reason}`,
};

/** Common `accept` strings. Combine them with commas. */
export const ACCEPT_PRESETS = {
  images: "image/*",
  documents: ".pdf,.doc,.docx,.txt,.md",
  spreadsheets: ".csv,.xls,.xlsx",
  archives: ".zip",
  media: "video/*,audio/*",
} as const;

export const DEFAULT_ACCEPT = [
  ACCEPT_PRESETS.images,
  ACCEPT_PRESETS.documents,
  ACCEPT_PRESETS.spreadsheets,
  ACCEPT_PRESETS.archives,
].join(",");

export const DEFAULT_MAX_SIZE = 25 * 1024 * 1024;
export const DEFAULT_MAX_FILES = 8;

const PHOTO =
  "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&fm=webp&q=84&w=1200";

/** Sample rows for previews. Paused rows resume with the simulated uploader. */
export const SAMPLE_FILES: FileUploadInitialFile[] = [
  {
    id: "sample-living-room",
    name: "living-room-final.webp",
    size: 2_480_000,
    type: "image/webp",
    status: "done",
    progress: 1,
    previewUrl: PHOTO,
  },
  {
    id: "sample-brief",
    name: "spring-campaign-brief.pdf",
    size: 6_350_000,
    type: "application/pdf",
    status: "paused",
    progress: 0.42,
  },
  {
    id: "sample-forecast",
    name: "q3-forecast.csv",
    size: 840_000,
    type: "text/csv",
    status: "failed",
    progress: 0.63,
    error: "Connection dropped",
  },
];

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}

export function isImage(item: Pick<UploadItem, "type" | "name">) {
  return (
    item.type.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(item.name)
  );
}
