"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type FileUploadInitialFile,
  isImage,
  type UploadFn,
  type UploadItem,
} from "./file-upload-data";

export type UploadQueueEvent =
  | { kind: "done"; item: UploadItem }
  | { kind: "failed"; item: UploadItem; reason: string };

type Options = {
  initialFiles: FileUploadInitialFile[];
  upload: UploadFn;
  concurrency?: number;
  fallbackError: string;
  onEvent?: (event: UploadQueueEvent) => void;
  onComplete?: (items: UploadItem[]) => void;
  onRemove?: (id: string) => void;
};

function fromInitial(file: FileUploadInitialFile): UploadItem {
  return {
    type: file.file?.type ?? "",
    status: "queued",
    progress: 0,
    speed: 0,
    ...file,
  };
}

/** Owns upload rows, runs them with limited concurrency, and cleans up. */
export function useUploadQueue({
  initialFiles,
  upload,
  concurrency = 3,
  fallbackError,
  onEvent,
  onComplete,
  onRemove,
}: Options) {
  const [items, setItems] = useState<UploadItem[]>(() =>
    initialFiles.map(fromInitial),
  );
  const controllers = useRef(new Map<string, AbortController>());
  const ownedUrls = useRef(new Set<string>());
  const settledSinceNotify = useRef(false);
  const counter = useRef(0);
  const disposeTimer = useRef<number | undefined>(undefined);
  const latest = useRef({ upload, onEvent, onComplete, onRemove });
  latest.current = { upload, onEvent, onComplete, onRemove };

  const patch = useCallback((id: string, next: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...next } : item)),
    );
  }, []);

  const run = useCallback(
    async (item: UploadItem) => {
      const controller = new AbortController();
      controllers.current.set(item.id, controller);
      const { signal } = controller;
      const file =
        item.file ??
        new File([new Uint8Array(item.size)], item.name, { type: item.type });
      let last = { time: performance.now(), loaded: item.progress * item.size };
      let speed = 0;
      try {
        await latest.current.upload(file, {
          signal,
          resumeFrom: item.progress,
          onProgress: (fraction) => {
            if (signal.aborted) return;
            const now = performance.now();
            const loaded = Math.min(1, Math.max(0, fraction)) * item.size;
            const elapsed = (now - last.time) / 1000;
            if (elapsed > 0.05) {
              const instant = Math.max(0, loaded - last.loaded) / elapsed;
              speed = speed ? speed * 0.7 + instant * 0.3 : instant;
              last = { time: now, loaded };
            }
            patch(item.id, { progress: loaded / item.size || 0, speed });
          },
        });
        if (signal.aborted) return;
        const done = { ...item, status: "done" as const, progress: 1 };
        patch(item.id, { status: "done", progress: 1, speed: 0 });
        settledSinceNotify.current = true;
        latest.current.onEvent?.({ kind: "done", item: done });
      } catch (error) {
        if (signal.aborted) return;
        const reason =
          error instanceof Error && error.message
            ? error.message
            : fallbackError;
        patch(item.id, { status: "failed", error: reason, speed: 0 });
        settledSinceNotify.current = true;
        latest.current.onEvent?.({ kind: "failed", item, reason });
      } finally {
        if (controllers.current.get(item.id) === controller)
          controllers.current.delete(item.id);
      }
    },
    [patch, fallbackError],
  );

  // Scheduler: start queued rows while there is spare concurrency.
  useEffect(() => {
    let active = controllers.current.size;
    const starting: UploadItem[] = [];
    for (const item of items) {
      if (active >= concurrency) break;
      if (item.status !== "queued" || controllers.current.has(item.id))
        continue;
      starting.push(item);
      active += 1;
    }
    if (starting.length === 0) return;
    const ids = new Set(starting.map((item) => item.id));
    setItems((current) =>
      current.map((item) =>
        ids.has(item.id) ? { ...item, status: "uploading" } : item,
      ),
    );
    for (const item of starting) void run(item);
  }, [items, concurrency, run]);

  // Notify once a batch settles with nothing left running.
  useEffect(() => {
    if (!settledSinceNotify.current) return;
    const busy = items.some(
      (item) => item.status === "queued" || item.status === "uploading",
    );
    if (busy) return;
    settledSinceNotify.current = false;
    const done = items.filter((item) => item.status === "done");
    if (done.length) latest.current.onComplete?.(done);
  }, [items]);

  // Abort in-flight uploads and release object URLs on unmount. Disposal is
  // deferred a tick so a Strict Mode remount keeps live uploads and previews.
  useEffect(() => {
    window.clearTimeout(disposeTimer.current);
    const running = controllers.current;
    const urls = ownedUrls.current;
    return () => {
      disposeTimer.current = window.setTimeout(() => {
        for (const controller of running.values()) controller.abort();
        for (const url of urls) URL.revokeObjectURL(url);
      }, 0);
    };
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const added = files.map<UploadItem>((file) => {
      counter.current += 1;
      let previewUrl: string | undefined;
      if (isImage(file)) {
        previewUrl = URL.createObjectURL(file);
        ownedUrls.current.add(previewUrl);
      }
      return {
        id: `upload-${Date.now().toString(36)}-${counter.current}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "queued",
        progress: 0,
        speed: 0,
        previewUrl,
        file,
      };
    });
    setItems((current) => [...current, ...added]);
    return added;
  }, []);

  const removeMany = useCallback((ids: string[]) => {
    const set = new Set(ids);
    for (const id of ids) {
      controllers.current.get(id)?.abort();
      controllers.current.delete(id);
    }
    setItems((current) => {
      for (const item of current) {
        if (!set.has(item.id) || !item.previewUrl) continue;
        if (ownedUrls.current.delete(item.previewUrl))
          URL.revokeObjectURL(item.previewUrl);
      }
      return current.filter((item) => !set.has(item.id));
    });
    for (const id of ids) latest.current.onRemove?.(id);
  }, []);

  const pause = useCallback(
    (id: string) => {
      controllers.current.get(id)?.abort();
      controllers.current.delete(id);
      patch(id, { status: "paused", speed: 0 });
    },
    [patch],
  );

  const resume = useCallback(
    (id: string) => patch(id, { status: "queued" }),
    [patch],
  );

  const retry = useCallback(
    (id: string) =>
      patch(id, { status: "queued", progress: 0, error: undefined }),
    [patch],
  );

  const remove = useCallback((id: string) => removeMany([id]), [removeMany]);

  return { items, addFiles, pause, resume, retry, remove };
}
