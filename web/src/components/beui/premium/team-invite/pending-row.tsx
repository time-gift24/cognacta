"use client";

import { Check, RotateCw, X } from "lucide-react";
import { motion, useAnimate, useReducedMotion } from "motion/react";
import { forwardRef, useEffect, useRef, useState } from "react";
import {
  ActionSwapIcon,
  ActionSwapText,
} from "@/components/beui/motion/action-swap";
import { Button } from "@/components/beui/motion/button";
import { RoleSelect } from "./role-select";
import { TeamAvatar } from "./team-avatar";
import type {
  PendingInvite,
  TeamInviteLabels,
  TeamRole,
  TeamRoleId,
} from "./team-invite-data";
import {
  PULSE_KEYFRAMES,
  PULSE_TRANSITION,
  reducedRowVariants,
  rowVariants,
} from "./team-invite-motion";

const SENT_HOLD_MS = 2200;

export type PendingRowProps = {
  invite: PendingInvite;
  roles: readonly TeamRole[];
  labels: Pick<TeamInviteLabels, "resend" | "resent" | "revoke" | "invited">;
  /** Entrance delay, so rows mounting together cascade. */
  delay: number;
  onResend: (id: string) => void | Promise<void>;
  onRevoke: (id: string) => void;
  onChangeRole: (id: string, role: TeamRoleId) => void;
};

export const PendingRow = forwardRef<HTMLLIElement, PendingRowProps>(
  function PendingRow(
    { invite, roles, labels, delay, onResend, onRevoke, onChangeRole },
    ref,
  ) {
    const reduce = useReducedMotion();
    const [scope, animate] = useAnimate<HTMLSpanElement>();
    const [sent, setSent] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => () => clearTimeout(timer.current), []);

    async function resend() {
      if (sent) return;
      if (!reduce && scope.current) {
        animate(scope.current, PULSE_KEYFRAMES, PULSE_TRANSITION);
      }
      await onResend(invite.id);
      setSent(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setSent(false), SENT_HOLD_MS);
    }

    return (
      <motion.li
        ref={ref}
        layout={reduce ? false : "position"}
        variants={reduce ? reducedRowVariants : rowVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        custom={delay}
        className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <TeamAvatar label={invite.email} src={invite.avatar} />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground text-sm">
              {invite.email}
            </p>
            <p className="text-muted-foreground text-xs">
              {labels.invited(invite.invitedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 pl-12 sm:pl-0">
          <RoleSelect
            roles={roles}
            value={invite.role}
            onValueChange={(role) => onChangeRole(invite.id, role)}
            label={`Role for ${invite.email}`}
            compact
            align="end"
            buttonClassName="min-w-28"
          />
          <span ref={scope} className="inline-flex">
            <Button
              type="button"
              variant="ghost"
              onClick={resend}
              aria-label={
                sent ? labels.resent : `${labels.resend} ${invite.email}`
              }
              className="h-10 gap-1.5 px-3 text-sm"
            >
              <ActionSwapIcon value={sent ? "sent" : "resend"}>
                {sent ? (
                  <Check aria-hidden className="size-3.5" />
                ) : (
                  <RotateCw aria-hidden className="size-3.5" />
                )}
              </ActionSwapIcon>
              <ActionSwapText value={sent ? "sent" : "resend"}>
                {sent ? labels.resent : labels.resend}
              </ActionSwapText>
            </Button>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRevoke(invite.id)}
            aria-label={`${labels.revoke} ${invite.email}`}
            className="size-10 text-muted-foreground hover:text-foreground"
          >
            <X aria-hidden className="size-4" />
          </Button>
        </div>
      </motion.li>
    );
  },
);
