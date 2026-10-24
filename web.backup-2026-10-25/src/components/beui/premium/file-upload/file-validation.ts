/* Pure validation helpers shared by drag, drop, paste, and browse. */

/** Extension to MIME map so extension-only accept lists work during drag. */
const EXTENSION_TYPES: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ".txt": ["text/plain"],
  ".md": ["text/markdown", "text/x-markdown"],
  ".csv": ["text/csv", "application/vnd.ms-excel"],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  ".zip": ["application/zip", "application/x-zip-compressed"],
  ".json": ["application/json"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"],
  ".gif": ["image/gif"],
  ".svg": ["image/svg+xml"],
};

export type FileRejection = "type" | "size" | "count";

export function parseAccept(accept: string | undefined) {
  return (accept ?? "")
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

/** Matches a MIME type (and optionally a file name) against an accept list. */
export function matchesAccept(
  tokens: string[],
  type: string,
  name?: string,
): boolean {
  if (tokens.length === 0) return true;
  const mime = type.toLowerCase();
  const lowerName = name?.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith(".")) {
      if (lowerName) return lowerName.endsWith(token);
      return EXTENSION_TYPES[token]?.includes(mime) ?? false;
    }
    if (token.endsWith("/*")) return mime.startsWith(token.slice(0, -1));
    return mime === token;
  });
}

export function validateFile(
  file: Pick<File, "name" | "size" | "type">,
  options: { accept: string[]; maxSize: number },
): FileRejection | null {
  if (!matchesAccept(options.accept, file.type, file.name)) return "type";
  if (file.size > options.maxSize) return "size";
  return null;
}

/**
 * Checks dragged items before drop. Browsers only expose MIME types while
 * dragging, so unknown types are allowed and re-checked on drop.
 */
export function validateDragItems(
  items: { kind: string; type: string }[],
  options: { accept: string[]; remaining: number },
): FileRejection | null {
  const files = items.filter((item) => item.kind === "file");
  if (files.length === 0) return null;
  if (files.length > options.remaining) return "count";
  const known = files.filter((item) => item.type);
  if (
    known.length > 0 &&
    known.every((item) => !matchesAccept(options.accept, item.type))
  )
    return "type";
  return null;
}

/** Splits files into accepted and rejected, respecting the remaining slots. */
export function partitionFiles(
  files: File[],
  options: { accept: string[]; maxSize: number; remaining: number },
) {
  const accepted: File[] = [];
  const rejected: { file: File; reason: FileRejection }[] = [];
  for (const file of files) {
    const reason =
      validateFile(file, options) ??
      (accepted.length >= options.remaining ? "count" : null);
    if (reason) rejected.push({ file, reason });
    else accepted.push(file);
  }
  return { accepted, rejected };
}
