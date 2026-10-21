"use client";

import { Dithering } from "@paper-design/shaders-react";
import {
  ArrowUpRight,
  AudioLines,
  Check,
  Mic,
  MoreHorizontal,
  Play,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { SharedLayoutBg } from "@/components/beui/motion/shared-layout-bg";
import { EASE_OUT, SPRING_PANEL } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { HERO_HEADING_CLASS } from "./hero-heading";

export type HeroVoiceMobileProps = {
  eyebrow?: string;
  title?: readonly [string, string];
  description?: string;
  className?: string;
};

const WAVEFORM = [
  { id: "a", height: 8 },
  { id: "b", height: 16 },
  { id: "c", height: 11 },
  { id: "d", height: 25 },
  { id: "e", height: 19 },
  { id: "f", height: 32 },
  { id: "g", height: 14 },
  { id: "h", height: 22 },
  { id: "i", height: 34 },
  { id: "j", height: 18 },
  { id: "k", height: 28 },
  { id: "l", height: 12 },
  { id: "m", height: 20 },
  { id: "n", height: 30 },
  { id: "o", height: 15 },
  { id: "p", height: 24 },
  { id: "q", height: 10 },
  { id: "r", height: 17 },
] as const;

const ACTIONS = [
  { id: "recap", label: "Send project recap", time: "Today" },
  { id: "review", label: "Review the launch brief", time: "4:30 PM" },
] as const;

export function HeroVoiceMobile({
  eyebrow = "AI voice notes for busy days",
  title = ["Say it once.", "Keep moving."],
  description = "Sona turns loose thoughts into clear notes, follow-ups, and reminders before the moment disappears.",
  className,
}: HeroVoiceMobileProps) {
  const reduce = useReducedMotion() ?? false;
  const [menuOpen, setMenuOpen] = useState(false);

  const enter = (delay: number, distance = 16) => ({
    initial: reduce
      ? false
      : { opacity: 0, transform: `translateY(${distance}px)` },
    animate: { opacity: 1, transform: "translateY(0px)" },
    transition: { duration: 0.6, ease: EASE_OUT, delay },
  });

  return (
    <section
      className={cn(
        "w-full overflow-hidden bg-background text-foreground",
        className,
      )}
    >
      <nav className="relative z-30 mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:h-24">
        <a
          href="/"
          className="flex min-h-10 items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Sona home"
        >
          <span className="grid size-8 place-items-center rounded-full border border-border bg-muted">
            <AudioLines className="size-4" aria-hidden="true" />
          </span>
          <span className="font-semibold tracking-[-0.03em]">Sona</span>
        </a>

        <div className="hidden md:block">
          <SharedLayoutBg
            className="w-auto flex-row items-center gap-0.5"
            inset={0}
            pillClassName="rounded-full bg-muted"
          >
            {[
              ["Features", "#features"],
              ["How it works", "#how-it-works"],
              ["Pricing", "#pricing"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {label}
              </a>
            ))}
          </SharedLayoutBg>
        </div>

        <div className="flex items-center gap-1">
          <ButtonLink
            href="#download"
            size="sm"
            className="hidden sm:inline-flex rounded-full h-9"
          >
            Get the app
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </ButtonLink>
          <Button
            variant="plain"
            type="button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="sona-mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
            className="relative grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            <span className="relative block h-4 w-5" aria-hidden="true">
              <motion.span
                animate={{
                  transform: menuOpen
                    ? "translateY(7px) rotate(45deg)"
                    : "translateY(3px) rotate(0deg)",
                }}
                transition={reduce ? { duration: 0 } : SPRING_PANEL}
                className="absolute left-0 block h-px w-5 origin-center bg-current"
              />
              <motion.span
                animate={{
                  transform: menuOpen
                    ? "translateY(7px) rotate(-45deg) scaleX(1)"
                    : "translateY(11px) rotate(0deg) scaleX(0.7)",
                }}
                transition={reduce ? { duration: 0 } : SPRING_PANEL}
                className="absolute left-0 block h-px w-5 origin-center bg-current"
              />
            </span>
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {menuOpen ? (
            <motion.div
              id="sona-mobile-navigation"
              initial={
                reduce
                  ? false
                  : {
                      opacity: 0,
                      transform: "translateY(-8px) scale(0.985)",
                      filter: "blur(4px)",
                    }
              }
              animate={{
                opacity: 1,
                transform: "translateY(0px) scale(1)",
                filter: "blur(0px)",
              }}
              exit={
                reduce
                  ? undefined
                  : {
                      opacity: 0,
                      transform: "translateY(-6px) scale(0.985)",
                      filter: "blur(3px)",
                    }
              }
              transition={reduce ? { duration: 0 } : SPRING_PANEL}
              className="absolute top-[calc(100%-4px)] right-5 left-5 origin-top overflow-hidden rounded-3xl border border-border bg-background/90 p-2 backdrop-blur-2xl sm:right-8 sm:left-8 md:hidden"
            >
              <div className="grid">
                {[
                  ["Features", "#features"],
                  ["How it works", "#how-it-works"],
                  ["Pricing", "#pricing"],
                ].map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center rounded-2xl px-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {label}
                  </a>
                ))}
              </div>
              <ButtonLink
                href="#download"
                size="md"
                className="mt-1 w-full rounded-full h-9"
                onClick={() => setMenuOpen(false)}
              >
                Download the app
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </ButtonLink>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </nav>

      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 pb-4 sm:px-6 sm:pb-6 lg:grid-cols-2 lg:px-8">
        <div className="flex min-h-[34rem] flex-col justify-center rounded-3xl bg-background px-7 py-16 sm:px-12 lg:h-[42rem] lg:min-h-0 lg:px-14">
          <motion.p
            {...enter(0.02)}
            className="text-sm font-medium text-muted-foreground"
          >
            {eyebrow}
          </motion.p>
          <motion.h1
            {...enter(0.08, 22)}
            className={cn(HERO_HEADING_CLASS, "mt-7 max-w-xl")}
          >
            <span className="block">{title[0]}</span>
            <span className="block">{title[1]}</span>
          </motion.h1>
          <motion.p
            {...enter(0.16)}
            className="mt-8 max-w-md text-pretty  leading-7 text-muted-foreground  text-sm sm:text-base"
          >
            {description}
          </motion.p>
          <motion.div {...enter(0.24)} className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="#download" size="lg">
              Download for iPhone
            </ButtonLink>
            <ButtonLink href="#demo" size="lg" variant="outline">
              See how it works
            </ButtonLink>
          </motion.div>

          <motion.div
            {...enter(0.32)}
            className="mt-12 flex items-center gap-5 border-border border-t pt-5 text-xs text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Check className="size-3.5" aria-hidden="true" />
              No typing required
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-3.5" aria-hidden="true" />
              Private by default
            </span>
          </motion.div>
        </div>

        <motion.div
          {...enter(0.12, 28)}
          className="relative isolate flex min-h-[38rem] items-center justify-center overflow-hidden rounded-3xl border border-border bg-muted lg:h-[42rem] lg:min-h-0"
        >
          <div className="absolute inset-0" aria-hidden="true">
            <Dithering
              className="size-full"
              colorBack="#dff4ea"
              colorFront="#f6bd9d"
              shape="wave"
              type="4x4"
              size={3}
              scale={1.12}
              speed={reduce ? 0 : 0.12}
            />
          </div>
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_45%,hsl(var(--background)/0.16))]"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto flex h-full w-full items-center justify-center px-5 sm:px-10 lg:px-8 xl:px-14">
            <PhoneInterface reduce={reduce} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PhoneInterface({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={
        reduce
          ? false
          : { opacity: 0, transform: "translateY(6%) rotate(1.5deg)" }
      }
      animate={{ opacity: 1, transform: "translateY(0%) rotate(0deg)" }}
      transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.24 }}
      className="relative h-[36rem] w-full max-w-[21rem] rounded-3xl border-[7px] border-foreground/5 bg-background/52 text-foreground backdrop-blur-lg sm:h-[39rem]"
      aria-label="Sona mobile app preview"
    >
      <div className="relative h-full overflow-hidden rounded-3xl border border-border/80 bg-background/54 px-5 pt-5 backdrop-blur-2xl">
        <div className="absolute top-3 left-1/2 h-6 w-24 -translate-x-1/2 rounded-full bg-foreground" />

        <div className="mt-11 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Thursday, August 14</p>
            <p className="mt-1 text-xl font-semibold tracking-tight">
              Good morning, Maya
            </p>
          </div>
          <Button
            variant="plain"
            type="button"
            className="grid size-10 place-items-center rounded-full border border-border bg-background/50 backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="More options"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </div>

        <div className="mt-7 rounded-3xl border border-border bg-background/58 p-4 backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
                <Mic className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium">Launch thoughts</p>
                <p className="text-xs text-muted-foreground">
                  1:24 · transcribed
                </p>
              </div>
            </div>
            <Button
              variant="plain"
              type="button"
              className="grid size-9 place-items-center rounded-full border border-border bg-background/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Play voice note"
            >
              <Play className="ml-0.5 size-3.5 fill-current" />
            </Button>
          </div>

          <div className="mt-5 flex h-10 items-center gap-1" aria-hidden="true">
            {WAVEFORM.map((bar, index) => (
              <motion.span
                key={bar.id}
                className="w-full rounded-full bg-foreground/65"
                style={{ height: bar.height }}
                animate={
                  reduce
                    ? undefined
                    : {
                        transform: [
                          "scaleY(0.72)",
                          "scaleY(1)",
                          "scaleY(0.72)",
                        ],
                      }
                }
                transition={{
                  duration: 1.5 + (index % 4) * 0.12,
                  ease: "linear",
                  repeat: Number.POSITIVE_INFINITY,
                  delay: index * 0.04,
                }}
              />
            ))}
          </div>

          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Move the launch review to Friday. Send the updated brief to Nina and
            remind me to check the final copy this afternoon.
          </p>
        </div>

        <div className="mt-4 rounded-3xl border border-border bg-background/58 p-3 backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Ready from your note</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                2 actions found
              </p>
            </div>
            <AudioLines
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          </div>

          <div className="mt-1 divide-y divide-border">
            {ACTIONS.map((action, index) => (
              <motion.div
                key={action.id}
                initial={
                  reduce ? false : { opacity: 0, transform: "translateY(8px)" }
                }
                animate={{ opacity: 1, transform: "translateY(0px)" }}
                transition={{
                  duration: 0.5,
                  ease: EASE_OUT,
                  delay: 0.8 + index * 0.07,
                }}
                className="flex items-center gap-2.5 py-1.5"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border bg-background/60">
                  <Check className="size-3" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs">
                  {action.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {action.time}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="absolute inset-x-5 bottom-2 flex items-center gap-3 rounded-full border border-border bg-background/58 p-2 pl-4 backdrop-blur-2xl">
          <p className="flex-1 text-sm text-muted-foreground">
            Say what’s next…
          </p>
          <Button
            variant="plain"
            type="button"
            className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Record a voice note"
          >
            <Mic className="size-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
