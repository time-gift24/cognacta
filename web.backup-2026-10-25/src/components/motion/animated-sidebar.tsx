"use client"

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChevronRightIcon } from "@hugeicons-pro/core-stroke-rounded"
import {
  AnimatedSidebarGroupLabel as BeuiGroupLabel,
  AnimatedSidebarMenuButton as BeuiMenuButton,
  AnimatedSidebarMenuSubButton as BeuiMenuSubButton,
  type AnimatedSidebarMenuSubButtonProps,
  type AnimatedSidebarMenuButtonProps,
} from "@/components/beui/motion/animated-sidebar"
import { cn } from "@/lib/utils"

export * from "@/components/beui/motion/animated-sidebar"

export const AnimatedSidebarGroupLabel = forwardRef<
  ComponentRef<typeof BeuiGroupLabel>,
  ComponentPropsWithoutRef<typeof BeuiGroupLabel>
>(function AnimatedSidebarGroupLabel({ className, ...props }, ref) {
  return (
    <BeuiGroupLabel
      ref={ref}
      className={cn("tracking-normal normal-case", className)}
      {...props}
    />
  )
})

export function AnimatedSidebarMenuButton({
  chevronIcon = <HugeiconsIcon icon={ChevronRightIcon} size={14} />,
  indicatorClassName,
  className,
  ...props
}: AnimatedSidebarMenuButtonProps) {
  return (
    <BeuiMenuButton
      {...props}
      focusClassName={props.focusClassName ?? (props.isActive ? "" : "focus-visible:bg-muted/70")}
      chevronIcon={chevronIcon}
      indicatorClassName={cn("bg-accent", indicatorClassName)}
      className={cn(props.isActive && "text-accent-foreground hover:text-accent-foreground", className)}
    />
  )
}

export function AnimatedSidebarMenuSubButton({
  className,
  ...props
}: AnimatedSidebarMenuSubButtonProps) {
  return (
    <BeuiMenuSubButton
      {...props}
      focusClassName={props.focusClassName ?? (props.isActive ? "" : "focus-visible:bg-muted/70")}
      activeClassName={props.activeClassName ?? "text-accent-foreground"}
      className={className}
    />
  )
}
