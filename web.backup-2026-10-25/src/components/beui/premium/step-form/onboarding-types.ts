import type { InputHTMLAttributes, ReactNode } from "react";
import type { StepFormAnswers } from "./types";

export type OnboardingMessages = {
  required: string;
  email: string;
  pattern: string;
};
export type OnboardingSlots = Partial<
  Record<
    | "card"
    | "header"
    | "content"
    | "field"
    | "input"
    | "label"
    | "button"
    | "error",
    string
  >
>;
export type OnboardingContext = {
  answers: StepFormAnswers;
  errors: Record<string, string>;
  sectionError: string;
  setAnswer: (id: string, value: string) => void;
};
export type OnboardingFieldContext = OnboardingContext & {
  id: string;
  errorId: string;
  value: string;
  error: string;
  onChange: (value: string) => void;
};
export type OnboardingField = {
  id: string;
  label: string;
  type: "text" | "email" | "select" | "textarea" | "custom";
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  /** Named spans or 1–12 columns of a twelve-column grid. */
  span?: "half" | "third" | "full" | number;
  options?: { value: string; label: string }[];
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  pattern?: string;
  enterKeyHint?: InputHTMLAttributes<HTMLInputElement>["enterKeyHint"];
  autoCapitalize?: string;
  autoCorrect?: string;
  spellCheck?: boolean;
  autoAdvance?: boolean;
  messages?: Partial<OnboardingMessages>;
  validate?: (value: string, answers: StepFormAnswers) => string | undefined;
  render?: (context: OnboardingFieldContext) => ReactNode;
};
export type OnboardingSection = {
  id: string;
  label: string;
  title: string;
  description?: string;
  fields?: OnboardingField[];
  validate?: (
    answers: StepFormAnswers,
  ) => string | Record<string, string> | undefined;
  render?: (context: OnboardingContext) => ReactNode;
  note?: ReactNode | ((context: OnboardingContext) => ReactNode);
  titleAction?: ReactNode | ((context: OnboardingContext) => ReactNode);
};
export type StepFormOnboardingProps = {
  sections?: OnboardingSection[];
  heading?: string;
  subheading?: string;
  /** Numbered section indicators by default, or a compact segmented row. */
  progressStyle?: "steps" | "compact";
  /** Accessible label for the section progress list. */
  progressLabel?: string;
  backLabel?: string;
  continueLabel?: string;
  restartLabel?: string;
  submitLabel?: string;
  successTitle?: string;
  successDescription?: string;
  messages?: Partial<OnboardingMessages>;
  size?: "default" | "comfortable";
  classNames?: OnboardingSlots;
  defaultAnswers?: StepFormAnswers;
  initialSectionId?: string;
  /** Complete after validating the starting section, for summary-page editing. */
  mode?: "flow" | "single-section";
  showSuccess?: boolean;
  fullHeight?: boolean;
  scrollToTop?: boolean;
  focusFirstField?: boolean;
  enterToNextField?: boolean;
  onSectionChange?: (sectionId: string, index: number) => void;
  onComplete?: (answers: StepFormAnswers) => void;
  className?: string;
};
