"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Archive,
  Edit,
  Folder,
  MoreHorizontal,
  Pin,
  Trash,
} from "@/components/icons";
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal";
import { NameDialog } from "@/components/name-dialog";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/arc/menu/menu";
import { useSessions } from "../session-provider";
import type { Session } from "../types";

export function SessionActions({
  session,
  active,
  pinned,
  onTogglePin,
}: {
  session: Session;
  active: boolean;
  pinned?: boolean;
  onTogglePin?: () => void;
}) {
  const { update, remove, moveToProject, projects, ready } = useSessions();
  const router = useRouter();
  const t = useTranslations("Chat");
  const tNav = useTranslations("Nav");
  const tProjects = useTranslations("Projects");
  const tDialog = useTranslations("Dialog");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  function deleteSession() {
    setDeleteOpen(false);
    remove(session.id);
    if (active) router.push("/");
  }

  return (
    <>
      <Menu modal={false}>
        <MenuTrigger asChild>
          <button
            ref={trigger}
            type="button"
            disabled={!ready}
            aria-label={t("moreActions", { title: session.title })}
            className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-active hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary [@media(pointer:coarse)]:size-10"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </MenuTrigger>
        <MenuContent
          side="bottom"
          align="start"
          sideOffset={6}
          className="min-w-48"
        >
          <MenuItem
            icon={<Edit className="size-4" />}
            onSelect={() => setRenameOpen(true)}
          >
            {t("rename")}
          </MenuItem>
          {onTogglePin ? (
            <MenuItem
              icon={<Pin className="size-4" />}
              onSelect={onTogglePin}
            >
              {pinned ? tNav("unpinSession") : tNav("pinSession")}
            </MenuItem>
          ) : null}
          <MenuSub>
            <MenuSubTrigger icon={<Folder className="size-4" />}>
              {session.projectId ? tProjects("moveTo") : tProjects("addTo")}
            </MenuSubTrigger>
            <MenuSubContent className="min-w-52">
              {!projects.length ? (
                <MenuItem onSelect={() => router.push("/projects")}>
                  {tProjects("createFirst")}
                </MenuItem>
              ) : null}
              <MenuRadioGroup
                value={session.projectId ?? ""}
                onValueChange={(value) =>
                  moveToProject(session.id, value || undefined)
                }
              >
                {projects.map((project) => (
                  <MenuRadioItem key={project.id} value={project.id}>
                    {project.title}
                  </MenuRadioItem>
                ))}
                {session.projectId ? (
                  <MenuRadioItem value="">
                    {tProjects("removeFrom")}
                  </MenuRadioItem>
                ) : null}
              </MenuRadioGroup>
            </MenuSubContent>
          </MenuSub>
          <MenuItem
            icon={<Archive className="size-4" />}
            onSelect={() => update(session.id, { archived: !session.archived })}
          >
            {session.archived ? t("restore") : t("archive")}
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            icon={<Trash className="size-4" />}
            destructive
            onSelect={() => setDeleteOpen(true)}
          >
            {t("delete")}
          </MenuItem>
        </MenuContent>
      </Menu>
      <DeleteConfirmationModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        itemName={session.title}
        itemType="chat"
        onConfirm={deleteSession}
        returnFocus={trigger}
      />
      <NameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title={tDialog("renameChatTitle")}
        description={tDialog("renameChatDesc")}
        initialValue={session.title}
        onSave={(title) => update(session.id, { title })}
        returnFocus={trigger}
      />
    </>
  );
}
