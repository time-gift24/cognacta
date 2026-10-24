import type {
  ApiKey,
  ApiKeyEnvironment,
  ApiKeyStatus,
  CreateApiKeyInput,
  CreateApiKeyResult,
} from "./api-keys-data";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const EXPIRING_WINDOW = 14 * DAY;

export function getKeyStatus(key: ApiKey, now: number): ApiKeyStatus {
  if (key.revokedAt) return "revoked";
  if (key.expiresAt && Date.parse(key.expiresAt) - now <= EXPIRING_WINDOW)
    return "expiring";
  return "active";
}

export function maskKey(key: Pick<ApiKey, "prefix" | "last4">) {
  return `${key.prefix}••••${key.last4}`;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(iso: string) {
  return DATE_FORMAT.format(new Date(iso));
}

export function formatRelative(iso: string | null, now: number, never: string) {
  if (!iso) return never;
  const diff = Math.max(0, now - Date.parse(iso));
  if (diff < 60_000) return "Just now";
  if (diff < HOUR) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return formatDate(iso);
}

export function formatCount(value: number) {
  return value >= 10_000
    ? `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`
    : value.toLocaleString("en-US");
}

function randomHex(length: number) {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, length);
}

export function randomLast4() {
  return randomHex(4);
}

/** Simulated create handler used when `onCreate` is not provided. */
export async function sampleCreate(
  input: CreateApiKeyInput,
  environment: ApiKeyEnvironment,
  now: number,
): Promise<CreateApiKeyResult> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  const secret = `${environment.prefix}${randomHex(40)}`;
  return {
    secret,
    key: {
      id: `key_${randomHex(8)}`,
      name: input.name,
      environment: environment.id,
      prefix: environment.prefix,
      last4: secret.slice(-4),
      scopes: input.scopes,
      createdAt: new Date(now).toISOString(),
      lastUsedAt: null,
      expiresAt:
        input.expiry.days === null
          ? null
          : new Date(now + input.expiry.days * DAY).toISOString(),
      requests: [0, 0, 0, 0, 0, 0, 0],
    },
  };
}

export function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
