import { cn } from "@/lib/beui/utils";
import { cryptoUsd } from "./crypto-wallet-data";

/** Signed gain or loss, colored by direction, with an optional percent. */
export function CryptoChange({
  value,
  percent,
  className,
}: {
  value?: number;
  percent?: number | null;
  className?: string;
}) {
  const direction = value ?? percent ?? 0;
  const sign = direction >= 0 ? "+" : "−";
  return (
    <span
      className={cn(
        "tabular-nums",
        direction >= 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400",
        className,
      )}
    >
      {value !== undefined ? `${sign}${cryptoUsd(Math.abs(value))}` : null}
      {percent !== undefined && percent !== null
        ? value !== undefined
          ? ` (${Math.abs(percent).toFixed(2)}%)`
          : `${sign}${Math.abs(percent).toFixed(2)}%`
        : null}
    </span>
  );
}
