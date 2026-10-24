import type { DropTarget, KanbanPriority, KanbanTask } from "./types";

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
export const PRIORITIES: { id: KanbanPriority; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "normal", label: "Normal" },
  { id: "high", label: "High" },
];

/** Inserting around a visible anchor preserves the order of filtered-out tasks. */
export function moveTask(tasks: KanbanTask[], id: string, target: DropTarget) {
  const task = tasks.find((item) => item.id === id);
  if (!task || target.beforeId === id) return tasks;
  const next = tasks.filter((item) => item.id !== id);
  const anchor = next.findIndex(
    (item) => item.id === target.beforeId && item.columnId === target.columnId,
  );
  const last = next.findLastIndex((item) => item.columnId === target.columnId);
  const at = anchor >= 0 ? anchor : last >= 0 ? last + 1 : next.length;
  next.splice(at, 0, { ...task, columnId: target.columnId });
  return next.every(
    (item, index) =>
      item.id === tasks[index]?.id && item.columnId === tasks[index]?.columnId,
  )
    ? tasks
    : next;
}
