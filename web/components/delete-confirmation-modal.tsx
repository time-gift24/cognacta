"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("Dialog");
  const titleKey =
    itemType === "chat"
      ? "deleteChatTitle"
      : itemType === "project"
        ? "deleteProjectTitle"
        : "deleteSourceTitle";
  const actionKey =
    itemType === "chat"
      ? "deleteChat"
      : itemType === "project"
        ? "deleteProject"
        : "deleteSource";
  return (
    <AnimatedModal
      open={open}
      onOpenChange={onOpenChange}
      backdropClassName="bg-black/40 backdrop-blur-none"
      panelClassName="max-w-sm rounded-2xl border border-border bg-background p-5"
    >
      <Trash className="mb-4 size-6 text-muted-foreground" />
      <AnimatedModalTitle className="text-lg font-semibold">
        {t(titleKey)}
      </AnimatedModalTitle>
      <AnimatedModalDescription className="mt-2 break-words text-sm leading-6 text-muted-foreground">
        {description ?? t("deleteBody", { name: itemName })}
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
          className="h-10 focus-visible:outline-2 focus-visible:outline-primary"
        >
          {t("cancel")}
        </Button>
        <Button
          onClick={onConfirm}
          className="h-10 bg-danger-strong text-white hover:bg-danger-strong/90 focus-visible:outline-2 focus-visible:outline-danger"
        >
          {t(actionKey)}
        </Button>
      </div>
    </AnimatedModal>
  );
}
