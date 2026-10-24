"use client";

import { type AgentComposerPresentation, useAgentComposerPresentation } from "./composition";

import { X } from "lucide-react";
import {
  AnimatedModal,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import {
  type AgentChatCreditsLabels,
  DEFAULT_CREDITS_LABELS,
} from "./credits-labels";
import type { AgentChatAttachment } from "./types";

export function CreditsImagePreview({
  labels = DEFAULT_CREDITS_LABELS,
  presentation: presentationOverride,
  attachment,
  src,
  onClose,
}: {
  labels?: AgentChatCreditsLabels;
  presentation?: AgentComposerPresentation;
  attachment?: AgentChatAttachment;
  src?: string;
  reduce?: boolean | null;
  onClose: () => void;
}) {
  const presentation = useAgentComposerPresentation(presentationOverride);
  const Modal = presentation.imagePreviewModal ?? AnimatedModal;
  const CloseIcon = presentation.icons?.close ?? X;
  return (
    <Modal
      open={Boolean(attachment && src)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      panelClassName="relative flex max-w-5xl flex-col overflow-hidden rounded-2xl border border-border"
    >
      <AnimatedModalTitle className="sr-only">
        {labels.previewAttachment(attachment?.name ?? "Attachment")}
      </AnimatedModalTitle>
      <Button
        size="icon"
        variant="secondary"
        data-autofocus
        aria-label={labels.closePreview}
        onClick={onClose}
        className="absolute right-3 top-3 z-10"
      >
        <CloseIcon aria-hidden className="size-4" />
      </Button>
      {src && attachment ? (
        <>
          {/* biome-ignore lint/performance/noImgElement: Blob and consumer URLs are not compatible with next/image. */}
          <img
            src={src}
            alt={attachment.name}
            className="max-h-[80dvh] max-w-full object-contain"
          />
          <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
            {attachment.name}
          </p>
        </>
      ) : null}
    </Modal>
  );
}
