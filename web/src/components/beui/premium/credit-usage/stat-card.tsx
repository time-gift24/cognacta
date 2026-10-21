import type { ReactNode } from "react";
import { cn } from "@/lib/beui/utils";

/** A bordered headline number with a label and optional badge. */
export function StatCard({
  label,
  badge,
  children,
  className,
}: {
  label: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-1 rounded-3xl border border-border p-5",
        className,
      )}
    >
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="flex items-center justify-between gap-3">
        <span className="font-medium text-4xl tracking-tight">{children}</span>
        {badge}
      </dd>
    </div>
  );
}
