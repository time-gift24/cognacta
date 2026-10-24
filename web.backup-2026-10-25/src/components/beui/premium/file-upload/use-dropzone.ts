"use client";

import {
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import { type FileRejection, validateDragItems } from "./file-validation";

export type DropzoneState =
  | { kind: "idle" }
  | { kind: "over" }
  | { kind: "invalid"; reason: FileRejection };

type Options = {
  accept: string[];
  remaining: number;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
};

function hasFiles(event: DragEvent) {
  return Array.from(event.dataTransfer.types).includes("Files");
}

/**
 * Drag, drop, and browse wiring for a drop target. Tracks drag depth so
 * moving across child elements does not flicker the state.
 */
export function useDropzone({ accept, remaining, disabled, onFiles }: Options) {
  const [state, setState] = useState<DropzoneState>({ kind: "idle" });
  const depth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const onDragEnter = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (disabled || !hasFiles(event)) return;
      event.preventDefault();
      depth.current += 1;
      const items = Array.from(event.dataTransfer.items ?? []).map((item) => ({
        kind: item.kind,
        type: item.type,
      }));
      const reason = validateDragItems(items, { accept, remaining });
      setState(reason ? { kind: "invalid", reason } : { kind: "over" });
    },
    [accept, remaining, disabled],
  );

  const onDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (disabled || !hasFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect =
        state.kind === "invalid" ? "none" : "copy";
    },
    [disabled, state.kind],
  );

  const onDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    if (!hasFiles(event)) return;
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setState({ kind: "idle" });
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current = 0;
      setState({ kind: "idle" });
      if (disabled) return;
      const files = Array.from(event.dataTransfer.files);
      if (files.length) onFiles(files);
    },
    [disabled, onFiles],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    },
    [open],
  );

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      // Reset so choosing the same file again still fires a change.
      event.target.value = "";
      if (files.length) onFiles(files);
    },
    [onFiles],
  );

  return {
    state,
    inputRef,
    open,
    rootProps: { onDragEnter, onDragOver, onDragLeave, onDrop, onKeyDown },
    inputProps: { onChange: onInputChange },
  };
}
