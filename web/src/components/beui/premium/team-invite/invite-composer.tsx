"use client";

import { Send } from "lucide-react";
import { useId } from "react";
import { type ButtonState, StatefulButton } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import { EmailChipInput } from "./email-chip-input";
import { RoleSelect } from "./role-select";
import type {
  TeamInviteLabels,
  TeamRole,
  TeamRoleId,
} from "./team-invite-data";
import type { useEmailChips } from "./use-email-chips";

export type InviteComposerProps = {
  batch: ReturnType<typeof useEmailChips>;
  roles: readonly TeamRole[];
  role: TeamRoleId;
  onRoleChange: (role: TeamRoleId) => void;
  note: string;
  onNoteChange: (note: string) => void;
  status: ButtonState;
  /** Invites in the batch beyond the seat limit. */
  overBy: number;
  onSend: () => void;
  labels: TeamInviteLabels;
};

/** Email chips, batch role, optional note, and the send action. */
export function InviteComposer({
  batch,
  roles,
  role,
  onRoleChange,
  note,
  onNoteChange,
  status,
  overBy,
  onSend,
  labels,
}: InviteComposerProps) {
  const noteId = useId();
  const busy = status === "loading";
  const invalidCount = batch.invalid.length;
  const blocker =
    invalidCount > 0
      ? labels.invalidBlocking(invalidCount)
      : overBy > 0
        ? labels.seatsOver(overBy)
        : null;
  const canSend =
    batch.valid.length > 0 && invalidCount === 0 && overBy === 0 && !busy;

  return (
    <div className="flex flex-col gap-4">
      <EmailChipInput
        chips={batch.chips}
        draft={batch.draft}
        onDraftChange={batch.setDraft}
        onAdd={batch.add}
        onCommitDraft={batch.commitDraft}
        onRemove={batch.remove}
        onRemoveLast={batch.removeLast}
        shake={batch.shake}
        sending={busy}
        disabled={busy}
        label={labels.emailLabel}
        placeholder={labels.emailPlaceholder}
        hint={labels.emailHint}
        status={
          batch.duplicateNotice ? labels.duplicate(batch.duplicateNotice) : null
        }
      />

      <div className="flex flex-col gap-1.5">
        <span className="px-1 font-medium text-foreground text-sm">
          {labels.roleLabel}
        </span>
        <RoleSelect
          roles={roles}
          value={role}
          onValueChange={onRoleChange}
          label={labels.roleLabel}
          disabled={busy}
          className="w-full"
          buttonClassName="w-full"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={noteId}
          className="px-1 font-medium text-foreground text-sm"
        >
          {labels.noteLabel}
        </label>
        <textarea
          id={noteId}
          rows={2}
          value={note}
          disabled={busy}
          maxLength={280}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder={labels.notePlaceholder}
          className={cn(
            "min-h-20 resize-none rounded-2xl border border-border bg-background px-3.5 py-2.5 text-foreground text-sm outline-none transition-colors duration-200",
            "placeholder:text-muted-foreground/60 focus:border-foreground/60 disabled:opacity-60",
          )}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          aria-live="polite"
          className={cn(
            "min-h-4 px-1 text-xs",
            blocker
              ? "text-amber-700 dark:text-amber-300"
              : "text-muted-foreground",
          )}
        >
          {blocker ?? ""}
        </p>
        <StatefulButton
          type="button"
          state={status}
          onClick={onSend}
          disabled={!canSend && status === "idle"}
          loadingText={labels.sending}
          successText={labels.sent}
          icon={<Send aria-hidden className="size-4" />}
          className="w-full sm:w-auto"
        >
          {labels.send}
        </StatefulButton>
      </div>
    </div>
  );
}
