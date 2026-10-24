"use client";

/*
 * Hover or focus storyboard
 * 1. The card lifts 4px and its border firms up.
 * 2. The portrait eases from muted to full color and zooms in slightly.
 * 3. The overlay fades up from the bottom: the bio rises, then each link pops
 *    in 50ms apart.
 * 4. The name nudges right and the location row brightens.
 * Hover only applies on hover-capable devices; keyboard focus always does.
 * Reduced motion: color and opacity change without lift, zoom, or rise.
 */

import { AtSign, Globe, MapPin } from "lucide-react";
import { motion, type Variants } from "motion/react";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/beui/motion/button";
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";
import type { TeamGridLabels, TeamMember } from "./team-grid-data";

/** Local time for a zone, filled in after mount so server and client match. */
function useLocalTime(timeZone?: string) {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    if (!timeZone) return;
    const format = () =>
      setTime(
        new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone,
        }).format(new Date()),
      );
    format();
    const timer = setInterval(format, 60_000);
    return () => clearInterval(timer);
  }, [timeZone]);
  return time;
}

const PHOTO: Variants = {
  rest: { scale: 1, filter: "grayscale(0.55) brightness(0.95)" },
  active: { scale: 1.06, filter: "grayscale(0) brightness(1)" },
};
const PHOTO_STILL: Variants = {
  rest: { filter: "grayscale(0.55) brightness(0.95)" },
  active: { filter: "grayscale(0) brightness(1)" },
};

export function TeamGridCard({
  member,
  labels,
  reduce,
}: {
  member: TeamMember;
  labels: TeamGridLabels;
  reduce: boolean;
}) {
  const canHover = useHoverCapable();
  const time = useLocalTime(member.timeZone);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = hovered || focused;
  const links = (
    [
      [member.website, Globe, "website"],
      [member.social, AtSign, "social profile"],
    ] as const
  ).filter(([href]) => href);
  const hasOverlay = Boolean(member.bio || links.length);
  const rise = (delay: number) => ({
    initial: false as const,
    animate: active
      ? { opacity: 1, y: 0, transition: { ...SPRING_SWAP, delay } }
      : {
          opacity: 0,
          y: reduce ? 0 : 10,
          transition: { duration: 0.15, ease: EASE_OUT },
        },
  });

  return (
    <motion.article
      initial={false}
      animate={active ? "active" : "rest"}
      variants={{
        rest: { y: 0 },
        active: { y: reduce ? 0 : -4 },
      }}
      transition={SPRING_LAYOUT}
      onHoverStart={canHover ? () => setHovered(true) : undefined}
      onHoverEnd={canHover ? () => setHovered(false) : undefined}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setFocused(false);
      }}
      className={cn(
        "flex h-full flex-col rounded-3xl border bg-background p-2.5 transition-colors duration-300",
        active ? "border-foreground/25" : "border-border",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted sm:aspect-[4/5]">
        {/* biome-ignore lint/performance/noImgElement: Remote sample portraits ship with the installable block. */}
        <motion.img
          src={member.image}
          alt=""
          loading="lazy"
          variants={reduce ? PHOTO_STILL : PHOTO}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="size-full object-cover object-[50%_25%]"
        />
        {hasOverlay ? (
          <motion.div
            initial={false}
            animate={{ opacity: active ? 1 : 0 }}
            transition={{ duration: active ? 0.3 : 0.15, ease: EASE_OUT }}
            className={cn(
              "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 pt-12",
              !active && "pointer-events-none",
            )}
          >
            <div className="flex items-end justify-between gap-2">
              {member.bio ? (
                <motion.p
                  {...rise(0.04)}
                  className="text-pretty text-xs leading-5 text-white/90"
                >
                  {member.bio}
                </motion.p>
              ) : (
                <span />
              )}
              <div className="flex shrink-0 gap-1">
                {links.map(([href, Icon, kind], index) => (
                  <motion.span
                    key={kind}
                    initial={false}
                    animate={
                      active
                        ? {
                            opacity: 1,
                            scale: 1,
                            transition: {
                              ...SPRING_SWAP,
                              delay: 0.1 + index * 0.05,
                            },
                          }
                        : {
                            opacity: 0,
                            scale: reduce ? 1 : 0.7,
                            transition: { duration: 0.12 },
                          }
                    }
                    className="flex"
                  >
                    <ButtonLink
                      href={href}
                      size="icon"
                      variant="secondary"
                      aria-label={`${member.name} ${kind}`}
                      className="size-8 bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
                    >
                      <Icon className="size-3.5" aria-hidden="true" />
                    </ButtonLink>
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col px-1.5 pt-3 pb-1">
        <motion.h3
          initial={false}
          animate={{ x: active && !reduce ? 3 : 0 }}
          transition={SPRING_SWAP}
          className="text-xl font-medium text-foreground"
        >
          {member.name}
        </motion.h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{member.role}</p>
        {member.location ? (
          <p
            className={cn(
              "mt-3 flex items-center gap-1.5 text-xs transition-colors duration-300",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{member.location}</span>
            {time ? (
              <span className="ml-auto shrink-0 font-mono tabular-nums">
                <span className="sr-only">{labels.localTime} </span>
                {time}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
    </motion.article>
  );
}
