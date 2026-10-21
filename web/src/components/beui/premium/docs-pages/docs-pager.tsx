import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/beui/utils";
import type { DocsPagerLink } from "./docs-data";

export type DocsPagerProps = {
  previous?: DocsPagerLink | null;
  next?: DocsPagerLink | null;
  previousLabel: string;
  nextLabel: string;
  onSelect: (id: string) => void;
};

export function DocsPager({
  previous,
  next,
  previousLabel,
  nextLabel,
  onSelect,
}: DocsPagerProps) {
  if (!previous && !next) return null;

  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      {previous ? (
        <PagerLink
          link={previous}
          direction="previous"
          label={previousLabel}
          onSelect={onSelect}
        />
      ) : null}
      {next ? (
        <PagerLink
          link={next}
          direction="next"
          label={nextLabel}
          onSelect={onSelect}
          className={previous ? undefined : "sm:col-start-2"}
        />
      ) : null}
    </div>
  );
}

function PagerLink({
  link,
  direction,
  label,
  onSelect,
  className,
}: {
  link: DocsPagerLink;
  direction: "previous" | "next";
  label: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const next = direction === "next";

  return (
    <a
      href={link.href ?? `#${link.id}`}
      onClick={(event) => {
        event.preventDefault();
        onSelect(link.id);
      }}
      className={cn(
        "group flex flex-col gap-1 rounded-2xl border border-border p-4 outline-none transition-colors hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-foreground",
        next && "items-end text-right",
        className,
      )}
    >
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
        {next ? null : (
          <ArrowLeft
            className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
            aria-hidden="true"
          />
        )}
        {label}
        {next ? (
          <ArrowRight
            className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        ) : null}
      </span>
      <span className="font-medium">{link.title}</span>
    </a>
  );
}
