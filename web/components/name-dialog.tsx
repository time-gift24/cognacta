"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/arc/button/button";
import { Dialog, DialogContent } from "@/components/arc/dialog/dialog";
import { Input } from "@/components/arc/input/input";

export function NameDialog({
  open,
  onOpenChange,
  title,
  description,
  initialValue = "",
  onSave,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initialValue?: string;
  onSave: (name: string) => void;
  returnFocus?: RefObject<HTMLElement | null>;
}) {
  const t = useTranslations("Dialog");
  const [name, setName] = useState(initialValue);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setName(initialValue);
  }, [open, initialValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={title}
        description={description}
        closeLabel={t("close")}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          input.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          if (!returnFocus?.current?.isConnected) return;
          event.preventDefault();
          returnFocus.current.focus({ preventScroll: true });
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) {
              onSave(name.trim());
              onOpenChange(false);
            }
          }}
        >
          <Input
            ref={input}
            label={t("name")}
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {t("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
