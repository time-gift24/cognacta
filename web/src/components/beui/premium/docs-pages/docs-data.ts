import type { ReactNode } from "react";

export type DocsNavItem = { id: string; label: string };

export type DocsNavGroup = {
  title: string;
  items: readonly DocsNavItem[];
};

/** An outline entry. `id` matches the `id` passed to `DocSection`. */
export type DocsSection = { id: string; label: string };

/** A previous or next page link. `href` defaults to `#${id}`. */
export type DocsPagerLink = { id: string; title: string; href?: string };

export type DocsFeedbackValue = "yes" | "no";

export type DocsPayloadField = {
  name: string;
  type: string;
  description: ReactNode;
};

export type DocsArticleLabels = {
  browse: string;
  dashboard: string;
  outline: string;
  browseTitle: string;
  closeNav: string;
  navLabel: string;
  searchPlaceholder: string;
  searchLabel: string;
  noMatches: (query: string) => string;
  feedbackQuestion: string;
  feedbackYes: string;
  feedbackNo: string;
  feedbackThanksYes: string;
  feedbackThanksNo: string;
  updated: (date: string) => string;
  previous: string;
  next: string;
};

export const DOCS_LABELS: DocsArticleLabels = {
  browse: "Browse",
  dashboard: "Dashboard",
  outline: "On this page",
  browseTitle: "Browse docs",
  closeNav: "Close navigation",
  navLabel: "Documentation",
  searchPlaceholder: "Search docs",
  searchLabel: "Search documentation",
  noMatches: (query) => `No pages match “${query}”.`,
  feedbackQuestion: "Was this page helpful?",
  feedbackYes: "Yes",
  feedbackNo: "No",
  feedbackThanksYes: "Thanks — glad it helped.",
  feedbackThanksNo: "Thanks — we will use this to improve the page.",
  updated: (date) => `Updated ${date}`,
  previous: "Previous",
  next: "Next",
};

/** Heading ids are prefixed so they never collide with host page ids. */
export const docsSectionId = (id: string) => `docs-${id}`;

export const DOCS_NAV: readonly DocsNavGroup[] = [
  {
    title: "Getting started",
    items: [
      { id: "introduction", label: "Introduction" },
      { id: "installation", label: "Installation" },
      { id: "quickstart", label: "Quickstart" },
      { id: "authentication", label: "Authentication" },
    ],
  },
  {
    title: "Core concepts",
    items: [
      { id: "events", label: "Events" },
      { id: "webhooks", label: "Webhooks" },
      { id: "retries", label: "Retries and backoff" },
      { id: "idempotency", label: "Idempotency keys" },
    ],
  },
  {
    title: "Reference",
    items: [
      { id: "client", label: "Client" },
      { id: "event-object", label: "Event object" },
      { id: "errors", label: "Errors" },
      { id: "rate-limits", label: "Rate limits" },
    ],
  },
];

export const DOCS_ACTIVE_PAGE = "webhooks";

export const DOCS_PRODUCT = "Fieldnote Docs";
export const DOCS_VERSION = "v2.4";

export const DOCS_BREADCRUMB: readonly string[] = [
  "Docs",
  "Core concepts",
  "Webhooks",
];

export const DOCS_TITLE = "Receive events with webhooks";

export const DOCS_LEAD =
  "Fieldnote sends a signed HTTP request to your endpoint whenever something changes in a workspace, so your app can react without polling.";

export const DOCS_UPDATED = "October 2, 2026";

export const DOCS_PREVIOUS: DocsPagerLink = { id: "events", title: "Events" };
export const DOCS_NEXT: DocsPagerLink = {
  id: "retries",
  title: "Retries and backoff",
};

export const DOCS_SECTIONS: readonly DocsSection[] = [
  { id: "overview", label: "Overview" },
  { id: "install", label: "Install the SDK" },
  { id: "delivery", label: "How delivery works" },
  { id: "verify", label: "Verify signatures" },
  { id: "payload", label: "Event payload" },
  { id: "retries", label: "Retries" },
];

export const DOCS_INSTALL = {
  npm: "npm install @fieldnote/sdk",
  pnpm: "pnpm add @fieldnote/sdk",
  bun: "bun add @fieldnote/sdk",
} as const;

export type DocsPackageManager = keyof typeof DOCS_INSTALL;

export const DOCS_VERIFY_CODE = `import { Fieldnote } from "@fieldnote/sdk";

const fieldnote = new Fieldnote(process.env.FIELDNOTE_KEY);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("fieldnote-signature");

  // Throws when the signature or timestamp is invalid.
  const event = fieldnote.webhooks.verify(body, signature);

  if (event.type === "note.published") {
    await notifyTeam(event.data);
  }

  return new Response(null, { status: 200 });
}`;

export const DOCS_PAYLOAD_FIELDS: readonly DocsPayloadField[] = [
  {
    name: "id",
    type: "string",
    description: "Unique event ID. Use it to ignore duplicate deliveries.",
  },
  {
    name: "type",
    type: "string",
    description: "Event name, such as note.published or member.invited.",
  },
  {
    name: "created",
    type: "number",
    description: "Unix timestamp in seconds when the event happened.",
  },
  {
    name: "data",
    type: "object",
    description: "The resource that changed, in its state after the event.",
  },
  {
    name: "attempt",
    type: "number",
    description: "Delivery attempt, starting at 1 and increasing on retry.",
  },
];
