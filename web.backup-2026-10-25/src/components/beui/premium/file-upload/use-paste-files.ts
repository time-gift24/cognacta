"use client";

import { type RefObject, useEffect, useRef } from "react";

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA")
  );
}

function extension(type: string) {
  const sub = type.split("/")[1] ?? "png";
  return sub === "jpeg" ? "jpg" : sub.replace("+xml", "");
}

/**
 * Accepts Cmd/Ctrl+V of files while focus is inside `scope` or nowhere in
 * particular, so pasting into other fields on the page is left alone.
 * Clipboard images get a readable, unique file name.
 */
export function usePasteFiles(
  scope: RefObject<HTMLElement | null>,
  onFiles: (files: File[]) => void,
  enabled = true,
) {
  const handler = useRef(onFiles);
  handler.current = onFiles;

  useEffect(() => {
    if (!enabled) return;
    function onPaste(event: ClipboardEvent) {
      const active = document.activeElement;
      const inScope = scope.current?.contains(active) ?? false;
      const unfocused = !active || active === document.body;
      if ((!inScope && !unfocused) || isEditable(event.target)) return;
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length === 0) return;
      event.preventDefault();
      const stamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[-:]/g, "")
        .replace("T", "-");
      handler.current(
        files.map((file, index) =>
          /^image\.\w+$/i.test(file.name) || !file.name
            ? new File(
                [file],
                `pasted-${stamp}${index ? `-${index + 1}` : ""}.${extension(file.type)}`,
                { type: file.type, lastModified: file.lastModified },
              )
            : file,
        ),
      );
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [scope, enabled]);
}
