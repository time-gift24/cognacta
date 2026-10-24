"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/motion/button/base";
import { Input } from "@/components/form-fields";
import {
  AnimatedModal,
  AnimatedModalTitle,
  AnimatedModalDescription,
} from "@/components/motion/animated-modal";

export function NameDialog({
  open,
  onOpenChange,
  title,
  description,
  initialValue = "",
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initialValue?: string;
  onSave: (name: string) => void;
}) {
  const t = useTranslations("Dialog");
  const [name, setName] = useState(initialValue);
  useEffect(() => {
    if (open) setName(initialValue);
  }, [open, initialValue]);
  return (
    <AnimatedModal
      open={open}
      onOpenChange={onOpenChange}
      backdropClassName="bg-black/40 backdrop-blur-none"
      panelClassName="max-w-sm rounded-2xl border border-border bg-background p-5"
    >
      <AnimatedModalTitle className="text-lg font-semibold">
        {title}
      </AnimatedModalTitle>
      <AnimatedModalDescription className="mt-2 text-sm text-muted-foreground">
        {description}
      </AnimatedModalDescription>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) {
            onSave(name.trim());
            onOpenChange(false);
          }
        }}
      >
        <label className="mt-5 block text-sm">
          {t("name")}
          <Input
            data-autofocus
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2"
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={!name.trim()}>
            {t("save")}
          </Button>
        </div>
      </form>
    </AnimatedModal>
  );
}
