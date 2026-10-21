import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/beui/utils";
import { docsSectionId } from "./docs-data";

export type DocSectionProps = {
  /** Matches a `DocsSection.id` so the outline can track it. */
  id: string;
  title: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DocSection({
  id,
  title,
  children,
  className,
}: DocSectionProps) {
  return (
    <section
      aria-labelledby={docsSectionId(id)}
      className={cn("space-y-5", className)}
    >
      <h2
        id={docsSectionId(id)}
        className="scroll-mt-24 font-medium text-xl tracking-tight"
      >
        {title}
      </h2>
      <div className="space-y-5 text-muted-foreground leading-7 [&_p]:text-pretty">
        {children}
      </div>
    </section>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md border border-border px-1.5 py-0.5 font-mono text-foreground text-xs">
      {children}
    </code>
  );
}

export type CalloutProps = {
  children: ReactNode;
  /** Replaces the default info icon. */
  icon?: ReactNode;
  className?: string;
};

export function Callout({ children, icon, className }: CalloutProps) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border border-border p-4 text-sm leading-6",
        className,
      )}
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-foreground">
        {icon ?? <Info className="size-3.5" aria-hidden="true" />}
      </span>
      <p className="pt-0.5">{children}</p>
    </div>
  );
}
