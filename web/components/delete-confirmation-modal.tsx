"use client";

import type { RefObject } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/arc/button/button";
import { Dialog, DialogContent } from "@/components/arc/dialog/dialog";

export function DeleteConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  itemType = "source",
  error,
  description,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemName: string;
  itemType?: "source" | "chat" | "project";
  description?: string;
  error?: string;
  returnFocus?: RefObject<HTMLElement | null>;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={t(titleKey)}
        description={description ?? t("deleteBody", { name: itemName })}
        closeLabel={t("close")}
        onCloseAutoFocus={(event) => {
          if (!returnFocus?.current?.isConnected) return;
          event.preventDefault();
          returnFocus.current.focus({ preventScroll: true });
        }}
      >
        {error ? (
          <p role="alert" className="mb-4 text-xs text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button type="button" variant="danger-solid" onClick={onConfirm}>
            {t(actionKey)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
