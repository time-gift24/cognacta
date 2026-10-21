import { cn } from "@/lib/beui/utils";

/** Compact scope list: the first few scopes, then a `+N` overflow pill. */
export function ScopePills({
  scopes,
  max = 2,
  className,
}: {
  scopes: readonly string[];
  max?: number;
  className?: string;
}) {
  const shown = scopes.slice(0, max);
  const rest = scopes.length - shown.length;

  return (
    <ul
      className={cn("flex flex-wrap items-center gap-1", className)}
      aria-label={`Scopes: ${scopes.join(", ")}`}
    >
      {shown.map((scope) => (
        <li
          key={scope}
          className="inline-flex h-6 items-center rounded-full border border-border px-2 font-mono text-muted-foreground text-xs"
        >
          {scope}
        </li>
      ))}
      {rest > 0 ? (
        <li
          aria-hidden
          title={scopes.slice(max).join(", ")}
          className="inline-flex h-6 items-center rounded-full border border-border border-dashed px-2 font-mono text-muted-foreground text-xs"
        >
          +{rest}
        </li>
      ) : null}
    </ul>
  );
}
