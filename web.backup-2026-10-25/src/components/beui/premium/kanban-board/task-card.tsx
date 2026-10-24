"use client";

import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckSquare,
  GripVertical,
  Minus,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  type PointerEvent,
  type TouchEvent,
  useState,
} from "react";
import { Button } from "@/components/beui/motion/button";
import { MorphicTooltip } from "@/components/beui/premium/morphic-tooltip";
import { SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { FOCUS_RING } from "./board-utils";
import type { KanbanMember, KanbanTask } from "./types";

export function MemberAvatar({ member }: { member: KanbanMember }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="grid size-5 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-background text-xs text-muted-foreground">
      {member.avatarUrl && !failed ? (
        // biome-ignore lint/performance/noImgElement: Installable avatars must also work outside Next.js.
        <img
          src={member.avatarUrl}
          alt=""
          className="size-full object-cover"
          draggable={false}
          onError={() => setFailed(true)}
        />
      ) : (
        member.name
          .split(" ")
          .map((part) => part[0])
          .slice(0, 2)
          .join("")
      )}
    </span>
  );
}

export function TaskPriority({ task }: { task: KanbanTask }) {
  const priority = task.priority ?? "normal";
  const Icon =
    priority === "high" ? ArrowUp : priority === "low" ? ArrowDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-border px-1.5 text-xs font-normal text-muted-foreground",
        priority === "high" && "text-foreground",
      )}
    >
      <Icon aria-hidden className="size-3" />
      {priority === "high" ? "High" : priority === "low" ? "Low" : "Normal"}
    </span>
  );
}

export function TaskCardContent({
  task,
  member,
}: {
  task: KanbanTask;
  member?: KanbanMember;
}) {
  const done = task.checklist?.filter((item) => item.done).length ?? 0;
  return (
    <span className="block">
      <span className="block px-4 pt-4 pb-3">
        <span className="block pr-7 text-sm font-medium leading-6 text-foreground">
          {task.title}
        </span>
        {task.description && (
          <span className="mt-1 line-clamp-1 text-xs font-normal leading-relaxed text-muted-foreground">
            {task.description}
          </span>
        )}
        {(!!task.tags?.length || !!task.checklist?.length) && (
          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-normal text-muted-foreground">
            {task.tags?.map((tag, index) => (
              <span key={tag} className="inline-flex items-center gap-2">
                {index > 0 && <span aria-hidden>·</span>}
                {tag}
              </span>
            ))}
            {!!task.checklist?.length && (
              <span className="inline-flex items-center gap-1">
                {!!task.tags?.length && (
                  <span aria-hidden className="mr-1">
                    ·
                  </span>
                )}
                <CheckSquare aria-hidden className="size-3" />
                <span>
                  {done}/{task.checklist.length}
                  <span className="sr-only"> checklist items completed</span>
                </span>
              </span>
            )}
          </span>
        )}
      </span>
      <span className="flex flex-wrap items-center gap-1.5 border-t border-border px-3 py-3 text-xs font-normal text-muted-foreground">
        <TaskPriority task={task} />
        {member && (
          <span className="inline-flex h-7 max-w-full min-w-0 items-center gap-1 rounded-full border border-border px-1.5">
            <MemberAvatar member={member} />
            <span className="max-w-28 truncate">{member.name}</span>
          </span>
        )}
        {task.dueDate && (
          <span className="inline-flex h-7 max-w-full min-w-0 items-center gap-1 rounded-full border border-border px-1.5">
            <CalendarDays aria-hidden className="size-3 shrink-0" />
            <span className="truncate">{task.dueDate}</span>
          </span>
        )}
      </span>
    </span>
  );
}

export function TaskCard({
  task,
  member,
  layoutId,
  dragging,
  instant,
  editable,
  instructions,
  onOpen,
  onDragStart,
  onTouchDragStart,
  onMove,
}: {
  task: KanbanTask;
  member?: KanbanMember;
  layoutId: string;
  dragging: boolean;
  instant: boolean;
  editable: boolean;
  instructions: string;
  onOpen: (keyboard: boolean) => void;
  onDragStart: (event: PointerEvent<HTMLElement>) => void;
  onTouchDragStart: (event: TouchEvent<HTMLElement>) => void;
  onMove: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      data-kanban-task={task.id}
      layout={!reduce}
      layoutId={reduce ? undefined : layoutId}
      transition={{ layout: instant ? { duration: 0 } : SPRING_LAYOUT }}
      style={{ opacity: dragging ? 0.35 : 1 }}
      onPointerDown={editable ? onDragStart : undefined}
      onTouchStart={editable ? onTouchDragStart : undefined}
      className="relative rounded-2xl border border-border bg-background"
    >
      {editable && (
        <MorphicTooltip
          content="Drag the card to move. On touch, hold then drag. Arrow keys to reorder."
          disabled={dragging}
          className="absolute top-2 right-2 z-10"
        >
          <Button
            variant="ghost"
            size="icon"
            tabIndex={0}
            data-kanban-handle={task.id}
            aria-label={`Move task: ${task.title}`}
            aria-describedby={instructions}
            whileHover={undefined}
            whileTap={undefined}
            onKeyDown={onMove}
            className={cn(
              "size-9 touch-none cursor-grab rounded-full active:cursor-grabbing",
              FOCUS_RING,
            )}
          >
            <GripVertical aria-hidden className="size-3.5" />
          </Button>
        </MorphicTooltip>
      )}
      <Button
        variant="ghost"
        tabIndex={0}
        aria-label={`Open task: ${task.title}`}
        aria-haspopup="dialog"
        data-kanban-open={task.id}
        whileHover={undefined}
        whileTap={undefined}
        onClick={(event) => onOpen(event.detail === 0)}
        onContextMenu={(event) => {
          if (dragging) event.preventDefault();
        }}
        layout={reduce || instant ? false : "position"}
        className={cn(
          "block h-auto w-full rounded-full p-0 text-left hover:bg-transparent",
          editable &&
            "cursor-grab active:cursor-grabbing [-webkit-touch-callout:none]",
          FOCUS_RING,
        )}
      >
        <TaskCardContent task={task} member={member} />
      </Button>
    </motion.article>
  );
}

export function TaskDragPreview({
  task,
  member,
}: {
  task: KanbanTask;
  member?: KanbanMember;
}) {
  return (
    <>
      <span
        aria-hidden
        className="absolute top-2 right-2 grid size-9 place-items-center rounded-full text-muted-foreground"
      >
        <GripVertical className="size-3.5" />
      </span>
      <TaskCardContent task={task} member={member} />
    </>
  );
}
