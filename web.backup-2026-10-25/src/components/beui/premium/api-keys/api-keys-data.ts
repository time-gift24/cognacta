export type ApiKeyStatus = "active" | "expiring" | "revoked";

export type ApiKey = {
  id: string;
  name: string;
  /** Environment id, such as `live` or `test`. */
  environment: string;
  /** Public key prefix, such as `fn_live_`. */
  prefix: string;
  /** Last four characters of the secret, shown after the mask. */
  last4: string;
  /** Scope ids, such as `notes:read`. */
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  lastRotatedAt?: string | null;
  expiresAt: string | null;
  revokedAt?: string | null;
  /** Requests per day for the last seven days, oldest first. */
  requests: number[];
};

export type ApiKeyEnvironment = {
  id: string;
  label: string;
  /** Prefix used for keys created in this environment. */
  prefix: string;
};

export type ApiKeyScope = { id: string; label: string };

export type ApiKeyScopeGroup = {
  id: string;
  label: string;
  description?: string;
  /** Usually a read scope followed by a write scope. */
  scopes: ApiKeyScope[];
};

export type ApiKeyExpiryOption = {
  id: string;
  label: string;
  /** Days until expiry; `null` never expires. */
  days: number | null;
};

export type CreateApiKeyInput = {
  name: string;
  environment: string;
  scopes: string[];
  expiry: ApiKeyExpiryOption;
};

export type CreateApiKeyResult = { secret: string; key: ApiKey };

export type RotateApiKeyResult = { last4?: string } | undefined;

export const DEFAULT_LABELS = {
  title: "API keys",
  description:
    "Keys authenticate requests to the Fieldnote API. Scope them tightly and rotate them often.",
  create: "Create key",
  environments: "Key environment",
  tableCaption: "API keys",
  name: "Name",
  scopes: "Scopes",
  created: "Created",
  lastUsed: "Last used",
  requests: "Requests · 7d",
  status: "Status",
  actions: "Actions",
  active: "Active",
  expiring: "Expires soon",
  revoked: "Revoked",
  never: "Never",
  rotated: "Rotated",
  copy: "Copy key prefix",
  copied: "Copied",
  rotate: "Rotate",
  rotating: "Rotating",
  rotateDone: "Rotated",
  revoke: "Revoke",
  emptyTitle: "No keys in this environment",
  emptyDescription:
    "Create a key to start sending requests. You can scope it to just what it needs.",
  createTitle: "Create an API key",
  createDescription:
    "Pick a name you will recognise later and only the scopes it needs.",
  keyName: "Key name",
  keyNamePlaceholder: "Ingest worker",
  keyNameError: "Give the key a name.",
  scopesLegend: "Scopes",
  scopesError: "Select at least one scope.",
  expiry: "Expires",
  cancel: "Cancel",
  creating: "Creating",
  createDone: "Key created",
  revealTitle: "Save your secret key",
  revealDescription: "Store it in your secrets manager now.",
  revealWarning:
    "You won't see this secret again. If you lose it, rotate the key to get a new one.",
  copySecret: "Copy secret",
  secretCopied: "Secret copied",
  done: "I've saved it",
  revokeTitle: "Revoke this key?",
  revokeDescription:
    "Requests using this key will fail immediately. This can't be undone.",
  revokeConfirm: "Type the key name to confirm",
  revoking: "Revoking",
  revokeDone: "Revoked",
};

export type ApiKeysLabels = typeof DEFAULT_LABELS;

export const DEFAULT_ENVIRONMENTS: ApiKeyEnvironment[] = [
  { id: "live", label: "Live", prefix: "fn_live_" },
  { id: "test", label: "Test", prefix: "fn_test_" },
];

export const DEFAULT_SCOPE_GROUPS: ApiKeyScopeGroup[] = [
  {
    id: "notes",
    label: "Notes",
    description: "Field notes, photos, and transcripts",
    scopes: [
      { id: "notes:read", label: "Read" },
      { id: "notes:write", label: "Write" },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    description: "Sites, surveys, and collaborators",
    scopes: [
      { id: "projects:read", label: "Read" },
      { id: "projects:write", label: "Write" },
    ],
  },
  {
    id: "exports",
    label: "Exports",
    description: "CSV, GeoJSON, and PDF exports",
    scopes: [
      { id: "exports:read", label: "Read" },
      { id: "exports:write", label: "Write" },
    ],
  },
  {
    id: "webhooks",
    label: "Webhooks",
    description: "Endpoints and delivery logs",
    scopes: [
      { id: "webhooks:read", label: "Read" },
      { id: "webhooks:write", label: "Write" },
    ],
  },
];

export const DEFAULT_EXPIRY_OPTIONS: ApiKeyExpiryOption[] = [
  { id: "30d", label: "In 30 days", days: 30 },
  { id: "90d", label: "In 90 days", days: 90 },
  { id: "1y", label: "In 1 year", days: 365 },
  { id: "never", label: "Never", days: null },
];

/**
 * Reference clock for the sample data. Server and client render the same
 * relative times from it; pass `now={Date.now()}` for live data.
 */
export const SAMPLE_NOW = Date.parse("2026-10-09T12:00:00Z");

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const at = (offset: number) => new Date(SAMPLE_NOW + offset).toISOString();

export const DEFAULT_KEYS: ApiKey[] = [
  {
    id: "key_ingest",
    name: "Ingest worker",
    environment: "live",
    prefix: "fn_live_",
    last4: "3f9a",
    scopes: ["notes:read", "notes:write", "projects:read"],
    createdAt: at(-84 * DAY),
    lastUsedAt: at(-4 * 60_000),
    expiresAt: at(96 * DAY),
    requests: [4120, 4380, 3960, 4710, 5020, 4880, 5310],
  },
  {
    id: "key_sync",
    name: "Mobile sync",
    environment: "live",
    prefix: "fn_live_",
    last4: "b27c",
    scopes: ["notes:read", "projects:read"],
    createdAt: at(-201 * DAY),
    lastUsedAt: at(-2 * HOUR),
    lastRotatedAt: at(-31 * DAY),
    expiresAt: at(6 * DAY),
    requests: [1820, 1640, 1910, 1700, 1580, 1490, 1320],
  },
  {
    id: "key_exports",
    name: "Nightly exports",
    environment: "live",
    prefix: "fn_live_",
    last4: "08e1",
    scopes: ["exports:read", "exports:write"],
    createdAt: at(-46 * DAY),
    lastUsedAt: at(-11 * HOUR),
    expiresAt: null,
    requests: [140, 152, 138, 160, 149, 155, 162],
  },
  {
    id: "key_hooks",
    name: "Webhook relay",
    environment: "live",
    prefix: "fn_live_",
    last4: "d41e",
    scopes: ["webhooks:read", "webhooks:write"],
    createdAt: at(-120 * DAY),
    lastUsedAt: at(-3 * DAY),
    expiresAt: at(220 * DAY),
    requests: [620, 580, 640, 510, 300, 120, 40],
  },
  {
    id: "key_legacy",
    name: "Legacy importer",
    environment: "live",
    prefix: "fn_live_",
    last4: "7a5d",
    scopes: ["notes:write"],
    createdAt: at(-340 * DAY),
    lastUsedAt: at(-19 * DAY),
    expiresAt: null,
    revokedAt: at(-18 * DAY),
    requests: [0, 0, 0, 0, 0, 0, 0],
  },
];
