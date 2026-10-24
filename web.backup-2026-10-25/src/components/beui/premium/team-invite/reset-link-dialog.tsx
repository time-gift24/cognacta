"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import {
  Button,
  type ButtonState,
  StatefulButton,
} from "@/components/beui/motion/button";
import type { TeamInviteLabels } from "./team-invite-data";

const SUCCESS_HOLD_MS = 700;

export type ResetLinkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  labels: Pick<
    TeamInviteLabels,
    | "resetTitle"
    | "resetDescription"
    | "resetConfirm"
    | "resetting"
    | "resetDone"
    | "cancel"
  >;
};

export function ResetLinkDialog({
  open,
  onOpenChange,
  onConfirm,
  labels,
}: ResetLinkDialogProps) {
  const [state, setState] = useState<ButtonState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function confirm() {
    setState("loading");
    try {
      await onConfirm();
      setState("success");
      timer.current = setTimeout(() => onOpenChange(false), SUCCESS_HOLD_MS);
    } catch {
      setState("error");
    }
  }

  return (
    <AnimatedModal
      open={open}
      onOpenChange={(next) => {
        if (state !== "loading") onOpenChange(next);
      }}
      onExitComplete={() => setState("idle")}
      panelClassName="max-w-md p-6"
    >
      <AnimatedModalTitle className="font-medium text-foreground text-xl">
        {labels.resetTitle}
      </AnimatedModalTitle>
      <AnimatedModalDescription className="mt-2 text-muted-foreground text-sm">
        {labels.resetDescription}
      </AnimatedModalDescription>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={state === "loading"}
        >
          {labels.cancel}
        </Button>
        <StatefulButton
          type="button"
          state={state}
          onClick={confirm}
          loadingText={labels.resetting}
          successText={labels.resetDone}
        >
          {labels.resetConfirm}
        </StatefulButton>
      </div>
    </AnimatedModal>
  );
}
