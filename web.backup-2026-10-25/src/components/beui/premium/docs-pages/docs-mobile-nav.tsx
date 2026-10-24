"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import {
  AnimatedModal,
  AnimatedModalTitle,
  type AnimatedModalProps,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import { DocsNav, type DocsNavProps } from "./docs-nav";
import { cn } from "@/lib/beui/utils";

export type DocsMobileNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExitComplete?: () => void;
  title: string;
  closeLabel: string;
  closeIcon?: ReactNode;
  panelClassName?: string;
  panelMotion?: AnimatedModalProps["panelMotion"];
} & (Omit<DocsNavProps, "layoutScope" | "className"> | { nav: ReactNode });

export function DocsMobileNav({
  open,
  onOpenChange,
  onExitComplete,
  title,
  closeLabel,
  closeIcon,
  panelClassName,
  panelMotion,
  ...navProps
}: DocsMobileNavProps) {
  return (
    <AnimatedModal
      open={open}
      onOpenChange={onOpenChange}
      onExitComplete={onExitComplete}
      backdropClassName="bg-foreground/15 backdrop-blur-sm"
      viewportClassName="overscroll-contain inset-3 sm:inset-6"
      panelClassName={cn("max-w-sm rounded-3xl", panelClassName)}
      panelMotion={panelMotion}
    >
      <div className="flex items-center justify-between border-border border-b px-5 py-4">
        <AnimatedModalTitle className="font-medium text-xl">
          {title}
        </AnimatedModalTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={closeLabel}
          onClick={() => onOpenChange(false)}
          data-autofocus
        >
          {closeIcon ?? <X className="size-4" aria-hidden="true" />}
        </Button>
      </div>
      {"nav" in navProps ? navProps.nav : <DocsNav {...navProps} layoutScope="modal" className="p-5" />}
    </AnimatedModal>
  );
}
