"use client";

import { MapPin } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { EASE_OUT, SPRING_PANEL } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";

export type StoryCardProps = {
  tag?: string;
  month?: string;
  day?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  location?: string;
  region?: string;
  href?: string;
  className?: string;
};

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&fm=webp&q=85&w=1200";

export function StoryCard({
  tag = "Field notes",
  month = "SEP",
  day = "04",
  title = "Discovering quiet",
  description = "Beyond the city, green ridgelines stretch into the horizon under a veil of morning mist.",
  imageUrl = DEFAULT_IMAGE,
  imageAlt = "Green mountain ridges beneath a cloudy sky",
  location = "Blue Ridge",
  region = "Virginia, USA",
  href,
  className,
}: StoryCardProps) {
  const reduceMotion = useReducedMotion();
  const canHover = useHoverCapable();
  const [active, setActive] = useState(false);
  const external = href ? /^https?:\/\//.test(href) : false;

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.5, ease: EASE_OUT }
      }
      onHoverStart={() => {
        if (canHover) setActive(true);
      }}
      onHoverEnd={() => setActive(false)}
      className={cn(
        "relative w-full max-w-md rounded-3xl border border-border bg-background p-4 sm:rounded-3xl sm:p-6",
        className,
      )}
    >
      {href ? (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer noopener" : undefined}
          aria-label={`Open ${title}`}
          className="absolute inset-0 z-30 rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="sr-only">Open {title}</span>
        </a>
      ) : null}

      <div className="flex items-center justify-between gap-4 px-1 sm:px-2">
        <span className="inline-flex h-8 items-center rounded-lg bg-primary px-3 font-medium text-xs text-primary-foreground">
          {tag}
        </span>

        <div className="flex h-8 overflow-hidden rounded-lg border border-border bg-primary font-medium text-xs">
          <span className="grid min-w-11 place-items-center px-2.5 text-primary-foreground">
            {month}
          </span>
          <span className="grid min-w-10 place-items-center rounded-lg bg-background px-2.5 text-foreground">
            {day}
          </span>
        </div>
      </div>

      <div className="px-1 pt-8 pb-7 sm:px-2 sm:pt-10 sm:pb-8">
        <h2 className="text-balance text-foreground leading-[1.05] tracking-[-0.04em] text-4xl font-medium">
          {title}
        </h2>
        <p className="mt-4 max-w-[36ch] text-pretty text-muted-foreground text-sm leading-6 sm:text-base sm:leading-7">
          {description}
        </p>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border sm:rounded-3xl">
        <motion.div
          animate={active && !reduceMotion ? { scale: 1.035 } : { scale: 1 }}
          transition={SPRING_PANEL}
          className="absolute -inset-1"
        >
          {/* biome-ignore lint/performance/noImgElement: caller-provided remote story image */}
          <img
            src={imageUrl}
            alt={imageAlt}
            className="size-full object-cover"
          />
        </motion.div>
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-background/50 to-transparent"
        />

        <div className="absolute bottom-4 left-4 flex max-w-[75%] items-start gap-2 rounded-2xl border border-border bg-background/80 px-3 py-2.5 text-foreground backdrop-blur-md sm:bottom-5 sm:left-5">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">{location}</p>
            <p className="mt-0.5 truncate text-muted-foreground text-xs">
              {region}
            </p>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
