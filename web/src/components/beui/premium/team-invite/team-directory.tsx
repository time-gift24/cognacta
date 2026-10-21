"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId } from "react";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { EASE_OUT } from "@/lib/beui/ease";
import { MembersList } from "./members-list";
import { PendingList, type PendingListProps } from "./pending-list";
import type {
  PendingInvite,
  TeamInviteLabels,
  TeamMember,
  TeamRole,
} from "./team-invite-data";
import { EXIT_TRANSITION } from "./team-invite-motion";

export type TeamDirectoryProps = {
  tab: string;
  onTabChange: (tab: string) => void;
  members: readonly TeamMember[];
  pending: readonly PendingInvite[];
  roles: readonly TeamRole[];
  labels: TeamInviteLabels;
  onResend: PendingListProps["onResend"];
  onRevoke: PendingListProps["onRevoke"];
  onChangeRole: PendingListProps["onChangeRole"];
};

/** Members and pending invites behind shared beUI Tabs with rolling counts. */
export function TeamDirectory({
  tab,
  onTabChange,
  members,
  pending,
  roles,
  labels,
  onResend,
  onRevoke,
  onChangeRole,
}: TeamDirectoryProps) {
  const id = useId();
  const tabs = [
    { value: "members", label: labels.membersTab, count: members.length },
    { value: "pending", label: labels.pendingTab, count: pending.length },
  ];

  return (
    <Tabs value={tab} onValueChange={onTabChange}>
      <div className="px-5 pt-5 sm:px-6">
        <TabsList aria-label={labels.title}>
          {tabs.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              id={`${id}-${item.value}-tab`}
              aria-controls={`${id}-${item.value}-panel`}
            >
              <span className="inline-flex items-center gap-2">
                {item.label}
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-border px-1.5 font-mono text-muted-foreground text-xs tabular-nums leading-none">
                  <DigitSwap value={item.count} className="leading-none" />
                </span>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          role="tabpanel"
          id={`${id}-${tab}-panel`}
          aria-labelledby={`${id}-${tab}-tab`}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: { duration: 0.2, ease: EASE_OUT },
          }}
          exit={{ opacity: 0, transition: EXIT_TRANSITION }}
          className="py-2"
        >
          {tab === "members" ? (
            <MembersList members={members} roles={roles} labels={labels} />
          ) : (
            <PendingList
              pending={pending}
              roles={roles}
              labels={labels}
              onResend={onResend}
              onRevoke={onRevoke}
              onChangeRole={onChangeRole}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </Tabs>
  );
}
