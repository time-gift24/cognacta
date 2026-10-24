"use client";

import { Check, Copy, Link2, RefreshCw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import {
  ActionSwapIcon,
  ActionSwapText,
} from "@/components/beui/motion/action-swap";
import { Button } from "@/components/beui/motion/button";
import { Switch } from "@/components/beui/motion/switch";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { ResetLinkDialog } from "./reset-link-dialog";
import { RoleSelect } from "./role-select";
import type {
  InviteLink,
  TeamInviteLabels,
  TeamRole,
  TeamRoleId,
} from "./team-invite-data";
import { useCopy } from "./use-copy";

export type InviteLinkCardProps = {
  link: InviteLink;
  roles: readonly TeamRole[];
  labels: TeamInviteLabels;
  onLinkChange: (link: InviteLink) => void;
  onResetLink: () => Promise<string>;
  className?: string;
};

/** Shareable join link with copy, an on/off switch, role, and reset. */
export function InviteLinkCard({
  link,
  roles,
  labels,
  onLinkChange,
  onResetLink,
  className,
}: InviteLinkCardProps) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const { copied, copy } = useCopy();
  const [resetOpen, setResetOpen] = useState(false);
  const display = link.url.replace(/^https?:\/\//, "");

  async function reset() {
    const url = await onResetLink();
    onLinkChange({ ...link, url });
  }

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-background p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <Link2 aria-hidden className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 id={titleId} className="font-medium text-foreground text-base">
            {labels.linkTitle}
          </h3>
          <p className="text-muted-foreground text-sm">
            {labels.linkDescription}
          </p>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ opacity: link.enabled ? 1 : 0.5 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        className="flex h-10 items-center gap-2 rounded-full border border-border pr-0.5 pl-4"
      >
        <span className="min-w-0 flex-1 truncate font-mono text-foreground text-xs">
          <ActionSwapText value={link.url} animation={reduce ? "blur" : "roll"}>
            {display}
          </ActionSwapText>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!link.enabled}
          onClick={() => copy(link.url)}
          aria-label={copied ? labels.copied : labels.copyLink}
          className="size-9 shrink-0"
        >
          <ActionSwapIcon value={copied ? "copied" : "copy"}>
            {copied ? (
              <Check aria-hidden className="size-4" />
            ) : (
              <Copy aria-hidden className="size-4" />
            )}
          </ActionSwapIcon>
        </Button>
        <span className="sr-only" aria-live="polite">
          {copied ? labels.copied : ""}
        </span>
      </motion.div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {labels.linkRoleLabel}
          </span>
          <RoleSelect
            roles={roles}
            value={link.role}
            onValueChange={(role: TeamRoleId) =>
              onLinkChange({ ...link, role })
            }
            label={labels.linkRoleLabel}
            disabled={!link.enabled}
            compact
            buttonClassName="min-w-28"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setResetOpen(true)}
          disabled={!link.enabled}
          className="gap-1.5 px-3"
        >
          <RefreshCw aria-hidden className="size-3.5" />
          {labels.resetLink}
        </Button>
      </div>

      <div className="flex flex-col gap-2 border-border border-t pt-4">
        <Switch
          checked={link.enabled}
          onCheckedChange={(enabled) => onLinkChange({ ...link, enabled })}
          label={labels.linkEnabled}
        />
        <p className="text-muted-foreground text-xs">
          {link.enabled ? link.expiresLabel : labels.linkDisabledNote}
        </p>
      </div>

      <ResetLinkDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        onConfirm={reset}
        labels={labels}
      />
    </section>
  );
}
