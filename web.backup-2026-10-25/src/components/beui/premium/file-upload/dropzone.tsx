"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type RefObject, useId } from "react";
import { Button } from "@/components/beui/motion/button";
import { SPRING_PANEL } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { DropzoneIllustration } from "./dropzone-illustration";
import type { FileUploadLabels } from "./file-upload-data";
import { SWAP_VARIANTS } from "./file-upload-motion";
import type { DropzoneState, useDropzone } from "./use-dropzone";

type DropzoneProps = {
  state: DropzoneState;
  labels: FileUploadLabels;
  hint: string;
  invalidMessage: string;
  accept: string;
  multiple: boolean;
  disabled?: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  rootProps: ReturnType<typeof useDropzone>["rootProps"];
  inputProps: ReturnType<typeof useDropzone>["inputProps"];
  onOpen: () => void;
};

/**
 * Drop target. Drag-over scales the zone up a touch and darkens its border
 * while the label swaps to the drop prompt; an invalid drag tints amber and
 * shows the reason. Reduced motion keeps the color shifts, drops the scale.
 */
export function Dropzone({
  state,
  labels,
  hint,
  invalidMessage,
  accept,
  multiple,
  disabled,
  inputRef,
  rootProps,
  inputProps,
  onOpen,
}: DropzoneProps) {
  const reduce = useReducedMotion();
  const hintId = useId();
  const mode = state.kind;
  const heading =
    mode === "over"
      ? labels.dragOver
      : mode === "invalid"
        ? invalidMessage
        : labels.idle;

  return (
    // biome-ignore lint/a11y/useSemanticElements: the drop target wraps the native file input and a Browse button, which a <button> cannot contain.
    <motion.div
      {...rootProps}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={labels.dropzoneLabel}
      aria-describedby={hintId}
      aria-disabled={disabled || undefined}
      onClick={(event) => {
        if (event.target !== inputRef.current) onOpen();
      }}
      animate={{ scale: !reduce && mode === "over" ? 1.015 : 1 }}
      transition={reduce ? { duration: 0 } : SPRING_PANEL}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center rounded-3xl border border-dashed px-6 pt-9 pb-7 text-center outline-none transition-colors duration-200",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        mode === "idle" && "border-border hover:border-foreground/30",
        mode === "over" && "border-foreground/50 bg-foreground/[0.03]",
        mode === "invalid" &&
          "cursor-not-allowed border-amber-500/50 bg-amber-500/5",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept || undefined}
        multiple={multiple}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        {...inputProps}
      />
      <DropzoneIllustration mode={mode} />

      <div className="relative mt-5 flex h-7 w-full items-center justify-center overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={heading}
            variants={reduce ? undefined : SWAP_VARIANTS}
            initial={reduce ? false : "enter"}
            animate="show"
            exit={reduce ? { opacity: 0 } : "exit"}
            className={cn(
              "font-medium text-base",
              mode === "invalid"
                ? "text-amber-700 dark:text-amber-300"
                : "text-foreground",
            )}
          >
            {heading}
          </motion.p>
        </AnimatePresence>
      </div>
      <p id={hintId} className="mt-1 text-muted-foreground text-sm">
        {hint}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        {/* The zone itself is the keyboard target, so this stays out of the tab order. */}
        <Button
          type="button"
          variant="secondary"
          tabIndex={-1}
          aria-hidden="true"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          className="h-9 px-4 text-sm"
        >
          {labels.browse}
        </Button>
        <span className="text-muted-foreground text-xs">
          {labels.pasteHint}
        </span>
      </div>
    </motion.div>
  );
}
