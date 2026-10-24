"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Edit, Folder, Plus, Trash } from "@/components/icons";
import { Button } from "@/components/motion/button/base";
import { NameDialog } from "@/components/name-dialog";
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal";
import { useSessions } from "../session-provider";
import type { Project } from "../types";

export function ProjectsPage() {
  const {
    projects,
    sessions,
    ready,
    createProject,
    renameProject,
    deleteProject,
    createProjectSession,
  } = useSessions();
  const router = useRouter();
  const t = useTranslations("Projects");
  const [editing, setEditing] = useState<Project | null>(null);
  const [nameOpen, setNameOpen] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  return (
    <div className="mx-auto w-full max-w-4xl px-5 pt-20 pb-10 sm:px-8 lg:pt-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button
          disabled={!ready}
          onClick={() => {
            setEditing(null);
            setNameOpen(true);
          }}
        >
          <Plus className="size-4" />
          {t("new")}
        </Button>
      </header>
      <div className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {projects.map((project) => {
          const chatCount = sessions.filter(
            (session) => session.projectId === project.id && !session.archived,
          ).length;
          return (
            <div
              key={project.id}
              className="flex flex-wrap items-center gap-3 p-4"
            >
              <Folder className="size-5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-medium">
                  {project.title}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("chatCount", { count: chatCount })}
                </p>
              </div>
              <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                <Button
                  variant="ghost"
                  disabled={!ready}
                  onClick={() => {
                    const id = createProjectSession(project.id);
                    if (id) router.push(`/chat/${id}`);
                  }}
                >
                  {t("newChat")}
                </Button>
                <Button
                  variant="ghost"
                  className="size-10 p-0"
                  aria-label={t("rename", { name: project.title })}
                  onClick={() => {
                    setEditing(project);
                    setNameOpen(true);
                  }}
                >
                  <Edit className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="size-10 p-0 text-danger"
                  aria-label={t("delete", { name: project.title })}
                  onClick={() => {
                    setDeleting(project);
                    setDeleteOpen(true);
                  }}
                >
                  <Trash className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
        {!projects.length && (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {t("empty")}
          </p>
        )}
      </div>
      <NameDialog
        open={nameOpen}
        onOpenChange={setNameOpen}
        title={editing ? t("renameTitle") : t("newTitle")}
        description={t("nameDescription")}
        initialValue={editing?.title ?? ""}
        onSave={(title) =>
          editing ? renameProject(editing.id, title) : createProject(title)
        }
      />
      <DeleteConfirmationModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        itemName={deleting?.title ?? ""}
        itemType="project"
        description={t("deleteDescription", { name: deleting?.title ?? "" })}
        onConfirm={() => {
          if (deleting) deleteProject(deleting.id);
          setDeleteOpen(false);
        }}
      />
    </div>
  );
}
