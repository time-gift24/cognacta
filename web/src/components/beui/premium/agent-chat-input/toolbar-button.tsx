"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";

export interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

export function ToolbarButton({
  label,
  active = false,
  disabled,
  className,
  children,
  onClick,
}: ToolbarButtonProps) {
  return (
    <Button
      variant="plain"
      type="button"
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-full text-muted-foreground text-sm transition-colors",
        "hover:bg-primary/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "data-[active=true]:bg-primary/5 data-[active=true]:text-foreground",
        className,
      )}
      data-active={active}
    >
      {children}
    </Button>
  );
}
