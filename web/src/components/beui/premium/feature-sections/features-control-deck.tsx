"use client";

import {
  ArrowUpRight,
  BookOpenCheck,
  Bot,
  Check,
  Command,
  Database,
  FileText,
  MessageSquareText,
  Settings2,
  Workflow,
} from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { EASE_OUT, SPRING_PRESS } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type FeaturesControlDeckProps = {
  eyebrow?: string;
  title?: readonly [string, string];
  subtext?: string;
  className?: string;
};

const SOURCES = [
  { label: "Docs", icon: FileText },
  { label: "Data", icon: Database },
  { label: "Chat", icon: MessageSquareText },
] as const;

export function FeaturesControlDeck({
  eyebrow = "Agent operations",
  title = ["One system for every", "customer conversation."],
  subtext = "Connect knowledge, automate the routine, and keep every handoff visible from one focused workspace.",
  className,
}: FeaturesControlDeckProps) {
  const reduce = useReducedMotion() ?? false;
  const deckRef = useRef<HTMLDivElement>(null);
  const inView = useInView(deckRef, { once: false, margin: "-15% 0px" });
  const [automationOn, setAutomationOn] = useState(true);

  return (
    <section
      className={cn("w-full bg-background px-4 py-20 sm:px-8", className)}
    >
      <div className="mx-auto w-full max-w-6xl">
        <header className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-muted-foreground text-xs uppercase tracking-[0.18em]">
            {eyebrow}
          </p>
          <h2 className="mt-4 text-foreground leading-[1.02] tracking-tight text-4xl font-medium">
            <span className="block">{title[0]}</span>
            <span className="block">{title[1]}</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground text-sm leading-7">
            {subtext}
          </p>
        </header>

        <motion.div
          ref={deckRef}
          initial={reduce ? false : { opacity: 0, y: 18, filter: "blur(8px)" }}
          whileInView={
            reduce ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }
          }
          viewport={{ once: true, margin: "-64px" }}
          transition={reduce ? undefined : { duration: 0.6, ease: EASE_OUT }}
          className="mt-12 grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-3xl border border-border bg-background p-2 lg:grid-cols-12 lg:grid-rows-[8rem_20rem_7rem]"
        >
          <article className="flex min-h-[32rem] min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-background lg:col-span-4 lg:row-span-3 lg:min-h-0">
            <div className="relative flex min-h-64 flex-1 items-center justify-center overflow-hidden border-border border-b px-8">
              <ContextPipeline active={inView && !reduce} />
            </div>

            <div className="px-7 py-7">
              <h3 className="font-medium text-foreground text-xl tracking-tight">
                Context that stays connected
              </h3>
              <p className="mt-2 max-w-sm text-pretty text-muted-foreground text-sm leading-6">
                Bring product knowledge, customer history, and live signals into
                every answer without rebuilding the workflow.
              </p>
            </div>

            <div className="mt-auto flex items-center justify-between border-border border-t px-5 py-4">
              <Button
                variant="plain"
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-muted px-4 font-medium text-foreground text-sm outline-none transition-colors hover:bg-muted/75 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Settings2 className="size-4" aria-hidden="true" />
                Configure
              </Button>
              <Button
                variant="plain"
                type="button"
                aria-label="Toggle automatic context"
                aria-pressed={automationOn}
                onClick={() => setAutomationOn((value) => !value)}
                className="relative h-10 w-[4.5rem] rounded-full border border-border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <motion.span
                  className="absolute top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-foreground text-background"
                  animate={{ x: automationOn ? 38 : 4 }}
                  transition={reduce ? { duration: 0 } : SPRING_PRESS}
                >
                  {automationOn ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : null}
                </motion.span>
              </Button>
            </div>
          </article>

          <article className="mt-2 flex min-w-0 items-center justify-between rounded-3xl border border-border bg-background px-6 py-5 lg:col-span-4 lg:col-start-5 lg:mt-0 lg:ml-2">
            <div>
              <h3 className="font-medium text-foreground text-xl tracking-tight">
                Sources connected
              </h3>
              <p className="mt-1 text-muted-foreground text-xs">
                3 live knowledge streams
              </p>
            </div>
            <ul className="flex -space-x-2" aria-label="Connected sources">
              {SOURCES.map(({ label, icon: Icon }, index) => (
                <motion.li
                  key={label}
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  animate={inView && !reduce ? { opacity: 1, x: 0 } : undefined}
                  transition={{
                    duration: 0.4,
                    ease: EASE_OUT,
                    delay: 0.25 + index * 0.08,
                  }}
                  title={label}
                  className="grid size-10 place-items-center rounded-full border-2 border-background bg-muted text-foreground"
                >
                  <Icon className="size-4" aria-hidden="true" />
                </motion.li>
              ))}
            </ul>
          </article>

          <article className="mt-2 flex min-h-72 min-w-0 flex-col rounded-3xl border border-border bg-background p-7 lg:col-span-4 lg:col-start-5 lg:row-start-2 lg:ml-2 lg:min-h-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium text-foreground text-xl tracking-tight">
                  Automatic resolution
                </h3>
                <p className="mt-1 text-muted-foreground text-sm">
                  Last 30 days
                </p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs text-muted-foreground uppercase tracking-wider">
                +14.8%
              </span>
            </div>

            <div className="my-auto py-7">
              <div className="flex items-end font-medium text-7xl text-foreground leading-none tracking-[-0.07em] tabular-nums sm:text-8xl">
                <NumberTicker value={68} duration={1.05} blur />
                <span className="mb-[0.4em] ml-1 text-base text-muted-foreground tracking-normal">
                  %
                </span>
              </div>
              <div className="mt-7 h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full origin-left rounded-full bg-foreground"
                  initial={false}
                  animate={{ scaleX: inView ? 0.68 : 0 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: 0.9, ease: EASE_OUT, delay: 0.2 }
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Handled by agent</span>
              <span className="font-mono tabular-nums">1,842 / 2,709</span>
            </div>
          </article>

          <article className="relative mt-2 flex min-h-[27rem] min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-background p-7 lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:ml-2 lg:min-h-0">
            <DotField active={inView && !reduce} />
            <div className="relative z-10 font-medium text-7xl text-foreground leading-none tracking-[-0.07em] tabular-nums sm:text-8xl">
              <NumberTicker value={12} suffix="k" duration={1.05} blur />
            </div>
            <div className="relative z-10 mt-auto max-w-xs">
              <span className="mb-5 grid size-10 place-items-center bg-muted text-foreground rounded-full">
                <BookOpenCheck className="size-4.5" aria-hidden="true" />
              </span>
              <h3 className="font-medium text-foreground text-xl tracking-tight">
                Answers grounded in your product
              </h3>
              <p className="mt-2 text-pretty text-muted-foreground text-sm leading-6">
                Every response traces back to approved context, with the source
                ready whenever your team needs it.
              </p>
            </div>
          </article>

          <article className="mt-2 flex min-h-24 min-w-0 items-center gap-4 rounded-3xl border border-border bg-background px-5 py-4 lg:col-span-8 lg:col-start-5 lg:row-start-3 lg:ml-2 lg:min-h-0">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-foreground">
              <Bot className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-foreground tracking-tight text-xl font-medium">
                Escalate with the full conversation attached
              </h3>
              <p className="mt-0.5 truncate text-muted-foreground text-xs sm:text-sm">
                The right teammate gets context, intent, and a suggested next
                action.
              </p>
            </div>
            <Button
              variant="plain"
              type="button"
              aria-label="Open handoff workflow"
              className="hidden min-h-10 shrink-0 items-center gap-3 rounded-full bg-muted px-4 font-mono text-foreground text-xs outline-none transition-colors hover:bg-muted/75 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:inline-flex"
            >
              <Command className="size-3.5" aria-hidden="true" /> H
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Button>
          </article>
        </motion.div>
      </div>
    </section>
  );
}

function ContextPipeline({ active }: { active: boolean }) {
  const reduce = useReducedMotion() ?? false;
  const routes = [
    { path: "M78 104 H116 Q128 104 128 92 V48 Q128 36 140 36 H320", delay: 0 },
    { path: "M78 104 H320", delay: 0.18 },
    {
      path: "M78 104 H108 Q120 104 120 116 V160 Q120 172 132 172 H320",
      delay: 0.34,
    },
    {
      path: "M78 104 H194 Q206 104 206 116 V132 Q206 144 218 144 H320",
      delay: 0.52,
    },
  ] as const;

  return (
    <div className="relative h-[13rem] w-full max-w-sm" aria-hidden="true">
      <svg
        viewBox="0 0 320 208"
        className="absolute inset-0 size-full overflow-visible text-border"
        fill="none"
      >
        <title>Context routes flowing into connected systems</title>
        {routes.map(({ path, delay }) => (
          <g key={path}>
            <motion.path
              d={path}
              stroke="currentColor"
              strokeWidth="1.25"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={
                active
                  ? { pathLength: 1, opacity: 1 }
                  : { pathLength: 0, opacity: 0 }
              }
              transition={
                reduce
                  ? { duration: 0 }
                  : { duration: 0.8, ease: EASE_OUT, delay }
              }
            />
            <motion.path
              d={path}
              className="text-foreground"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeDasharray="10 320"
              initial={{ opacity: 0 }}
              animate={
                active
                  ? { strokeDashoffset: [20, -320], opacity: [0, 0.5, 0] }
                  : { opacity: 0 }
              }
              transition={{
                duration: 2.8,
                ease: "linear",
                repeat: Number.POSITIVE_INFINITY,
                repeatDelay: 0.7,
                delay: 0.8 + delay,
              }}
            />
          </g>
        ))}
        {[36, 104, 144, 172].map((y) => (
          <g key={y}>
            <circle cx="316" cy={y} r="4" fill="currentColor" />
            <circle
              cx="316"
              cy={y}
              r="1.75"
              className="text-background"
              fill="currentColor"
            />
          </g>
        ))}
      </svg>

      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.88 }}
        animate={active ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={reduce ? { duration: 0 } : { ...SPRING_PRESS, delay: 0.12 }}
        className="absolute left-0 top-1/2 flex -translate-y-1/2 flex-col items-center"
      >
        <span className="grid size-[4.9rem] place-items-center border border-border bg-muted text-foreground rounded-full">
          <Workflow className="size-6" />
        </span>
        <span className="mt-3 font-mono text-xs text-muted-foreground uppercase tracking-[0.18em]">
          Live context
        </span>
      </motion.div>
    </div>
  );
}

function DotField({ active }: { active: boolean }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-52 overflow-hidden text-border"
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,currentColor_1px,transparent_1.25px)] bg-[size:12px_12px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
        animate={
          active
            ? { opacity: [0.35, 0.7, 0.35], y: [0, 6, 0] }
            : { opacity: 0.35 }
        }
        transition={{
          duration: 4,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      />
    </div>
  );
}
