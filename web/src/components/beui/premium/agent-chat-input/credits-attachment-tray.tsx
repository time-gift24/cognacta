"use client";

import { type AgentComposerPresentation, useAgentComposerPresentation } from "./composition";

import { FileText, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import { SPRING_PANEL, SPRING_PRESS, SPRING_SWAP } from "@/lib/beui/ease";
import { isImageAttachment } from "./attachment-utils";
import {
  type AgentChatCreditsLabels,
  DEFAULT_CREDITS_LABELS,
} from "./credits-labels";
import type { AgentChatAttachment } from "./types";

export function CreditsAttachmentTray({
  labels = DEFAULT_CREDITS_LABELS,
  presentation: presentationOverride,
  attachments,
  previewUrls,
  disabled = false,
  reduce,
  onPreview,
  onRemove,
}: {
  labels?: AgentChatCreditsLabels;
  presentation?: AgentComposerPresentation;
  attachments: readonly AgentChatAttachment[];
  previewUrls: Record<string, string>;
  disabled?: boolean;
  reduce?: boolean | null;
  onPreview: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const presentation = useAgentComposerPresentation(presentationOverride);
  const FileIcon = presentation.icons?.file ?? FileText;
  const CloseIcon = presentation.icons?.close ?? X;
  return (
    <AnimatePresence initial={false}>
      {attachments.length > 0 ? (
        <motion.div
          key="attachment-tray"
          initial={reduce ? false : { height: 0, opacity: 0, y: -6 }}
          animate={{ height: "auto", opacity: 1, y: 0 }}
          exit={reduce ? undefined : { height: 0, opacity: 0, y: -6 }}
          transition={reduce ? { duration: 0 } : SPRING_PANEL}
          className="overflow-hidden"
        >
          <div className="scrollbar-hide flex gap-1.5 overflow-x-auto px-1.5 pt-2 pb-0.5">
            {attachments.map((attachment) => {
              const image = isImageAttachment(attachment);
              const imageUrl = previewUrls[attachment.id];

              return (
                <motion.div
                  layout={!reduce}
                  key={attachment.id}
                  initial={reduce ? false : presentation.attachmentMotion?.initial ?? { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? undefined : presentation.attachmentMotion?.exit ?? { opacity: 0, scale: 0.96 }}
                  transition={reduce ? { duration: 0 } : presentation.attachmentMotion?.transition ?? SPRING_SWAP}
                  className={presentation.classNames?.attachment ?? "group flex h-9 min-w-0 shrink-0 items-center gap-1.5 rounded-lg border border-border/70 bg-background/90 p-1 pr-0.5"}
                >
                  {image && imageUrl ? (
                    <Button
                      variant="plain"
                      type="button"
                      aria-label={labels.previewAttachment(attachment.name)}
                      onClick={() => onPreview(attachment.id)}
                      className="size-7 shrink-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {/* biome-ignore lint/performance/noImgElement: blob and consumer URLs are not compatible with next/image. */}
                      <img
                        src={imageUrl}
                        alt={attachment.name}
                        className="size-full object-cover"
                      />
                    </Button>
                  ) : (
                    <span className="grid size-7 shrink-0 place-items-center bg-muted text-muted-foreground rounded-full">
                      <FileIcon className="size-3.5" />
                    </span>
                  )}
                  <span className="max-w-24 truncate text-foreground text-xs">
                    {attachment.name}
                  </span>
                  <Button
                    variant="plain"
                    type="button"
                    aria-label={labels.removeAttachment(attachment.name)}
                    disabled={disabled}
                    onClick={() => onRemove(attachment.id)}
                    whileTap={reduce ? undefined : { scale: 0.92 }}
                    transition={SPRING_PRESS}
                    className="pointer-events-none grid h-6 w-0 shrink-0 scale-75 place-items-center overflow-hidden text-muted-foreground opacity-0 transition-[width,opacity,transform,color,background-color] duration-200 ease-out group-hover:pointer-events-auto group-hover:w-6 group-hover:scale-100 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:w-6 group-focus-within:scale-100 group-focus-within:opacity-100 hover:bg-muted hover:text-foreground focus-visible:w-6 focus-visible:scale-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <CloseIcon className="size-3" />
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
