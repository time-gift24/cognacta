"use client";

import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/beui/motion/button";
import { TextReveal } from "@/components/beui/motion/text-reveal";
import { EASE_OUT } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";

export type ContentMetricsGalleryItem = {
  metric: string;
  description: string;
  href: string;
  linkLabel: string;
  image?: string;
};

export type ContentMetricsGalleryProps = {
  eyebrow?: string;
  title?: string | string[];
  items?: ContentMetricsGalleryItem[];
  backgroundImage?: string;
  className?: string;
};

const DEFAULT_ITEMS: ContentMetricsGalleryItem[] = [
  {
    metric: "42%",
    description: "Less time spent on repeat work.",
    href: "#",
    linkLabel: "Reduce repeat work",
  },
  {
    metric: "3.6x",
    description: "Faster from first brief to final delivery.",
    href: "#",
    linkLabel: "Explore faster workflows",
  },
  {
    metric: "24/7",
    description: "A clear view of every moving part.",
    href: "#",
    linkLabel: "See live visibility",
  },
];

export function ContentMetricsGallery({
  eyebrow = "Built for momentum",
  title = ["Less time managing.", "More time moving."],
  items = DEFAULT_ITEMS,
  backgroundImage = "https://pro.beui.dev/content/metrics-isometric.webp",
  className,
}: ContentMetricsGalleryProps) {
  const reduceMotion = useReducedMotion();
  const canHover = useHoverCapable();

  return (
    <section
      className={cn(
        "w-full overflow-hidden bg-background px-4 py-20 text-foreground sm:px-6 sm:py-24 lg:px-8 lg:py-28",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-7xl">
        <motion.div
          initial={
            reduceMotion ? false : { opacity: 0, y: 18, filter: "blur(8px)" }
          }
          whileInView={
            reduceMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }
          }
          viewport={{ once: true, margin: "-80px" }}
          transition={
            reduceMotion ? undefined : { duration: 0.65, ease: EASE_OUT }
          }
          className="max-w-4xl"
        >
          {eyebrow ? (
            <p className="mb-5 font-medium text-muted-foreground text-xs uppercase tracking-[0.18em]">
              {eyebrow}
            </p>
          ) : null}
        </motion.div>
        <TextReveal
          as="h2"
          blur={10}
          className="max-w-4xl text-balance leading-tight tracking-[-0.065em] text-4xl font-medium"
          stagger={0.07}
          text={title}
          whileInView
          yOffset="24%"
        />

        <div className="mt-10 grid gap-4 md:grid-cols-3 sm:mt-12">
          {items.slice(0, 3).map((item, index) => (
            <MetricStoryCard
              backgroundImage={backgroundImage}
              index={index}
              item={item}
              key={`${item.metric}-${item.description}`}
              reduceMotion={reduceMotion ?? false}
              canHover={canHover}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricStoryCard({
  backgroundImage,
  item,
  index,
  reduceMotion,
  canHover,
}: {
  backgroundImage: string;
  item: ContentMetricsGalleryItem;
  index: number;
  reduceMotion: boolean;
  canHover: boolean;
}) {
  return (
    <motion.article
      initial={
        reduceMotion ? false : { opacity: 0, y: 28, filter: "blur(10px)" }
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
              ease: EASE_OUT,
              delay: Math.min(index * 0.09, 0.18),
            }
      }
      className="group relative isolate overflow-hidden rounded-3xl border border-border bg-background"
    >
      <div className="relative z-10 p-6 pb-0">
        <div className="flex items-center justify-between gap-4">
          <p className="font-medium text-5xl leading-none tracking-tight lg:text-6xl">
            {item.metric}
          </p>
          <CardLink canHover={canHover && !reduceMotion} item={item} />
        </div>
        <p className="mt-4 min-h-12 max-w-64 text-pretty text-muted-foreground text-sm leading-6">
          {item.description}
        </p>
      </div>

      <div className="relative mt-2 h-72 overflow-hidden lg:h-80">
        <CardAtmosphere
          index={item.image ? null : index}
          src={item.image ?? backgroundImage}
        />
      </div>
    </motion.article>
  );
}

function CardLink({
  item,
  canHover,
}: {
  item: ContentMetricsGalleryItem;
  canHover: boolean;
}) {
  return (
    <ButtonLink
      aria-label={item.linkLabel}
      href={item.href}
      size="icon"
      variant="secondary"
      className="size-9 shrink-0 border border-border bg-background text-foreground hover:bg-muted rounded-full h-9"
    >
      <ArrowUpRight
        aria-hidden
        className={cn(
          "size-4 transition-transform duration-300",
          canHover &&
            "group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
        )}
      />
    </ButtonLink>
  );
}

function CardAtmosphere({ index, src }: { index: number | null; src: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-4 inset-y-0 overflow-hidden"
    >
      {/* biome-ignore lint/performance/noImgElement: portable installable block with a lazy decorative image */}
      <img
        src={src}
        alt=""
        width={1536}
        height={1024}
        loading="lazy"
        decoding="async"
        className="absolute top-1/2 h-auto max-w-none -translate-y-1/2 mix-blend-multiply dark:mix-blend-screen dark:grayscale dark:invert"
        style={{
          width: index === null ? "100%" : "300%",
          left: index === null ? 0 : `-${index * 100}%`,
        }}
      />
      <div className="absolute inset-0 bg-background/5 dark:bg-background/10" />
      <div className="absolute inset-x-0 top-0 h-12 bg-linear-to-b from-background via-background/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-background via-background/40 to-transparent" />
    </div>
  );
}
