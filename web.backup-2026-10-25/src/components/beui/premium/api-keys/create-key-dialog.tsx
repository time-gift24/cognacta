"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
import { Select } from "@/components/beui/premium/select";
import { SPRING_PANEL } from "@/lib/beui/ease";
import type {
  ApiKey,
  ApiKeyExpiryOption,
  ApiKeyScopeGroup,
  ApiKeysLabels,
  CreateApiKeyInput,
  CreateApiKeyResult,
} from "./api-keys-data";
import { STAGE_VARIANTS } from "./api-keys-motion";
import { RevealPanel } from "./reveal-panel";
import { ScopePicker } from "./scope-picker";
import { useMeasuredHeight } from "./use-measured-height";

export type CreateKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  environment: string;
  environmentLabel: string;
  scopeGroups: readonly ApiKeyScopeGroup[];
  expiryOptions: readonly ApiKeyExpiryOption[];
  labels: ApiKeysLabels;
  onCreate: (input: CreateApiKeyInput) => Promise<CreateApiKeyResult>;
  /** Called once the reveal is dismissed, so the new row lands after close. */
  onCreated: (key: ApiKey) => void;
};

type Created = CreateApiKeyResult | null;

/**
 * CREATE FLOW
 *   open     panel springs in (AnimatedModal)
 *   submit   button rolls to loading, then success
 *   reveal   form blurs out, the panel height glides to the reveal, the
 *            secret resolves chunk by chunk
 *   close    the new row is handed back after the exit completes
 *   reduced  stages swap with opacity only; height jumps
 */
export function CreateKeyDialog({
  open,
  onOpenChange,
  environment,
  environmentLabel,
  scopeGroups,
  expiryOptions,
  labels,
  onCreate,
  onCreated,
}: CreateKeyDialogProps) {
  const reduce = useReducedMotion();
  const { ref, height } = useMeasuredHeight<HTMLDivElement>();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [expiryId, setExpiryId] = useState(expiryOptions[1]?.id ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [state, setState] = useState<ButtonState>("idle");
  const [created, setCreated] = useState<Created>(null);

  const nameError = submitted && !name.trim() ? labels.keyNameError : null;
  const scopeError =
    submitted && scopes.length === 0 ? labels.scopesError : null;
  const busy = state === "loading" || state === "success";

  function reset() {
    setName("");
    setScopes([]);
    setExpiryId(expiryOptions[1]?.id ?? "");
    setSubmitted(false);
    setState("idle");
    setCreated(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next && state === "loading") return;
    onOpenChange(next);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const expiry = expiryOptions.find((option) => option.id === expiryId);
    if (!name.trim() || scopes.length === 0 || !expiry) return;
    setState("loading");
    try {
      const result = await onCreate({
        name: name.trim(),
        environment,
        scopes,
        expiry,
      });
      setState("success");
      setTimeout(() => setCreated(result), reduce ? 0 : 450);
    } catch {
      setState("error");
    }
  }

  return (
    <AnimatedModal
      open={open}
      onOpenChange={handleOpenChange}
      onExitComplete={() => {
        if (created) onCreated(created.key);
        reset();
      }}
      panelClassName="max-w-xl rounded-3xl"
    >
      <motion.div
        animate={{ height }}
        transition={reduce ? { duration: 0 } : SPRING_PANEL}
        className="overflow-hidden"
      >
        <div ref={ref}>
          <AnimatePresence mode="popLayout" initial={false}>
            {created ? (
              <motion.div
                key="reveal"
                variants={STAGE_VARIANTS}
                initial={reduce ? { opacity: 0 } : "enter"}
                animate="show"
                exit="exit"
              >
                <RevealPanel
                  secret={created.secret}
                  labels={labels}
                  onDone={() => onOpenChange(false)}
                />
              </motion.div>
            ) : (
              <motion.form
                key="form"
                variants={STAGE_VARIANTS}
                initial={false}
                animate="show"
                exit="exit"
                onSubmit={submit}
                noValidate
                className="p-6"
              >
                <div className="flex items-center gap-2">
                  <AnimatedModalTitle className="font-medium text-xl">
                    {labels.createTitle}
                  </AnimatedModalTitle>
                  <span className="inline-flex h-6 items-center rounded-full border border-border px-2 font-mono text-muted-foreground text-xs">
                    {environmentLabel}
                  </span>
                </div>
                <AnimatedModalDescription className="mt-1 text-muted-foreground text-sm">
                  {labels.createDescription}
                </AnimatedModalDescription>

                <div className="mt-6 grid gap-5">
                  <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                    <Input
                      label={labels.keyName}
                      placeholder={labels.keyNamePlaceholder}
                      value={name}
                      onChange={setName}
                      error={nameError ?? undefined}
                      disabled={busy}
                      autoComplete="off"
                      data-autofocus
                    />
                    <div className="flex flex-col gap-1.5">
                      <span
                        aria-hidden
                        className="px-1 font-medium text-foreground text-sm"
                      >
                        {labels.expiry}
                      </span>
                      <Select
                        label={labels.expiry}
                        options={expiryOptions.map(({ id, label }) => ({
                          id,
                          label,
                        }))}
                        value={expiryId}
                        onValueChange={setExpiryId}
                        disabled={busy}
                        portal
                        align="end"
                        buttonClassName="w-full"
                        className="w-full"
                      />
                    </div>
                  </div>
                  <ScopePicker
                    groups={scopeGroups}
                    selected={scopes}
                    onChange={setScopes}
                    legend={labels.scopesLegend}
                    error={scopeError}
                    disabled={busy}
                  />
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="ghost"
                    onClick={() => handleOpenChange(false)}
                    disabled={state === "loading"}
                  >
                    {labels.cancel}
                  </Button>
                  <StatefulButton
                    type="submit"
                    state={state}
                    loadingText={labels.creating}
                    successText={labels.createDone}
                  >
                    {labels.create}
                  </StatefulButton>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatedModal>
  );
}
