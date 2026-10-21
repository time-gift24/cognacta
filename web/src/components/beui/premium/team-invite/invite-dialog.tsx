"use client";

import { X } from "lucide-react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import { InviteComposer, type InviteComposerProps } from "./invite-composer";
import { SeatMeter } from "./seat-meter";

export type InviteDialogProps = InviteComposerProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Seats already taken by members and pending invites. */
  used: number;
  seatLimit: number;
};

/** The invite form in a dialog, with a live seat meter above the fields. */
export function InviteDialog({
  open,
  onOpenChange,
  used,
  seatLimit,
  ...composer
}: InviteDialogProps) {
  const { labels, status, batch } = composer;
  const busy = status === "loading";

  return (
    <AnimatedModal
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
      backdropClassName="bg-foreground/15 backdrop-blur-sm"
      viewportClassName="overscroll-contain inset-3 sm:inset-6"
      panelClassName="max-w-xl rounded-3xl"
    >
      <div className="flex items-start justify-between gap-4 border-border border-b px-5 pt-5 pb-4 sm:px-6">
        <div className="min-w-0">
          <AnimatedModalTitle className="font-medium text-xl">
            {labels.title}
          </AnimatedModalTitle>
          <AnimatedModalDescription className="mt-1 text-muted-foreground text-sm">
            {labels.description}
          </AnimatedModalDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={labels.closeInvite}
          onClick={() => onOpenChange(false)}
          disabled={busy}
          data-autofocus
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <SeatMeter
          used={used}
          batch={batch.valid.length}
          limit={seatLimit}
          labels={labels}
        />
        <InviteComposer {...composer} />
      </div>
    </AnimatedModal>
  );
}
