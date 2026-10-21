"use client";

import { AtSign, Globe } from "lucide-react";
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/beui/motion/button";
import { TextReveal } from "@/components/beui/motion/text-reveal";
import { cn } from "@/lib/beui/utils";
import { TEAM_PHOTOS, teamPortrait } from "./team-portraits";

export type TeamMarqueeMember = {
  name: string;
  role: string;
  bio: string;
  /** Portrait photo URL, shown as a small round avatar. */
  image: string;
  /** Optional links under the bio. */
  website?: string;
  social?: string;
};

export type TeamMarqueeProps = {
  eyebrow?: string;
  title?: string[];
  subtext?: string;
  members?: TeamMarqueeMember[];
  className?: string;
};

const DEFAULT_MEMBERS: TeamMarqueeMember[] = [
  {
    name: "Maya Okafor",
    role: "Founder & CEO",
    bio: "Sets the vision and keeps the bar high. Ex-design systems lead.",
    image: teamPortrait(TEAM_PHOTOS.maya, 96),
    website: "#maya",
    social: "#maya-social",
  },
  {
    name: "Dev Sharma",
    role: "Head of Engineering",
    bio: "Owns the registry and runtime. Motion is a feature, not a finish.",
    image: teamPortrait(TEAM_PHOTOS.dev, 96),
    website: "#dev",
    social: "#dev-social",
  },
  {
    name: "Lior Adler",
    role: "Design Lead",
    bio: "Tunes every spring and curve until it feels physical.",
    image: teamPortrait(TEAM_PHOTOS.lior, 96),
    website: "#lior",
    social: "#lior-social",
  },
  {
    name: "Ana Ruiz",
    role: "Developer Advocate",
    bio: "Turns complex APIs into docs people enjoy reading.",
    image: teamPortrait(TEAM_PHOTOS.ana, 96),
    website: "#ana",
    social: "#ana-social",
  },
  {
    name: "Kenji Mori",
    role: "Staff Engineer",
    bio: "Performance obsessive who ships at 60fps or not at all.",
    image: teamPortrait(TEAM_PHOTOS.kenji, 96),
    website: "#kenji",
    social: "#kenji-social",
  },
  {
    name: "Priya Nair",
    role: "Product Manager",
    bio: "Keeps the roadmap honest and the scope ruthless.",
    image: teamPortrait(TEAM_PHOTOS.priya, 96),
    website: "#priya",
    social: "#priya-social",
  },
  {
    name: "Sam Cole",
    role: "Motion Designer",
    bio: "Storyboards the interactions before a line of code is written.",
    image: teamPortrait(TEAM_PHOTOS.sam, 96),
    website: "#sam",
    social: "#sam-social",
  },
  {
    name: "Tariq Hassan",
    role: "Infra Engineer",
    bio: "Keeps the edge fast and the deploys boring.",
    image: teamPortrait(TEAM_PHOTOS.tariq, 96),
    website: "#tariq",
    social: "#tariq-social",
  },
  {
    name: "Noa Berger",
    role: "Frontend Engineer",
    bio: "Lives in the component layer; allergic to layout shift.",
    image: teamPortrait(TEAM_PHOTOS.noa, 96),
    website: "#noa",
    social: "#noa-social",
  },
  {
    name: "Ravi Menon",
    role: "Platform Engineer",
    bio: "Builds the tooling that makes everyone else faster.",
    image: teamPortrait(TEAM_PHOTOS.ravi, 96),
    website: "#ravi",
    social: "#ravi-social",
  },
];

export function TeamMarquee({
  eyebrow = "Team",
  title = ["The humans behind", "every component."],
  subtext = "A small, senior crew obsessed with motion, craft, and developer experience.",
  members = DEFAULT_MEMBERS,
  className,
}: TeamMarqueeProps) {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { margin: "-10% 0px" });
  const [hovered, setHovered] = useState(false);
  const paused = !!reduce || !inView || hovered;

  const mid = Math.ceil(members.length / 2);
  const rowOne = members.slice(0, mid);
  const rowTwo = members.slice(mid).concat(members.slice(0, 1));

  return (
    <section
      ref={sectionRef}
      className={cn("w-full px-4 py-20 sm:px-8", className)}
    >
      <div className="mx-auto w-full max-w-2xl text-center">
        {eyebrow ? (
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground text-xs shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]">
            {eyebrow}
          </span>
        ) : null}
        <TextReveal
          as="h2"
          text={title}
          split="word"
          blur={10}
          className="mt-5 text-balance font-sans text-foreground leading-[1.1] text-4xl font-medium"
        />
        {subtext ? (
          <p className="mx-auto mt-4 max-w-md text-pretty text-muted-foreground text-sm leading-7">
            {subtext}
          </p>
        ) : null}
      </div>

      <div
        className="relative mt-14 flex flex-col gap-4 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <MarqueeRow items={rowOne} paused={paused} speed={26} />
        <MarqueeRow items={rowTwo} paused={paused} speed={20} reverse />
      </div>
    </section>
  );
}

function MarqueeRow({
  items,
  paused,
  speed,
  reverse = false,
}: {
  items: TeamMarqueeMember[];
  paused: boolean;
  speed: number;
  reverse?: boolean;
}) {
  const x = useMotionValue(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const halfRef = useRef(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when the item set changes.
  useEffect(() => {
    const measure = () => {
      if (trackRef.current) halfRef.current = trackRef.current.scrollWidth / 2;
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [items]);

  useAnimationFrame((_, delta) => {
    if (paused) return;
    const half = halfRef.current;
    if (!half) return;
    const step = ((reverse ? 1 : -1) * (speed * delta)) / 1000;
    let next = x.get() + step;
    if (next <= -half) next += half;
    if (next > 0) next -= half;
    x.set(next);
  });

  // Two copies so the translation wraps seamlessly at half the track width.
  const cards = [...items, ...items];

  return (
    <div ref={trackRef} className="flex w-max">
      <motion.div style={{ x }} className="flex w-max gap-4">
        {cards.map((item, i) => (
          <Chip key={`${item.name}-${i}`} member={item} />
        ))}
      </motion.div>
    </div>
  );
}

function Chip({ member }: { member: TeamMarqueeMember }) {
  return (
    <div className="flex w-80 shrink-0 flex-col rounded-2xl border border-border bg-background p-4 transition-colors hover:border-foreground/20">
      <div className="flex items-center gap-3">
        {/* biome-ignore lint/performance/noImgElement: Remote sample portraits ship with the installable block. */}
        <img
          src={member.image}
          alt=""
          loading="lazy"
          className="size-11 shrink-0 rounded-full bg-muted object-cover object-[50%_25%]"
        />
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground text-sm">
            {member.name}
          </p>
          <p className="truncate text-muted-foreground text-xs">
            {member.role}
          </p>
        </div>
      </div>
      <p className="mt-3 text-pretty text-muted-foreground text-xs leading-5">
        {member.bio}
      </p>
      {member.website || member.social ? (
        <div className="mt-3 flex items-center gap-1.5">
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
                className="size-8 bg-background text-muted-foreground hover:text-foreground"
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </ButtonLink>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}
