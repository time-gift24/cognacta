"use client";

import { ArrowUpRight, AtSign, Globe } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { TEAM_PHOTOS, teamPortrait } from "./team-portraits";

export type TeamSpotlightMember = {
  name: string;
  role: string;
  bio: string;
  /** Portrait photo URL, shown as a square crop. */
  image: string;
  /** Optional links shown under the bio. */
  website?: string;
  social?: string;
  profile?: string;
};

export type TeamSpotlightProps = {
  eyebrow?: string;
  title?: string;
  subtext?: string;
  members?: TeamSpotlightMember[];
  className?: string;
};

const DEFAULT_MEMBERS: TeamSpotlightMember[] = [
  {
    name: "Maya Okafor",
    role: "Founder & CEO",
    bio: "Sets the vision and keeps the bar high. Led design systems teams for a decade before starting beUI.",
    image: teamPortrait(TEAM_PHOTOS.maya, 480),
    website: "#maya",
    social: "#maya-social",
    profile: "#maya-profile",
  },
  {
    name: "Dev Sharma",
    role: "Head of Engineering",
    bio: "Owns the registry and runtime. Treats motion as a feature, not a finish, and readable source as a promise.",
    image: teamPortrait(TEAM_PHOTOS.dev, 480),
    website: "#dev",
    social: "#dev-social",
    profile: "#dev-profile",
  },
  {
    name: "Lior Adler",
    role: "Design Lead",
    bio: "Crafts every spring and easing curve until it feels physical. Obsessed with the half-pixel details nobody notices but everybody feels.",
    image: teamPortrait(TEAM_PHOTOS.lior, 480),
    website: "#lior",
    social: "#lior-social",
    profile: "#lior-profile",
  },
  {
    name: "Ana Ruiz",
    role: "Developer Advocate",
    bio: "Turns complex APIs into docs people enjoy reading. Runs the community and ships the examples you copy first.",
    image: teamPortrait(TEAM_PHOTOS.ana, 480),
    website: "#ana",
    social: "#ana-social",
    profile: "#ana-profile",
  },
  {
    name: "Kenji Mori",
    role: "Staff Engineer",
    bio: "Performance obsessive who ships at 60fps or not at all. Keeps the bundle small and the interactions smooth.",
    image: teamPortrait(TEAM_PHOTOS.kenji, 480),
    website: "#kenji",
    social: "#kenji-social",
    profile: "#kenji-profile",
  },
];

export function TeamSpotlight({
  eyebrow = "Team",
  title = "The crew behind the craft.",
  subtext = "Pick a face to meet the person behind the components.",
  members = DEFAULT_MEMBERS,
  className,
}: TeamSpotlightProps) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const member = members[active];

  return (
    <section className={cn("w-full px-4 py-20 sm:px-8", className)}>
      <div className="mx-auto w-full max-w-4xl">
        {/* Header. */}
        <div className="mx-auto max-w-xl text-center">
          {eyebrow ? (
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground text-xs shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]">
              {eyebrow}
            </span>
          ) : null}
          <h2 className="mt-5 text-balance font-sans text-foreground leading-[1.1] text-4xl font-medium">
            {title}
          </h2>
          {subtext ? (
            <p className="mx-auto mt-4 max-w-md text-pretty text-muted-foreground text-sm leading-7">
              {subtext}
            </p>
          ) : null}
        </div>

        {/* Featured card. */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-border/60 bg-background">
          <div className="grid items-center gap-6 p-6 sm:grid-cols-[auto_1fr] sm:gap-8 sm:p-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`avatar-${member.name}`}
                initial={reduce ? false : { opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                transition={
                  reduce ? { duration: 0 } : { duration: 0.3, ease: EASE_OUT }
                }
                className="mx-auto size-40 overflow-hidden rounded-3xl bg-muted sm:mx-0"
              >
                {/* biome-ignore lint/performance/noImgElement: Remote sample portraits ship with the installable block. */}
                <img
                  src={member.image}
                  alt={member.name}
                  className="size-full object-cover object-[50%_25%]"
                />
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`info-${member.name}`}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                transition={
                  reduce ? { duration: 0 } : { duration: 0.3, ease: EASE_OUT }
                }
                className="text-center sm:text-left"
              >
                <h3 className="font-sans text-foreground text-xl font-medium">
                  {member.name}
                </h3>
                <p className="mt-1 font-medium text-primary text-sm">
                  {member.role}
                </p>
                <p className="mt-3 text-pretty text-muted-foreground text-sm leading-6">
                  {member.bio}
                </p>
                <div className="mt-4 flex items-center justify-center gap-1.5 sm:justify-start">
                  {(
                    [
                      [member.website, Globe, "website"],
                      [member.social, AtSign, "social profile"],
                    ] as const
                  ).map(([href, Icon, kind]) =>
                    href ? (
                      <ButtonLink
                        key={kind}
                        href={href}
                        size="icon"
                        variant="outline"
                        aria-label={`${member.name} ${kind}`}
                        className="bg-background text-muted-foreground hover:text-foreground"
                      >
                        <Icon className="size-3.5" aria-hidden="true" />
                      </ButtonLink>
                    ) : null,
                  )}
                  {member.profile ? (
                    <ButtonLink
                      href={member.profile}
                      variant="ghost"
                      className="ml-1 gap-1 px-3"
                    >
                      Full profile
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </ButtonLink>
                  ) : null}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Avatar rail. */}
          <div className="flex items-center gap-2 overflow-x-auto border-border/60 border-t bg-background/40 p-3">
            {members.map((m, i) => {
              const isActive = i === active;
              return (
                <Button
                  variant="plain"
                  key={m.name}
                  type="button"
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  aria-label={m.name}
                  aria-pressed={isActive}
                  className={cn(
                    "relative shrink-0 rounded-full p-0.5 transition-all duration-300",
                    isActive ? "scale-105" : "opacity-60 hover:opacity-100",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 place-items-center overflow-hidden rounded-full border-2 bg-muted",
                      isActive ? "border-primary" : "border-transparent",
                    )}
                  >
                    {/* biome-ignore lint/performance/noImgElement: Remote sample portraits ship with the installable block. */}
                    <img
                      src={m.image}
                      alt=""
                      className="size-full rounded-full object-cover object-[50%_25%]"
                    />
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
