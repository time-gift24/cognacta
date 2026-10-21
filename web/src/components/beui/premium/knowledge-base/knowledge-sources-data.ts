export type KnowledgeSource = {
  id: string;
  title: string;
  kind: "document" | "link" | "note";
  content: string;
  url?: string;
  enabled: boolean;
};

export const INITIAL_KNOWLEDGE_SOURCES: readonly KnowledgeSource[] = [
  {
    id: "brand-guide",
    title: "Brand voice & writing guidelines",
    kind: "document",
    enabled: true,
    content:
      "Write like a helpful teammate. Lead with the answer, use plain language, and keep interface labels short. Avoid jargon and explain the next step clearly.\n\nOur voice is thoughtful, direct, and warm. Prefer specific examples over broad promises.",
  },
  {
    id: "product-context",
    title: "Product overview",
    kind: "note",
    enabled: true,
    content:
      "Forma helps small teams organize projects and shared knowledge. Our customers are designers, engineers, and independent studios.\n\nFocus on practical workflows, clear ownership, and making useful information easy to find.",
  },
  {
    id: "help-center",
    title: "Customer help center",
    kind: "link",
    enabled: true,
    url: "https://example.com/help",
    content:
      "Reference link for customer-facing help articles. Verify the relevant article before using it as an answer source.",
  },
  {
    id: "launch-brief",
    title: "Autumn launch brief",
    kind: "document",
    enabled: false,
    content:
      "Launch objective: introduce the new team workspace.\n\nAudience: existing customers and small creative teams.\n\nDeliverables: a product walkthrough, an announcement, and a concise getting-started guide.",
  },
  {
    id: "support-guidance",
    title: "Support response principles",
    kind: "note",
    enabled: true,
    content:
      "Acknowledge the question, give the shortest complete answer, and include a useful next step. Never invent product capabilities or promise a release date. If the answer is uncertain, say what needs to be checked.",
  },
];

export function validSourceUrl(value: string) {
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
