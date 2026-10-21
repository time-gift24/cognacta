"use client";

/*
 * Storyboard
 * 1. Mount: header, team tabs, and invite link card blur-rise in sequence,
 *    70ms apart. Member rows cascade 45ms apart.
 * 2. Invite: the header button opens the invite form in AnimatedModal.
 * 3. Typing: committed addresses pop in as chips on a bouncy spring; removed
 *    chips pop out in 150ms. A duplicate shakes the chip it repeats. Each
 *    valid chip fills the next seat pill and the seat count rolls.
 * 4. Send: the button swaps to a spinner while chips hold. On success the
 *    chips drop away, the dialog closes, the Pending tab opens, and the new
 *    invites cascade in at the top of the list.
 * 5. Rows: resend pulses the button and swaps its label to "Sent"; revoke
 *    slides the row out in 150ms while the rest glide up.
 * Reduced motion: every transform is replaced with a short opacity fade and
 * the shake, pulse, and seat fill play instantly.
 */

import { UserPlus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { Button, type ButtonState } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import { InviteDialog } from "./invite-dialog";
import { InviteLinkCard } from "./invite-link-card";
import { SeatMeter } from "./seat-meter";
import { TeamDirectory } from "./team-directory";
import {
  DEFAULT_INVITE_LINK,
  DEFAULT_LABELS,
  DEFAULT_MEMBERS,
  DEFAULT_PENDING,
  DEFAULT_ROLES,
  DEFAULT_SEAT_LIMIT,
  type InviteLink,
  type PendingInvite,
  type TeamInviteLabels,
  type TeamMember,
  type TeamRole,
  type TeamRoleId,
} from "./team-invite-data";
import { reducedStageVariants, stageVariants } from "./team-invite-motion";
import { useEmailChips } from "./use-email-chips";

const STATUS_HOLD_MS = 1600;
/** How long "Invites sent" shows before the dialog closes. */
const CLOSE_AFTER_SEND_MS = 700;

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export type TeamInviteProps = {
  members?: readonly TeamMember[];
  pending?: readonly PendingInvite[];
  roles?: readonly TeamRole[];
  seatLimit?: number;
  inviteLink?: InviteLink;
  /** Role preselected for each new batch. */
  defaultRole?: TeamRoleId;
  labels?: Partial<TeamInviteLabels>;
  /** Send a batch. Reject to show the error state. */
  onInvite?: (
    emails: string[],
    role: TeamRoleId,
    note: string,
  ) => Promise<void>;
  onResend?: (id: string) => void | Promise<void>;
  onRevoke?: (id: string) => void;
  onChangeRole?: (id: string, role: TeamRoleId) => void;
  /** Rotate the invite link. Resolve with the new URL. */
  onResetLink?: () => Promise<string>;
  onLinkChange?: (link: InviteLink) => void;
  className?: string;
};

export function TeamInvite({
  members = DEFAULT_MEMBERS,
  pending: pendingProp = DEFAULT_PENDING,
  roles = DEFAULT_ROLES,
  seatLimit = DEFAULT_SEAT_LIMIT,
  inviteLink = DEFAULT_INVITE_LINK,
  defaultRole = "member",
  labels: labelsProp,
  onInvite = () => wait(900),
  onResend = () => wait(450),
  onRevoke,
  onChangeRole,
  onResetLink = async () => {
    await wait(800);
    return `https://app.northwind.studio/join/${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;
  },
  onLinkChange,
  className,
}: TeamInviteProps) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const labels = useMemo(
    () => ({ ...DEFAULT_LABELS, ...labelsProp }),
    [labelsProp],
  );
  const [pending, setPending] = useState<PendingInvite[]>(() => [
    ...pendingProp,
  ]);
  const [link, setLink] = useState(inviteLink);
  const [role, setRole] = useState<TeamRoleId>(defaultRole);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<ButtonState>("idle");
  const [tab, setTab] = useState("members");
  const [inviteOpen, setInviteOpen] = useState(false);

  const taken = useMemo(
    () =>
      new Set([
        ...members.map((member) => member.email.toLowerCase()),
        ...pending.map((invite) => invite.email.toLowerCase()),
      ]),
    [members, pending],
  );
  const batch = useEmailChips(taken);
  const used = members.length + pending.length;
  const batchSize = batch.valid.length;
  const overBy = Math.max(0, used + batchSize - seatLimit);

  async function send() {
    if (batch.draft.trim()) {
      batch.commitDraft();
      return;
    }
    if (!batch.valid.length || batch.invalid.length || overBy > 0) return;
    const emails = batch.valid.map((chip) => chip.email);
    setStatus("loading");
    try {
      await onInvite(emails, role, note.trim());
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), STATUS_HOLD_MS);
      return;
    }
    const stamp = Date.now();
    setPending((current) => [
      ...emails.map((email, index) => ({
        id: `invite-${stamp}-${index}`,
        email,
        role,
        invitedAt: "Just now",
      })),
      ...current,
    ]);
    batch.clear();
    setNote("");
    setStatus("success");
    setTimeout(() => {
      setInviteOpen(false);
      setTab("pending");
      setStatus("idle");
    }, CLOSE_AFTER_SEND_MS);
  }

  function revoke(id: string) {
    setPending((current) => current.filter((invite) => invite.id !== id));
    onRevoke?.(id);
  }

  function changeRole(id: string, next: TeamRoleId) {
    setPending((current) =>
      current.map((invite) =>
        invite.id === id ? { ...invite, role: next } : invite,
      ),
    );
    onChangeRole?.(id, next);
  }

  function updateLink(next: InviteLink) {
    setLink(next);
    onLinkChange?.(next);
  }

  const variants = reduce ? reducedStageVariants : stageVariants;
  const stage = (index: number) => ({
    variants,
    initial: "hidden",
    animate: "visible",
    custom: index,
  });

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "mx-auto w-full max-w-5xl overflow-clip rounded-3xl border border-border bg-background text-foreground",
        className,
      )}
    >
      <motion.header
        {...stage(0)}
        className="flex flex-col gap-5 border-border border-b p-5 sm:p-6 md:flex-row md:items-end md:justify-between"
      >
        <div className="max-w-md">
          <h2 id={titleId} className="font-medium text-xl">
            {labels.teamTitle}
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            {labels.teamDescription}
          </p>
        </div>
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end md:w-auto">
          <SeatMeter
            used={used}
            batch={0}
            limit={seatLimit}
            labels={labels}
            className="w-full sm:w-56"
          />
          <Button
            type="button"
            onClick={() => setInviteOpen(true)}
            aria-haspopup="dialog"
            className="shrink-0"
          >
            <UserPlus className="size-4" aria-hidden="true" />
            {labels.openInvite}
          </Button>
        </div>
      </motion.header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
        <motion.div
          {...stage(1)}
          className="min-w-0 lg:border-border lg:border-r"
        >
          <TeamDirectory
            tab={tab}
            onTabChange={setTab}
            members={members}
            pending={pending}
            roles={roles}
            labels={labels}
            onResend={onResend}
            onRevoke={revoke}
            onChangeRole={changeRole}
          />
        </motion.div>
        <motion.div
          {...stage(2)}
          className="border-border border-t p-5 sm:p-6 lg:border-t-0"
        >
          <InviteLinkCard
            link={link}
            roles={roles}
            labels={labels}
            onLinkChange={updateLink}
            onResetLink={onResetLink}
          />
        </motion.div>
      </div>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        used={used}
        seatLimit={seatLimit}
        batch={batch}
        roles={roles}
        role={role}
        onRoleChange={setRole}
        note={note}
        onNoteChange={setNote}
        status={status}
        overBy={overBy}
        onSend={send}
        labels={labels}
      />
    </section>
  );
}
