"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, CircleCheck, Layers3, Workflow } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/beui/motion/button";
import { TextReveal } from "@/components/beui/motion/text-reveal";
import { EASE_OUT } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";

export type ContentCapabilityShowcaseItem = {
  label: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  icon?: LucideIcon;
  image?: string;
};

export type ContentCapabilityShowcaseProps = {
  eyebrow?: string;
  title?: string | string[];
  features?: string[];
  items?: ContentCapabilityShowcaseItem[];
  backgroundImage?: string;
  className?: string;
};

const DEFAULT_FEATURES = [
  "Shape ideas with your whole team",
  "Move from planning into production",
  "Keep every handoff clear and visible",
  "Adapt the system as the work changes",
];

const DEFAULT_ITEMS: ContentCapabilityShowcaseItem[] = [
  {
    label: "Shared workspace",
    title: "Plan together",
    description:
      "Turn loose ideas into clear plans without losing the context behind them.",
    href: "#",
    linkLabel: "Explore shared planning",
    icon: Layers3,
  },
  {
    label: "Connected flows",
    title: "Keep work moving",
    description:
      "Connect the steps, owners, and approvals that carry work through delivery.",
    href: "#",
    linkLabel: "Explore connected flows",
    icon: Workflow,
  },
];

export function ContentCapabilityShowcase({
  eyebrow = "One connected system",
  title = ["Made for the way", "your team works."],
  features = DEFAULT_FEATURES,
  items = DEFAULT_ITEMS,
  backgroundImage = "https://pro.beui.dev/content/capability-duotone.webp",
  className,
}: ContentCapabilityShowcaseProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const canHover = useHoverCapable();

  return (
    <section
      className={cn(
        "w-full overflow-hidden bg-background px-4 py-20 text-foreground sm:px-6 sm:py-24 lg:px-8 lg:py-28",
        className,
      )}
    >
      <div className="mx-auto grid w-full max-w-7xl items-start gap-x-4 gap-y-10 lg:grid-cols-[1.35fr_1fr_1fr]">
        <div className="flex flex-col px-1 py-2 sm:px-2 lg:min-h-[29rem] lg:py-5 lg:pr-8">
          <motion.span
            initial={
              reduceMotion ? false : { opacity: 0, filter: "blur(8px)", y: 8 }
            }
            whileInView={
              reduceMotion
                ? undefined
                : { opacity: 1, filter: "blur(0px)", y: 0 }
            }
            viewport={{ once: true, margin: "-60px" }}
            transition={
              reduceMotion ? undefined : { duration: 0.55, ease: EASE_OUT }
            }
            className="w-fit rounded-full border border-border/70 bg-background px-3 py-1.5 font-medium text-muted-foreground text-xs"
          >
            {eyebrow}
          </motion.span>

          <TextReveal
            as="h2"
            blur={10}
            className="mt-8 text-balance leading-tight tracking-[-0.055em] lg:[&>span]:whitespace-nowrap text-4xl font-medium"
            stagger={0.075}
            text={title}
            whileInView
            yOffset="28%"
          />

          <motion.ul
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 0.55, delay: 0.35, ease: EASE_OUT }
            }
            className="mt-12 space-y-3.5 lg:mt-auto"
          >
            {features.slice(0, 4).map((feature) => (
              <li
                className="flex items-start gap-3 text-sm leading-6 text-muted-foreground"
                key={feature}
              >
                <CircleCheck
                  aria-hidden
                  className="mt-0.5 size-5 shrink-0 text-foreground"
                  strokeWidth={1.7}
                />
                <span>{feature}</span>
              </li>
            ))}
          </motion.ul>
        </div>

        {items.slice(0, 2).map((item, index) => (
          <CapabilityCard
            backgroundImage={backgroundImage}
            canHover={canHover}
            index={index}
            item={item}
            key={`${item.title}-${item.label}`}
            reduceMotion={reduceMotion}
          />
        ))}
      </div>
    </section>
  );
}

function CapabilityCard({
  backgroundImage,
  item,
  index,
  reduceMotion,
  canHover,
}: {
  backgroundImage: string;
  item: ContentCapabilityShowcaseItem;
  index: number;
  reduceMotion: boolean;
  canHover: boolean;
}) {
  const Icon = item.icon ?? (index === 0 ? Layers3 : Workflow);

  return (
    <motion.article
      initial={
        reduceMotion ? false : { opacity: 0, y: 24, filter: "blur(10px)" }
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
              delay: 0.12 + index * 0.1,
              ease: EASE_OUT,
            }
      }
      className="group flex h-full flex-col rounded-3xl border border-border bg-background p-3"
    >
      <div className="relative isolate h-64 overflow-hidden rounded-2xl lg:h-72">
        <CardImage
          index={item.image ? null : index}
          src={item.image ?? backgroundImage}
        />
      </div>

      <div className="flex flex-col p-3 pb-2 pt-5 sm:p-4 sm:pb-3 sm:pt-6">
        <div className="mb-3 flex items-center gap-2 text-muted-foreground">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted">
            <Icon aria-hidden className="size-4" />
          </span>
          <span className="text-xs font-medium">{item.label}</span>
        </div>
        <h3 className="text-xl font-medium tracking-tight">{item.title}</h3>
        <p className="mt-2.5 max-w-sm text-pretty text-muted-foreground text-sm leading-6 lg:min-h-12">
          {item.description}
        </p>
        <ButtonLink
          aria-label={item.linkLabel}
          className="mt-5 w-fit gap-2 rounded-full h-9"
          href={item.href}
          size="sm"
          variant="secondary"
        >
          Explore
          <ArrowUpRight
            aria-hidden
            className={cn(
              "size-4 transition-transform duration-300",
              canHover &&
                !reduceMotion &&
                "group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
            )}
          />
        </ButtonLink>
      </div>
    </motion.article>
  );
}

function CardImage({ index, src }: { index: number | null; src: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* biome-ignore lint/performance/noImgElement: portable installable block with a lazy decorative image */}
      <img
        src={src}
        alt=""
        width={1536}
        height={768}
        loading="lazy"
        decoding="async"
        className="absolute top-1/2 h-auto max-w-none -translate-y-1/2"
        style={{
          width: index === null ? "100%" : "200%",
          left: index === null ? 0 : `-${index * 100}%`,
        }}
      />
    </div>
  );
}
