"use client";

import { Check, ListTodo, Pencil, Plus, X } from "lucide-react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { MorphicTooltip } from "@/components/beui/premium/morphic-tooltip";
import { cn } from "@/lib/beui/utils";
import { FOCUS_RING } from "./board-utils";
import type { KanbanColumn } from "./types";

export function BoardColumn({
  column,
  count,
  canRename,
  canAddTask,
  onRename,
  onAddTask,
  children,
}: {
  column: KanbanColumn;
  count: number;
  canRename: boolean;
  canAddTask: boolean;
  onRename: (title: string) => void;
  onAddTask: () => void;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.title);
  const [hasTopFade, setHasTopFade] = useState(false);
  const renameRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (editing) inputRef.current?.focus({ preventScroll: true });
  }, [editing]);

  function finish() {
    setEditing(false);
    requestAnimationFrame(() =>
      renameRef.current?.focus({ preventScroll: true }),
    );
  }

  return (
    <section
      data-kanban-column={column.id}
      aria-label={`${column.title} column`}
      className="flex min-h-0 flex-col bg-background"
    >
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-2 px-3 py-2">
        {editing ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim()) return;
              onRename(name.trim());
              finish();
            }}
          >
            <Input
              aria-label="Column name"
              ref={inputRef}
              value={name}
              onChange={setName}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  finish();
                }
              }}
              className="min-w-0 flex-1"
              classNames={{
                field:
                  "h-10 bg-background ring-0 focus-within:border-foreground/60",
                input: "text-sm",
              }}
            />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              tabIndex={0}
              aria-label="Save column name"
              disabled={!name.trim()}
              className={cn("size-9 shrink-0 rounded-full", FOCUS_RING)}
            >
              <Check aria-hidden className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              tabIndex={0}
              aria-label="Cancel column rename"
              onClick={finish}
              className={cn("size-9 shrink-0 rounded-full", FOCUS_RING)}
            >
              <X aria-hidden className="size-4" />
            </Button>
          </form>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:size-3.5"
              >
                {column.icon ?? <ListTodo />}
              </span>
              <h3 className="truncate text-sm font-medium">{column.title}</h3>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {count}
              </span>
            </div>
            <div className="flex shrink-0 items-center">
              {canRename && (
                <MorphicTooltip content="Rename column">
                  <Button
                    ref={renameRef}
                    variant="ghost"
                    size="icon"
                    tabIndex={0}
                    aria-label={`Rename ${column.title} column`}
                    onClick={() => {
                      setName(column.title);
                      setEditing(true);
                    }}
                    className={cn("size-9 rounded-full", FOCUS_RING)}
                  >
                    <Pencil aria-hidden className="size-3.5" />
                  </Button>
                </MorphicTooltip>
              )}
              {canAddTask && (
                <MorphicTooltip content="Add task">
                  <Button
                    variant="ghost"
                    size="icon"
                    tabIndex={0}
                    aria-label={`Add task to ${column.title}`}
                    onClick={onAddTask}
                    className={cn("size-9 rounded-full", FOCUS_RING)}
                  >
                    <Plus aria-hidden className="size-4" />
                  </Button>
                </MorphicTooltip>
              )}
            </div>
          </>
        )}
      </header>
      <div
        data-kanban-cards
        onScroll={(event) => setHasTopFade(event.currentTarget.scrollTop > 0)}
        className={cn(
          "min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 pb-3",
          hasTopFade
            ? "[mask-image:linear-gradient(to_bottom,transparent,black_20px,black_calc(100%_-_20px),transparent)]"
            : "[mask-image:linear-gradient(to_bottom,black_calc(100%_-_20px),transparent)]",
        )}
      >
        {children}
      </div>
    </section>
  );
}
