"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/beui/utils";
import {
  Button as BeUIButton,
  ButtonLink as BeUIButtonLink,
  type ButtonLinkProps as BeUIButtonLinkProps,
  type ButtonProps as BeUIButtonProps,
  type ButtonVariant as BeUIButtonVariant,
  type ButtonSize,
} from "./button/base";
import {
  StatefulButton as BeUIStatefulButton,
  type StatefulButtonProps as BeUIStatefulButtonProps,
} from "./button/stateful";

export type { ButtonSize } from "./button/base";
export type { ButtonState } from "./button/stateful";
export type ButtonVariant = BeUIButtonVariant | "plain";
export type ButtonProps = Omit<BeUIButtonProps, "variant"> & {
  variant?: ButtonVariant;
};
export type ButtonLinkProps = Omit<BeUIButtonLinkProps, "variant"> & {
  variant?: ButtonVariant;
};
export type StatefulButtonProps = Omit<BeUIStatefulButtonProps, "variant"> & {
  variant?: ButtonVariant;
};

// Keep the public beUI implementation as a dependency and apply Pro defaults
// here so installed blocks and the product app share the same controls.
function controlClassName(
  size: ButtonSize = "md",
  className?: string,
  variant?: ButtonVariant,
) {
  return cn(
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    size === "md" && "h-9",
    size === "icon" && "size-9",
    variant === "plain" &&
      "inline-block h-auto p-0 font-normal text-inherit hover:bg-transparent hover:text-inherit",
    className,
    "rounded-full",
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ size, className, variant, ...props }, ref) {
    return (
      <BeUIButton
        ref={ref}
        size={size}
        variant={variant === "plain" ? "ghost" : variant}
        className={controlClassName(size, className, variant)}
        {...props}
      />
    );
  },
);

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  function ButtonLink({ size, className, variant, ...props }, ref) {
    return (
      <BeUIButtonLink
        ref={ref}
        size={size}
        variant={variant === "plain" ? "ghost" : variant}
        className={controlClassName(size, className, variant)}
        {...props}
      />
    );
  },
);

export const StatefulButton = forwardRef<
  HTMLButtonElement,
  StatefulButtonProps
>(function StatefulButton({ size, className, variant, ...props }, ref) {
  return (
    <BeUIStatefulButton
      ref={ref}
      size={size}
      variant={variant === "plain" ? "ghost" : variant}
      className={controlClassName(size, className, variant)}
      {...props}
    />
  );
});
