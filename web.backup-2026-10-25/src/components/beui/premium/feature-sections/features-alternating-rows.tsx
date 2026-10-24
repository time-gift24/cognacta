"use client";

import { ArrowRight, Check, FileText, MessageCircle, Send } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type AlternatingFeatureRow = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  visual: ReactNode;
  link?: { label: string; href: string; external?: boolean };
};
export type FeaturesAlternatingRowsProps = {
  title?: string;
  description?: string;
  rows?: AlternatingFeatureRow[];
  className?: string;
};

const sceneReveal = {
  hidden: { opacity: 0, y: 22, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

function ProductScene({ kind }: { kind: "capture" | "collaborate" | "ship" }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.35 }}
      transition={{ staggerChildren: reduce ? 0 : 0.15 }}
      className="relative isolate flex h-112 items-center justify-center overflow-hidden rounded-3xl border border-border/50 px-6 pb-6 pt-12 sm:p-10"
    >
      <div
        className="absolute inset-0 -z-10 opacity-65 dark:opacity-15"
        style={{
          background:
            kind === "capture"
              ? "radial-gradient(ellipse at 15% 90%, #f5d2aa, transparent 70%), linear-gradient(135deg, #faf4e9, #dceaf3)"
              : kind === "collaborate"
                ? "radial-gradient(ellipse at 90% 10%, #aeddd5, transparent 70%), linear-gradient(135deg, #e5eef1, #f7efdf)"
                : "radial-gradient(ellipse at 10% 90%, #f4ccb7, transparent 70%), linear-gradient(135deg, #f8eee3, #d7e8f1)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(var(--foreground) 0.6px, transparent 0.6px)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="absolute left-6 top-5 flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full bg-current" />
        {kind === "capture"
          ? "THE FIRST DRAFT"
          : kind === "collaborate"
            ? "IN GOOD COMPANY"
            : "THE FINISHING TOUCH"}
      </div>
      {kind === "capture" ? (
        <CaptureScene reduce={!!reduce} />
      ) : kind === "collaborate" ? (
        <CollaborateScene reduce={!!reduce} />
      ) : (
        <LaunchScene reduce={!!reduce} />
      )}
    </motion.div>
  );
}

function CaptureScene({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative w-full max-w-72">
      <motion.div
        variants={sceneReveal}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE_OUT }}
        className="absolute -inset-x-2 -top-4 bottom-4 rotate-6 rounded-2xl border border-border bg-background/80"
      />
      <motion.div
        variants={sceneReveal}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE_OUT }}
        className="absolute -inset-x-1 -top-2 bottom-2 -rotate-3 rounded-2xl border border-border bg-background/90"
      />
      <motion.div
        variants={sceneReveal}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE_OUT }}
        className="relative rounded-2xl border border-border bg-background p-5"
      >
        <div className="flex items-center justify-between">
          <span className="grid size-9 place-items-center rounded-full border border-border">
            <FileText className="size-4" />
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            DRAFT 001
          </span>
        </div>
        <p className="mt-5 text-xl font-medium tracking-tight">
          What if we made
          <br />
          room for a little more?
        </p>
        <div className="my-4 space-y-2">
          <div className="h-1.5 w-full rounded-full bg-foreground/10" />
          <div className="h-1.5 w-5/6 rounded-full bg-foreground/10" />
          <div className="h-1.5 w-2/3 rounded-full bg-foreground/10" />
        </div>
        <div className="flex flex-wrap gap-2">
          {["An idea", "Worth exploring"].map((label) => (
            <span
              key={label}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          Saved to your space
        </div>
      </motion.div>
      <motion.div
        variants={sceneReveal}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE_OUT }}
        className="absolute -bottom-5 -right-3 flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-xs sm:-right-6"
      >
        <Check className="size-3.5" />
        Nothing slips away.
      </motion.div>
    </div>
  );
}

function CollaborateScene({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative w-full max-w-xs pt-3">
      <motion.div
        variants={sceneReveal}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE_OUT }}
        className="mr-8 rounded-2xl border border-border bg-background p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-medium">Homepage / First look</span>
          <span className="text-xs text-muted-foreground">v.02</span>
        </div>
        <div className="relative flex h-20 items-center justify-center overflow-hidden rounded-xl border border-border">
          <div
            className="absolute inset-0 opacity-50 dark:opacity-20"
            style={{ background: "linear-gradient(120deg, #d7e6e3, #f3dfc1)" }}
          />
          <div className="relative flex gap-2">
            {["w-8 h-10", "w-10 h-16", "w-8 h-12"].map((size, i) => (
              <div
                key={size}
                className={cn(
                  "self-end rounded-t-full border border-foreground/20 bg-background/60",
                  size,
                )}
                style={{ transform: `rotate(${(i - 1) * 12}deg)` }}
              />
            ))}
          </div>
          <span className="absolute bottom-2 right-3 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
            <MessageCircle className="size-3" />
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Shared with the team</span>
          <div className="flex -space-x-1.5">
            {["J", "A", "M"].map((name) => (
              <span
                key={name}
                className="grid size-6 place-items-center rounded-full border border-border bg-background text-xs text-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
      <motion.div
        variants={sceneReveal}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE_OUT }}
        className="relative -mt-3 ml-7 rounded-2xl border border-border bg-background p-4 sm:ml-12"
      >
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full border border-border text-xs">
            JL
          </span>
          <span className="text-xs font-medium">Jamie</span>
          <span className="ml-auto text-xs text-muted-foreground">Now</span>
        </div>
        <p className="mt-3 text-sm leading-6">
          This feels like us. Let’s give the opening a little more room.
        </p>
        <motion.div
          variants={sceneReveal}
          transition={{ duration: reduce ? 0 : 0.4, ease: EASE_OUT }}
          className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground"
        >
          <Check className="size-3.5" />
          Alex updated the design
        </motion.div>
      </motion.div>
    </div>
  );
}

function LaunchScene({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative w-full max-w-xs">
      <motion.div
        variants={sceneReveal}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE_OUT }}
        className="rounded-2xl border border-border bg-background p-4 sm:p-5"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">A new beginning</span>
          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
            Release 1.0
          </span>
        </div>
        <div className="relative my-5 flex justify-between">
          <div className="absolute left-5 right-5 top-4 h-px bg-border">
            <motion.div
              variants={{ hidden: { scaleX: 0 }, visible: { scaleX: 1 } }}
              transition={{
                duration: reduce ? 0 : 0.9,
                delay: reduce ? 0 : 0.3,
                ease: EASE_OUT,
              }}
              className="h-full origin-left bg-primary"
            />
          </div>
          {["Create", "Review", "Publish"].map((label, i) => (
            <motion.div
              key={label}
              variants={sceneReveal}
              transition={{
                duration: reduce ? 0 : 0.5,
                delay: reduce ? 0 : i * 0.15,
                ease: EASE_OUT,
              }}
              className="relative flex flex-col items-center gap-2"
            >
              <span className="grid size-8 place-items-center rounded-full border border-border bg-background">
                <Check className="size-3.5 text-primary" />
              </span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </motion.div>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-border pt-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">
            <Send className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium">All the details. All done.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Made together. Ready to share.
            </p>
          </div>
        </div>
      </motion.div>
      <motion.div
        variants={sceneReveal}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE_OUT }}
        className="mx-4 -mt-px flex items-center justify-between rounded-b-2xl border border-border bg-background px-4 py-3 text-xs"
      >
        <span className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" />
          Your project is live
        </span>
        <ArrowRight className="size-3.5" />
      </motion.div>
    </div>
  );
}

const defaultRows: AlternatingFeatureRow[] = [
  {
    id: "capture",
    eyebrow: "01 / Make space",
    title: "Give every idea a place to grow.",
    description:
      "Catch the rough sketch, the quick note, and the what-if. Bring them into one space that makes it easy to pick up where you left off.",
    points: [
      "Notes and files, right where you need them",
      "A little structure without the extra work",
    ],
    visual: <ProductScene kind="capture" />,
  },
  {
    id: "collaborate",
    eyebrow: "02 / Find your rhythm",
    title: "Good work is a conversation.",
    description:
      "Keep feedback close to the work. Share a first draft, work through the details, and move forward with everyone on the same page.",
    points: [
      "Feedback with the full picture",
      "Fewer handoffs, clearer next steps",
    ],
    visual: <ProductScene kind="collaborate" />,
  },
  {
    id: "ship",
    eyebrow: "03 / Put it out there",
    title: "From almost there to out in the world.",
    description:
      "Turn the finishing touches into a fresh start. Keep track of the details so you can spend less time checking and more time creating.",
    points: [
      "A shared view of what is ready",
      "A clear path to your next milestone",
    ],
    visual: <ProductScene kind="ship" />,
  },
];

export function FeaturesAlternatingRows({
  title = "From a first thought to a finished thing.",
  description = "One connected space for the way good work actually happens.",
  rows = defaultRows,
  className,
}: FeaturesAlternatingRowsProps) {
  const reduce = useReducedMotion();
  return (
    <section
      className={cn(
        "w-full bg-background px-6 py-12 text-foreground sm:px-10 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <h2 className="text-balance text-4xl font-medium tracking-tight">
            {title}
          </h2>
          <p className="mt-4 text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        <div className="space-y-14 sm:space-y-20">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="grid items-center gap-7 md:grid-cols-2 md:gap-12 lg:gap-20"
            >
              <div className={cn(index % 2 === 1 && "md:order-2")}>
                {row.visual}
              </div>
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, ease: EASE_OUT }}
                className={cn(index % 2 === 1 && "md:order-1")}
              >
                <p className="mb-4 font-mono text-xs text-muted-foreground">
                  {row.eyebrow}
                </p>
                <h3 className="text-balance text-xl font-medium tracking-tight">
                  {row.title}
                </h3>
                <p className="mt-3 text-pretty text-sm leading-7 text-muted-foreground sm:text-base">
                  {row.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {row.points.map((point) => (
                    <li key={point} className="flex gap-3 text-sm">
                      <Check
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      />
                      {point}
                    </li>
                  ))}
                </ul>
                {row.link && (
                  <ButtonLink
                    href={row.link.href}
                    variant="outline"
                    className="mt-6"
                    {...(row.link.external
                      ? { target: "_blank", rel: "noreferrer noopener" }
                      : {})}
                  >
                    {row.link.label}
                    <ArrowRight className="size-4" />
                  </ButtonLink>
                )}
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
