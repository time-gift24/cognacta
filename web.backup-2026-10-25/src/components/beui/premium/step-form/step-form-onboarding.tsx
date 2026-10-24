"use client";

import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { OnboardingFieldControl } from "./onboarding-field";
import type {
  OnboardingSection,
  StepFormOnboardingProps,
} from "./onboarding-types";
import type { StepFormAnswers } from "./types";

export type {
  OnboardingContext,
  OnboardingField,
  OnboardingFieldContext,
  OnboardingMessages,
  OnboardingSection,
  OnboardingSlots,
  StepFormOnboardingProps,
} from "./onboarding-types";

const ONBOARDING_SECTIONS: OnboardingSection[] = [
  {
    id: "profile",
    label: "Profile",
    title: "Tell us about you",
    description: "Start with the basics. You can change these details later.",
    fields: [
      {
        id: "firstName",
        label: "First name",
        type: "text",
        placeholder: "Alex",
        autoComplete: "given-name",
        required: true,
        span: "half",
      },
      {
        id: "lastName",
        label: "Last name",
        type: "text",
        placeholder: "Morgan",
        autoComplete: "family-name",
        required: true,
        span: "half",
      },
      {
        id: "email",
        label: "Work email",
        type: "email",
        placeholder: "alex@company.com",
        autoComplete: "email",
        required: true,
        span: "full",
      },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    title: "Set up your workspace",
    description: "A few details help us prepare the right starting point.",
    fields: [
      {
        id: "company",
        label: "Company or team",
        type: "text",
        placeholder: "Acme Studio",
        autoComplete: "organization",
        required: true,
        span: "full",
      },
      {
        id: "role",
        label: "Your role",
        type: "select",
        placeholder: "Select a role",
        required: true,
        span: "half",
        options: [
          { value: "founder", label: "Founder" },
          { value: "design", label: "Design" },
          { value: "engineering", label: "Engineering" },
          { value: "product", label: "Product" },
        ],
      },
      {
        id: "teamSize",
        label: "Team size",
        type: "select",
        placeholder: "Select a size",
        required: true,
        span: "half",
        options: [
          { value: "1", label: "Just me" },
          { value: "2-10", label: "2–10 people" },
          { value: "11-50", label: "11–50 people" },
          { value: "51+", label: "51+ people" },
        ],
      },
    ],
  },
  {
    id: "goals",
    label: "Goals",
    title: "What should we optimize for?",
    description: "Give the workspace a little context before you arrive.",
    fields: [
      {
        id: "website",
        label: "Company website",
        type: "text",
        placeholder: "company.com",
        autoComplete: "url",
        span: "full",
      },
      {
        id: "goal",
        label: "Primary goal",
        type: "select",
        placeholder: "Choose your main goal",
        required: true,
        span: "full",
        options: [
          { value: "launch", label: "Launch something new" },
          { value: "improve", label: "Improve an existing product" },
          { value: "explore", label: "Explore and prototype" },
        ],
      },
      {
        id: "context",
        label: "Anything else we should know?",
        type: "textarea",
        placeholder: "A short note about what you are building",
        span: "full",
      },
    ],
  },
];

export function StepFormOnboarding({
  sections = ONBOARDING_SECTIONS,
  submitLabel = "Create workspace",
  successTitle = "Your workspace is ready.",
  successDescription = "Everything is set up. You can start inviting your team.",
  onComplete,
  heading = "Set up your account",
  subheading = "Usually takes less than two minutes",
  progressStyle = "steps",
  progressLabel = "Progress",
  backLabel = "Back",
  continueLabel = "Continue",
  restartLabel = "Start again",
  messages,
  size = "default",
  classNames = {},
  defaultAnswers = {},
  initialSectionId,
  mode = "flow",
  showSuccess = true,
  fullHeight = false,
  scrollToTop = false,
  focusFirstField = false,
  enterToNextField = false,
  onSectionChange,
  className,
}: StepFormOnboardingProps) {
  const reduce = useReducedMotion();
  const safeSections = sections.length ? sections : ONBOARDING_SECTIONS;
  const startIndex = Math.max(
    0,
    safeSections.findIndex((item) => item.id === initialSectionId),
  );
  const [activeIndex, setSectionIndex] = useState(startIndex);
  const sectionIndex = Math.min(activeIndex, safeSections.length - 1);
  const prefix = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const comfortable = size === "comfortable";
  const compactProgress = progressStyle === "compact";
  const buttonClass = cn(
    comfortable && "h-11 min-h-11 text-base",
    classNames.button,
  );
  const [sectionError, setSectionError] = useState("");
  const copy = {
    required: "This is required.",
    email: "Enter a valid email address.",
    pattern: "Enter a valid value.",
    ...messages,
  };
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<StepFormAnswers>(() => ({
    ...defaultAnswers,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [complete, setComplete] = useState(false);
  const section = safeSections[sectionIndex];
  const lastSection =
    mode === "single-section" || sectionIndex === safeSections.length - 1;

  const updateAnswer = (id: string, value: string) => {
    setSectionError("");
    setAnswers((current) => ({ ...current, [id]: value }));
    setErrors((current) => ({ ...current, [id]: "" }));
  };

  const context = { answers, errors, sectionError, setAnswer: updateAnswer };
  const fieldNodes = () =>
    Array.from(
      contentRef.current?.querySelectorAll<HTMLElement>(
        "[data-onboarding-field]",
      ) ?? [],
    );
  const focusField = (id: string) => {
    const node = fieldNodes().find(
      (node) => node.dataset.onboardingField === id,
    );
    node
      ?.querySelector<HTMLElement>(
        "input:not(:disabled), textarea:not(:disabled), button:not(:disabled), [tabindex='0']",
      )
      ?.focus();
  };
  const advance = (id: string) => {
    const nodes = fieldNodes();
    const index = nodes.findIndex(
      (node) => node.dataset.onboardingField === id,
    );
    const next = nodes[index + 1];
    if (next?.dataset.onboardingField) focusField(next.dataset.onboardingField);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: Re-run after each section transition even when focus options stay the same.
  useEffect(() => {
    if (complete || (!scrollToTop && !focusFirstField)) return;
    // Wait for the outgoing and incoming panels before moving focus or scroll.
    const timer = window.setTimeout(
      () => {
        if (scrollToTop) {
          if (contentRef.current) contentRef.current.scrollTop = 0;
          cardRef.current?.scrollIntoView({
            block: "start",
            behavior: reduce ? "instant" : "smooth",
          });
        }
        if (focusFirstField)
          contentRef.current
            ?.querySelector<HTMLElement>("[data-onboarding-body]")
            ?.querySelector<HTMLElement>(
              "input:not(:disabled), textarea:not(:disabled), button:not(:disabled), [tabindex='0']",
            )
            ?.focus({ preventScroll: true });
      },
      reduce ? 0 : 460,
    );
    return () => window.clearTimeout(timer);
  }, [sectionIndex, complete, scrollToTop, focusFirstField, reduce]);
  const changeSection = (index: number) => {
    setErrors({});
    setSectionError("");
    setSectionIndex(index);
    onSectionChange?.(safeSections[index].id, index);
  };
  const validateSection = () => {
    const nextErrors: Record<string, string> = {};
    for (const field of section.fields ?? []) {
      const value = answers[field.id] ?? "";
      const fieldCopy = { ...copy, ...field.messages };
      if (field.required && !value.trim())
        nextErrors[field.id] = fieldCopy.required;
      else if (
        field.type === "email" &&
        value.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
      )
        nextErrors[field.id] = fieldCopy.email;
      else if (
        field.pattern &&
        value &&
        !new RegExp(`^(?:${field.pattern})$`, "v").test(value)
      )
        nextErrors[field.id] = fieldCopy.pattern;
      if (!nextErrors[field.id]) {
        const error = field.validate?.(value, answers);
        if (error) nextErrors[field.id] = error;
      }
    }
    const result = section.validate?.(answers);
    const message = typeof result === "string" ? result : "";
    if (result && typeof result !== "string") Object.assign(nextErrors, result);
    setErrors(nextErrors);
    setSectionError(message);
    const firstError = Object.keys(nextErrors).find((id) => nextErrors[id]);
    if (firstError) focusField(firstError);
    else if (message) contentRef.current?.focus();
    return !firstError && !message;
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateSection()) return;
    if (lastSection) {
      if (showSuccess) setComplete(true);
      onComplete?.({ ...answers });
      return;
    }
    setDirection(1);
    changeSection(sectionIndex + 1);
  };
  const back = () => {
    if (sectionIndex === 0 || mode === "single-section") return;
    setDirection(-1);
    changeSection(sectionIndex - 1);
  };
  const restart = () => {
    setAnswers({ ...defaultAnswers });
    setDirection(-1);
    changeSection(startIndex);
    setComplete(false);
  };

  const swap = {
    initial: reduce
      ? false
      : { opacity: 0, transform: `translateX(${direction * 18}px)` },
    animate: { opacity: 1, transform: "translateX(0px)" },
    exit: reduce
      ? { opacity: 0 }
      : { opacity: 0, transform: `translateX(${direction * -14}px)` },
    transition: reduce ? { duration: 0 } : { duration: 0.22, ease: EASE_OUT },
  };

  return (
    <section
      className={cn(
        "w-full px-4 py-12 sm:px-6",
        fullHeight && "h-dvh py-0",
        className,
      )}
    >
      <motion.div
        ref={cardRef}
        layout={reduce || fullHeight ? false : "size"}
        transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
        className={cn(
          "mx-auto w-full max-w-3xl rounded-2xl border border-border/55 bg-background",
          fullHeight && "flex h-full min-h-0 flex-col",
          classNames.card,
        )}
      >
        <div
          className={cn(
            "shrink-0 border-border/45 border-b px-5 py-5 sm:px-8",
            classNames.header,
          )}
        >
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="font-medium text-foreground text-sm tracking-tight">
                {heading}
              </p>
              {subheading ? (
                <p className="mt-0.5 text-muted-foreground text-xs">
                  {subheading}
                </p>
              ) : null}
            </div>
            {!complete ? (
              <span className="shrink-0 rounded-full border border-border/60 px-2.5 py-1 font-mono text-muted-foreground text-xs tabular-nums">
                {sectionIndex + 1} / {safeSections.length}
              </span>
            ) : null}
          </div>
          {!complete ? (
            <ol
              aria-label={progressLabel}
              data-progress-style={progressStyle}
              className={cn(
                "mt-6 grid",
                compactProgress ? "gap-2" : "gap-3 overflow-x-auto pb-1",
              )}
              style={{
                gridTemplateColumns: `repeat(${safeSections.length}, minmax(${compactProgress ? "0" : "5rem"}, 1fr))`,
              }}
            >
              {safeSections.map((item, index) => {
                const current = index === sectionIndex;
                const completed = index < sectionIndex;
                return (
                  <li
                    key={item.id}
                    className="min-w-0"
                    aria-current={current ? "step" : undefined}
                    aria-label={item.label}
                  >
                    {compactProgress ? (
                      <>
                        <span className="sr-only">{item.label}</span>
                        <span
                          aria-hidden="true"
                          className="relative block h-1.5 overflow-hidden rounded-full bg-muted"
                        >
                          <motion.span
                            className="absolute inset-0 origin-left rounded-full bg-foreground"
                            initial={false}
                            animate={{
                              scaleX: current || completed ? 1 : 0,
                              opacity: completed ? 0.6 : 1,
                            }}
                            transition={
                              reduce ? { duration: 0 } : SPRING_LAYOUT
                            }
                          />
                        </span>
                      </>
                    ) : (
                      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-2.5">
                        <span
                          className={cn(
                            "grid size-7 shrink-0 place-items-center rounded-full border font-medium text-xs transition-colors",
                            current
                              ? "border-foreground bg-foreground text-background"
                              : completed
                                ? "border-border bg-muted text-foreground"
                                : "border-border/70 text-muted-foreground",
                          )}
                        >
                          {completed ? <Check className="size-3" /> : index + 1}
                        </span>
                        <span
                          className={cn(
                            "truncate text-xs transition-colors",
                            current
                              ? "font-medium text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {item.label}
                        </span>
                        {index < safeSections.length - 1 ? (
                          <div
                            aria-hidden="true"
                            className="relative ml-1 hidden h-px min-w-2 flex-1 overflow-hidden bg-border/60 sm:block"
                          >
                            <motion.div
                              className="absolute inset-0 origin-left bg-foreground/40"
                              initial={false}
                              animate={{ scaleX: completed ? 1 : 0 }}
                              transition={
                                reduce ? { duration: 0 } : SPRING_LAYOUT
                              }
                            />
                          </div>
                        ) : null}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>

        <form
          onSubmit={submit}
          noValidate
          className={fullHeight ? "flex min-h-0 flex-1 flex-col" : undefined}
          onKeyDown={(event) => {
            if (
              !enterToNextField ||
              event.key !== "Enter" ||
              event.nativeEvent.isComposing ||
              event.shiftKey ||
              event.ctrlKey ||
              event.metaKey ||
              event.altKey ||
              !(event.target instanceof HTMLInputElement) ||
              event.target.type === "checkbox" ||
              event.target.type === "radio"
            )
              return;
            const node = event.target.closest<HTMLElement>(
              "[data-onboarding-field]",
            );
            if (!node?.dataset.onboardingField) return;
            const nodes = fieldNodes();
            if (nodes.indexOf(node) < nodes.length - 1) {
              event.preventDefault();
              advance(node.dataset.onboardingField);
            }
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {complete ? (
              <motion.div
                key="complete"
                {...swap}
                className="px-6 py-16 text-center sm:px-10 sm:py-20"
              >
                <motion.span
                  initial={reduce ? false : { opacity: 0, scale: 0.86 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                  className="mx-auto grid size-11 place-items-center rounded-full bg-foreground text-background"
                >
                  <Check className="size-5" />
                </motion.span>
                <h2 className="mt-5 text-foreground tracking-tight text-xl font-medium">
                  {successTitle}
                </h2>
                {successDescription ? (
                  <p className="mx-auto mt-2 max-w-sm text-muted-foreground text-sm leading-6">
                    {successDescription}
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={restart}
                  className={cn("mt-5 rounded-full h-9", buttonClass)}
                >
                  <RotateCcw className="size-3.5" />
                  {restartLabel}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key={section.id}
                {...swap}
                ref={contentRef}
                tabIndex={-1}
                aria-labelledby={`${prefix}-title`}
                className={cn(
                  "px-5 pt-7 pb-6 sm:px-8 sm:pt-9 sm:pb-8 outline-none",
                  fullHeight && "min-h-0 flex-1 overflow-y-auto",
                  classNames.content,
                )}
              >
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-[0.14em]">
                  {section.label}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <h2
                    id={`${prefix}-title`}
                    className="text-foreground tracking-tight text-xl font-medium"
                  >
                    {section.title}
                  </h2>
                  {typeof section.titleAction === "function"
                    ? section.titleAction(context)
                    : section.titleAction}
                </div>
                {section.description ? (
                  <p className="mt-2 max-w-lg text-muted-foreground text-sm leading-6">
                    {section.description}
                  </p>
                ) : null}
                {section.render ? (
                  <div data-onboarding-body className="mt-7">
                    {section.render(context)}
                  </div>
                ) : (
                  <div
                    data-onboarding-body
                    className="mt-7 grid grid-cols-12 gap-x-4 gap-y-5"
                  >
                    {section.fields?.map((field) => (
                      <OnboardingFieldControl
                        key={field.id}
                        field={field}
                        prefix={prefix}
                        context={context}
                        comfortable={comfortable}
                        slots={classNames}
                        advance={advance}
                      />
                    ))}
                  </div>
                )}
                {section.note ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {typeof section.note === "function"
                      ? section.note(context)
                      : section.note}
                  </div>
                ) : null}
                {sectionError ? (
                  <p
                    role="alert"
                    className={cn(
                      "mt-3 text-sm text-destructive",
                      classNames.error,
                    )}
                  >
                    {sectionError}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={back}
                    disabled={sectionIndex === 0 || mode === "single-section"}
                    className={cn("-ml-3 rounded-full h-9", buttonClass)}
                  >
                    <ArrowLeft className="size-3.5" />
                    {backLabel}
                  </Button>
                  <Button type="submit" size="md" className={buttonClass}>
                    {lastSection ? submitLabel : continueLabel}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
    </section>
  );
}
