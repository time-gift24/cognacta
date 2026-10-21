export type RoadmapStatus = "shipped" | "progress" | "planned";

export type RoadmapItem = {
  id: string;
  title: string;
  summary: string;
  area: string;
  status: RoadmapStatus;
  /** Completion from 0 to 100, used for work in progress. */
  progress?: number;
  votes: number;
  included: readonly string[];
};

export type RoadmapPeriod = {
  id: string;
  label: string;
  period: string;
  items: readonly RoadmapItem[];
};

export const ROADMAP_STATUS_LABEL: Record<RoadmapStatus, string> = {
  shipped: "Shipped",
  progress: "In progress",
  planned: "Planned",
};

export const DEFAULT_ROADMAP_LABELS = {
  eyebrow: "Roadmap",
  title: "What we are building, and what comes next.",
  description:
    "Updated every two weeks. Vote for the work that matters to your team and open any item to see what is included.",
  filterAll: "All",
  filterAriaLabel: "Filter roadmap",
  closeDetails: "Close details",
  progress: "Progress",
  included: "What is included",
  voted: "Thanks — your vote is in.",
  notVoted: "Want this sooner?",
  vote: "Vote for",
  removeVote: "Remove vote for",
  votes: "votes",
};

export type RoadmapLabels = typeof DEFAULT_ROADMAP_LABELS;

export type RoadmapStatusLabels = Record<RoadmapStatus, string>;

export type RoadmapFilter = "all" | RoadmapStatus;

export const ROADMAP_PERIODS: readonly RoadmapPeriod[] = [
  {
    id: "q3",
    label: "Shipped",
    period: "Jul – Sep 2026",
    items: [
      {
        id: "shared-spaces",
        title: "Shared spaces",
        summary:
          "Group projects by team and invite partners into a single space.",
        area: "Collaboration",
        status: "shipped",
        votes: 412,
        included: [
          "Space-level members and roles",
          "Partner access without a paid seat",
          "Pinned projects for each space",
        ],
      },
      {
        id: "offline",
        title: "Offline editing",
        summary:
          "Keep writing on a flight and sync changes when you reconnect.",
        area: "Apps",
        status: "shipped",
        votes: 286,
        included: [
          "Local drafts on desktop and mobile",
          "Conflict review when edits overlap",
          "Sync status in the sidebar",
        ],
      },
    ],
  },
  {
    id: "q4",
    label: "Now",
    period: "Oct – Dec 2026",
    items: [
      {
        id: "calendar",
        title: "Two-way calendar sync",
        summary:
          "See due dates next to meetings and move them from either side.",
        area: "Integrations",
        status: "progress",
        progress: 68,
        votes: 538,
        included: [
          "Google and Outlook calendars",
          "Drag to reschedule from the calendar",
          "Per-project sync settings",
        ],
      },
      {
        id: "permissions",
        title: "Field-level permissions",
        summary: "Choose who can view or edit sensitive fields on any record.",
        area: "Security",
        status: "progress",
        progress: 34,
        votes: 197,
        included: [
          "Hidden and read-only fields",
          "Permission presets for common roles",
          "Audit entries for every change",
        ],
      },
    ],
  },
  {
    id: "q1",
    label: "Next",
    period: "Jan – Mar 2027",
    items: [
      {
        id: "api",
        title: "Public API v2",
        summary: "Faster endpoints, webhooks for every event, and typed SDKs.",
        area: "Developers",
        status: "planned",
        votes: 344,
        included: [
          "Webhooks with retries",
          "TypeScript and Python SDKs",
          "Usage dashboard for API keys",
        ],
      },
      {
        id: "widgets",
        title: "Home screen widgets",
        summary:
          "Check today’s work and add quick notes without opening the app.",
        area: "Apps",
        status: "planned",
        votes: 159,
        included: [
          "Today and inbox widgets",
          "Quick capture from the lock screen",
          "Light and dark styles",
        ],
      },
    ],
  },
  {
    id: "later",
    label: "Later",
    period: "Exploring",
    items: [
      {
        id: "custom-fields",
        title: "Formula fields",
        summary:
          "Calculate totals, dates, and scores from the fields you already track.",
        area: "Data",
        status: "planned",
        votes: 121,
        included: [
          "Arithmetic and date functions",
          "References across linked records",
          "Live previews while editing",
        ],
      },
    ],
  },
];
