"use client";

import { ArrowUpRight, BriefcaseBusiness } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/beui/motion/button";
import { TextReveal } from "@/components/beui/motion/text-reveal";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type ContentValueGridItem = {
  eyebrow: string;
  title: string;
  description: string;
  image?: string;
};

export type ContentValueGridProps = {
  mutedTitle?: string;
  title?: string;
  description?: string;
  items?: ContentValueGridItem[];
  backgroundImage?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  footnote?: string;
  className?: string;
};

const DEFAULT_ITEMS: ContentValueGridItem[] = [
  {
    eyebrow: "Shared direction",
    title: "Turn scattered ideas into one clear plan",
    description:
      "Keep the thinking, decisions, and next steps together from the start.",
  },
  {
    eyebrow: "Steady delivery",
    title: "Keep every handoff moving forward",
    description:
      "Give each owner the context they need without another status meeting.",
  },
  {
    eyebrow: "Flexible by design",
    title: "Shape the system around your team",
    description:
      "Start with the way you work today, then adapt it as the team grows.",
  },
];

export function ContentValueGrid({
  mutedTitle = "More tools create noise.",
  title = "Clear systems move work.",
  description = "Give every idea, decision, and handoff a clear place to move forward.",
  items = DEFAULT_ITEMS,
  backgroundImage = "https://pro.beui.dev/content/value-grain.webp",
  primaryHref = "#",
  primaryLabel = "Explore the workspace",
  secondaryHref = "#",
  secondaryLabel = "See how teams work",
  footnote = "Bring the process you have. Make it easier to run.",
  className,
}: ContentValueGridProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <section
      className={cn(
        "w-full overflow-hidden bg-background px-4 py-20 text-foreground sm:px-6 sm:py-24 lg:px-8 lg:py-28",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-balance leading-tight tracking-[-0.065em] text-4xl font-medium">
            <TextReveal
              blur={10}
              className="text-muted-foreground/70"
              stagger={0.055}
              text={mutedTitle}
              whileInView
              yOffset="20%"
            />
            <TextReveal
              blur={10}
              className="text-foreground"
              delay={0.18}
              stagger={0.055}
              text={title}
              whileInView
              yOffset="20%"
            />
          </h2>

          <motion.p
            initial={
              reduceMotion ? false : { opacity: 0, y: 12, filter: "blur(7px)" }
            }
            whileInView={
              reduceMotion
                ? undefined
                : { opacity: 1, y: 0, filter: "blur(0px)" }
            }
            viewport={{ once: true, margin: "-50px" }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 0.6, delay: 0.55, ease: EASE_OUT }
            }
            className="mx-auto mt-7 max-w-2xl text-pretty text-sm leading-7 text-muted-foreground sm:text-base"
          >
            {description}
          </motion.p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3 sm:mt-12">
          {items.slice(0, 3).map((item, index) => (
            <ValueCard
              backgroundImage={backgroundImage}
              index={index}
              item={item}
              key={`${item.eyebrow}-${item.title}`}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={
            reduceMotion
              ? undefined
              : { duration: 0.55, delay: 0.18, ease: EASE_OUT }
          }
          className="mt-10 flex flex-col items-center"
        >
          <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
            <ButtonLink
              href={primaryHref}
              className="h-9 rounded-full"
              size="md"
              variant="primary"
            >
              {primaryLabel}
              <ArrowUpRight aria-hidden className="size-4" />
            </ButtonLink>
            <ButtonLink
              href={secondaryHref}
              className="h-9 rounded-full"
              size="md"
              variant="secondary"
            >
              <BriefcaseBusiness aria-hidden className="size-4" />
              {secondaryLabel}
            </ButtonLink>
          </div>
          <p className="mt-6 text-center text-muted-foreground text-sm">
            {footnote}
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function ValueCard({
  backgroundImage,
  item,
  index,
  reduceMotion,
}: {
  backgroundImage: string;
  item: ContentValueGridItem;
  index: number;
  reduceMotion: boolean;
}) {
  return (
    <motion.article
      initial={
        reduceMotion ? false : { opacity: 0, y: 26, filter: "blur(10px)" }
      }
      whileInView={
        reduceMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }
      }
      viewport={{ once: true, margin: "-60px" }}
      transition={
        reduceMotion
          ? undefined
          : {
              duration: 0.65,
              delay: index * 0.09,
              ease: EASE_OUT,
            }
      }
      className="flex flex-col overflow-hidden rounded-3xl border border-border bg-background"
    >
      <div className="flex flex-1 flex-col p-6">
        <p className="font-medium text-muted-foreground text-xs">
          {item.eyebrow}
        </p>
        <h3 className="mt-3 text-balance leading-snug tracking-tight text-xl font-medium">
          {item.title}
        </h3>
        <p className="mt-3 text-pretty text-muted-foreground text-sm leading-6">
          {item.description}
        </p>
      </div>

      <div className="relative isolate h-64 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_40%)]">
        <div className="absolute inset-0 overflow-hidden">
          {/* biome-ignore lint/performance/noImgElement: portable, lazy-loaded decorative artwork */}
          <img
            src={item.image ?? backgroundImage}
            alt=""
            width={1536}
            height={512}
            loading="lazy"
            decoding="async"
            className="absolute top-1/2 h-auto max-w-none -translate-y-1/2"
            style={{
              width: item.image ? "100%" : "300%",
              left: item.image ? 0 : `-${index * 100}%`,
            }}
          />
        </div>
      </div>
    </motion.article>
  );
}
