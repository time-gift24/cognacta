"use client";

import { type CSSProperties, useRef } from "react";
import { Input } from "@/components/beui/motion/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/beui/motion/select";
import { cn } from "@/lib/beui/utils";
import type {
  OnboardingContext,
  OnboardingField,
  OnboardingSlots,
} from "./onboarding-types";

export function OnboardingFieldControl({
  field,
  prefix,
  context,
  comfortable,
  slots,
  advance,
}: {
  field: OnboardingField;
  prefix: string;
  context: OnboardingContext;
  comfortable: boolean;
  slots: OnboardingSlots;
  advance: (id: string) => void;
}) {
  const composing = useRef(false);
  const id = `${prefix}-${field.id}`;
  const errorId = `${id}-error`;
  const value = context.answers[field.id] ?? "";
  const error = context.errors[field.id] ?? "";
  const onChange = (next: string) => {
    context.setAnswer(field.id, next);
    if (field.autoAdvance && field.maxLength && next.length === field.maxLength)
      advance(field.id);
  };
  const label = (
    <>
      {field.label}
      {field.required ? (
        <span className="ml-1 text-muted-foreground" aria-hidden="true">
          *
        </span>
      ) : null}
    </>
  );
  const labelClass = cn(
    "mb-2 block font-medium text-foreground text-xs",
    comfortable && "text-sm",
    slots.label,
  );
  const inputClass = cn(
    "w-full border-0 bg-muted/55 px-3.5 text-foreground text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:bg-muted focus-visible:ring-2 focus-visible:ring-foreground/10 rounded-full h-10",
    comfortable && "h-11 text-base",
    slots.input,
  );
  const shared = {
    id,
    name: field.id,
    value,
    placeholder: field.placeholder,
    required: field.required,
    autoComplete: field.autoComplete,
    inputMode: field.inputMode,
    maxLength: field.maxLength,
    enterKeyHint: field.enterKeyHint,
    autoCapitalize: field.autoCapitalize,
    autoCorrect: field.autoCorrect,
    spellCheck: field.spellCheck,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? errorId : undefined,
  };
  return (
    <div
      data-onboarding-field={field.id}
      className={cn(
        "min-w-0 [grid-column:span_var(--field-span)]",
        field.span === "half" && "max-sm:col-span-12",
        slots.field,
      )}
      style={
        {
          "--field-span": `${typeof field.span === "number" ? Math.max(1, Math.min(12, Math.trunc(field.span) || 12)) : field.span === "half" ? 6 : field.span === "third" ? 4 : 12}`,
        } as CSSProperties
      }
    >
      {field.type === "select" && !field.render ? (
        <fieldset
          className="min-w-0"
          aria-labelledby={`${id}-label`}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
        >
          <Select value={value} onValueChange={onChange}>
            {/* biome-ignore lint/a11y/noLabelWithoutControl: SelectTrigger renders the labelable button inside this label. */}
            <label>
              <span id={`${id}-label`} className={labelClass}>
                {label}
              </span>
              <SelectTrigger
                className={cn(inputClass, "h-11 py-0", slots.input)}
              >
                <SelectValue placeholder={field.placeholder ?? ""} />
              </SelectTrigger>
            </label>
            <SelectContent className="border-border/55">
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </fieldset>
      ) : (
        <>
          <label htmlFor={id} className={labelClass}>
            {label}
          </label>
          {field.render ? (
            field.render({ ...context, id, errorId, value, error, onChange })
          ) : field.type === "textarea" ? (
            <textarea
              {...shared}
              onChange={(event) => {
                context.setAnswer(field.id, event.target.value);
              }}
              className={cn(
                inputClass,
                "h-auto min-h-24 resize-none rounded-xl py-3",
              )}
            />
          ) : field.type !== "custom" ? (
            <Input
              {...shared}
              error={Boolean(error)}
              type={field.type}
              pattern={field.pattern}
              onChange={(value) => {
                if (composing.current) context.setAnswer(field.id, value);
                else onChange(value);
              }}
              onCompositionStart={() => {
                composing.current = true;
              }}
              onCompositionEnd={(event) => {
                composing.current = false;
                onChange(event.currentTarget.value);
              }}
              className="w-full"
            />
          ) : null}
        </>
      )}
      <p
        id={errorId}
        aria-live="polite"
        className={cn("min-h-5 pt-1 text-destructive text-xs", slots.error)}
      >
        {error}
      </p>
    </div>
  );
}
