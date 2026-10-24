"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import type { ButtonState } from "@/components/beui/motion/button";
import { useOnOpen } from "@/lib/beui/hooks/use-on-open";
import type {
  BookingDetails,
  BookingHost,
  BookingLabels,
  BookingSelection,
  BookingTimeZone,
} from "./booking-data";
import { BookingForm } from "./booking-form";
import { panelSwap } from "./booking-motion";
import { BookingSuccess } from "./booking-success";
import { BookingSummary } from "./booking-summary";

type BookingConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  host: BookingHost;
  selection: BookingSelection | null;
  hostOffset: number;
  timeZone: BookingTimeZone;
  hour12: boolean;
  labels: BookingLabels;
  reduce: boolean;
  onBook: (
    selection: BookingSelection,
    details: BookingDetails,
  ) => Promise<void>;
  onBooked: (selection: BookingSelection) => void;
  onReschedule: (selection: BookingSelection) => void;
};

/** How long the "Booked" button state holds before the success view swaps in. */
const SUCCESS_HOLD_MS = 650;
const ERROR_HOLD_MS = 1800;

export function BookingConfirmDialog({
  open,
  onOpenChange,
  host,
  selection,
  hostOffset,
  timeZone,
  hour12,
  labels,
  reduce,
  onBook,
  onBooked,
  onReschedule,
}: BookingConfirmDialogProps) {
  const [phase, setPhase] = useState<"form" | "success">("form");
  const [status, setStatus] = useState<ButtonState>("idle");
  const timer = useRef<number | undefined>(undefined);

  useOnOpen(open, () => {
    setPhase("form");
    setStatus("idle");
  });

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function handleSubmit(details: BookingDetails) {
    if (!selection) return;
    window.clearTimeout(timer.current);
    setStatus("loading");
    try {
      await onBook(selection, details);
      setStatus("success");
      timer.current = window.setTimeout(
        () => {
          setPhase("success");
          onBooked(selection);
        },
        reduce ? 0 : SUCCESS_HOLD_MS,
      );
    } catch {
      setStatus("error");
      timer.current = window.setTimeout(() => setStatus("idle"), ERROR_HOLD_MS);
    }
  }

  const close = () => {
    if (status === "loading") return;
    onOpenChange(false);
  };

  return (
    <AnimatedModal
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      {selection ? (
        <div className="p-5 sm:p-6">
          <AnimatePresence mode="wait" initial={false}>
            {phase === "form" ? (
              <motion.div
                key="form"
                custom={{ reduce }}
                variants={panelSwap}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col gap-5"
              >
                <div className="flex flex-col gap-1">
                  <AnimatedModalTitle className="font-medium text-xl">
                    {labels.dialogTitle}
                  </AnimatedModalTitle>
                  <AnimatedModalDescription className="text-muted-foreground text-sm">
                    {labels.dialogDescription}
                  </AnimatedModalDescription>
                </div>
                <BookingSummary
                  host={host}
                  selection={selection}
                  hostOffset={hostOffset}
                  timeZone={timeZone}
                  hour12={hour12}
                />
                <BookingForm
                  status={status}
                  submitError={labels.submitError}
                  labels={labels}
                  reduce={reduce}
                  onSubmit={handleSubmit}
                  onCancel={close}
                />
              </motion.div>
            ) : (
              <motion.div
                key="success"
                custom={{ reduce }}
                variants={panelSwap}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <BookingSuccess
                  host={host}
                  selection={selection}
                  hostOffset={hostOffset}
                  timeZone={timeZone}
                  hour12={hour12}
                  labels={labels}
                  reduce={reduce}
                  onReschedule={() => onReschedule(selection)}
                  onDone={() => onOpenChange(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : null}
    </AnimatedModal>
  );
}
