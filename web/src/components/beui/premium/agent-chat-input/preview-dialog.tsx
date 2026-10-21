"use client";

import { X } from "lucide-react";

import {
  AnimatedModal,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";

export interface AgentChatAttachmentPreviewDialogProps {
  src?: string;
  name?: string;
  reduce?: boolean | null;
  onClose: () => void;
}

export function AgentChatAttachmentPreviewDialog({
  src,
  name,
  onClose,
}: AgentChatAttachmentPreviewDialogProps) {
  return (
    <AnimatedModal
      open={Boolean(src)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      panelClassName="relative max-w-5xl rounded-2xl border border-border p-4"
    >
      <AnimatedModalTitle className="sr-only">
        {name ?? "Attachment preview"}
      </AnimatedModalTitle>
      {src ? (
        <img
          src={src}
          alt={name ?? "Attachment preview"}
          width={960}
          height={720}

          className="mx-auto max-h-[80dvh] w-auto max-w-full object-contain"
        />
      ) : null}
      <Button
        size="icon"
        variant="secondary"
        onClick={onClose}
        aria-label="Close attachment preview"
        data-autofocus
        className="absolute right-3 top-3"
      >
        <X aria-hidden className="size-4" />
      </Button>
    </AnimatedModal>
  );
}
