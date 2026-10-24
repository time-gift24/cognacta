import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

// Shared native fields keep labels, validation, refs, and keyboard behavior standard.
const fieldStyles =
  "w-full border border-border bg-background text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, type = "text", ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(fieldStyles, "h-11 rounded-xl px-3", className)}
      {...props}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(fieldStyles, "min-h-28 resize-y rounded-xl p-3", className)}
      {...props}
    />
  );
});
