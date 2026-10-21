"use client";

import { Check, Copy } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  ActionSwapIcon,
  ActionSwapText,
} from "@/components/beui/motion/action-swap";
import { Button, ButtonLink } from "@/components/beui/motion/button/base";
import { EASE_OUT, SPRING_PANEL } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";

export type ProfileCardProps = {
  role?: string;
  time?: string;
  name?: string;
  company?: string;
  availability?: string;
  avatarUrl?: string;
  avatarAlt?: string;
  email?: string;
  hireLabel?: string;
  copyLabel?: string;
  hireHref?: string;
  onCopyEmail?: (email: string) => void | Promise<void>;
  className?: string;
};

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&fm=webp&q=85&w=320";

export function ProfileCard({
  role = "Design engineer",
  time = "9:41 PM",
  name = "Saurabh",
  company = "Northstar Studio",
  availability = "Available for work",
  avatarUrl = DEFAULT_AVATAR,
  avatarAlt = "Profile portrait",
  email = "hello@example.com",
  hireLabel = "Hire me",
  copyLabel = "Copy email",
  hireHref = `mailto:${email}`,
  onCopyEmail,
  className,
}: ProfileCardProps) {
  const reduceMotion = useReducedMotion();
  const canHover = useHoverCapable();
  const [active, setActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const external = /^https?:\/\//.test(hireHref);
  const copyState = copied ? "copied" : "copy";

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const copyEmail = async () => {
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1600);

    try {
      if (onCopyEmail) await onCopyEmail(email);
      else await navigator.clipboard.writeText(email);
    } catch {
      setCopied(false);
    }
  };

  const setHoverActive = (next: boolean) => {
    if (canHover) setActive(next);
  };

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.45, ease: EASE_OUT }
      }
      onHoverStart={() => setHoverActive(true)}
      onHoverEnd={() => setHoverActive(false)}
      onFocusCapture={() => setActive(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setActive(false);
      }}
      className={cn("w-full max-w-sm", className)}
    >
      <div className="relative z-10 rounded-3xl border border-border bg-background p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 text-muted-foreground text-xs">
          <span className="font-medium">{role}</span>
          <time className="tabular-nums">{time}</time>
        </div>

        <div className="mt-6 grid grid-cols-[4.75rem_1fr] items-center gap-4">
          <motion.div
            animate={
              active && !reduceMotion
                ? { scale: 1.035, rotate: -1 }
                : { scale: 1, rotate: 0 }
            }
            transition={SPRING_PANEL}
            className="size-[4.75rem] overflow-hidden rounded-full border border-border bg-background"
          >
            {/* biome-ignore lint/performance/noImgElement: caller-provided remote profile image */}
            <img
              src={avatarUrl}
              alt={avatarAlt}
              className="size-full object-cover"
            />
          </motion.div>

          <div className="min-w-0">
            <h2 className="text-balance text-foreground leading-tight tracking-[-0.035em] text-4xl font-medium">
              {name}
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground leading-tight">
              @ {company}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <ButtonLink
            href={hireHref}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer noopener" : undefined}
            size="lg"
            className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full h-9"
          >
            {hireLabel}
          </ButtonLink>

          <Button
            variant="outline"
            size="lg"
            onClick={copyEmail}
            aria-label={copied ? "Email copied" : `Copy ${email}`}
            className="w-full px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
          >
            <ActionSwapIcon
              value={copyState}
              animation="cascade"
              className="size-4"
            >
              {copied ? (
                <Check aria-hidden className="size-4" />
              ) : (
                <Copy aria-hidden className="size-4" />
              )}
            </ActionSwapIcon>
            <ActionSwapText value={copyState} animation="cascade">
              {copied ? "Copied" : copyLabel}
            </ActionSwapText>
          </Button>
        </div>
      </div>

      <div className="relative z-0 mx-4 -mt-6 flex min-h-16 items-end justify-center rounded-b-3xl border border-accent/20 bg-accent/10 px-5 pt-8 pb-3 text-foreground">
        <div className="flex items-center gap-2">
          <motion.span
            aria-hidden
            animate={active && !reduceMotion ? { scale: 1.15 } : { scale: 1 }}
            transition={SPRING_PANEL}
            className="size-2.5 shrink-0 rounded-full bg-success"
          />
          <span className="truncate font-medium text-xs">{availability}</span>
        </div>
      </div>
    </motion.article>
  );
}
