"use client";

import {
  BadgeCheck,
  Blocks,
  Braces,
  FileCode2,
  GalleryVerticalEnd,
  LayoutPanelTop,
  Palette,
  PanelsTopLeft,
  Rows3,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { FeatureArtwork } from "./feature-artwork";

export type BenefitsTriptychItem = {
  title: string;
  description: string;
  visual?: ReactNode;
};

export type FeaturesBenefitsTriptychProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  items?: BenefitsTriptychItem[];
  backgroundImage?: string;
  className?: string;
};

const DEFAULT_ITEMS: BenefitsTriptychItem[] = [
  {
    title: "Start with the right block",
    description:
      "Explore polished heroes, pricing, features, and calls to action without rebuilding the foundation.",
  },
  {
    title: "Compose a complete page",
    description:
      "Combine sections that already share thoughtful responsive behavior, motion, and theme conventions.",
  },
  {
    title: "Make every detail yours",
    description:
      "Install real React source, then reshape the structure, styling, and interactions for your product.",
  },
];

export function FeaturesBenefitsTriptych({
  eyebrow = "Built for momentum",
  title = "From first section to finished page.",
  description = "A premium component system for teams that want to move quickly without giving up ownership or polish.",
  items = DEFAULT_ITEMS,
  backgroundImage = "https://pro.beui.dev/features/watercolor-valley.webp",
  className,
}: FeaturesBenefitsTriptychProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { amount: 0.2 });
  const [phase, setPhase] = useState(0);
  const visibleItems = items.slice(0, 3);

  useEffect(() => {
    if (reduceMotion || !isInView) return;

    const interval = window.setInterval(
      () => setPhase((current) => (current + 1) % 3),
      3600,
    );

    return () => window.clearInterval(interval);
  }, [isInView, reduceMotion]);

  return (
    <section
      ref={sectionRef}
      className={cn(
        "w-full overflow-hidden bg-background px-4 py-20 text-foreground sm:px-8 sm:py-24 lg:py-28",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <motion.p
            initial={reduceMotion ? false : { opacity: 0 }}
            whileInView={reduceMotion ? undefined : { opacity: 1 }}
            viewport={{ once: true, margin: "-48px" }}
            transition={
              reduceMotion ? undefined : { duration: 0.45, ease: EASE_OUT }
            }
            className="font-medium text-muted-foreground text-xs uppercase tracking-widest"
          >
            {eyebrow}
          </motion.p>
          <motion.h2
            initial={
              reduceMotion
                ? false
                : {
                    opacity: 0,
                    transform: "translateY(18px)",
                    filter: "blur(8px)",
                  }
            }
            whileInView={
              reduceMotion
                ? undefined
                : {
                    opacity: 1,
                    transform: "translateY(0px)",
                    filter: "blur(0px)",
                  }
            }
            viewport={{ once: true, margin: "-48px" }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 0.65, delay: 0.08, ease: EASE_OUT }
            }
            className="mt-5 text-balance font-sans font-medium text-4xl text-foreground leading-none tracking-tight"
          >
            {title}
          </motion.h2>
          <motion.p
            initial={reduceMotion ? false : { opacity: 0 }}
            whileInView={reduceMotion ? undefined : { opacity: 1 }}
            viewport={{ once: true, margin: "-48px" }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 0.5, delay: 0.2, ease: EASE_OUT }
            }
            className="mx-auto mt-5 max-w-2xl text-pretty text-muted-foreground text-sm leading-7 sm:text-base"
          >
            {description}
          </motion.p>
        </div>

        <div className="mt-14 grid overflow-hidden border border-border md:grid-cols-3 lg:mt-16">
          {visibleItems.map((item, index) => (
            <motion.article
              key={`${item.title}-${index}`}
              initial={
                reduceMotion
                  ? false
                  : {
                      opacity: 0,
                      transform: "translateY(24px)",
                    }
              }
              whileInView={
                reduceMotion
                  ? undefined
                  : {
                      opacity: 1,
                      transform: "translateY(0px)",
                    }
              }
              viewport={{ once: true, margin: "-64px" }}
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: 0.6,
                      delay: index * 0.08,
                      ease: EASE_OUT,
                    }
              }
              className={cn(
                "flex min-w-0 flex-col border-border",
                index < visibleItems.length - 1 &&
                  "border-b md:border-r md:border-b-0",
              )}
            >
              <div className="flex min-h-48 flex-col px-6 py-7 sm:px-8 md:min-h-56 md:px-7 lg:px-8">
                <span className="w-fit rounded-lg bg-muted px-2.5 py-1.5 font-mono text-muted-foreground text-xs tabular-nums tracking-[0.16em]">
                  0{index + 1}
                </span>
                <h3 className="mt-auto pt-10 font-medium text-xl leading-tight tracking-[-0.025em]">
                  {item.title}
                </h3>
                <p className="mt-3 max-w-sm text-pretty text-muted-foreground text-sm leading-6">
                  {item.description}
                </p>
              </div>

              <div
                aria-hidden="true"
                className="relative isolate mt-auto h-[25rem] w-full shrink-0 overflow-hidden border-border border-t"
              >
                <FeatureArtwork
                  src={backgroundImage}
                  position={`${index * 50}% center`}
                />
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-foreground/15 to-transparent" />
                <div className="absolute inset-0 flex items-end justify-center px-5 sm:px-8 md:px-5 lg:px-8">
                  {item.visual ?? (
                    <DefaultVisual
                      index={index}
                      phase={phase}
                      reduceMotion={reduceMotion}
                    />
                  )}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DefaultVisual({
  index,
  phase,
  reduceMotion,
}: {
  index: number;
  phase: number;
  reduceMotion: boolean;
}) {
  if (index === 1) {
    return <CompositionPanel phase={phase} reduceMotion={reduceMotion} />;
  }

  if (index === 2) {
    return <SourcePanel phase={phase} reduceMotion={reduceMotion} />;
  }

  return <LibraryPanel phase={phase} />;
}

const LIBRARY_ITEMS = [
  { label: "Heroes", icon: LayoutPanelTop },
  { label: "Features", icon: GalleryVerticalEnd },
  { label: "Pricing", icon: PanelsTopLeft },
  { label: "CTAs", icon: Blocks },
] as const;

function LibraryPanel({ phase }: { phase: number }) {
  return (
    <div className="relative -mb-7 w-full max-w-sm overflow-hidden rounded-t-2xl border border-b-0 border-border/80 bg-background/70 p-5 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-foreground/10">
      <GlassSheen />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-foreground text-sm">
            Component library
          </p>
          <p className="mt-1 text-muted-foreground text-xs">Premium blocks</p>
        </div>
        <span className="rounded-full border border-border/60 bg-background/55 px-2.5 py-1 font-mono text-muted-foreground text-xs tabular-nums backdrop-blur-md">
          120+ variants
        </span>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-2">
        {LIBRARY_ITEMS.map(({ label, icon: Icon }, itemIndex) => {
          const active = itemIndex === phase;

          return (
            <div
              key={label}
              className={cn(
                "min-h-24 rounded-xl border p-3 transition-colors duration-500",
                active
                  ? "border-transparent bg-foreground/5 text-foreground backdrop-blur-lg"
                  : "border-border/60 bg-background/35 text-foreground backdrop-blur-md",
              )}
            >
              <Icon className="size-4" />
              <p className="mt-6 font-medium text-xs">{label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PAGE_SECTIONS = [
  { label: "Hero", icon: LayoutPanelTop },
  { label: "Feature story", icon: Rows3 },
  { label: "Conversion", icon: PanelsTopLeft },
] as const;

function CompositionPanel({
  phase,
  reduceMotion,
}: {
  phase: number;
  reduceMotion: boolean;
}) {
  return (
    <div className="relative -mb-7 w-full max-w-sm overflow-hidden rounded-t-2xl border border-b-0 border-border/80 bg-background/70 p-5 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-foreground/10">
      <GlassSheen />
      <div className="relative flex items-center justify-between gap-4 border-border/50 border-b pb-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-full bg-muted text-foreground">
            <GalleryVerticalEnd className="size-3.5" />
          </span>
          <div>
            <p className="font-medium text-foreground text-sm">Landing page</p>
            <p className="text-muted-foreground text-xs">3 sections</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-muted-foreground text-xs uppercase tracking-wider">
          <span className="size-1.5 rounded-full bg-foreground" />
          Composing
        </span>
      </div>

      <div className="relative mt-4 space-y-2.5">
        {PAGE_SECTIONS.map(({ label, icon: Icon }, itemIndex) => {
          const active = itemIndex === phase;

          return (
            <motion.div
              key={label}
              animate={{
                transform:
                  active && !reduceMotion
                    ? "translateX(3px)"
                    : "translateX(0px)",
              }}
              transition={{ duration: 0.4, ease: EASE_IN_OUT }}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border/60 px-3.5 py-3 transition-colors duration-500",
                active
                  ? "border-transparent bg-foreground/5 backdrop-blur-lg"
                  : "bg-background/35 backdrop-blur-md",
              )}
            >
              <Icon className="size-4 text-foreground" />
              <span className="font-medium text-foreground text-xs">
                {label}
              </span>
              <BadgeCheck
                className={cn(
                  "ml-auto size-3.5 text-muted-foreground transition-opacity duration-300",
                  active ? "opacity-100" : "opacity-35",
                )}
              />
            </motion.div>
          );
        })}
      </div>

      <div className="relative mt-4 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Responsive preview</span>
        <span className="font-medium text-foreground tabular-nums">
          {phase + 1} / 3 ready
        </span>
      </div>
    </div>
  );
}

const SOURCE_FILES = ["hero.tsx", "features.tsx", "pricing.tsx"] as const;
const CODE_LINES = [
  ["section", "motion.section", "initial", "visible"],
  ["theme", "bg-background", "radius", "rounded-lg"],
  ["layout", "grid-cols-3", "motion", "SPRING_PANEL"],
] as const;

function SourcePanel({
  phase,
  reduceMotion,
}: {
  phase: number;
  reduceMotion: boolean;
}) {
  return (
    <div className="relative -mb-7 w-full max-w-sm overflow-hidden rounded-t-2xl border border-b-0 border-border/80 bg-background/70 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-foreground/10">
      <GlassSheen />
      <div className="relative flex items-center justify-between border-border/50 border-b px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Braces className="size-4 text-foreground" />
          <span className="font-medium text-foreground text-xs">
            Source workspace
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <BadgeCheck className="size-3.5" />
          Installed
        </span>
      </div>

      <div className="relative grid min-h-56 grid-cols-[7rem_1fr] gap-2 p-2">
        <div className="rounded-xl border border-border/60 bg-background/25 py-2 backdrop-blur-md">
          {SOURCE_FILES.map((file, fileIndex) => (
            <div
              key={file}
              className={cn(
                "mx-2 flex items-center gap-2 rounded-lg border px-2 py-2 font-mono text-xs transition-colors duration-500",
                fileIndex === phase
                  ? "border-border/60 bg-background/70 text-foreground backdrop-blur-md"
                  : "border-transparent text-muted-foreground",
              )}
            >
              <FileCode2 className="size-3" />
              <span className="truncate">{file}</span>
            </div>
          ))}
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-background/25 px-4 py-4 font-mono text-xs leading-5 backdrop-blur-md">
          <p className="text-muted-foreground">
            <span className="text-foreground">export</span> const section =
          </p>
          <div className="grid">
            <AnimatePresence initial={false}>
              <motion.div
                key={phase}
                initial={
                  reduceMotion
                    ? false
                    : {
                        opacity: 0,
                        transform: "translateY(3px)",
                      }
                }
                animate={{ opacity: 1, transform: "translateY(0px)" }}
                exit={
                  reduceMotion
                    ? undefined
                    : {
                        opacity: 0,
                        transform: "translateY(-3px)",
                      }
                }
                transition={{ duration: 0.3, ease: EASE_IN_OUT }}
                className="col-start-1 row-start-1"
              >
                <p className="text-muted-foreground">{"{"}</p>
                {CODE_LINES[phase].map((line, lineIndex) => (
                  <p key={line} className="truncate pl-3 text-muted-foreground">
                    <span className="text-foreground">{lineIndex + 1}</span>
                    {"  "}
                    {line}
                  </p>
                ))}
                <p className="text-muted-foreground">{"}"}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-1 text-muted-foreground">
              <Palette className="size-3" /> themed
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-1 text-muted-foreground">
              <BadgeCheck className="size-3" /> editable
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlassSheen() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/50 to-transparent" />
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-foreground/25 to-transparent" />
      <div className="absolute -right-12 -top-16 size-40 rounded-full bg-foreground/5 blur-3xl" />
    </div>
  );
}
