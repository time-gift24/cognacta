"use client";

import { ArrowDown, ArrowUpRight, Menu, PanelsTopLeft, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { SharedLayoutBg } from "@/components/beui/motion/shared-layout-bg";
import { EASE_OUT, SPRING_PANEL } from "@/lib/beui/ease";
import { useDarkTheme } from "@/lib/beui/hooks/use-dark-theme";
import { cn } from "@/lib/beui/utils";
import { HERO_HEADING_CLASS } from "./hero-heading";

export type HeroDecisionSpectrumProps = {
  title?: readonly [string, string];
  description?: string;
  className?: string;
};

const NAV_ITEMS = [
  ["Product", "#product"],
  ["Automations", "#automations"],
  ["Customers", "#customers"],
  ["Pricing", "#pricing"],
] as const;

const TRUST_MARKS = ["NORTH/CO", "Fieldwork", "Kinline", "FORM", "Arcside"];

const SIGNAL_COUNT = 20;
const SIGNALS = Array.from({ length: SIGNAL_COUNT }, (_, index) => index);

function valleyScale(index: number, lift = 0) {
  const center = (SIGNAL_COUNT - 1) / 2;
  const distance = Math.abs(index - center) / center;
  const valley = 0.3 + 0.66 * distance ** 1.55;

  return Number(Math.min(0.98, Math.max(0.2, valley + lift)).toFixed(3));
}

export function HeroDecisionSpectrum({
  title = ["Projects move faster.", "Teams stay in sync."],
  description = "Daymark brings projects, docs, and automated handoffs into one shared workspace, so every team knows what is moving and what needs attention.",
  className,
}: HeroDecisionSpectrumProps) {
  const dark = useDarkTheme();
  const reduce = useReducedMotion() ?? false;

  const enter = (delay: number, distance = 16) => ({
    initial: reduce
      ? false
      : { opacity: 0, transform: `translateY(${distance}px)` },
    animate: { opacity: 1, transform: "translateY(0px)" },
    transition: { duration: 0.65, ease: EASE_OUT, delay },
  });

  return (
    <section
      className={cn(
        "relative isolate min-h-[48rem] w-full overflow-hidden bg-background text-foreground sm:min-h-[52rem]",
        className,
      )}
    >
      <SignalField dark={dark} />
      <DecisionNav reduce={reduce} />

      <div className="relative z-10 mx-auto flex min-h-[calc(48rem-5rem)] w-full max-w-6xl flex-col items-center px-5 pt-24 pb-12 text-center sm:min-h-[calc(52rem-6rem)] sm:px-8 sm:pt-28 sm:pb-14">
        <motion.h1
          {...enter(0.04, 24)}
          className={cn(HERO_HEADING_CLASS, "max-w-5xl")}
        >
          <span className="block font-normal">{title[0]}</span>
          <span className="block font-semibold">{title[1]}</span>
        </motion.h1>

        <motion.p
          {...enter(0.12)}
          className="mt-6 max-w-2xl text-pretty  leading-6 text-muted-foreground  sm:leading-7 text-sm sm:text-base"
        >
          {description}
        </motion.p>

        <motion.div
          {...enter(0.2)}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <ButtonLink
            href="#product"
            size="lg"
            className="min-w-44 gap-3 rounded-full h-9"
          >
            Start for free
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </ButtonLink>
          <a
            href="#product-tour"
            className="inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            Watch product tour
            <ArrowDown className="size-4" aria-hidden="true" />
          </a>
        </motion.div>

        <motion.div {...enter(0.3)} className="mt-auto pt-20 sm:pt-24">
          <p className="text-xs text-muted-foreground">
            Trusted by teams that ship every week
          </p>
          <div className="mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-7 gap-y-4 sm:gap-x-10">
            {TRUST_MARKS.map((mark, index) => (
              <span
                key={mark}
                className={cn(
                  "whitespace-nowrap font-semibold text-sm tracking-[-0.035em] sm:text-base",
                  index === 0 && "font-mono text-xs tracking-[-0.06em]",
                  "text-foreground/72",
                )}
              >
                {mark}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function DecisionNav({ reduce }: { reduce: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="relative z-30 mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:h-24 sm:px-8">
      <a
        href="/"
        className="flex min-h-10 items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30"
        aria-label="Daymark home"
      >
        <span className="grid size-8 place-items-center rounded-full border border-border bg-muted">
          <PanelsTopLeft className="size-4" aria-hidden="true" />
        </span>
        <span className="font-semibold tracking-[-0.04em]">Daymark</span>
      </a>

      <div className="hidden md:block">
        <SharedLayoutBg
          className="w-auto flex-row items-center gap-0.5"
          inset={0}
          pillClassName="rounded-full bg-muted"
        >
          {NAV_ITEMS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {label}
            </a>
          ))}
        </SharedLayoutBg>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="#login"
          className="hidden min-h-10 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:inline-flex"
        >
          Log in
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
        <ButtonLink
          href="#product"
          size="sm"
          className="hidden sm:inline-flex rounded-full h-9"
        >
          Start for free
        </ButtonLink>
        <Button
          variant="plain"
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="daymark-mobile-navigation"
          onClick={() => setOpen((value) => !value)}
          className="grid size-10 place-items-center rounded-full border border-border transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 md:hidden"
        >
          {open ? (
            <X className="size-4" aria-hidden="true" />
          ) : (
            <Menu className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="daymark-mobile-navigation"
            initial={
              reduce
                ? false
                : { opacity: 0, transform: "translateY(-8px) scale(0.98)" }
            }
            animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
            exit={{ opacity: 0, transform: "translateY(-6px) scale(0.98)" }}
            transition={reduce ? { duration: 0 } : SPRING_PANEL}
            className="absolute top-[calc(100%-2px)] right-5 left-5 origin-top rounded-2xl border border-border bg-background/92 p-2 backdrop-blur-2xl md:hidden"
          >
            {NAV_ITEMS.map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-xl px-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                {label}
              </a>
            ))}
            <ButtonLink
              href="#product"
              size="md"
              onClick={() => setOpen(false)}
              className="mt-1 w-full rounded-full h-9"
            >
              Start for free
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}

function SignalField({ dark }: { dark: boolean }) {
  const fieldId = useId().replaceAll(":", "");
  const gradientId = `${fieldId}-gradient`;
  const edgeId = `${fieldId}-edge`;
  const fadeId = `${fieldId}-fade`;
  const maskId = `${fieldId}-mask`;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <svg
        className="absolute inset-x-0 bottom-0 h-[66%] w-full"
        viewBox={`0 0 ${SIGNAL_COUNT} 1`}
        preserveAspectRatio="none"
      >
        <title>Decorative aurora light field</title>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
            <stop
              offset="0%"
              stopColor={dark ? "oklch(0.82 0.16 155)" : "oklch(0.74 0.14 155)"}
              stopOpacity={dark ? 0.94 : 0.88}
            />
            <stop
              offset={dark ? "48%" : "52%"}
              stopColor={dark ? "oklch(0.58 0.1 158)" : "oklch(0.7 0.11 158)"}
              stopOpacity={dark ? 0.48 : 0.7}
            />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={fadeId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="white" />
            <stop offset="58%" stopColor="white" stopOpacity="0.9" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={edgeId} x1="0" y1="0" x2="1" y2="0">
            <stop
              offset="0%"
              stopColor={dark ? "oklch(0.12 0.02 155)" : "oklch(0.35 0.06 155)"}
              stopOpacity={dark ? 0.2 : 0.12}
            />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
          <mask
            id={maskId}
            x="0"
            y="0"
            width={SIGNAL_COUNT}
            height="1"
            maskUnits="userSpaceOnUse"
            maskContentUnits="userSpaceOnUse"
          >
            {SIGNALS.map((index) => {
              const scale = valleyScale(index);

              return (
                <rect
                  key={index}
                  x={index}
                  y={1 - scale}
                  width="1"
                  height={scale}
                  fill={`url(#${fadeId})`}
                  shapeRendering="crispEdges"
                />
              );
            })}
          </mask>
        </defs>
        <rect
          width={SIGNAL_COUNT}
          height="1"
          fill={`url(#${gradientId})`}
          mask={`url(#${maskId})`}
        />
        <g mask={`url(#${maskId})`}>
          {SIGNALS.slice(1).map((index) => (
            <rect
              key={index}
              x={index}
              width="0.12"
              height="1"
              fill={`url(#${edgeId})`}
            />
          ))}
        </g>
      </svg>

      <div className="absolute inset-x-0 top-0 h-[70%] bg-gradient-to-b from-background via-background/96 to-transparent" />
    </div>
  );
}
