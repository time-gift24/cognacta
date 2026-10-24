import type { CryptoTransaction } from "./crypto-wallet-data";

export type CryptoActivityStatus = "all" | CryptoTransaction["status"];

export const CRYPTO_STATUS_LABELS: Record<CryptoTransaction["status"], string> =
  {
    confirmed: "Confirmed",
    pending: "Pending",
    failed: "Failed",
  };

/** Tinted pill classes for non-confirmed statuses. */
export const CRYPTO_STATUS_TONES: Record<CryptoTransaction["status"], string> =
  {
    confirmed:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    pending:
      "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    failed:
      "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  };

const timestamp = (value: string) =>
  Number.isNaN(Date.parse(value)) ? 0 : Date.parse(value);

export function cryptoTransactionTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      }).format(date);
}

export function cryptoTransactionDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
        timeZone: "UTC",
      }).format(date);
}

export function cryptoExplorerLink(value?: string) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** Groups newest first into Today, This week, then month names. */
export function groupCryptoTransactions(
  transactions: readonly CryptoTransaction[],
  referenceDate: string,
) {
  const reference = new Date(referenceDate);
  const dayStart = new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate(),
    ),
  );
  const weekStart = new Date(dayStart);
  weekStart.setUTCDate(
    weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7),
  );
  const groups = new Map<string, CryptoTransaction[]>();
  for (const transaction of [...transactions].sort(
    (a, b) => timestamp(b.date) - timestamp(a.date),
  )) {
    const date = new Date(transaction.date);
    const label = Number.isNaN(date.getTime())
      ? "Date unavailable"
      : date >= dayStart && date <= reference
        ? "Today"
        : date >= weekStart && date <= reference
          ? "This week"
          : new Intl.DateTimeFormat("en-US", {
              month: "long",
              ...(date.getUTCFullYear() !== reference.getUTCFullYear()
                ? { year: "numeric" as const }
                : {}),
              timeZone: "UTC",
            }).format(date);
    groups.set(label, [...(groups.get(label) ?? []), transaction]);
  }
  return [...groups];
}

export function cryptoTransactionTitle(transaction: CryptoTransaction) {
  if (transaction.kind === "swap")
    return transaction.toSymbol
      ? `Swapped ${transaction.symbol} for ${transaction.toSymbol}`
      : transaction.title;
  return transaction.kind === "receive"
    ? `Received ${transaction.symbol}`
    : `Sent ${transaction.symbol}`;
}
