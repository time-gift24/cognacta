"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import {
  type FileUploadLabels,
  formatBytes,
  type UploadItem,
} from "./file-upload-data";

/**
 * Image preview in the shared AnimatedModal. The last item is kept through
 * the exit animation so the panel does not empty while it closes.
 */
export function ImagePreviewDialog({
  item,
  labels,
  onClose,
}: {
  item: UploadItem | null;
  labels: FileUploadLabels;
  onClose: () => void;
}) {
  const [shown, setShown] = useState(item);
  useEffect(() => {
    if (item) setShown(item);
  }, [item]);

  return (
    <AnimatedModal
      open={Boolean(item)}
      onOpenChange={(open) => !open && onClose()}
      onExitComplete={() => setShown(null)}
      panelClassName="max-w-2xl p-2"
    >
      {shown ? (
        <>
          <div className="overflow-hidden rounded-xl border border-border">
            {/* biome-ignore lint/performance/noImgElement: object URLs and remote previews cannot go through next/image. */}
            <img
              src={shown.previewUrl}
              alt={shown.name}
              className="max-h-[70dvh] w-full object-contain"
            />
          </div>
          <div className="flex items-center gap-3 px-3 pt-3 pb-2">
            <div className="min-w-0 flex-1">
              <AnimatedModalTitle className="truncate font-medium text-sm">
                {shown.name}
              </AnimatedModalTitle>
              <AnimatedModalDescription className="font-mono text-muted-foreground text-xs tabular-nums">
                {formatBytes(shown.size)}
                {shown.type ? ` · ${shown.type}` : ""}
              </AnimatedModalDescription>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={labels.closePreview}
              onClick={onClose}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </>
      ) : null}
    </AnimatedModal>
  );
}
