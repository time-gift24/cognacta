import type { ReactNode } from "react";

export type KanbanPriority = "low" | "normal" | "high";
export type KanbanColumn = { id: string; title: string; icon?: ReactNode };
export type KanbanMember = { id: string; name: string; avatarUrl?: string };
export type KanbanChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};
export type KanbanTask = {
  /** Stable, unique across the board. Array order determines column order. */
  id: string;
  columnId: string;
  title: string;
  description?: string;
  priority?: KanbanPriority;
  assigneeId?: string;
  tags?: string[];
  /** A caller-formatted date label. */
  dueDate?: string;
  checklist?: KanbanChecklistItem[];
};
export type KanbanBoardProps = {
  columns?: KanbanColumn[];
  defaultColumns?: KanbanColumn[];
  onColumnsChange?: (columns: KanbanColumn[]) => void;
  tasks?: KanbanTask[];
  defaultTasks?: KanbanTask[];
  onTasksChange?: (tasks: KanbanTask[]) => void;
  members?: KanbanMember[];
  currentUserId?: string;
  title?: string;
  readOnly?: boolean;
  headerActions?: ReactNode;
  className?: string;
};

export type DropTarget = { columnId: string; beforeId?: string };
