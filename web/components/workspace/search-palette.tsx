"use client";

import { CommandPalette } from "@/components/motion/command-palette";
import { Folder, MessageCircle, Archive } from "@/components/icons";
import { useSessions } from "./session-provider";

export function SearchPalette({
  open,
  onOpenChange,
  onSelectThread,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectThread: (id: string) => void;
}) {
  const { sessions, projects } = useSessions();
  return (
    <CommandPalette
      open={open}
      onOpenChange={onOpenChange}
      placeholder="Search projects and conversations"
      emptyMessage="No conversations found."
      items={sessions.map((session) => ({
        id: session.id,
        label: session.title,
        group: session.archived
          ? "Archived"
          : session.projectId
            ? (projects.find((project) => project.id === session.projectId)
                ?.title ?? "Projects")
            : "Recent chats",
        icon: session.archived
          ? Archive
          : session.projectId
            ? Folder
            : MessageCircle,
        onSelect: () => onSelectThread(session.id),
      }))}
    />
  );
}
