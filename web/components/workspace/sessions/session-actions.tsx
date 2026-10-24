"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Edit, MoreHorizontal, Trash } from "@/components/icons";
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal";
import { NameDialog } from "@/components/name-dialog";
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
  AnimatedDropdownItemIcon,
  AnimatedDropdownItemText,
  AnimatedDropdownTrigger,
} from "@/components/premium/animated-dropdown";
import { useSessions } from "../session-provider";
import type { Session } from "../types";
import { SessionProjectMenu } from "./session-project-menu";

export function SessionActions({
  session,
  active,
}: {
  session: Session;
  active: boolean;
}) {
  const { update, remove, moveToProject, ready } = useSessions();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  function deleteSession() {
    setDeleteOpen(false);
    remove(session.id);
    if (active) router.push("/");
  }

  return (
    <>
      {/* Non-modal menus avoid competing focus locks with the confirmation dialog. */}
      <AnimatedDropdown modal={false}>
        <AnimatedDropdownTrigger asChild>
          <button
            type="button"
            disabled={!ready}
            aria-label={`More actions for ${session.title}`}
            className="grid size-8 place-items-center rounded-md hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary [@media(pointer:coarse)]:size-10"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </AnimatedDropdownTrigger>
        <AnimatedDropdownContent
          side="bottom"
          align="start"
          className="w-48 min-w-0"
        >
          <AnimatedDropdownItem onSelect={() => setRenameOpen(true)}>
            <AnimatedDropdownItemIcon>
              <Edit />
            </AnimatedDropdownItemIcon>
            <AnimatedDropdownItemText>Rename</AnimatedDropdownItemText>
          </AnimatedDropdownItem>
          <SessionProjectMenu
            projectId={session.projectId}
            onMove={(projectId) => moveToProject(session.id, projectId)}
          />
          <AnimatedDropdownItem
            onSelect={() => update(session.id, { archived: !session.archived })}
          >
            <AnimatedDropdownItemIcon>
              <Archive />
            </AnimatedDropdownItemIcon>
            <AnimatedDropdownItemText>
              {session.archived ? "Restore" : "Archive"}
            </AnimatedDropdownItemText>
          </AnimatedDropdownItem>
          <AnimatedDropdownItem
            destructive
            onSelect={() => setDeleteOpen(true)}
          >
            <AnimatedDropdownItemIcon>
              <Trash />
            </AnimatedDropdownItemIcon>
            <AnimatedDropdownItemText>Delete</AnimatedDropdownItemText>
          </AnimatedDropdownItem>
        </AnimatedDropdownContent>
      </AnimatedDropdown>
      <DeleteConfirmationModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        itemName={session.title}
        itemType="chat"
        onConfirm={deleteSession}
      />
      <NameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename chat"
        description="Choose a name you can find easily."
        initialValue={session.title}
        onSave={(title) => update(session.id, { title })}
      />
    </>
  );
}
