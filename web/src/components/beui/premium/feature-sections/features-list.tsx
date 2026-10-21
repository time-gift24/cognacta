"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { TextReveal } from "@/components/beui/motion/text-reveal";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { FeatureArtwork } from "./feature-artwork";

export type FeatureListMock = "source" | "registry" | "motion" | "theme";

export type FeatureListItem = {
  id: string;
  title: string;
  description: string;
  mock: FeatureListMock;
};

export type FeaturesListProps = {
  eyebrow?: string;
  title?: string[];
  subtext?: string;
  items?: FeatureListItem[];
  backgroundImage?: string;
  className?: string;
};

const DEFAULT_ITEMS: FeatureListItem[] = [
  {
    id: "source",
    title: "Copy-paste source",
    description:
      "Own the code. Every component drops into your repo as real source — yours to read and edit.",
    mock: "source",
  },
  {
    id: "registry",
    title: "Private registry",
    description:
      "Install premium components from your own namespace with a single shadcn CLI command.",
    mock: "registry",
  },
  {
    id: "motion",
    title: "Motion built-in",
    description:
      "Tuned springs, shared-layout transitions, and reduced-motion fallbacks ship with every piece.",
    mock: "motion",
  },
  {
    id: "theme",
    title: "Theme-aware",
    description:
      "Built on your tokens — every component reads correctly in light and dark out of the box.",
    mock: "theme",
  },
];

export function FeaturesList({
  eyebrow = "Built to ship",
  title = ["Everything you need to ship", "premium UI, nothing in your way."],
  subtext = "From primitive to shipped block in minutes — polished, animated, and ready to publish.",
  items = DEFAULT_ITEMS,
  backgroundImage = "https://pro.beui.dev/features/botanical-print.webp",
  className,
}: FeaturesListProps) {
  const reduce = useReducedMotion();
  const [activeId, setActiveId] = useState(items[0]?.id);
  const [paused, setPaused] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: activeId restarts the timer on manual selection.
  useEffect(() => {
    if (reduce || paused || items.length < 2) return;
    const id = setInterval(() => {
      setActiveId((current) => {
        const index = items.findIndex((item) => item.id === current);
        return items[(index + 1) % items.length]?.id ?? current;
      });
    }, 3600);
    return () => clearInterval(id);
  }, [reduce, paused, items, activeId]);

  const active = items.find((item) => item.id === activeId) ?? items[0];
  if (!active) return null;

  return (
    <section className={cn("w-full px-4 py-20 sm:px-8", className)}>
      <div className="mx-auto w-full max-w-6xl">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
              {eyebrow}
            </p>
          ) : null}
          <TextReveal
            as="h2"
            text={title}
            split="word"
            blur={10}
            className="mt-5 text-balance text-foreground leading-none tracking-tight text-4xl font-medium"
          />
          {subtext ? (
            <p className="mt-4 max-w-md text-pretty text-muted-foreground text-sm leading-7">
              {subtext}
            </p>
          ) : null}
        </div>

        <div
          className="mt-14 grid items-center gap-10 lg:grid-cols-2 lg:gap-14"
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
        >
          {/* Feature list — active is bright, the rest fade back. */}
          <div className="flex flex-col gap-7">
            {items.map((item) => {
              const selected = item.id === active.id;
              return (
                <Button
                  variant="plain"
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  onPointerEnter={() => setActiveId(item.id)}
                  className={cn(
                    "max-w-md text-left outline-none transition-opacity duration-300 focus-visible:opacity-100",
                    selected ? "opacity-100" : "opacity-40 hover:opacity-70",
                  )}
                >
                  <h3 className="font-medium text-foreground text-xl">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-muted-foreground text-sm leading-7">
                    {item.description}
                  </p>
                </Button>
              );
            })}
          </div>

          {/* Synced visual. */}
          <div className="relative h-[26rem] overflow-hidden rounded-2xl">
            <FeatureArtwork src={backgroundImage} />
            <div className="absolute inset-0 grid place-items-center p-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active.id}
                  initial={
                    reduce ? false : { opacity: 0, y: 14, filter: "blur(6px)" }
                  }
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: 0.32, ease: EASE_OUT }
                  }
                  className="w-full max-w-xs"
                >
                  <ListMock mock={active.mock} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const GLASS =
  "rounded-2xl border border-border bg-background/90 p-4 backdrop-blur-md ";

function ListMock({ mock }: { mock: FeatureListMock }) {
  if (mock === "registry") {
    return (
      <div className={cn(GLASS, "font-mono text-foreground text-xs")}>
        <p className="text-foreground/55">$ npx shadcn add</p>
        <p className="mt-1 font-medium">@beui-pro/pricing</p>
        <p className="mt-3 flex items-center gap-2 text-primary">
          <span className="grid size-3.5 place-items-center rounded-full bg-muted text-foreground">
            <Check className="size-2.5" />
          </span>
          added 1 component
        </p>
      </div>
    );
  }

  if (mock === "motion") {
    return (
      <div className={cn(GLASS, "flex flex-col items-center gap-3")}>
        <span className="inline-flex h-10 items-center rounded-full bg-white px-6 font-medium text-neutral-900 text-sm">
          Get started
        </span>
        <span className="text-xs text-foreground/70">Spring press · 60fps</span>
      </div>
    );
  }

  if (mock === "theme") {
    return (
      <div className={cn(GLASS, "flex items-center gap-3")}>
        <div className="flex-1 rounded-xl border border-border bg-white p-3">
          <div className="h-2 w-2/3 rounded-full bg-neutral-300" />
          <div className="mt-2 h-2 w-1/2 rounded-full bg-neutral-200" />
          <p className="mt-2 text-xs text-neutral-500">Light</p>
        </div>
        <div className="flex-1 rounded-xl border border-border bg-background p-3">
          <div className="h-2 w-2/3 rounded-full bg-neutral-700" />
          <div className="mt-2 h-2 w-1/2 rounded-full bg-neutral-800" />
          <p className="mt-2 text-xs text-neutral-400">Dark</p>
        </div>
      </div>
    );
  }

  // source
  return (
    <div className={cn(GLASS, "text-foreground")}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs">pricing.tsx</span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-background/90 px-2 py-1 text-xs">
          <Check className="size-3" /> Copied
        </span>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-2 w-4/5 rounded-full bg-background/90" />
        <div className="h-2 w-3/5 rounded-full bg-background/90" />
        <div className="h-2 w-2/3 rounded-full bg-background/90" />
      </div>
    </div>
  );
}
