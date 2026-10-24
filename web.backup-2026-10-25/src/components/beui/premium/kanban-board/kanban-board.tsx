"use client";

import { Plus, Search, X } from "lucide-react";
import { LayoutGroup, motion, useMotionTemplate } from "motion/react";
import {
  type KeyboardEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import {
  MorphicTooltip,
  MorphicTooltipProvider,
} from "@/components/beui/premium/morphic-tooltip";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { BoardColumn } from "./board-column";
import { FOCUS_RING, moveTask } from "./board-utils";
import { TaskCard, TaskDragPreview } from "./task-card";
import { TaskDialog } from "./task-dialog";
import type { DropTarget, KanbanBoardProps, KanbanTask } from "./types";
import { useBoardDrag } from "./use-board-drag";

export type {
  KanbanBoardProps,
  KanbanChecklistItem,
  KanbanColumn,
  KanbanMember,
  KanbanPriority,
  KanbanTask,
} from "./types";

type OpenTask = { task: KanbanTask; isNew: boolean; instant: boolean };

export function KanbanBoard({
  columns: controlledColumns,
  defaultColumns = [],
  onColumnsChange,
  tasks: controlledTasks,
  defaultTasks = [],
  onTasksChange,
  members = [],
  currentUserId,
  title = "Project board",
  readOnly = false,
  headerActions,
  className,
}: KanbanBoardProps) {
  const [internalColumns, setInternalColumns] = useState(defaultColumns);
  const [internalTasks, setInternalTasks] = useState(defaultTasks);
  const columns = controlledColumns ?? internalColumns;
  const tasks = controlledTasks ?? internalTasks;
  const canEditTasks =
    !readOnly && (controlledTasks === undefined || !!onTasksChange);
  const canEditColumns =
    !readOnly && (controlledColumns === undefined || !!onColumnsChange);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<OpenTask | null>(null);
  const [instant, setInstant] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const root = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const pendingHandle = useRef<string | null>(null);
  const pendingTask = useRef<string | null>(null);
  const scope = useId();
  const needle = query.trim().toLocaleLowerCase();
  const visible = tasks.filter(
    (task) =>
      (filter !== "high" || task.priority === "high") &&
      (filter !== "mine" || task.assigneeId === currentUserId) &&
      (!needle ||
        [
          task.title,
          task.description,
          ...(task.tags ?? []),
          members.find((member) => member.id === task.assigneeId)?.name,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(needle)),
  );
  const filters = [
    { value: "all", label: "All tasks" },
    { value: "high", label: "High priority" },
    ...(currentUserId ? [{ value: "mine", label: "Mine" }] : []),
  ];

  useLayoutEffect(() => {
    const id = pendingHandle.current;
    if (!id) return;
    pendingHandle.current = null;
    Array.from(
      root.current?.querySelectorAll<HTMLButtonElement>(
        "[data-kanban-handle]",
      ) ?? [],
    )
      .find((button) => button.dataset.kanbanHandle === id)
      ?.focus({ preventScroll: true });
  });

  function publishTasks(next: KanbanTask[]) {
    if (!canEditTasks) return;
    if (controlledTasks === undefined) setInternalTasks(next);
    onTasksChange?.(next);
  }

  function move(id: string, target: DropTarget, keyboard = false) {
    if (
      !canEditTasks ||
      !columns.some((column) => column.id === target.columnId)
    )
      return;
    const next = moveTask(tasks, id, target);
    if (next === tasks) return;
    setInstant(keyboard);
    pendingHandle.current = id;
    publishTasks(next);
    const task = next.find((item) => item.id === id);
    const column = columns.find((item) => item.id === target.columnId);
    const inColumn = next.filter((item) => item.columnId === target.columnId);
    setAnnouncement(
      `${task?.title} moved to ${column?.title}, position ${inColumn.findIndex((item) => item.id === id) + 1} of ${inColumn.length}.`,
    );
  }

  const drag = useBoardDrag({
    root,
    onDrop: move,
    onCancel: () => setAnnouncement("Move cancelled."),
  });
  const ghostTransform = useMotionTemplate`translate3d(${drag.x}px, ${drag.y}px, 0)`;

  function keyboardMove(
    task: KanbanTask,
    event: KeyboardEvent<HTMLButtonElement>,
  ) {
    if (
      ![
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const index = columns.findIndex((column) => column.id === task.columnId);
      const destination =
        columns[index + (event.key === "ArrowRight" ? 1 : -1)];
      if (destination) move(task.id, { columnId: destination.id }, true);
      return;
    }
    const inColumn = visible.filter((item) => item.columnId === task.columnId);
    const from = inColumn.findIndex((item) => item.id === task.id);
    const to =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? inColumn.length - 1
          : from + (event.key === "ArrowDown" ? 1 : -1);
    if (to < 0 || to >= inColumn.length || from === to) return;
    const remaining = inColumn.filter((item) => item.id !== task.id);
    move(
      task.id,
      { columnId: task.columnId, beforeId: remaining[to]?.id },
      true,
    );
  }

  function addTask(columnId: string) {
    setDialog({
      task: {
        id: crypto.randomUUID(),
        columnId,
        title: "",
        priority: "normal",
      },
      isNew: true,
      instant: false,
    });
  }

  function restoreTaskFocus() {
    const id = pendingTask.current;
    pendingTask.current = null;
    if (!id) return;
    requestAnimationFrame(() => {
      const button = Array.from(
        root.current?.querySelectorAll<HTMLButtonElement>(
          "[data-kanban-open]",
        ) ?? [],
      ).find((item) => item.dataset.kanbanOpen === id);
      (button ?? input.current)?.focus({ preventScroll: true });
    });
  }

  function changeFilter(value: string) {
    setFilter(value);
    setInstant(true);
  }

  function openTask(task: KanbanTask, keyboard: boolean) {
    pendingTask.current = task.id;
    setInstant(keyboard);
    setDialog({ task, isNew: false, instant: keyboard });
  }

  return (
    <LayoutGroup id={scope}>
      <section
        ref={root}
        aria-labelledby={`${scope}-title`}
        className={cn(
          "w-full max-w-6xl bg-background p-3 text-foreground sm:p-5",
          className,
        )}
      >
        <MorphicTooltipProvider delay={180}>
          <header className="flex flex-wrap items-center justify-between gap-3 px-1 pb-4">
            <div>
              <h2 id={`${scope}-title`} className="text-xl font-medium">
                {title}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {tasks.length} tasks · {columns.length} columns
              </p>
            </div>
            <div className="flex items-center gap-2">
              {headerActions}
              {canEditTasks && (
                <Button
                  tabIndex={0}
                  disabled={!columns.length}
                  onClick={() => addTask(columns[0].id)}
                  className={cn("h-9 rounded-full px-3 text-xs", FOCUS_RING)}
                >
                  <Plus aria-hidden className="size-3.5" />
                  New task
                </Button>
              )}
            </div>
          </header>
          <Tabs value={filter} onValueChange={changeFilter} variant="pill">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="max-w-full overflow-x-auto">
                <TabsList
                  aria-label="Filter tasks"
                  className="gap-0.5 p-0.5"
                  onKeyDown={(event) => {
                    if (
                      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                        event.key,
                      )
                    )
                      return;
                    event.preventDefault();
                    const current = filters.findIndex(
                      (item) => item.value === filter,
                    );
                    const index =
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? filters.length - 1
                          : (current +
                              (event.key === "ArrowRight" ? 1 : -1) +
                              filters.length) %
                            filters.length;
                    changeFilter(filters[index].value);
                    event.currentTarget
                      .querySelectorAll<HTMLElement>('[role="tab"]')
                      [index]?.focus();
                  }}
                >
                  {filters.map((item) => (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      id={`${scope}-${item.value}`}
                      aria-controls={`${scope}-columns`}
                      tabIndex={filter === item.value ? 0 : -1}
                      className={cn("h-8 px-3 py-0 text-xs", FOCUS_RING)}
                    >
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <Input
                ref={input}
                type="search"
                aria-label="Search tasks"
                placeholder="Search tasks…"
                value={query}
                onChange={(value) => {
                  setQuery(value);
                  setInstant(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && query) {
                    event.preventDefault();
                    setQuery("");
                  }
                }}
                className="w-full sm:w-60"
                classNames={{
                  field:
                    "h-10 bg-background ring-0 focus-within:border-foreground/60",
                  input:
                    "min-w-0 text-xs [&::-webkit-search-cancel-button]:hidden",
                  rightIcon: "[&_button]:size-9",
                }}
                leftIcon={<Search aria-hidden />}
                rightIcon={
                  query ? (
                    <MorphicTooltip content="Clear search">
                      <Button
                        variant="ghost"
                        size="icon"
                        tabIndex={0}
                        aria-label="Clear task search"
                        onClick={() => {
                          setQuery("");
                          input.current?.focus();
                        }}
                        className={cn("size-9 rounded-full", FOCUS_RING)}
                      >
                        <X aria-hidden className="size-3.5" />
                      </Button>
                    </MorphicTooltip>
                  ) : undefined
                }
              />
            </div>
            <div
              role="tabpanel"
              id={`${scope}-columns`}
              aria-labelledby={`${scope}-${filter}`}
              data-kanban-scroll
              className="overflow-x-auto overscroll-x-contain pb-1"
            >
              {columns.length ? (
                <motion.div
                  key={filter}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.14, ease: EASE_OUT }}
                  className="grid h-120 min-w-full auto-cols-[minmax(17rem,1fr)] grid-flow-col gap-3"
                >
                  {columns.map((column) => {
                    const items = visible.filter(
                      (task) => task.columnId === column.id,
                    );
                    const target =
                      drag.target?.columnId === column.id ? drag.target : null;
                    return (
                      <BoardColumn
                        key={column.id}
                        column={column}
                        count={items.length}
                        canRename={canEditColumns}
                        canAddTask={canEditTasks}
                        onRename={(title) => {
                          const next = columns.map((item) =>
                            item.id === column.id ? { ...item, title } : item,
                          );
                          if (controlledColumns === undefined)
                            setInternalColumns(next);
                          onColumnsChange?.(next);
                          setAnnouncement(`Column renamed to ${title}.`);
                        }}
                        onAddTask={() => addTask(column.id)}
                      >
                        {items.map((task) => (
                          <div key={task.id} className="relative">
                            {target?.beforeId === task.id && (
                              <div
                                aria-hidden
                                className="pointer-events-none absolute inset-x-0 -top-2 h-1 rounded-full bg-primary/40"
                              />
                            )}
                            <TaskCard
                              task={task}
                              member={members.find(
                                (member) => member.id === task.assigneeId,
                              )}
                              layoutId={`task-${task.id}`}
                              dragging={drag.drag?.task.id === task.id}
                              instant={instant}
                              editable={canEditTasks}
                              instructions={`${scope}-instructions`}
                              onOpen={(keyboard) => {
                                if (!keyboard && drag.shouldSuppressClick())
                                  return;
                                openTask(task, keyboard);
                              }}
                              onDragStart={(event) => {
                                setInstant(false);
                                drag.start(event, task);
                              }}
                              onTouchDragStart={(event) => {
                                setInstant(false);
                                drag.startTouch(event, task);
                              }}
                              onMove={(event) => keyboardMove(task, event)}
                            />
                          </div>
                        ))}
                        {target && !target.beforeId && (
                          <div
                            aria-hidden
                            className="h-1 rounded-full bg-primary/40"
                          />
                        )}
                        {!items.length && (
                          <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-border px-3 text-center text-xs text-muted-foreground">
                            {needle || filter !== "all"
                              ? "No matching tasks"
                              : "Drop a task here"}
                          </div>
                        )}
                      </BoardColumn>
                    );
                  })}
                </motion.div>
              ) : (
                <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No columns yet.
                </div>
              )}
            </div>
          </Tabs>
          <p id={`${scope}-instructions`} className="sr-only">
            Drag anywhere on a card to move it. On touch, hold briefly before
            dragging; swipe to scroll. With the handle focused, use Up or Down
            to reorder, Left or Right to change columns, and Home or End to move
            to the edges. Escape cancels a drag.
          </p>
          <output aria-live="polite" className="sr-only">
            {announcement}
          </output>
          {drag.drag &&
            createPortal(
              <motion.div
                aria-hidden
                className="pointer-events-none fixed top-0 left-0 z-[110] rounded-2xl border border-border-strong bg-background text-foreground"
                style={{ transform: ghostTransform, width: drag.drag.width }}
              >
                <TaskDragPreview
                  task={drag.drag.task}
                  member={members.find(
                    (member) => member.id === drag.drag?.task.assigneeId,
                  )}
                />
              </motion.div>,
              document.body,
            )}
          {dialog && (
            <TaskDialog
              key={dialog.task.id}
              task={dialog.task}
              columns={columns}
              members={members}
              instant={dialog.instant}
              editable={canEditTasks}
              isNew={dialog.isNew}
              onClose={() => {
                setDialog(null);
                restoreTaskFocus();
              }}
              onSave={(task) => {
                publishTasks(
                  dialog.isNew
                    ? [...tasks, task]
                    : tasks.map((item) => (item.id === task.id ? task : item)),
                );
                pendingTask.current = task.id;
                setAnnouncement(
                  `${task.title} ${dialog.isNew ? "created" : "updated"}.`,
                );
              }}
            />
          )}
        </MorphicTooltipProvider>
      </section>
    </LayoutGroup>
  );
}
