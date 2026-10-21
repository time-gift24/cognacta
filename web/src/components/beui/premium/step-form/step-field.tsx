"use client";

import { Check } from "lucide-react";
import { type MotionConfigProps, motion } from "motion/react";
import { useId } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type { StepFormStep } from "./types";

type StepFieldProps = {
  step: StepFormStep;
  value: string;
  error: string;
  reduce: boolean | null;
  onChange: (value: string) => void;
};

export function StepField({
  step,
  value,
  error,
  reduce,
  onChange,
}: StepFieldProps) {
  const selectionId = useId();
  const transition: MotionConfigProps["transition"] = reduce
    ? { duration: 0 }
    : SPRING_LAYOUT;

  if (step.type === "choice") {
    return (
      <fieldset className="grid gap-2" aria-describedby={`${step.id}-error`}>
        <legend className="sr-only">{step.title}</legend>
        {step.options.map((option) => {
          const selected = value === option.value;

          return (
            <div
              key={option.value}
              className={cn(
                "relative isolate flex min-h-14 w-full items-center justify-between gap-4 overflow-hidden rounded-xl border border-border/60 px-4 py-3 text-left text-foreground transition-colors has-[:focus-visible]:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                !selected && "hover:border-border",
              )}
            >
              {selected ? (
                <motion.span
                  layoutId={`step-form-choice-${selectionId}`}
                  aria-hidden="true"
                  initial={reduce ? false : { opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 -z-10 bg-muted"
                  transition={transition}
                />
              ) : null}
              <span className="min-w-0">
                <span className="block font-medium text-sm">
                  {option.label}
                </span>
                {option.description ? (
                  <span className="mt-0.5 block text-muted-foreground text-xs leading-5">
                    {option.description}
                  </span>
                ) : null}
              </span>
              <motion.span
                initial={false}
                animate={
                  reduce
                    ? undefined
                    : {
                        opacity: selected ? 1 : 0.45,
                        scale: selected ? 1 : 0.82,
                        rotate: selected ? 0 : -8,
                      }
                }
                transition={transition}
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border",
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-transparent",
                )}
              >
                <Check className="size-3" strokeWidth={2.5} />
              </motion.span>
              {/* Full-option control; the shared Button is always pill-shaped, so the
                  option keeps its own radius and this sits on top. */}
              <Button
                variant="plain"
                type="button"
                aria-label={option.label}
                aria-pressed={selected}
                onClick={() => onChange(option.value)}
                whileHover={undefined}
                whileTap={undefined}
                className="absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          );
        })}
        <FieldError id={`${step.id}-error`} error={error} />
      </fieldset>
    );
  }

  return (
    <div>
      <label htmlFor={step.id} className="sr-only">
        {step.title}
      </label>
      <Input
        id={step.id}
        name={step.id}
        type={step.type}
        value={value}
        autoComplete={step.autoComplete}
        placeholder={step.placeholder}
        error={Boolean(error)}
        aria-describedby={`${step.id}-error`}
        onChange={(event) => onChange(event)}
        className="w-full"
        classNames={{
          input:
            "px-4 text-foreground text-base placeholder:text-muted-foreground/65",
        }}
      />
      <FieldError id={`${step.id}-error`} error={error} />
    </div>
  );
}

function FieldError({ id, error }: { id: string; error: string }) {
  return (
    <p
      id={id}
      aria-live="polite"
      className="min-h-6 pt-1.5 text-destructive text-xs"
    >
      {error}
    </p>
  );
}
