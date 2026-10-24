import { cn } from "@/lib/beui/utils";
import type { CreditCategory } from "./credit-usage-data";

/** Tinted label for a category in tables and lists. */
export function CategoryPill({
  category,
  fallback,
  className,
}: {
  category?: CreditCategory;
  fallback?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 font-medium text-xs",
        category?.badge ?? "border-border",
        className,
      )}
    >
      {category?.label ?? fallback}
    </span>
  );
}
