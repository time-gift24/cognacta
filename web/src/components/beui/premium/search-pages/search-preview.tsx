"use client";

import { ArrowRight, type LucideIcon, X } from "lucide-react";
import { AnimatedModalTitle } from "@/components/beui/motion/animated-modal";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { Highlight } from "./highlight";
import type { SearchResult } from "./search-data";

export type SearchPreviewProps = {
  result: SearchResult;
  words: readonly string[];
  typeLabel: string;
  icon: LucideIcon;
  openLabel: string;
  closeLabel: string;
  /** Renders the title as the dialog's accessible title. */
  inDialog?: boolean;
  onClose?: () => void;
};

/** Preview content shared by the desktop pane and the small-screen dialog. */
export function SearchPreview({
  result,
  words,
  typeLabel,
  icon: Icon,
  openLabel,
  closeLabel,
  inDialog = false,
  onClose,
}: SearchPreviewProps) {
  const Title = inDialog ? AnimatedModalTitle : "p";

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-xs">
          <Icon className="size-3.5" aria-hidden="true" />
          {typeLabel}
        </span>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={closeLabel}
            onClick={onClose}
            data-autofocus
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      {result.image && result.type === "guides" ? (
        // biome-ignore lint/performance/noImgElement: remote guide cover in preview.
        <img
          src={result.image}
          alt=""
          className="mt-4 aspect-video w-full rounded-2xl object-cover"
        />
      ) : null}
      <p className="mt-4 text-muted-foreground text-xs">
        {result.path.join(" / ")}
      </p>
      <Title className="mt-1 font-medium text-xl">{result.title}</Title>
      <p className="mt-3 text-muted-foreground text-sm leading-6">
        <Highlight text={result.snippet} words={words} />
      </p>
      {result.image && result.type === "community" ? (
        <div className="mt-4 flex items-center gap-2.5 text-sm">
          {/* biome-ignore lint/performance/noImgElement: remote author photo in preview. */}
          <img
            src={result.image}
            alt=""
            width={28}
            height={28}
            className="size-7 rounded-full object-cover"
          />
          <span className="text-muted-foreground">{result.meta}</span>
        </div>
      ) : (
        <p className="mt-4 text-muted-foreground text-xs">
          {result.area} · {result.meta}
        </p>
      )}
      <ButtonLink href={result.href ?? "#"} className="mt-5 w-full">
        {openLabel}
        <ArrowRight className="size-4" aria-hidden="true" />
      </ButtonLink>
    </div>
  );
}
