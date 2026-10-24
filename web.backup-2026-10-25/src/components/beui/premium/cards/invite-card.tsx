"use client";

import {
  Award,
  Check,
  Copy,
  Gift,
  Link2,
  type LucideIcon,
  UserRoundPlus,
  WalletCards,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  ActionSwapIcon,
  ActionSwapText,
} from "@/components/beui/motion/action-swap";
import { Button } from "@/components/beui/motion/button/base";
import { EASE_OUT, SPRING_BOUNCE, SPRING_PANEL } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";

export type InviteCardStep = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type InviteCardProps = {
  rewardLabel?: string;
  title?: string;
  description?: string;
  steps?: InviteCardStep[];
  inviteLink?: string;
  copyLabel?: string;
  onCopy?: (inviteLink: string) => void | Promise<void>;
  onDismiss?: () => void;
  className?: string;
};

const DEFAULT_STEPS: InviteCardStep[] = [
  {
    title: "Share your invite",
    description: "Send your personal link to someone you want to bring in.",
    icon: Link2,
  },
  {
    title: "They join",
    description: "Your friend creates an account through your invitation.",
    icon: UserRoundPlus,
  },
  {
    title: "You both earn",
    description: "The reward unlocks for both of you after they get started.",
    icon: Gift,
  },
];

function RewardArtwork({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#bdeaf0_0%,#72c8df_42%,#568fd2_100%)]" />
      <div className="absolute -right-6 bottom-[-2.5rem] size-56 rounded-full border-[36px] border-white/20" />
      <div className="absolute right-5 bottom-2 size-28 rounded-full bg-white/20 blur-sm" />
      <motion.div
        animate={
          active && !reduceMotion
            ? { rotate: 4, scale: 1.06, y: -3 }
            : { rotate: 0, scale: 1, y: 0 }
        }
        transition={SPRING_PANEL}
        className="absolute right-14 bottom-10 grid size-16 place-items-center text-foreground sm:right-12 sm:bottom-8 sm:size-20"
      >
        <Award className="size-10 sm:size-12" strokeWidth={1.6} />
      </motion.div>
    </div>
  );
}

export function InviteCard({
  rewardLabel = "Earn 150 credits",
  title = "Invite & earn rewards",
  description = "Share your link and earn a reward when friends join.",
  steps = DEFAULT_STEPS,
  inviteLink = "https://app.example.com/ref/alex1234",
  copyLabel = "Copy link",
  onCopy,
  onDismiss,
  className,
}: InviteCardProps) {
  const reduceMotion = useReducedMotion();
  const canHover = useHoverCapable();
  const [active, setActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyState = copied ? "copied" : "copy";

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const copyInviteLink = async () => {
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1600);

    try {
      if (onCopy) await onCopy(inviteLink);
      else await navigator.clipboard.writeText(inviteLink);
    } catch {
      setCopied(false);
    }
  };

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.5, ease: EASE_OUT }
      }
      onHoverStart={() => {
        if (canHover) setActive(true);
      }}
      onHoverEnd={() => setActive(false)}
      className={cn(
        "w-full max-w-md rounded-3xl border border-border bg-background p-3",
        className,
      )}
    >
      <div className="relative min-h-60 overflow-hidden rounded-2xl border border-border p-6 sm:p-7">
        <RewardArtwork active={active} />

        <div className="relative flex min-h-[12.5rem] flex-col items-start">
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border bg-background/85 px-3 font-medium text-foreground text-xs backdrop-blur-sm">
            <WalletCards aria-hidden className="size-3.5" />
            {rewardLabel}
          </span>

          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss invite card"
              className="absolute -top-1 -right-1 grid size-10 place-items-center rounded-full border border-border bg-background/20 text-foreground backdrop-blur-sm transition-colors hover:bg-background/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden className="size-4" />
            </button>
          ) : null}

          <div className="mt-auto max-w-[10rem] sm:max-w-[15rem]">
            <h2 className="text-balance text-foreground leading-[1.02] tracking-[-0.04em] text-4xl font-medium">
              {title}
            </h2>
            <p className="mt-3 text-pretty text-foreground/75 text-sm leading-5">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 pt-7 pb-3 sm:px-4">
        <p className="font-mono font-medium text-xs text-muted-foreground uppercase tracking-[0.14em]">
          How it works
        </p>

        <ol className="mt-5 space-y-5">
          {steps.slice(0, 3).map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.li
                key={step.title}
                initial={
                  reduceMotion
                    ? false
                    : { opacity: 0, x: -8, filter: "blur(4px)" }
                }
                whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { ...SPRING_BOUNCE, delay: 0.08 + index * 0.06 }
                }
                className="grid grid-cols-[2rem_1fr] gap-3"
              >
                <span className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground">
                  <Icon aria-hidden className="size-3.5" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-foreground leading-5 text-xl font-medium">
                    {step.title}
                  </h3>
                  <p className="mt-0.5 text-pretty text-muted-foreground text-xs leading-5">
                    {step.description}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ol>

        <div className="mt-8 border-border border-t pt-6">
          <p className="font-mono font-medium text-xs text-muted-foreground uppercase tracking-[0.14em]">
            Invite link
          </p>
          <div className="mt-3 flex min-h-12 items-center gap-3 rounded-full border border-border bg-transparent p-1.5 pl-3.5">
            <Link2
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground text-xs">
              {inviteLink}
            </span>
            <Button
              size="sm"
              onClick={copyInviteLink}
              aria-label={copied ? "Invite link copied" : "Copy invite link"}
              className="min-w-[6.5rem] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full h-9"
            >
              <ActionSwapIcon
                value={copyState}
                animation="cascade"
                className="size-3.5"
              >
                {copied ? (
                  <Check aria-hidden className="size-3.5" />
                ) : (
                  <Copy aria-hidden className="size-3.5" />
                )}
              </ActionSwapIcon>
              <ActionSwapText value={copyState} animation="cascade">
                {copied ? "Copied" : copyLabel}
              </ActionSwapText>
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
