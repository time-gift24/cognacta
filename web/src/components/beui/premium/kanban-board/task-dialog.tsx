"use client";

import { X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import {
  AnimatedModal,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import { Checkbox } from "@/components/beui/motion/checkbox";
import { Input } from "@/components/beui/motion/input";
import { Select } from "@/components/beui/premium/select";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { FOCUS_RING, PRIORITIES } from "./board-utils";
import type {
  KanbanColumn,
  KanbanMember,
  KanbanPriority,
  KanbanTask,
} from "./types";

const INPUT_STYLES = {
  label: "px-0 text-xs font-normal text-muted-foreground",
  field:
    "h-10 bg-background opacity-100 ring-0 data-[state=focused]:border-foreground/60",
  input: "text-sm",
};

export function TaskDialog({
  task,
  columns,
  members,
  instant,
  editable,
  isNew,
  onSave,
  onClose,
}: {
  task: KanbanTask;
  columns: KanbanColumn[];
  members: KanbanMember[];
  instant: boolean;
  editable: boolean;
  isNew: boolean;
  onSave: (task: KanbanTask) => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState(task);
  const [error, setError] = useState("");
  const selectedColumn = columns.some((column) => column.id === draft.columnId)
    ? draft.columnId
    : columns[0]?.id;

  return (
    <AnimatedModal
      open={open}
      onOpenChange={setOpen}
      onExitComplete={onClose}
      panelClassName="max-w-lg rounded-2xl border border-border"
    >
      <motion.div
        layout={reduce || instant ? false : "position"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: EASE_OUT }}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <AnimatedModalTitle className="text-xl font-medium">
            {isNew ? "New task" : "Task details"}
          </AnimatedModalTitle>
          <Button
            variant="ghost"
            size="icon"
            tabIndex={0}
            aria-label="Close task details"
            data-autofocus={!isNew || undefined}
            onClick={() => setOpen(false)}
            className={cn("size-9 rounded-full", FOCUS_RING)}
          >
            <X aria-hidden className="size-4" />
          </Button>
        </header>
        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!draft.title.trim()) {
              setError("Give this task a title.");
              return;
            }
            if (!selectedColumn) {
              setError("Add a column before saving a task.");
              return;
            }
            onSave({
              ...draft,
              title: draft.title.trim(),
              columnId: selectedColumn,
              description: draft.description?.trim(),
            });
            setOpen(false);
          }}
        >
          <Input
            label="Title"
            aria-label="Task title"
            data-autofocus={isNew ? true : undefined}
            value={draft.title}
            disabled={!editable}
            onChange={(title) => {
              setDraft({ ...draft, title });
              setError("");
            }}
            classNames={INPUT_STYLES}
            error={!!error}
          />
          <label className="block space-y-1.5 text-xs text-muted-foreground">
            <span>Description</span>
            <textarea
              aria-label="Task description"
              rows={3}
              value={draft.description ?? ""}
              disabled={!editable}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-foreground/60 disabled:opacity-100"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <span className="block">Status</span>
              <Select
                label="Task status"
                options={columns.map((column) => ({
                  id: column.id,
                  label: column.title,
                }))}
                value={selectedColumn}
                onValueChange={(columnId) => setDraft({ ...draft, columnId })}
                disabled={!editable}
                portal
                className="w-full"
                buttonClassName="min-w-0 w-full text-xs focus:border-foreground/60"
                optionsClassName="z-[120] motion-reduce:transition-none"
              />
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <span className="block">Priority</span>
              <Select
                label="Task priority"
                options={PRIORITIES}
                value={draft.priority ?? "normal"}
                onValueChange={(priority) =>
                  setDraft({
                    ...draft,
                    priority: priority as KanbanPriority,
                  })
                }
                disabled={!editable}
                portal
                className="w-full"
                buttonClassName="min-w-0 w-full text-xs focus:border-foreground/60"
                optionsClassName="z-[120] motion-reduce:transition-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <span className="block">Assignee</span>
              <Select
                label="Task assignee"
                options={[
                  { id: "", label: "Unassigned" },
                  ...members.map((member) => ({
                    id: member.id,
                    label: member.name,
                  })),
                ]}
                value={draft.assigneeId ?? ""}
                onValueChange={(assigneeId) =>
                  setDraft({
                    ...draft,
                    assigneeId: assigneeId || undefined,
                  })
                }
                disabled={!editable}
                portal
                className="w-full"
                buttonClassName="min-w-0 w-full text-xs focus:border-foreground/60"
                optionsClassName="z-[120] motion-reduce:transition-none"
              />
            </div>
            <Input
              label="Due date"
              aria-label="Task due date"
              placeholder="e.g. Oct 12"
              value={draft.dueDate ?? ""}
              disabled={!editable}
              onChange={(dueDate) => setDraft({ ...draft, dueDate })}
              classNames={{ ...INPUT_STYLES, input: "text-xs" }}
            />
          </div>
          {!!draft.checklist?.length && (
            <fieldset className="space-y-2 border-t border-border pt-4">
              <legend className="px-1 text-xs text-muted-foreground">
                Checklist
              </legend>
              {draft.checklist.map((item) => (
                <Checkbox
                  key={item.id}
                  label={item.label}
                  checked={item.done}
                  disabled={!editable}
                  onCheckedChange={(done) =>
                    setDraft({
                      ...draft,
                      checklist: draft.checklist?.map((entry) =>
                        entry.id === item.id ? { ...entry, done } : entry,
                      ),
                    })
                  }
                  className={cn(
                    "flex gap-2.5",
                    item.done &&
                      "[&_span]:text-muted-foreground [&_span]:line-through",
                  )}
                />
              ))}
            </fieldset>
          )}
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <footer className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              variant="ghost"
              tabIndex={0}
              type="button"
              onClick={() => setOpen(false)}
              className={cn("h-9 rounded-full px-4 text-xs", FOCUS_RING)}
            >
              {editable ? "Cancel" : "Close"}
            </Button>
            {editable && (
              <Button
                type="submit"
                tabIndex={0}
                className={cn("h-9 rounded-full px-4 text-xs", FOCUS_RING)}
              >
                {isNew ? "Create task" : "Save changes"}
              </Button>
            )}
          </footer>
        </form>
      </motion.div>
    </AnimatedModal>
  );
}
