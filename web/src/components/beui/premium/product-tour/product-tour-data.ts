/** Each step id selects the stage the product window renders. */
export type ProductTourStepId = "collect" | "sort" | "review" | "ship";

export type ProductTourStep = {
  id: ProductTourStepId;
  label: string;
  title: string;
  description: string;
};

export const PRODUCT_TOUR_STEPS: readonly ProductTourStep[] = [
  {
    id: "collect",
    label: "Collect",
    title: "Every request lands in one inbox",
    description:
      "Feedback from support, sales, and your own team arrives in a single list, already tagged and attributed.",
  },
  {
    id: "sort",
    label: "Sort",
    title: "Plan the work in three lanes",
    description:
      "Move requests into Now, Next, and Later so everyone can see what is being built and what is waiting.",
  },
  {
    id: "review",
    label: "Review",
    title: "Approve with the context in view",
    description:
      "Open any item to see its checklist, reviewers, and remaining work before it moves forward.",
  },
  {
    id: "ship",
    label: "Ship",
    title: "Bundle finished work into a release",
    description:
      "Completed items roll into release notes your customers can read, while later work stays queued.",
  },
];

export type ProductTourItem = {
  id: string;
  title: string;
  tag: string;
  owner: string;
};

export const PRODUCT_TOUR_ITEMS: readonly ProductTourItem[] = [
  { id: "search", title: "Faster search", tag: "Core", owner: "AL" },
  { id: "export", title: "Export to CSV", tag: "Data", owner: "MK" },
  { id: "dark", title: "Dark mode for reports", tag: "Design", owner: "JR" },
  { id: "alerts", title: "Slack alerts", tag: "Integrations", owner: "SO" },
  { id: "bulk", title: "Bulk edit tasks", tag: "Core", owner: "TN" },
  { id: "usage", title: "Usage dashboard", tag: "Data", owner: "EV" },
];

export type ProductTourLane = {
  title: string;
  /** Item ids shown in this lane, in order. */
  ids: readonly string[];
};

export const PRODUCT_TOUR_LANES: readonly ProductTourLane[] = [
  { title: "Now", ids: ["search", "export"] },
  { title: "Next", ids: ["dark", "alerts"] },
  { title: "Later", ids: ["bulk", "usage"] },
];

export const PRODUCT_TOUR_FOCUS_ID = "search";

export const PRODUCT_TOUR_CHECKLIST: readonly string[] = [
  "Index rebuilt for large workspaces",
  "Results ranked by recent activity",
  "Keyboard shortcuts documented",
];

export const PRODUCT_TOUR_REVIEWERS: readonly string[] = ["AL", "MK", "JR"];

export const PRODUCT_TOUR_SHIPPED: readonly string[] = [
  "search",
  "export",
  "dark",
  "alerts",
];

export const DEFAULT_PRODUCT_TOUR_LABELS = {
  eyebrow: "Product tour",
  title: "From scattered requests to a shipped release.",
  description:
    "Follow one week of work through the board, from the first request to the notes your customers read.",
  stepsLabel: "Tour steps",
  stepCounter: "step",
  inbox: "Inbox",
  inboxNew: "new",
  inReview: "In review",
  queue: "Queue",
  approvals: "2 of 3 approvals",
  readyToShip: "Ready to ship",
  release: "Release",
  releaseName: "Version 2.4",
  releaseStatus: "Published",
  improvements: "improvements",
  releaseAudience: "sent to 1,284 readers",
  upNext: "Up next",
};

export type ProductTourLabels = typeof DEFAULT_PRODUCT_TOUR_LABELS;

/** Resolved data shared by the product window and its stages. */
export type ProductTourModel = {
  items: readonly ProductTourItem[];
  lanes: readonly { title: string; items: readonly ProductTourItem[] }[];
  focus: ProductTourItem | undefined;
  queue: readonly ProductTourItem[];
  shipped: readonly ProductTourItem[];
  later: readonly ProductTourItem[];
  checklist: readonly string[];
  reviewers: readonly string[];
  labels: ProductTourLabels;
};
