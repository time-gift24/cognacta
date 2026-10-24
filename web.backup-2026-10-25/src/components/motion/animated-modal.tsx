"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons-pro/core-stroke-rounded";
import {
  AnimatedModal as BeuiAnimatedModal,
  type AnimatedModalProps as BeuiAnimatedModalProps,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/motion/button";
import { EASE_IN_OUT, SPRING_MODAL } from "@/lib/ease";
import { cn } from "@/lib/utils";

export { AnimatedModalTitle, AnimatedModalDescription } from "@/components/beui/motion/animated-modal";

export type AnimatedModalProps = Omit<BeuiAnimatedModalProps, "panelMotion"> & {
  showCloseButton?: boolean;
};

export const dialogPanelMotion = {
  initial: { opacity: 0, y: 10, scale: 0.96 },
  exit: { opacity: 0, y: 6, scale: 0.96, transition: { duration: 0.15, ease: EASE_IN_OUT } },
  transition: SPRING_MODAL,
} satisfies NonNullable<BeuiAnimatedModalProps["panelMotion"]>;

export function AnimatedModal({
  showCloseButton = false,
  children,
  panelClassName,
  onOpenChange,
  ...props
}: AnimatedModalProps) {
  return (
    <BeuiAnimatedModal
      {...props}
      onOpenChange={onOpenChange}
      panelClassName={cn("chat-modal-panel relative", panelClassName)}
      panelMotion={dialogPanelMotion}
    >
      {children}
      {showCloseButton ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="关闭"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 size-9 rounded-full text-muted-foreground"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} aria-hidden="true" />
        </Button>
      ) : null}
    </BeuiAnimatedModal>
  );
}
