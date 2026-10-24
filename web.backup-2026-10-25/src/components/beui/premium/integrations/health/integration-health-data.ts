import {
  DEFAULT_INTEGRATIONS,
  type IntegrationItem,
} from "../integration-data";

export type IntegrationHealthStatus = "healthy" | "attention" | "failing";

export type IntegrationHealthFilter = "all" | "attention" | "failing";

export type IntegrationHealthScope = {
  id: string;
  label: string;
  description: string;
  granted: boolean;
  /** Set once a missing scope has been requested from the app's admin. */
  requested?: boolean;
};

export type IntegrationHealthRun = {
  id: string;
  status: "success" | "failure";
  /** Minutes since the run finished. */
  minutesAgo: number;
  records: number;
  note: string;
};

export type IntegrationHealthError = {
  /** Copyable reference for support threads and logs. */
  id: string;
  summary: string;
  detail: string;
};

export type IntegrationHealthConnection = {
  id: string;
  integration: IntegrationItem;
  account: string;
  status: IntegrationHealthStatus;
  /** Minutes since the last successful sync. */
  lastSyncMinutes: number;
  /** Records synced per interval, oldest first. */
  volume: number[];
  error?: IntegrationHealthError;
  scopes: IntegrationHealthScope[];
  runs: IntegrationHealthRun[];
};

export const DEFAULT_INTEGRATION_HEALTH_LABELS = {
  eyebrow: "Connections",
  title: "Integration health",
  description:
    "See what is syncing, what needs a nudge, and fix broken connections in place.",
  healthy: "Healthy",
  attention: "Needs attention",
  failing: "Failing",
  healthyHint: "Syncing on schedule",
  attentionHint: "Missing scopes or stale data",
  failingHint: "Sync has stopped",
  all: "All",
  searchPlaceholder: "Search apps or accounts",
  searchLabel: "Search connections",
  filterLabel: "Filter connections by status",
  lastSync: "Last sync",
  syncNow: "Sync now",
  syncing: "Syncing",
  fix: "Fix",
  openDetails: "Open details for",
  volume: "Sync volume",
  emptyTitle: "No connections match",
  emptyDescription: "Try another status or clear the search.",
  clearSearch: "Clear search",
  close: "Close",
  closeDialog: "Close connection details",
  scopesTitle: "Permission scopes",
  granted: "Granted",
  missing: "Missing",
  requestScope: "Request",
  requestingScope: "Requesting",
  requestedScope: "Requested",
  runsTitle: "Recent sync runs",
  records: "records",
  errorTitle: "Latest error",
  errorId: "Error ID",
  copy: "Copy",
  copyErrorId: "Copy error ID",
  copied: "Copied",
  reconnect: "Reconnect",
  reconnecting: "Reconnecting",
  reconnected: "Connected",
  retry: "Try again",
};

export type IntegrationHealthLabels = typeof DEFAULT_INTEGRATION_HEALTH_LABELS;

export function formatSyncAge(minutes: number) {
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1440)} d ago`;
}

function brand(id: string): IntegrationItem {
  const found = DEFAULT_INTEGRATIONS.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown integration: ${id}`);
  return found;
}

const BASE_SCOPES = {
  read: { id: "read", label: "Read records", description: "Pull new items" },
  write: {
    id: "write",
    label: "Write records",
    description: "Push status updates back",
  },
  webhooks: {
    id: "webhooks",
    label: "Receive events",
    description: "Get changes as they happen",
  },
  analytics: {
    id: "analytics",
    label: "Read analytics",
    description: "Usage and traffic summaries",
  },
} as const;

function scopes(
  granted: (keyof typeof BASE_SCOPES)[],
  missing: (keyof typeof BASE_SCOPES)[] = [],
): IntegrationHealthScope[] {
  return [
    ...granted.map((key) => ({ ...BASE_SCOPES[key], granted: true })),
    ...missing.map((key) => ({ ...BASE_SCOPES[key], granted: false })),
  ];
}

function runs(
  pattern: string,
  start: number,
  every: number,
  records: number,
): IntegrationHealthRun[] {
  return pattern.split("").map((mark, index) => ({
    id: `run-${start}-${index}`,
    status: mark === "x" ? "failure" : "success",
    minutesAgo: start + index * every,
    records: mark === "x" ? 0 : records - index * 37,
    note: mark === "x" ? "Stopped before the first page" : "Completed",
  }));
}

export const DEFAULT_INTEGRATION_HEALTH_CONNECTIONS: IntegrationHealthConnection[] =
  [
    {
      id: "github-halden",
      integration: brand("github"),
      account: "halden-studio",
      status: "healthy",
      lastSyncMinutes: 3,
      volume: [32, 41, 38, 52, 47, 61, 58, 66],
      scopes: scopes(["read", "write", "webhooks"]),
      runs: runs("oooo", 3, 15, 412),
    },
    {
      id: "postgres-replica",
      integration: brand("postgres"),
      account: "replica-eu-west",
      status: "failing",
      lastSyncMinutes: 186,
      volume: [74, 70, 72, 68, 41, 12, 0, 0],
      error: {
        id: "ERR-7F3K-2Q91",
        summary: "Replica host refused the connection",
        detail:
          "The sync worker reached the host, but the connection was closed during the handshake. The stored password may have rotated.",
      },
      scopes: scopes(["read"], ["write"]),
      runs: runs("xxxo", 6, 60, 980),
    },
    {
      id: "linear-product",
      integration: brand("linear"),
      account: "Halden · Product",
      status: "healthy",
      lastSyncMinutes: 12,
      volume: [18, 22, 19, 27, 24, 30, 29, 34],
      scopes: scopes(["read", "write"]),
      runs: runs("oooo", 12, 30, 196),
    },
    {
      id: "cloudflare-edge",
      integration: brand("cloudflare"),
      account: "edge-workers",
      status: "attention",
      lastSyncMinutes: 128,
      volume: [44, 46, 40, 38, 31, 33, 29, 27],
      scopes: scopes(["read", "webhooks"], ["analytics"]),
      runs: runs("oooo", 128, 60, 288),
    },
    {
      id: "slack-release",
      integration: brand("slack"),
      account: "#release-desk",
      status: "healthy",
      lastSyncMinutes: 1,
      volume: [12, 16, 14, 21, 26, 22, 31, 36],
      scopes: scopes(["read", "write", "webhooks"]),
      runs: runs("oooo", 1, 10, 164),
    },
    {
      id: "stripe-billing",
      integration: brand("stripe"),
      account: "Billing workspace",
      status: "failing",
      lastSyncMinutes: 52,
      volume: [58, 61, 64, 60, 63, 22, 4, 0],
      error: {
        id: "ERR-2M8C-6D04",
        summary: "Event signatures no longer match",
        detail:
          "Incoming events failed verification after the signing secret changed. Reconnect to store the new secret.",
      },
      scopes: scopes(["read", "webhooks"]),
      runs: runs("xxoo", 4, 24, 530),
    },
    {
      id: "figma-system",
      integration: brand("figma"),
      account: "Design system",
      status: "attention",
      lastSyncMinutes: 2880,
      volume: [26, 24, 25, 19, 14, 9, 6, 5],
      scopes: scopes(["read"], ["webhooks"]),
      runs: runs("ooo", 2880, 1440, 140),
    },
  ];
