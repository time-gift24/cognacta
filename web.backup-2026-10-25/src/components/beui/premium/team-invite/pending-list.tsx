"use client";

import { MailPlus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/lib/beui/ease";
import { PendingRow, type PendingRowProps } from "./pending-row";
import type { PendingInvite, TeamInviteLabels } from "./team-invite-data";
import { ROW_STAGGER } from "./team-invite-motion";
import { useCascadeDelays } from "./use-cascade-delays";

export type PendingListProps = Omit<
  PendingRowProps,
  "invite" | "delay" | "labels"
> & {
  pending: readonly PendingInvite[];
  labels: PendingRowProps["labels"] & Pick<TeamInviteLabels, "emptyPending">;
  /** Seconds before freshly sent invites start landing. */
  lead?: number;
};

export function PendingList({
  pending,
  labels,
  lead = 0.18,
  ...rowProps
}: PendingListProps) {
  const reduce = useReducedMotion();
  const delays = useCascadeDelays(
    pending.map((invite) => invite.id),
    ROW_STAGGER,
    lead,
  );

  return (
    <div className="relative">
      <ul className="relative divide-y divide-border">
        <AnimatePresence mode="popLayout">
          {pending.map((invite) => (
            <PendingRow
              key={invite.id}
              invite={invite}
              labels={labels}
              delay={reduce ? 0 : (delays.get(invite.id) ?? 0)}
              {...rowProps}
            />
          ))}
        </AnimatePresence>
      </ul>
      <AnimatePresence initial={false}>
        {pending.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.1 }}
            className="flex flex-col items-center gap-3 px-6 py-10 text-center"
          >
            <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
              <MailPlus aria-hidden className="size-4" />
            </span>
            <p className="max-w-xs text-muted-foreground text-sm">
              {labels.emptyPending}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
