"use client";

import type { LucideIcon } from "lucide-react";
import { Pause, Play, RotateCcw, Trash2, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import type { FileUploadLabels, UploadItem } from "./file-upload-data";

export type FileRowHandlers = {
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
};

type Action = {
  key: string;
  /** Toggle actions share a slot so focus survives pause → resume. */
  slot: "toggle" | "dismiss";
  label: string;
  icon: LucideIcon;
  run: () => void;
};

function actionsFor(
  item: UploadItem,
  labels: FileUploadLabels,
  handlers: FileRowHandlers,
): Action[] {
  const pause: Action = {
    key: "pause",
    slot: "toggle",
    label: labels.pause,
    icon: Pause,
    run: () => handlers.onPause(item.id),
  };
  const resume: Action = {
    key: "resume",
    slot: "toggle",
    label: labels.resume,
    icon: Play,
    run: () => handlers.onResume(item.id),
  };
  const retry: Action = {
    key: "retry",
    slot: "toggle",
    label: labels.retry,
    icon: RotateCcw,
    run: () => handlers.onRetry(item.id),
  };
  const cancel: Action = {
    key: "cancel",
    slot: "dismiss",
    label: labels.cancel,
    icon: X,
    run: () => handlers.onRemove(item.id),
  };
  const remove: Action = {
    key: "remove",
    slot: "dismiss",
    label: labels.remove,
    icon: item.status === "done" ? Trash2 : X,
    run: () => handlers.onRemove(item.id),
  };
  switch (item.status) {
    case "queued":
    case "uploading":
      return [pause, cancel];
    case "paused":
      return [resume, cancel];
    case "failed":
      return [retry, remove];
    case "done":
      return [remove];
  }
}

/** Icon actions that pop in and out as the row's status changes. */
export function FileRowActions({
  item,
  labels,
  handlers,
}: {
  item: UploadItem;
  labels: FileUploadLabels;
  handlers: FileRowHandlers;
}) {
  const reduce = useReducedMotion();
  const actions = actionsFor(item, labels, handlers);
  return (
    <div className="relative z-10 flex shrink-0 items-center">
      <AnimatePresence mode="popLayout" initial={false}>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.slot}
              type="button"
              size="icon"
              variant="ghost"
              aria-label={`${action.label}: ${item.name}`}
              title={action.label}
              onClick={action.run}
              initial={reduce ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={
                reduce
                  ? { opacity: 0, transition: { duration: 0 } }
                  : { opacity: 0, scale: 0.6, transition: { duration: 0.12 } }
              }
              className="text-muted-foreground hover:text-foreground"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={action.key}
                  initial={reduce ? false : { opacity: 0, rotate: -45 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="flex"
                >
                  <Icon className="size-4" aria-hidden="true" />
                </motion.span>
              </AnimatePresence>
            </Button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
