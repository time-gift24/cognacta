"use client";

import {
  Check,
  ChevronRight,
  Clock3,
  type LucideIcon,
  MessageSquareText,
  UsersRound,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useState } from "react";
import { ButtonLink } from "@/components/beui/motion/button/base";
import { EASE_OUT, SPRING_BOUNCE, SPRING_PANEL } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";

export type CompactCardPerson = {
  name: string;
  avatarUrl?: string;
};

export type CompactCardDetail = {
  icon: LucideIcon;
  label: string;
};

export type CompactCardProps = {
  status?: string;
  title?: string;
  description?: string;
  details?: CompactCardDetail[];
  footerLabel?: string;
  people?: CompactCardPerson[];
  peopleCount?: number;
  actionLabel?: string;
  href?: string;
  texture?: ReactNode;
  className?: string;
};

const DEFAULT_PEOPLE: CompactCardPerson[] = [
  { name: "Maya Chen" },
  { name: "Theo Martin" },
  { name: "June Park" },
];

const DEFAULT_DETAILS: CompactCardDetail[] = [
  { icon: Clock3, label: "Updated 2h ago" },
  { icon: UsersRound, label: "Product team" },
];

function CardTexture({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      aria-hidden
      animate={
        active && !reduceMotion ? { x: -4, scale: 1.025 } : { x: 0, scale: 1 }
      }
      transition={SPRING_PANEL}
      className="absolute -inset-3 overflow-hidden bg-[linear-gradient(125deg,#ffd4bd_0%,#ffe8bd_48%,#bfe5d8_100%)]"
    >
      <div className="absolute inset-0 opacity-55 [background-image:radial-gradient(circle_at_center,white_1.25px,transparent_1.25px)] [background-size:18px_18px]" />
      <div className="absolute -top-20 -left-10 size-52 rounded-full border-[22px] border-[#e9785d]/55" />
      <div className="absolute -top-14 left-[38%] h-44 w-24 rotate-[32deg] rounded-full border-[18px] border-[#2182a1]/55" />
      <div className="absolute -top-16 -right-5 size-44 rounded-full border-[24px] border-[#e2a12f]/60" />
      <div className="absolute top-10 right-[15%] h-2 w-24 -rotate-12 rounded-full bg-white/55" />
    </motion.div>
  );
}

function PersonAvatar({ person }: { person: CompactCardPerson }) {
  const initials = person.name
    .split(" ")
    .map((part) => part[0])
    .join(" ")
    .slice(0, 2);

  return (
    <span
      className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-background bg-background font-medium text-foreground text-xs ring-1 ring-border"
      title={person.name}
    >
      {person.avatarUrl ? (
        // biome-ignore lint/performance/noImgElement: caller-provided avatar source
        <img
          src={person.avatarUrl}
          alt={person.name}
          className="size-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}

export function CompactCard({
  status = "In progress",
  title = "Design refresh",
  description = "A tighter visual system for the next product release.",
  details = DEFAULT_DETAILS,
  footerLabel = "3 new comments",
  people = DEFAULT_PEOPLE,
  peopleCount = 5,
  actionLabel = "Open",
  href = "/",
  texture,
  className,
}: CompactCardProps) {
  const reduceMotion = useReducedMotion();
  const canHover = useHoverCapable();
  const [active, setActive] = useState(false);
  const visiblePeople = people.slice(0, 3);
  const remaining = Math.max(0, peopleCount - visiblePeople.length);
  const external = /^https?:\/\//.test(href);

  const setHoverActive = (next: boolean) => {
    if (canHover) setActive(next);
  };

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.5, ease: EASE_OUT }
      }
      onHoverStart={() => setHoverActive(true)}
      onHoverEnd={() => setHoverActive(false)}
      onFocusCapture={() => setActive(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setActive(false);
      }}
      className={cn(
        "relative isolate w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-background",
        className,
      )}
    >
      <div aria-hidden className="absolute inset-px overflow-hidden rounded-sm">
        {texture ?? <CardTexture active={active} />}
      </div>

      <div className="relative mt-10 rounded-t-3xl border-border border-t bg-background px-4 pt-4 pb-3.5">
        <div className="flex items-start justify-between gap-5">
          <span className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 font-medium text-foreground text-xs">
            <span className="grid size-4 place-items-center rounded-full bg-primary text-primary-foreground">
              <Check aria-hidden className="size-2.5" strokeWidth={2.5} />
            </span>
            {status}
          </span>

          <div
            className="flex -space-x-2"
            role="img"
            aria-label={`${peopleCount} people`}
          >
            {visiblePeople.map((person, index) => (
              <motion.span
                key={person.name}
                initial={
                  reduceMotion ? false : { opacity: 0, x: 8, scale: 0.82 }
                }
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { ...SPRING_BOUNCE, delay: 0.08 + index * 0.045 }
                }
              >
                <PersonAvatar person={person} />
              </motion.span>
            ))}
            {remaining > 0 ? (
              <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-background bg-background font-semibold text-foreground text-xs tabular-nums ring-1 ring-border">
                +{remaining}
              </span>
            ) : null}
          </div>
        </div>

        <h2 className="mt-4 text-foreground leading-tight tracking-[-0.03em] text-4xl font-medium">
          {title}
        </h2>
        <p className="mt-1.5 text-pretty text-muted-foreground text-sm leading-6">
          {description}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {details.slice(0, 2).map((detail) => {
            const Icon = detail.icon;
            return (
              <span
                key={detail.label}
                className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-border bg-transparent px-3 text-foreground text-xs"
              >
                <Icon aria-hidden className="size-4 text-muted-foreground" />
                {detail.label}
              </span>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 border-border border-t pt-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground">
              <MessageSquareText aria-hidden className="size-4" />
            </span>
            <span className="truncate font-medium text-foreground text-sm">
              {footerLabel}
            </span>
          </div>

          <ButtonLink
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer noopener" : undefined}
            size="md"
            className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full h-9"
          >
            {actionLabel}
            <motion.span
              animate={active && !reduceMotion ? { x: 2 } : { x: 0 }}
              transition={SPRING_PANEL}
            >
              <ChevronRight aria-hidden className="size-4" />
            </motion.span>
          </ButtonLink>
        </div>
      </div>
    </motion.article>
  );
}
