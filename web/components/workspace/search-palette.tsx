"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("Search");
  return (
    <CommandPalette
      open={open}
      onOpenChange={onOpenChange}
      placeholder={t("placeholder")}
      emptyMessage={t("empty")}
      items={sessions.map((session) => ({
        id: session.id,
        label: session.title,
        group: session.archived
          ? t("archived")
          : session.projectId
            ? (projects.find((project) => project.id === session.projectId)
                ?.title ?? t("projects"))
            : t("recentChats"),
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
