"use client";

import { Ban } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import {
  Button,
  type ButtonState,
  StatefulButton,
} from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import type { ApiKey, ApiKeysLabels } from "./api-keys-data";
import { maskKey } from "./api-keys-format";

export type RevokeDialogProps = {
  /** Key pending revocation; `null` closes the dialog. */
  apiKey: ApiKey | null;
  labels: ApiKeysLabels;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
  /** Runs after the dialog has closed, so the row change is visible. */
  onRevoked: (id: string) => void;
};

/** Confirms revocation by asking for the exact key name. */
export function RevokeDialog({
  apiKey,
  labels,
  onClose,
  onConfirm,
  onRevoked,
}: RevokeDialogProps) {
  // Keep the last key so copy stays put while the dialog animates out.
  const [shown, setShown] = useState<ApiKey | null>(apiKey);
  if (apiKey && apiKey !== shown) setShown(apiKey);
  const [typed, setTyped] = useState("");
  const [state, setState] = useState<ButtonState>("idle");
  const matches = shown !== null && typed.trim() === shown.name;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!shown || !matches || state === "loading" || state === "success")
      return;
    setState("loading");
    try {
      await onConfirm(shown.id);
      setState("success");
      setTimeout(onClose, 420);
    } catch {
      setState("error");
    }
  }

  return (
    <AnimatedModal
      open={apiKey !== null}
      onOpenChange={(open) => {
        if (!open && (state === "idle" || state === "error")) onClose();
      }}
      onExitComplete={() => {
        if (state === "success" && shown) onRevoked(shown.id);
        setTyped("");
        setState("idle");
      }}
      panelClassName="max-w-md rounded-3xl"
    >
      {shown ? (
        <form onSubmit={submit} noValidate className="p-6">
          <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
            <Ban aria-hidden className="size-4" />
          </span>
          <AnimatedModalTitle className="mt-4 font-medium text-xl">
            {labels.revokeTitle}
          </AnimatedModalTitle>
          <AnimatedModalDescription className="mt-1 text-muted-foreground text-sm">
            {labels.revokeDescription}
          </AnimatedModalDescription>

          <div className="mt-5 rounded-2xl border border-border px-4 py-3">
            <p className="font-medium text-sm">{shown.name}</p>
            <p className="mt-0.5 font-mono text-muted-foreground text-xs">
              {maskKey(shown)}
            </p>
          </div>

          <Input
            className="mt-5"
            label={labels.revokeConfirm}
            placeholder={shown.name}
            value={typed}
            onChange={setTyped}
            disabled={state === "loading"}
            autoComplete="off"
            spellCheck={false}
            data-autofocus
          />

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={state === "loading"}
            >
              {labels.cancel}
            </Button>
            <StatefulButton
              type="submit"
              state={state}
              disabled={!matches}
              loadingText={labels.revoking}
              successText={labels.revokeDone}
            >
              {labels.revoke}
            </StatefulButton>
          </div>
        </form>
      ) : null}
    </AnimatedModal>
  );
}
