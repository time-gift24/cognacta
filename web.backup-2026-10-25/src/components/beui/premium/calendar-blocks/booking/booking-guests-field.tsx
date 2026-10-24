"use client";

import { Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { EASE_IN, EASE_OUT } from "@/lib/beui/ease";
import type { BookingLabels } from "./booking-data";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type BookingGuestsFieldProps = {
  guests: string[];
  onChange: (guests: string[]) => void;
  disabled?: boolean;
  labels: BookingLabels;
  reduce: boolean;
};

/** Optional guest emails entered one at a time and shown as removable chips. */
export function BookingGuestsField({
  guests,
  onChange,
  disabled,
  labels,
  reduce,
}: BookingGuestsFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function addGuest() {
    const value = draft.trim().replace(/,$/, "");
    if (!value) return;
    if (!EMAIL_PATTERN.test(value)) {
      setError(labels.guestError);
      return;
    }
    if (!guests.includes(value)) onChange([...guests, value]);
    setDraft("");
    setError("");
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        id={id}
        label={labels.guestsLabel}
        type="email"
        value={draft}
        disabled={disabled}
        placeholder={labels.guestsPlaceholder}
        error={error || undefined}
        onChange={(value) => {
          setDraft(value);
          if (error) setError("");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addGuest();
          }
        }}
        rightIcon={
          <Button
            variant="plain"
            aria-label={labels.addGuest}
            disabled={disabled || !draft.trim()}
            onClick={addGuest}
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus aria-hidden />
          </Button>
        }
      />
      <ul
        aria-label={labels.guestsLabel}
        className="flex flex-wrap gap-1.5 empty:hidden"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {guests.map((guest) => (
            <motion.li
              key={guest}
              layout={!reduce}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: { duration: 0.2, ease: EASE_OUT },
              }}
              exit={{
                opacity: 0,
                scale: reduce ? 1 : 0.9,
                transition: { duration: 0.12, ease: EASE_IN },
              }}
              className="flex h-8 items-center gap-1 rounded-full border border-border bg-background pr-1 pl-3 text-xs"
            >
              <span className="max-w-48 truncate">{guest}</span>
              <Button
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label={`${labels.removeGuest} ${guest}`}
                onClick={() =>
                  onChange(guests.filter((item) => item !== guest))
                }
                className="relative size-6 after:absolute after:-inset-2"
              >
                <X aria-hidden className="size-3" />
              </Button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
