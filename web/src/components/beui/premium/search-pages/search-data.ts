import {
  BookOpen,
  Compass,
  type LucideIcon,
  Megaphone,
  MessagesSquare,
} from "lucide-react";

export type SearchResultType = "docs" | "guides" | "changelog" | "community";

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  path: readonly string[];
  snippet: string;
  area: SearchArea;
  meta: string;
  /** Guide cover or community author photo. */
  image?: string;
  /** Destination for the preview's open link. Defaults to `#`. */
  href?: string;
};

/** Product area shown in the filter aside. Any string works with custom data. */
export type SearchArea = string;

/** Active type tab: every type, or one result type. */
export type SearchTypeFilter = "all" | SearchResultType;

export const SEARCH_AREAS: readonly SearchArea[] = [
  "Platform",
  "Integrations",
  "Security",
  "Billing",
];

export const SEARCH_TYPE_LABEL: Record<SearchResultType, string> = {
  docs: "Docs",
  guides: "Guides",
  changelog: "Changelog",
  community: "Community",
};

export const SEARCH_TYPE_ORDER: readonly SearchResultType[] = [
  "docs",
  "guides",
  "changelog",
  "community",
];

export const SEARCH_TYPE_ICON: Record<SearchResultType, LucideIcon> = {
  docs: BookOpen,
  guides: Compass,
  changelog: Megaphone,
  community: MessagesSquare,
};

export const DEFAULT_LABELS = {
  title: "Search",
  placeholder: "Search docs, guides, and discussions",
  inputLabel: "Search",
  clearSearch: "Clear search",
  resultSingular: "result",
  resultPlural: "results",
  resultsFor: "for",
  keyboardHint: "Use ↑ ↓ to move, Enter to open",
  typeTabs: "Result type",
  allTypes: "All",
  areaLegend: "Product area",
  clearFilters: "Clear filters",
  resultsRegion: "Results",
  viewGroup: "View",
  closePreview: "Close preview",
  openResult: (typeLabel: string) =>
    `Open ${typeLabel.toLowerCase().replace(/s$/, "")}`,
  emptyTitle: (query: string) => `No results for “${query}”`,
  emptyIdle: "Start typing to search",
  emptyHint: "Check the spelling, remove a filter, or try one of these.",
};

export type SearchLabels = typeof DEFAULT_LABELS;

const cover = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&fm=webp&q=80&w=240&h=240`;
const avatar = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&fm=webp&q=80&w=96&h=96`;

export const SEARCH_RESULTS: readonly SearchResult[] = [
  {
    id: "docs-webhooks",
    type: "docs",
    title: "Receive events with webhooks",
    path: ["Docs", "Core concepts"],
    snippet:
      "Fieldnote sends a signed HTTP request to your endpoint whenever something changes, so your app can react without polling.",
    area: "Platform",
    meta: "Updated Oct 2",
  },
  {
    id: "docs-verify",
    type: "docs",
    title: "Verify webhook signatures",
    path: ["Docs", "Security"],
    snippet:
      "Read the raw request body and pass it to the SDK with the signature header. Requests older than five minutes are rejected.",
    area: "Security",
    meta: "Updated Sep 28",
  },
  {
    id: "docs-retries",
    type: "docs",
    title: "Retries and backoff",
    path: ["Docs", "Core concepts"],
    snippet:
      "Failed webhook deliveries retry with exponential backoff for up to three days before the endpoint is paused.",
    area: "Platform",
    meta: "Updated Sep 20",
  },
  {
    id: "docs-events",
    type: "docs",
    title: "Event types reference",
    path: ["Docs", "Reference"],
    snippet:
      "Every event your workspace can emit, from note.published to member.invited, with example payloads.",
    area: "Platform",
    meta: "Updated Sep 14",
  },
  {
    id: "docs-billing-events",
    type: "docs",
    title: "Billing events",
    path: ["Docs", "Billing"],
    snippet:
      "Listen for invoice.paid and plan.changed events to keep seats and access in sync with your own records.",
    area: "Billing",
    meta: "Updated Aug 30",
  },
  {
    id: "guide-slack",
    type: "guides",
    title: "Send webhook alerts to Slack",
    path: ["Guides", "Integrations"],
    snippet:
      "Forward published notes to a Slack channel in about ten minutes, with a small function and one webhook endpoint.",
    area: "Integrations",
    meta: "8 min read",
    image: cover("1497366811353-6870744d04b2"),
  },
  {
    id: "guide-local",
    type: "guides",
    title: "Test webhooks on your laptop",
    path: ["Guides", "Development"],
    snippet:
      "Use the CLI to forward live events to localhost, replay deliveries, and inspect every request while you build.",
    area: "Platform",
    meta: "6 min read",
    image: cover("1518770660439-4636190af475"),
  },
  {
    id: "guide-sync",
    type: "guides",
    title: "Keep a CRM in sync",
    path: ["Guides", "Integrations"],
    snippet:
      "Map member events to contacts in your CRM, handle retries safely, and backfill history with the events API.",
    area: "Integrations",
    meta: "12 min read",
    image: cover("1521737711867-e3b97375f902"),
  },
  {
    id: "changelog-replay",
    type: "changelog",
    title: "Replay any webhook delivery",
    path: ["Changelog", "October 2026"],
    snippet:
      "Resend a past event to the same or a different endpoint from the delivery log, with the original signature refreshed.",
    area: "Platform",
    meta: "Oct 6",
  },
  {
    id: "changelog-ip",
    type: "changelog",
    title: "Static IPs for webhook delivery",
    path: ["Changelog", "September 2026"],
    snippet:
      "Allowlist a fixed set of addresses for outgoing webhooks on Scale plans, available in every region.",
    area: "Security",
    meta: "Sep 18",
  },
  {
    id: "community-queue",
    type: "community",
    title: "Queueing webhooks before processing them",
    path: ["Community", "Architecture"],
    snippet:
      "We acknowledge right away and push each event to a queue, which keeps us well inside the ten-second window.",
    area: "Platform",
    meta: "24 replies",
    image: avatar("1494790108377-be9c29b29330"),
  },
  {
    id: "community-dupes",
    type: "community",
    title: "Handling duplicate webhook events",
    path: ["Community", "Help"],
    snippet:
      "Store the event ID with a unique constraint and skip anything you have already seen. Retries become harmless.",
    area: "Platform",
    meta: "Solved · 11 replies",
    image: avatar("1500648767791-00dcc994a43e"),
  },
  {
    id: "community-billing",
    type: "community",
    title: "Pausing access when an invoice fails",
    path: ["Community", "Billing"],
    snippet:
      "Our approach to grace periods: wait for the third failed payment event before restricting the workspace.",
    area: "Billing",
    meta: "9 replies",
    image: avatar("1438761681033-6461ffad8d80"),
  },
];

export const SEARCH_SUGGESTIONS: readonly string[] = [
  "webhooks",
  "signatures",
  "billing",
  "slack",
];
