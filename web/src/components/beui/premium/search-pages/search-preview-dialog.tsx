"use client";

import type { ReactNode } from "react";
import { AnimatedModal } from "@/components/beui/motion/animated-modal";

/** Small-screen preview (below xl) in the shared animated dialog. */
export function SearchPreviewDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <AnimatedModal
      open={open}
      onOpenChange={onOpenChange}
      backdropClassName="bg-foreground/15 backdrop-blur-sm"
      viewportClassName="overscroll-contain inset-3 sm:inset-6"
      panelClassName="max-w-md rounded-3xl p-5"
    >
      {children}
    </AnimatedModal>
  );
}
