"use client";

import { Check, FileCode, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { TextReveal } from "@/components/beui/motion/text-reveal";
import { EASE_OUT, SPRING_BOUNCE } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { FeatureArtwork } from "./feature-artwork";

export type FeatureShowcaseKind = "chat" | "files" | "install";

export type FeatureShowcaseItem = {
  title: string;
  description: string;
  /** Optional custom background illustration. */
  image?: string;
  /** @deprecated Backgrounds now use images. */
  colors?: [string, string, string];
  /** Which animated illustration to render on the stage. */
  kind: FeatureShowcaseKind;
  /** Custom illustration that replaces the built-in `kind` mock. */
  visual?: ReactNode;
};

export type FeaturesShowcaseProps = {
  eyebrow?: string;
  title?: string[];
  subtext?: string;
  items?: FeatureShowcaseItem[];
  backgroundImage?: string;
  backgroundImages?: readonly string[];
  className?: string;
};

const DEFAULT_ITEMS: FeatureShowcaseItem[] = [
  {
    title: "Assemble a page in minutes",
    description:
      "Drop in premium blocks — pricing, hero, footer, CTA — and a full landing page comes together fast.",
    kind: "chat",
  },
  {
    title: "Source files, fully yours",
    description:
      "Every component ships as real source you can read, edit, and own — no black-box dependency.",
    kind: "files",
  },
  {
    title: "Install in one command",
    description:
      "Add any premium component straight from your private registry with the shadcn CLI.",
    kind: "install",
  },
];

export function FeaturesShowcase({
  eyebrow = "System explanation",
  title = ["One library.", "Every layer covered."],
  subtext = "beUI gives you the motion, polish, and structure to ship premium interfaces faster — without rebuilding the basics.",
  items = DEFAULT_ITEMS,
  backgroundImage,
  backgroundImages = [
    "https://pro.beui.dev/features/showcase-dither-blue.webp",
    "https://pro.beui.dev/features/showcase-dither-peach.webp",
    "https://pro.beui.dev/features/showcase-dither-sage.webp",
  ],
  className,
}: FeaturesShowcaseProps) {
  const reduce = useReducedMotion();

  return (
    <section className={cn("w-full px-4 py-20 sm:px-8", className)}>
      <div className="mx-auto w-full max-w-6xl">
        {/* Header: headline left, supporting copy right. */}
        <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-end lg:gap-12">
          <div>
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
          </div>
          {subtext ? (
            <p className="text-pretty text-muted-foreground text-sm leading-7 sm:text-base lg:pb-2">
              {subtext}
            </p>
          ) : null}
        </div>

        {/* Cards. */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <motion.div
              key={item.title}
              initial={
                reduce ? false : { opacity: 0, y: 24, filter: "blur(6px)" }
              }
              whileInView={
                reduce ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }
              }
              viewport={{ once: true, margin: "-60px" }}
              transition={
                reduce
                  ? undefined
                  : {
                      duration: 0.55,
                      ease: EASE_OUT,
                      delay: Math.min(index * 0.1, 0.3),
                    }
              }
            >
              {/* Illustrated stage with a built illustration on top. */}
              <div className="relative h-[26rem] overflow-hidden rounded-2xl">
                <FeatureArtwork
                  src={
                    item.image ??
                    backgroundImage ??
                    backgroundImages[index % backgroundImages.length]
                  }
                  position="center"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-black/15 dark:bg-black/20"
                />
                {item.visual ?? (
                  <ShowcaseMock kind={item.kind} reduce={reduce} />
                )}
              </div>

              <h3 className="mt-4 font-medium text-foreground text-xl">
                {item.title}
              </h3>
              <p className="mt-1 text-pretty text-muted-foreground text-sm">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

type Reduce = boolean | null;

// Re-mount the animation subtree on an interval so it loops.
function useLoop(reduce: Reduce, duration: number) {
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setCycle((c) => c + 1), duration);
    return () => clearInterval(id);
  }, [reduce, duration]);
  return cycle;
}

function ShowcaseMock({
  kind,
  reduce,
}: {
  kind: FeatureShowcaseKind;
  reduce: Reduce;
}) {
  if (kind === "files") return <FilesMock reduce={reduce} />;
  if (kind === "install") return <InstallMock reduce={reduce} />;
  return <ChatMock reduce={reduce} />;
}

const BLOCKS = [
  "Pricing — plans grid",
  "Hero — code demo",
  "Footer — spotlight",
  "CTA — gradient FAQ",
];
const CHAT_FILES: [string, string][] = [
  ["pricing.tsx", "#3b82f6"],
  ["hero.tsx", "#10b981"],
  ["footer.tsx", "#f59e0b"],
];

function ChatMock({ reduce }: { reduce: Reduce }) {
  const cycle = useLoop(reduce, 5600);
  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 10, filter: "blur(4px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { duration: 0.4, ease: EASE_OUT, delay },
        };

  return (
    <div className="absolute inset-0 flex flex-col justify-end gap-2.5 p-5">
      <motion.div key={cycle} className="flex flex-col gap-2.5">
        <motion.div
          {...rise(0.1)}
          className="max-w-[86%] self-end rounded-2xl rounded-br-sm bg-white px-3.5 py-2 font-medium text-neutral-900 text-xs"
        >
          Add a pricing block and a hero to my landing.
        </motion.div>

        <motion.div
          {...rise(0.5)}
          className="rounded-2xl border border-border bg-background/90 p-3 backdrop-blur-md"
        >
          <div className="flex flex-col gap-2">
            {BLOCKS.map((name, i) => (
              <div
                key={name}
                className="flex items-center gap-2 text-xs text-foreground"
              >
                <motion.span
                  {...(reduce
                    ? {}
                    : {
                        initial: { scale: 0 },
                        animate: { scale: 1 },
                        transition: {
                          ...SPRING_BOUNCE,
                          delay: 0.95 + i * 0.22,
                        },
                      })}
                  className="grid size-3.5 shrink-0 place-items-center rounded-full bg-muted text-foreground"
                >
                  <Check className="size-2.5" />
                </motion.span>
                <span className="flex-1 truncate">{name}</span>
              </div>
            ))}
          </div>
          <motion.p {...rise(1.9)} className="mt-2 text-xs text-foreground/60">
            Four blocks added
          </motion.p>
        </motion.div>

        <motion.div
          {...rise(2.3)}
          className="max-w-[90%] self-start rounded-2xl rounded-bl-sm border border-border bg-background/90 px-3.5 py-2 text-foreground text-xs backdrop-blur-md"
        >
          Done — your landing page is assembled.
        </motion.div>

        <motion.div {...rise(2.7)} className="flex flex-wrap gap-1.5">
          {CHAT_FILES.map(([file, color]) => (
            <span
              key={file}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/90 px-2 py-1 text-xs text-foreground backdrop-blur-md"
            >
              <span
                className="size-2 rounded-sm"
                style={{ backgroundColor: color }}
              />
              {file}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

const FILES: { name: string; color: string; icon: LucideIcon }[] = [
  { name: "pricing.tsx", color: "#3b82f6", icon: FileCode },
  { name: "hero-code-demo.tsx", color: "#10b981", icon: FileCode },
  { name: "footer-spotlight.tsx", color: "#f59e0b", icon: FileCode },
  { name: "agent-chat-input.tsx", color: "#f43f5e", icon: FileCode },
  { name: "cta-faq.tsx", color: "#06b6d4", icon: FileCode },
  { name: "features-tabs.tsx", color: "#2563eb", icon: FileCode },
];

function FileRow({
  file,
}: {
  file: { name: string; color: string; icon: LucideIcon };
}) {
  const Icon = file.icon;
  return (
    <div className="mb-2.5 flex items-center gap-3 rounded-xl border border-border bg-background/90 px-3 py-2.5 backdrop-blur-md">
      <span
        className="grid size-7 shrink-0 place-items-center rounded-md"
        style={{ backgroundColor: file.color }}
      >
        <Icon className="size-3.5 text-foreground" />
      </span>
      <span className="truncate text-foreground text-xs">{file.name}</span>
    </div>
  );
}

function FilesMock({ reduce }: { reduce: Reduce }) {
  // Two stacked copies so the upward scroll loops seamlessly at -50%.
  const rows = [...FILES, ...FILES];

  if (reduce) {
    return (
      <div className="absolute inset-0 flex flex-col justify-center p-5">
        {FILES.map((file) => (
          <FileRow key={file.name} file={file} />
        ))}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center p-5">
      <div className="relative h-[15rem] w-full overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_16%,black_84%,transparent)]">
        <motion.div
          animate={{ y: ["0%", "-50%"] }}
          transition={{
            duration: FILES.length * 1.7,
            ease: "linear",
            repeat: Number.POSITIVE_INFINITY,
          }}
        >
          {rows.map((file, i) => (
            <FileRow key={`${file.name}-${i}`} file={file} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

const INSTALL_SLUGS = [
  "pricing",
  "hero-code-demo",
  "footer-spotlight",
  "cta-faq",
  "features-tabs",
];

function InstallMock({ reduce }: { reduce: Reduce }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % INSTALL_SLUGS.length),
      2600,
    );
    return () => clearInterval(id);
  }, [reduce]);

  const slug = INSTALL_SLUGS[index];

  return (
    <div className="absolute inset-0 flex items-center p-5">
      <div className="w-full rounded-2xl border border-border bg-background/95 p-4 font-mono text-foreground text-xs backdrop-blur-md">
        <div className="mb-3 flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-background/90" />
          <span className="size-2.5 rounded-full bg-background/90" />
          <span className="size-2.5 rounded-full bg-background/90" />
        </div>

        <p className="text-foreground/55">$ npx shadcn add</p>
        <div className="mt-1 flex items-center">
          <span className="text-foreground/50">@beui-pro/</span>
          <span className="relative inline-flex h-4 items-center overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={slug}
                initial={reduce ? false : { y: 9, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { y: -9, opacity: 0 }}
                transition={
                  reduce ? { duration: 0 } : { duration: 0.28, ease: EASE_OUT }
                }
                className="font-medium text-foreground"
              >
                {slug}
              </motion.span>
            </AnimatePresence>
          </span>
          {reduce ? null : (
            <motion.span
              animate={{ opacity: [1, 1, 0, 0] }}
              transition={{
                duration: 1,
                ease: "linear",
                repeat: Number.POSITIVE_INFINITY,
              }}
              className="ml-0.5 inline-block h-3.5 w-1.5 bg-white align-middle"
            />
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 text-primary">
          <span className="grid size-3.5 place-items-center rounded-full bg-muted text-foreground">
            <Check className="size-2.5" />
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={slug}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={
                reduce ? { duration: 0 } : { duration: 0.28, ease: EASE_OUT }
              }
            >
              added {slug}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
