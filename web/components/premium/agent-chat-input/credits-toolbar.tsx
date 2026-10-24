"use client";

import { useTranslations } from "next-intl";
import { ArrowUp, Mic, Paperclip, Square } from "@/components/icons";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { SPRING_PRESS, SPRING_SWAP } from "@/lib/ease";
import { CreditsModelSelector } from "./credits-model-selector";
import { CreditsSearchToggle } from "./credits-search-toggle";
import type { AgentChatInputOption } from "./types";

export function CreditsToolbar({
  busy,
  canSubmit,
  disabled,
  reduce,
  models,
  selectedModel,
  searchEnabled,
  onAttach,
  onSearchChange,
  onModelChange,
  onStop,
  onSubmit,
  onVoice,
  attachControl,
}: {
  busy: boolean;
  canSubmit: boolean;
  disabled: boolean;
  reduce?: boolean | null;
  models: readonly AgentChatInputOption[];
  selectedModel: string;
  searchEnabled: boolean;
  onAttach: () => void;
  onSearchChange: (enabled: boolean) => void;
  onModelChange: (model: string) => void;
  onStop?: () => void;
  onSubmit: () => void;
  onVoice?: () => void;
  attachControl?: ReactNode;
}) {
  const t = useTranslations("Composer");
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <div className="flex min-w-0 items-center gap-0.5 text-muted-foreground">
        {attachControl ?? (
          <ActionButton label={t("attachFiles")} onClick={onAttach}>
            <Paperclip className="size-[18px]" />
          </ActionButton>
        )}
        <CreditsSearchToggle
          enabled={searchEnabled}
          reduce={reduce}
          onChange={onSearchChange}
        />
        <CreditsModelSelector
          models={models}
          selectedModel={selectedModel}
          disabled={disabled}
          reduce={reduce}
          onModelChange={onModelChange}
        />
      </div>

      <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
        {onVoice && (
          <ActionButton label={t("voiceInput")} onClick={onVoice}>
            <Mic className="size-[18px]" />
          </ActionButton>
        )}
        <motion.button
          type="button"
          disabled={disabled || (!busy && !canSubmit)}
          aria-label={busy ? t("stopResponse") : t("sendMessage")}
          onClick={busy ? onStop : onSubmit}
          whileTap={reduce ? undefined : { scale: 0.94 }}
          transition={SPRING_PRESS}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={busy ? "stop" : "send"}
              initial={reduce ? false : { opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.7 }}
              transition={reduce ? { duration: 0 } : SPRING_SWAP}
            >
              {busy ? (
                <Square className="size-3.5 fill-current" />
              ) : (
                <ArrowUp className="size-[18px]" strokeWidth={2.4} />
              )}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      transition={SPRING_PRESS}
      className="grid size-9 place-items-center rounded-full transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </motion.button>
  );
}
