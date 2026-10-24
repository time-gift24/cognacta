export type KnowledgeEntry = {
  id: string;
  title: string;
  content: string;
  url: string;
};

export function isKnowledgeEntry(value: unknown): value is KnowledgeEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    ["id", "title", "content", "url"].every(
      (key) => typeof entry[key] === "string",
    ) && isReferenceUrl(entry.url as string)
  );
}

export function isReferenceUrl(value: string) {
  if (!value) return true;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
