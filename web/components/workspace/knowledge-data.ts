export type KnowledgeEntry = {
  id: string;
  title: string;
  content: string;
  url: string;
};

export const INITIAL_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "brand-voice",
    title: "Brand voice & writing guidelines",
    content:
      "Write like a helpful teammate. Be direct, use plain language, and lead with the outcome. Keep interface labels short and specific.",
    url: "",
  },
  {
    id: "project-brief",
    title: "Website launch brief",
    content:
      "Build a clear homepage that explains the product, shows how it works, and helps visitors take the next step. Prioritize mobile layouts and accessible controls.",
    url: "",
  },
  {
    id: "design-reference",
    title: "beUI component library",
    content:
      "A reference for reusable interface components and interaction patterns.",
    url: "https://beui.dev",
  },
];

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
