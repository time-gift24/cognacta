"use client";

import { AnimatePresence } from "motion/react";
import { type ClipboardEvent, type KeyboardEvent, useId, useRef } from "react";
import { Input } from "@/components/beui/motion/input";
import { cn } from "@/lib/beui/utils";
import { EmailChip } from "./email-chip";
import {
  CHIP_SEPARATORS,
  type EmailChipData,
  splitEmails,
} from "./parse-emails";
import type { ChipShake } from "./use-email-chips";

export type EmailChipInputProps = {
  chips: readonly EmailChipData[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: (entries: readonly string[]) => void;
  onCommitDraft: () => void;
  onRemove: (id: string) => void;
  onRemoveLast: () => void;
  shake: ChipShake | null;
  /** True while invites are being sent: chips drop toward the list. */
  sending: boolean;
  disabled?: boolean;
  label: string;
  placeholder: string;
  hint: string;
  status?: string | null;
};

/**
 * A field that turns typed or pasted addresses into chips. Enter, comma,
 * semicolon, and space commit the draft; Backspace on an empty draft removes
 * the last chip; pasting a list adds every address at once.
 */
export function EmailChipInput({
  chips,
  draft,
  onDraftChange,
  onAdd,
  onCommitDraft,
  onRemove,
  onRemoveLast,
  shake,
  sending,
  disabled,
  label,
  placeholder,
  hint,
  status,
}: EmailChipInputProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const separator = (CHIP_SEPARATORS as readonly string[]).includes(
      event.key,
    );
    if (event.key === "Enter" || separator) {
      if (!draft.trim()) {
        if (separator) event.preventDefault();
        return;
      }
      event.preventDefault();
      onCommitDraft();
    } else if (event.key === "Backspace" && !draft && chips.length > 0) {
      event.preventDefault();
      onRemoveLast();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    const entries = splitEmails(`${draft} ${text}`);
    if (entries.length < 2 && !/[\s,;]/.test(text.trim())) return;
    event.preventDefault();
    onAdd(entries);
    onDraftChange("");
  }

  // Soft keyboards may skip keydown for separators, so split on change too.
  function handleChange(value: string) {
    if (!/[\s,;]/.test(value)) {
      onDraftChange(value);
      return;
    }
    const parts = value.split(/[\s,;]+/);
    const trailing = parts.pop() ?? "";
    const complete = parts.filter(Boolean);
    if (complete.length) onAdd(complete);
    onDraftChange(trailing);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="px-1 font-medium text-foreground text-sm">
        {label}
      </label>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: clicking the field surface focuses its input; the input itself stays keyboard-accessible. */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard users reach the input directly. */}
      <div
        onClick={(event) => {
          if (event.target === event.currentTarget) inputRef.current?.focus();
        }}
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1.5 rounded-3xl border border-border bg-background p-1 transition-colors duration-200",
          "focus-within:border-foreground/60",
          disabled && "opacity-60",
        )}
      >
        <AnimatePresence initial={false}>
          {chips.map((chip, index) => (
            <EmailChip
              key={chip.id}
              chip={chip}
              shakeNonce={shake?.id === chip.id ? shake.nonce : undefined}
              exit={{ sent: sending, index }}
              disabled={disabled}
              onRemove={onRemove}
            />
          ))}
        </AnimatePresence>
        <Input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="email"
          autoComplete="off"
          spellCheck={false}
          value={draft}
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={onCommitDraft}
          placeholder={chips.length ? "" : placeholder}
          aria-describedby={`${id}-hint`}
          className="min-w-40 flex-1"
          classNames={{
            field: "h-8 border-0 bg-transparent",
            input: "pl-2",
          }}
        />
      </div>
      <p id={`${id}-hint`} className="px-1 text-muted-foreground text-xs">
        {hint}
      </p>
      <span className="sr-only" aria-live="polite">
        {status ?? ""}
      </span>
    </div>
  );
}
