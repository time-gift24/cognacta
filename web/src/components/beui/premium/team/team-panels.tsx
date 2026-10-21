"use client";

/*
 * Storyboard
 * 1. Hover, focus, or tap a panel: it springs wider while the others narrow.
 *    Its photo shifts from muted to full color and settles from a slight
 *    zoom, and the bio and link rise in above the name.
 * 2. Collapsed panels keep a muted photo with the name and role pinned to
 *    the bottom, so nothing reflows while widths change.
 * Reduced motion: widths, photos, and text change in place.
 */

import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { EASE_OUT, EASE_OUT_CSS, SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { TEAM_PHOTOS, teamPortrait } from "./team-portraits";

export type TeamPanelMember = {
  name: string;
  role: string;
  bio: string;
  /** Portrait photo URL. Shown full-bleed, so prefer a vertical crop. */
  image: string;
  /** Optional profile link shown when the panel is open. */
  href?: string;
};

export type TeamPanelsProps = {
  eyebrow?: string;
  title?: string;
  subtext?: string;
  members?: TeamPanelMember[];
  /** Label for the profile link. */
  profileLabel?: string;
  className?: string;
};

/** Wide, heavy spring for panel widths: no wobble at the end of travel. */
const PANEL_SPRING = {
  type: "spring",
  stiffness: 210,
  damping: 34,
  mass: 0.9,
} as const;

const portrait = (id: string) => teamPortrait(id, 720, 960);

const DEFAULT_MEMBERS: TeamPanelMember[] = [
  {
    name: "Maya Okafor",
    role: "Founder & CEO",
    bio: "Sets the vision and keeps the bar high. Spent a decade leading design systems teams.",
    image: portrait(TEAM_PHOTOS.maya),
    href: "#maya",
  },
  {
    name: "Dev Sharma",
    role: "Head of Engineering",
    bio: "Owns the registry and runtime, and treats motion as a feature, not a finish.",
    image: portrait(TEAM_PHOTOS.dev),
    href: "#dev",
  },
  {
    name: "Lior Adler",
    role: "Design Lead",
    bio: "Tunes every spring and easing curve until it feels physical.",
    image: portrait(TEAM_PHOTOS.lior),
    href: "#lior",
  },
  {
    name: "Ana Ruiz",
    role: "Developer Advocate",
    bio: "Turns complex APIs into docs people actually enjoy reading.",
    image: portrait(TEAM_PHOTOS.ana),
    href: "#ana",
  },
  {
    name: "Kenji Mori",
    role: "Staff Engineer",
    bio: "Performance obsessive who ships at 60fps or not at all.",
    image: portrait(TEAM_PHOTOS.kenji),
    href: "#kenji",
  },
];

export function TeamPanels({
  eyebrow = "Team",
  title = "Meet the makers.",
  subtext = "Hover or tap a panel to meet the people behind every component.",
  members = DEFAULT_MEMBERS,
  profileLabel = "Profile",
  className,
}: TeamPanelsProps) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  return (
    <section className={cn("w-full px-4 py-20 sm:px-8", className)}>
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          {eyebrow ? (
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]">
              {eyebrow}
            </span>
          ) : null}
          <h2 className="mt-5 text-balance text-4xl font-medium text-foreground">
            {title}
          </h2>
          {subtext ? (
            <p className="mx-auto mt-4 max-w-md text-pretty text-sm leading-7 text-muted-foreground">
              {subtext}
            </p>
          ) : null}
        </div>

        <ul className="mt-12 flex h-[38rem] flex-col gap-2.5 md:h-[28rem] md:flex-row">
          {members.map((member, index) => {
            const open = index === active;
            return (
              <motion.li
                key={member.name}
                initial={false}
                animate={{ flexGrow: open ? 3.4 : 1 }}
                transition={reduce ? { duration: 0 } : PANEL_SPRING}
                style={{ flexBasis: 0 }}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "group relative min-h-0 min-w-0 overflow-hidden rounded-3xl border bg-muted transition-colors duration-300",
                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                  open ? "border-foreground/15" : "border-border",
                )}
              >
                {/* biome-ignore lint/performance/noImgElement: Remote sample portraits ship with the installable block. */}
                <img
                  src={member.image}
                  alt=""
                  loading="lazy"
                  className={cn(
                    "absolute inset-0 size-full object-cover object-[50%_25%] transition-[transform,filter] duration-700",
                    open
                      ? "scale-100 grayscale-0"
                      : "scale-105 grayscale-[0.85] brightness-90",
                    reduce && "transition-none",
                  )}
                  style={{ transitionTimingFunction: EASE_OUT_CSS }}
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"
                />

                {/* Full-card control for click, tap, and keyboard focus. */}
                <Button
                  type="button"
                  variant="plain"
                  aria-label={`${member.name}, ${member.role}`}
                  aria-expanded={open}
                  onClick={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  whileHover={undefined}
                  whileTap={undefined}
                  className="absolute inset-0 size-full outline-none"
                />

                <div className="absolute inset-x-0 bottom-0 p-5">
                  {/* Fixed width so the bio never rewraps while widths spring. */}
                  <motion.div
                    aria-hidden={!open}
                    initial={false}
                    animate={
                      reduce
                        ? { opacity: open ? 1 : 0 }
                        : { opacity: open ? 1 : 0, y: open ? 0 : 10 }
                    }
                    transition={
                      reduce
                        ? { duration: 0 }
                        : open
                          ? { ...SPRING_SWAP, delay: 0.08 }
                          : { duration: 0.15, ease: EASE_OUT }
                    }
                    className={cn(
                      "mb-4 w-64 max-w-full",
                      !open && "pointer-events-none",
                    )}
                  >
                    <p className="text-pretty text-sm leading-6 text-white/85">
                      {member.bio}
                    </p>
                    {member.href ? (
                      <ButtonLink
                        href={member.href}
                        variant="secondary"
                        tabIndex={open ? 0 : -1}
                        className="relative z-10 mt-3 h-8 gap-1 bg-white/15 px-3 text-xs text-white backdrop-blur-sm hover:bg-white/25"
                      >
                        {profileLabel}
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </ButtonLink>
                    ) : null}
                  </motion.div>

                  <p className="truncate text-base font-medium text-white">
                    {member.name}
                  </p>
                  <p className="truncate text-xs text-white/70">
                    {member.role}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
