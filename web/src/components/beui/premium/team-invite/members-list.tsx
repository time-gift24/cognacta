"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/beui/utils";
import { TeamAvatar } from "./team-avatar";
import type {
  TeamInviteLabels,
  TeamMember,
  TeamRole,
} from "./team-invite-data";
import {
  ROW_STAGGER,
  reducedRowVariants,
  rowVariants,
} from "./team-invite-motion";

export type MembersListProps = {
  members: readonly TeamMember[];
  roles: readonly TeamRole[];
  labels: Pick<TeamInviteLabels, "owner">;
};

export function MembersList({ members, roles, labels }: MembersListProps) {
  const reduce = useReducedMotion();

  return (
    <ul className="divide-y divide-border">
      {members.map((member, index) => (
        <MemberRow
          key={member.id}
          member={member}
          roleLabel={
            roles.find((role) => role.id === member.role)?.label ?? member.role
          }
          ownerLabel={labels.owner}
          delay={reduce ? 0 : index * ROW_STAGGER}
          reduce={Boolean(reduce)}
        />
      ))}
    </ul>
  );
}

type MemberRowProps = {
  member: TeamMember;
  roleLabel: string;
  ownerLabel: string;
  delay: number;
  reduce: boolean;
};

function MemberRow({
  member,
  roleLabel,
  ownerLabel,
  delay,
  reduce,
}: MemberRowProps) {
  return (
    <motion.li
      variants={reduce ? reducedRowVariants : rowVariants}
      initial="initial"
      animate="animate"
      custom={delay}
      className="flex items-center gap-3 px-4 py-3"
    >
      <TeamAvatar
        label={member.name}
        src={member.avatar}
        online={member.online}
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate font-medium text-foreground text-sm">
          <span className="truncate">{member.name}</span>
          {member.owner ? (
            <span className="shrink-0 rounded-full border border-border px-2 py-0.5 font-normal text-muted-foreground text-xs">
              {ownerLabel}
            </span>
          ) : null}
        </p>
        <p className="truncate text-muted-foreground text-xs">{member.email}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        <span className="font-medium text-foreground text-sm">{roleLabel}</span>
        <span
          className={cn(
            "text-xs",
            member.online
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-muted-foreground",
          )}
        >
          {member.lastActive}
        </span>
      </div>
    </motion.li>
  );
}
