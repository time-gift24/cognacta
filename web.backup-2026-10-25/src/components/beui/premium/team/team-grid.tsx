"use client";

/*
 * Storyboard
 * 1. View: cards blur-rise 60ms apart; the header's avatar stack fans in.
 * 2. Filter: the tab pill glides; cards that stay slide to their new cell,
 *    new ones rise in, and removed ones fade out in 150ms. The hiring card
 *    always closes the grid.
 * 3. Hover or focus a card: the portrait warms to full color with a slight
 *    zoom and a bio with links slides up over it.
 * Reduced motion: cards appear in place; hover changes color only.
 */

import { ArrowUpRight, Plus } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { useId, useRef, useState } from "react";
import { ButtonLink } from "@/components/beui/motion/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { EASE_IN, EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { TeamGridCard } from "./team-grid-card";
import {
  TEAM_GRID_LABELS,
  TEAM_GRID_MEMBERS,
  TEAM_GRID_TEAMS,
  type TeamGridLabels,
  type TeamGridTeam,
  type TeamMember,
} from "./team-grid-data";

export type TeamGridProps = {
  eyebrow?: string;
  title?: string;
  subtext?: string;
  members?: TeamMember[];
  /** Team filters. Tabs appear when at least two teams have members. */
  teams?: TeamGridTeam[];
  labels?: Partial<TeamGridLabels>;
  /** Link for the closing hiring card. Omit to hide it. */
  hiringHref?: string;
  openRoles?: number;
  className?: string;
};

const ALL = "all";

export function TeamGrid({
  eyebrow = "Team",
  title = "The people behind beUI.",
  subtext = "A small, senior team obsessed with motion, craft, and developer experience.",
  members = TEAM_GRID_MEMBERS,
  teams = TEAM_GRID_TEAMS,
  labels: labelOverrides,
  hiringHref = "/",
  openRoles = 4,
  className,
}: TeamGridProps) {
  const labels = { ...TEAM_GRID_LABELS, ...labelOverrides };
  const reduce = useReducedMotion() ?? false;
  const id = useId();
  const [team, setTeam] = useState(ALL);
  const [cascade, setCascade] = useState(true);
  // Hold the entrance until the grid scrolls into view.
  const gridRef = useRef<HTMLUListElement>(null);
  const inView = useInView(gridRef, { once: true, margin: "-60px" });

  const usedTeams = teams.filter((item) =>
    members.some((member) => member.team === item.id),
  );
  const filters =
    usedTeams.length > 1 ? [{ id: ALL, label: labels.all }, ...usedTeams] : [];
  const shown =
    team === ALL ? members : members.filter((member) => member.team === team);
  const countries = new Set(
    members
      .map((member) => member.location?.split(",").at(-1)?.trim())
      .filter(Boolean),
  ).size;

  const rise = (index: number) => ({
    initial: reduce
      ? { opacity: 0 }
      : { opacity: 0, y: 18, filter: "blur(6px)" },
    animate: inView
      ? {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: {
            duration: 0.45,
            ease: EASE_OUT,
            delay: cascade ? Math.min(index * 0.06, 0.42) : 0,
          },
        }
      : undefined,
    exit: { opacity: 0, transition: { duration: 0.15, ease: EASE_IN } },
    transition: SPRING_LAYOUT,
  });

  return (
    <section className={cn("w-full px-4 py-20 sm:px-8", className)}>
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            {eyebrow ? (
              <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]">
                {eyebrow}
              </span>
            ) : null}
            <h2 className="mt-5 text-balance text-4xl font-medium text-foreground">
              {title}
            </h2>
            {subtext ? (
              <p className="mt-4 max-w-xl text-pretty text-sm leading-7 text-muted-foreground">
                {subtext}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {members.slice(0, 5).map((member, index) => (
                // biome-ignore lint/performance/noImgElement: Remote sample portraits ship with the installable block.
                <motion.img
                  key={member.name}
                  src={member.image}
                  alt=""
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    ease: EASE_OUT,
                    delay: index * 0.05,
                  }}
                  className="size-9 rounded-full bg-muted object-cover object-[50%_25%] ring-2 ring-background"
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {labels.people(members.length)}
              </span>
              {countries ? <> · {labels.countries(countries)}</> : null}
            </p>
          </div>
        </div>

        {filters.length ? (
          <Tabs
            value={team}
            onValueChange={(value) => {
              setCascade(false);
              setTeam(value);
            }}
            className="mt-10"
          >
            <TabsList
              aria-label={labels.filter}
              className="flex max-w-full overflow-x-auto [scrollbar-width:none] sm:inline-flex"
            >
              {filters.map((item, index) => {
                const count =
                  item.id === ALL
                    ? members.length
                    : members.filter((member) => member.team === item.id)
                        .length;
                return (
                  <TabsTrigger
                    key={item.id}
                    value={item.id}
                    id={`${id}-team-${item.id}`}
                    tabIndex={team === item.id ? 0 : -1}
                    className="h-8 gap-1.5 px-3 text-xs"
                    onKeyDown={(event) => {
                      const step =
                        event.key === "ArrowRight"
                          ? 1
                          : event.key === "ArrowLeft"
                            ? -1
                            : 0;
                      if (!step) return;
                      event.preventDefault();
                      const next =
                        filters[
                          (index + step + filters.length) % filters.length
                        ];
                      setCascade(false);
                      setTeam(next.id);
                      document.getElementById(`${id}-team-${next.id}`)?.focus();
                    }}
                  >
                    {item.label}
                    <span className="text-muted-foreground tabular-nums">
                      {count}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        ) : null}

        <ul
          ref={gridRef}
          className={cn(
            "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
            filters.length ? "mt-6" : "mt-12",
          )}
        >
          <AnimatePresence mode="popLayout" initial={!reduce}>
            {shown.map((member, index) => (
              <motion.li
                key={member.name}
                layout={reduce ? false : "position"}
                {...rise(index)}
              >
                <TeamGridCard member={member} labels={labels} reduce={reduce} />
              </motion.li>
            ))}
            {hiringHref ? (
              <motion.li
                key="hiring"
                layout={reduce ? false : "position"}
                {...rise(shown.length)}
              >
                <div className="flex h-full min-h-72 flex-col justify-between rounded-3xl border border-dashed border-border bg-background p-5 transition-colors duration-300 hover:border-foreground/30">
                  <span className="grid size-11 place-items-center rounded-full bg-muted">
                    <Plus className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-xl font-medium text-foreground">
                      {labels.hiringTitle}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {labels.hiringBody(openRoles)}
                    </p>
                    <ButtonLink
                      href={hiringHref}
                      variant="outline"
                      className="mt-5 gap-1.5 bg-background"
                    >
                      {labels.hiringCta}
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </ButtonLink>
                  </div>
                </div>
              </motion.li>
            ) : null}
          </AnimatePresence>
        </ul>
      </div>
    </section>
  );
}
