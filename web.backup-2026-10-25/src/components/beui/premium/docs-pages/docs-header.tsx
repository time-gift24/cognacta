"use client";

import { BookOpen, Menu } from "lucide-react";
import type { ReactNode } from "react";
import { Button, ButtonLink } from "@/components/beui/motion/button";

export type DocsHeaderProps = {
  productName: ReactNode;
  version?: ReactNode;
  browseLabel: string;
  dashboardLabel: string;
  dashboardHref: string;
  onBrowse: () => void;
};

export function DocsHeader({
  productName,
  version,
  browseLabel,
  dashboardLabel,
  dashboardHref,
  onBrowse,
}: DocsHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-border border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-full bg-muted">
            <BookOpen className="size-4" aria-hidden="true" />
          </span>
          <span className="font-medium">{productName}</span>
          {version ? (
            <span className="rounded-full border border-border px-2 py-0.5 font-mono text-muted-foreground text-xs">
              {version}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBrowse}
            className="lg:hidden"
          >
            <Menu className="size-4" aria-hidden="true" />
            {browseLabel}
          </Button>
          <ButtonLink
            href={dashboardHref}
            size="sm"
            className="hidden sm:inline-flex"
          >
            {dashboardLabel}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
