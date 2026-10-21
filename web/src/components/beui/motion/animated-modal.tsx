"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { AnimatePresence, motion, useReducedMotion, type MotionProps } from "motion/react";
import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { EASE_OUT, SPRING_PANEL } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

const MotionBackdrop = motion.create(DialogBackdrop);
const MotionPanel = motion.create(DialogPanel);

export type AnimatedModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Runs after the closing animation completes. */
  onExitComplete?: () => void;
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  backdropClassName?: string;
  viewportClassName?: string;
  panelClassName?: string;
  panelDataSlot?: string;
  panelMotion?: Pick<MotionProps, "initial" | "exit" | "transition">;
};

export function AnimatedModal({
  open,
  onOpenChange,
  onExitComplete,
  initialFocus,
  children,
  className,
  backdropClassName,
  viewportClassName,
  panelClassName,
  panelDataSlot,
  panelMotion,
}: AnimatedModalProps) {
  const reduce = useReducedMotion();
  const currentlyOpen = useRef(open);
  useLayoutEffect(() => {
    currentlyOpen.current = open;
  }, [open]);

  return (
    <AnimatePresence onExitComplete={() => {
      // The focus trap unmounts after the exit; a reopened dialog owns focus.
      if (onExitComplete) requestAnimationFrame(() => {
        if (!currentlyOpen.current) onExitComplete();
      });
    }}>
      {open ? (
        <Dialog
          key="animated-modal"
          open
          initialFocus={initialFocus}
          onClose={() => onOpenChange(false)}
          className={cn("relative z-[100]", className)}
        >
          <MotionBackdrop
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              transition: reduce
                ? { duration: 0 }
                : { duration: 0.15, ease: EASE_OUT },
            }}
            transition={
              reduce ? { duration: 0 } : { duration: 0.2, ease: EASE_OUT }
            }
            className={cn(
              "fixed inset-0 bg-foreground/10 backdrop-blur-xl",
              backdropClassName,
            )}
          />

          <div
            className={cn(
              // Inset from every edge rather than padded: iOS 26 Safari samples a
              // transparent fixed layer that touches the viewport edges to tint
              // its toolbar, which blocks the main thread while the panel
              // animates. Override the margin with inset-*, not p-*.
              "fixed inset-4 z-[101] overflow-x-hidden overflow-y-auto",
              viewportClassName,
            )}
          >
            <div className="flex min-h-full items-center justify-center">
              <MotionPanel
                data-slot={panelDataSlot}
                initial={reduce ? false : panelMotion?.initial ?? { opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0, y: 0, scale: 1, transition: { duration: 0 } } : panelMotion?.exit ?? {
                  opacity: 0,
                  y: reduce ? 0 : 6,
                  scale: reduce ? 1 : 0.96,
                  transition: reduce
                    ? { duration: 0 }
                    : { duration: 0.15, ease: EASE_OUT },
                }}
                transition={reduce ? { duration: 0 } : panelMotion?.transition ?? SPRING_PANEL}
                className={cn(
                  "max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background text-foreground will-change-transform",
                  panelClassName,
                )}
              >
                {children}
              </MotionPanel>
            </div>
          </div>
        </Dialog>
      ) : null}
    </AnimatePresence>
  );
}

export const AnimatedModalTitle = DialogTitle;
export const AnimatedModalDescription = DialogDescription;
