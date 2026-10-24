"use client";

import { type LucideIcon, X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/beui/motion/button";
import {
  MorphicTooltip,
  MorphicTooltipProvider,
} from "@/components/beui/premium/morphic-tooltip";
import { cn } from "@/lib/beui/utils";

export type ArtifactProps = ComponentProps<"div">;

/** Content and state belong to the consumer; the shell makes no assumptions about the artifact type. */
export function Artifact({ className, children, ...props }: ArtifactProps) {
  return (
    <MorphicTooltipProvider>
      <div
        data-slot="artifact"
        className={cn(
          "flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </MorphicTooltipProvider>
  );
}

export type ArtifactHeaderProps = ComponentProps<"div">;
export function ArtifactHeader({ className, ...props }: ArtifactHeaderProps) {
  return (
    <div
      data-slot="artifact-header"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

export type ArtifactTitleProps = ComponentProps<"p">;
export function ArtifactTitle({ className, ...props }: ArtifactTitleProps) {
  return (
    <p
      data-slot="artifact-title"
      className={cn("truncate text-sm font-medium", className)}
      {...props}
    />
  );
}

export type ArtifactDescriptionProps = ComponentProps<"p">;
export function ArtifactDescription({
  className,
  ...props
}: ArtifactDescriptionProps) {
  return (
    <p
      data-slot="artifact-description"
      className={cn("mt-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export type ArtifactActionsProps = ComponentProps<"div">;
export function ArtifactActions({ className, ...props }: ArtifactActionsProps) {
  return (
    <div
      data-slot="artifact-actions"
      className={cn("flex shrink-0 items-center gap-1", className)}
      {...props}
    />
  );
}

export type ArtifactActionProps = ButtonProps & {
  /** Accessible name, including when only an icon is displayed. */
  label: string;
  tooltip?: ReactNode;
  icon?: LucideIcon;
};
export function ArtifactAction({
  label,
  tooltip,
  icon: Icon,
  children,
  className,
  variant = "ghost",
  size = "icon",
  type = "button",
  ...props
}: ArtifactActionProps) {
  const button = (
    <Button
      data-slot="artifact-action"
      type={type}
      variant={variant}
      size={size}
      aria-label={label}
      className={cn(
        "rounded-full h-9",
        size === "icon" ? "size-9" : "rounded-full h-9",
        className,
      )}
      {...props}
    >
      {children ??
        (Icon ? <Icon className="size-4" aria-hidden="true" /> : label)}
    </Button>
  );
  return tooltip ? (
    <MorphicTooltip content={tooltip}>{button}</MorphicTooltip>
  ) : (
    button
  );
}

export type ArtifactCloseProps = Omit<ArtifactActionProps, "label" | "icon"> & {
  label?: string;
};
/** Wire onClick to the parent that controls whether the artifact is mounted. */
export function ArtifactClose({
  label = "Close artifact",
  tooltip = label,
  children,
  ...props
}: ArtifactCloseProps) {
  return (
    <ArtifactAction label={label} tooltip={tooltip} icon={X} {...props}>
      {children}
    </ArtifactAction>
  );
}

export type ArtifactContentProps = ComponentProps<"div">;
export function ArtifactContent({ className, ...props }: ArtifactContentProps) {
  return (
    <div
      data-slot="artifact-content"
      className={cn(
        "min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain p-4",
        className,
      )}
      {...props}
    />
  );
}

export type ArtifactFooterProps = ComponentProps<"div">;
export function ArtifactFooter({ className, ...props }: ArtifactFooterProps) {
  return (
    <div
      data-slot="artifact-footer"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5",
        className,
      )}
      {...props}
    />
  );
}

export { ArtifactCode, type ArtifactCodeProps } from "./artifact-code";
