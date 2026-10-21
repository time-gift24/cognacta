"use client";

import { type FormEvent, useId, useState } from "react";
import {
  Button,
  type ButtonState,
  StatefulButton,
} from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import type { BookingDetails, BookingLabels } from "./booking-data";
import { BookingGuestsField, EMAIL_PATTERN } from "./booking-guests-field";

type BookingFormProps = {
  status: ButtonState;
  submitError: string;
  labels: BookingLabels;
  reduce: boolean;
  onSubmit: (details: BookingDetails) => void;
  onCancel: () => void;
};

export function BookingForm({
  status,
  submitError,
  labels,
  reduce,
  onSubmit,
  onCancel,
}: BookingFormProps) {
  const id = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [guests, setGuests] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const busy = status === "loading" || status === "success";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = {
      name: name.trim() ? undefined : labels.nameError,
      email: EMAIL_PATTERN.test(email.trim()) ? undefined : labels.emailError,
    };
    setErrors(next);
    if (next.name || next.email) return;
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      notes: notes.trim(),
      guests,
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={labels.nameLabel}
          value={name}
          autoComplete="name"
          disabled={busy}
          placeholder={labels.namePlaceholder}
          error={errors.name}
          onChange={(value) => {
            setName(value);
            if (errors.name)
              setErrors((current) => ({ ...current, name: undefined }));
          }}
        />
        <Input
          label={labels.emailLabel}
          type="email"
          value={email}
          autoComplete="email"
          disabled={busy}
          placeholder={labels.emailPlaceholder}
          error={errors.email}
          onChange={(value) => {
            setEmail(value);
            if (errors.email)
              setErrors((current) => ({ ...current, email: undefined }));
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-notes`} className="px-1 font-medium text-sm">
          {labels.notesLabel}
        </label>
        <textarea
          id={`${id}-notes`}
          rows={3}
          value={notes}
          disabled={busy}
          placeholder={labels.notesPlaceholder}
          onChange={(event) => setNotes(event.target.value)}
          className="w-full resize-none rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors duration-200 placeholder:text-muted-foreground/60 focus:border-foreground/60 disabled:opacity-60"
        />
      </div>

      <BookingGuestsField
        guests={guests}
        onChange={setGuests}
        disabled={busy}
        labels={labels}
        reduce={reduce}
      />

      <p aria-live="polite" className="min-h-4 px-1 text-destructive text-xs">
        {status === "error" ? submitError : ""}
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={busy}
        >
          {labels.cancel}
        </Button>
        <StatefulButton
          type="submit"
          state={status}
          loadingText={labels.submitting}
          successText={labels.submitted}
          errorText={labels.submit}
          className="min-w-32"
        >
          {labels.submit}
        </StatefulButton>
      </div>
    </form>
  );
}
