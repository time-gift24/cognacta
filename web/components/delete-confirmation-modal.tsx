"use client";

import { Trash } from "@/components/icons";
import { Button } from "@/components/motion/button/base";
import {
  AnimatedModal,
  AnimatedModalTitle,
  AnimatedModalDescription,
} from "@/components/motion/animated-modal";

export function DeleteConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  itemType = "source",
  error,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemName: string;
  itemType?: "source" | "chat" | "project";
  description?: string;
  error?: string;
}) {
  return (
    <AnimatedModal
      open={open}
      onOpenChange={onOpenChange}
      backdropClassName="bg-black/40 backdrop-blur-none"
      panelClassName="max-w-sm rounded-2xl border border-border bg-background p-6"
    >
      <Trash className="mb-4 size-6 text-muted-foreground" />
      <AnimatedModalTitle className="text-lg font-semibold">
        Delete {itemType}?
      </AnimatedModalTitle>
      <AnimatedModalDescription className="mt-2 break-words text-sm leading-6 text-muted-foreground">
        {description ??
          `“${itemName}” will be permanently removed from this browser. This cannot be undone.`}
      </AnimatedModalDescription>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button
          data-autofocus
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="h-11 focus-visible:outline-2 focus-visible:outline-primary"
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          className="h-11 bg-danger text-white hover:bg-danger/90 focus-visible:outline-2 focus-visible:outline-danger"
        >
          Delete {itemType}
        </Button>
      </div>
    </AnimatedModal>
  );
}
