import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/beui/utils";

export function MatrixComparisonValue({
  value,
  emphasized = false,
}: {
  value: boolean | string | undefined;
  emphasized?: boolean;
}) {
  if (typeof value === "string")
    return <span className="text-sm text-foreground">{value}</span>;
  if (value === undefined)
    return <span className="text-xs text-muted-foreground">Not specified</span>;
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full text-foreground",
        emphasized && value ? "bg-accent/25" : "bg-muted",
      )}
    >
      {value ? (
        <Check className="size-3.5" aria-hidden="true" />
      ) : (
        <Minus className="size-3.5 text-muted-foreground" aria-hidden="true" />
      )}
      <span className="sr-only">{value ? "Included" : "Not included"}</span>
    </span>
  );
}
