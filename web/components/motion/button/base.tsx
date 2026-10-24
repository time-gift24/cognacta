"use client";

import {
  type HTMLMotionProps,
  type MotionProps,
  motion,
  useReducedMotion,
} from "motion/react";
import { forwardRef, type ReactNode } from "react";
import { SPRING_PRESS } from "@/lib/ease";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pressScale?: number;
  children?: ReactNode;
}

export interface ButtonLinkProps
  extends Omit<HTMLMotionProps<"a">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pressScale?: number;
  children?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border border-border bg-card text-foreground hover:border-border",
  ghost: "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-primary/5",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-full px-3 text-xs",
  md: "h-10 gap-2 rounded-full px-5 text-sm",
  lg: "h-12 gap-2 rounded-full px-6 text-base",
  icon: "h-8 w-8 rounded-lg",
};

function pressMotion({
  reduce,
  canHover,
  pressScale,
}: {
  reduce: boolean | null;
  canHover: boolean;
  pressScale: number;
}): Pick<MotionProps, "whileHover" | "whileTap" | "transition"> {
  return {
    whileTap: reduce ? undefined : { scale: pressScale },
    whileHover: reduce || !canHover ? undefined : { scale: 1.01 },
    transition: SPRING_PRESS,
  };
}

function buttonClassName({
  variant,
  size,
  className,
}: {
  variant: ButtonVariant;
  size: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex items-center justify-center font-medium select-none",
    "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      pressScale = 0.99,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const reduce = useReducedMotion();
    const canHover = useHoverCapable();

    return (
      <motion.button
        ref={ref}
        type="button"
        className={buttonClassName({ variant, size, className })}
        {...pressMotion({ reduce, canHover, pressScale })}
        {...rest}
      >
        {children}
      </motion.button>
    );
  },
);

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  function ButtonLink(
    {
      variant = "primary",
      size = "md",
      pressScale = 0.99,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const reduce = useReducedMotion();
    const canHover = useHoverCapable();

    return (
      <motion.a
        ref={ref}
        className={buttonClassName({ variant, size, className })}
        {...pressMotion({ reduce, canHover, pressScale })}
        {...rest}
      >
        {children}
      </motion.a>
    );
  },
);
