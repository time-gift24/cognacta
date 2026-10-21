"use client";

import { ArrowDown, ArrowRight, ArrowUp, Bell, Waves } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { SharedLayoutBg } from "@/components/beui/motion/shared-layout-bg";
import { EASE_OUT, SPRING_PANEL } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { HERO_HEADING_CLASS } from "./hero-heading";

export type HeroDefiRoutingProps = {
  eyebrow?: string;
  title?: readonly [string, string];
  description?: string;
  className?: string;
};

const NAV_ITEMS = [
  ["Yield", "#yield"],
  ["How it works", "#how-it-works"],
  ["Security", "#security"],
] as const;

const TRANSACTIONS = [
  {
    id: "deposit",
    type: "Deposit",
    date: "Today, 9:42 AM",
    amount: "+$350.00",
    direction: "down",
  },
  {
    id: "withdraw",
    type: "Withdrawal",
    date: "Yesterday",
    amount: "−$100.00",
    direction: "up",
  },
  {
    id: "yield",
    type: "Yield earned",
    date: "August 12",
    amount: "+$42.18",
    direction: "down",
  },
] as const;

export function HeroDefiRouting({
  eyebrow = "Introducing Basin Earn",
  title = ["Earn more on", "your stablecoins."],
  description = "A non-custodial savings vault that routes your cash across audited onchain markets. Withdraw anytime.",
  className,
}: HeroDefiRoutingProps) {
  const reduce = useReducedMotion() ?? false;

  const enter = (delay: number, distance = 14) => ({
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
      <DefiNav reduce={reduce} />

      <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-5 pt-12 text-center sm:px-8 sm:pt-16">
        <motion.div {...enter(0.02)}>
          <div className="rounded-full border border-border bg-muted/45 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
            <span>{eyebrow}</span>
          </div>
        </motion.div>

        <motion.h1
          {...enter(0.08, 20)}
          className={cn(HERO_HEADING_CLASS, "mt-6 max-w-4xl")}
        >
          <span className="block">{title[0]}</span>
          <span className="block">{title[1]}</span>
        </motion.h1>

        <motion.p
          {...enter(0.16)}
          className="mt-5 max-w-xl text-pretty  leading-6 text-muted-foreground  sm:leading-7 text-sm sm:text-base"
        >
          {description}
        </motion.p>

        <motion.form
          {...enter(0.24)}
          className="mt-7 flex w-full max-w-md items-center gap-2"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="sr-only" htmlFor="basin-email">
            Email address
          </label>
          <Input
            id="basin-email"
            type="email"
            placeholder="you@company.com"
            className="w-full min-w-0 flex-1"
            classNames={{
              input: "px-4 text-sm placeholder:text-muted-foreground",
            }}
          />
          <Button
            type="submit"
            size="md"
            className="shrink-0 px-5 rounded-full h-9"
          >
            Get early access
          </Button>
        </motion.form>

        <motion.p
          {...enter(0.3)}
          className="mt-3 text-xs text-muted-foreground"
        >
          Available in the US. More regions coming soon.
        </motion.p>

        <motion.div
          initial={
            reduce
              ? false
              : { opacity: 0, transform: "translateY(8%) scale(0.985)" }
          }
          animate={{ opacity: 1, transform: "translateY(0%) scale(1)" }}
          transition={{ duration: 0.85, ease: EASE_OUT, delay: 0.3 }}
          className="mt-12 w-full max-w-[24rem] sm:mt-10"
        >
          <SavingsPhone reduce={reduce} />
        </motion.div>
      </div>
    </section>
  );
}

function DefiNav({ reduce }: { reduce: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="relative z-30 mx-auto flex h-20 w-full max-w-5xl items-center justify-between px-5 sm:px-8 lg:h-24">
      <a
        href="/"
        className="flex min-h-10 items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Basin home"
      >
        <span className="grid size-8 place-items-center rounded-full border border-border bg-muted">
          <Waves className="size-4" aria-hidden="true" />
        </span>
        <span className="font-semibold tracking-[-0.035em]">Basin</span>
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
              className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {label}
            </a>
          ))}
        </SharedLayoutBg>
      </div>

      <div className="flex items-center gap-1">
        <ButtonLink
          href="#access"
          size="sm"
          className="hidden sm:inline-flex rounded-full h-9"
        >
          Get early access
        </ButtonLink>
        <Button
          variant="plain"
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="basin-mobile-navigation"
          onClick={() => setOpen((value) => !value)}
          className="relative grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <span className="relative block h-4 w-5" aria-hidden="true">
            <motion.span
              animate={{
                transform: open
                  ? "translateY(7px) rotate(45deg)"
                  : "translateY(3px) rotate(0deg)",
              }}
              transition={reduce ? { duration: 0 } : SPRING_PANEL}
              className="absolute left-0 block h-px w-5 origin-center bg-current"
            />
            <motion.span
              animate={{
                transform: open
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
        {open ? (
          <motion.div
            id="basin-mobile-navigation"
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
            className="absolute top-[calc(100%-4px)] right-5 left-5 origin-top overflow-hidden rounded-3xl border border-border bg-background/88 p-2 backdrop-blur-[28px] backdrop-saturate-150 sm:right-8 sm:left-8 md:hidden"
          >
            {NAV_ITEMS.map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-2xl px-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {label}
              </a>
            ))}
            <ButtonLink
              href="#access"
              size="md"
              className="mt-1 w-full rounded-full h-9"
              onClick={() => setOpen(false)}
            >
              Get early access
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}

function SavingsPhone({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative h-[40rem] w-full rounded-3xl border-[7px] border-foreground/5 backdrop-blur-lg bg-background text-left text-foreground sm:h-[43rem]">
      <div className="relative h-full overflow-hidden rounded-3xl border border-border bg-background px-5">
        <div className="absolute top-3 left-1/2 h-6 w-24 -translate-x-1/2 rounded-full bg-foreground" />

        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="plain"
            type="button"
            className="grid size-10 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open profile"
          >
            {/* biome-ignore lint/performance/noImgElement: deterministic remote SVG avatar */}
            <img
              src="https://api.dicebear.com/10.x/glass/svg?seed=Maya"
              alt="Maya's profile"
              className="size-8 rounded-full border border-border bg-muted object-cover"
            />
          </Button>
          <Button
            variant="plain"
            type="button"
            className="grid size-10 place-items-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="View notifications"
          >
            <Bell className="size-4" />
          </Button>
        </div>

        <div className="mt-4">
          <p className="text-xs text-muted-foreground">Total balance</p>
          <NumberTicker
            value={12593}
            prefix="$"
            suffix=".00"
            locale
            className="mt-1 font-mono text-4xl font-medium tracking-[-0.06em]"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            +$421.25 this month · 3.4%
          </p>
        </div>

        <div className="relative mt-4 h-40">
          <svg
            className="size-full overflow-visible"
            viewBox="0 0 320 150"
            role="img"
          >
            <title>Balance increasing over the selected period</title>
            <defs>
              <linearGradient id="basin-chart-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity="0.16" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <motion.path
              d="M0 135 C45 132 82 126 116 112 C156 96 177 89 208 64 C239 39 267 25 302 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.7 }}
            />
            <motion.path
              d="M0 135 C45 132 82 126 116 112 C156 96 177 89 208 64 C239 39 267 25 302 8 L302 150 L0 150 Z"
              fill="url(#basin-chart-fill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 1.15 }}
            />
            <motion.circle
              cx="302"
              cy="8"
              r="4"
              fill="currentColor"
              initial={
                reduce ? false : { opacity: 0, transform: "scale(0.92)" }
              }
              animate={{ opacity: 1, transform: "scale(1)" }}
              transition={{ duration: 0.35, ease: EASE_OUT, delay: 1.2 }}
            />
          </svg>
        </div>

        <div className="flex items-center justify-between gap-1">
          {["1D", "1W", "1M", "3M", "ALL"].map((range) => (
            <Button
              variant="plain"
              key={range}
              type="button"
              className={cn(
                "h-8 min-w-10 rounded-full px-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                range === "1M"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {range}
            </Button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="font-medium text-sm">Transaction history</p>
          <Button
            variant="plain"
            type="button"
            className="min-h-8 rounded-full bg-muted px-3 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            See all
          </Button>
        </div>

        <div className="mt-2 divide-y divide-border">
          {TRANSACTIONS.map((transaction, index) => {
            const Icon = transaction.direction === "down" ? ArrowDown : ArrowUp;
            return (
              <motion.div
                key={transaction.id}
                initial={
                  reduce ? false : { opacity: 0, transform: "translateY(8px)" }
                }
                animate={{ opacity: 1, transform: "translateY(0px)" }}
                transition={{
                  duration: 0.45,
                  ease: EASE_OUT,
                  delay: 1 + index * 0.06,
                }}
                className="flex items-center gap-3 py-2.5"
              >
                <span className="grid size-8 place-items-center rounded-full border border-border bg-muted">
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">
                    {transaction.type}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {transaction.date}
                  </p>
                </div>
                <span className="font-mono text-xs tabular-nums">
                  {transaction.amount}
                </span>
              </motion.div>
            );
          })}
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-background via-background/95 to-transparent"
          aria-hidden="true"
        />

        <div className="absolute inset-x-5 bottom-5 z-20 grid grid-cols-2 gap-2">
          <Button
            variant="plain"
            type="button"
            className="h-11 rounded-full bg-primary text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Deposit
          </Button>
          <Button
            variant="plain"
            type="button"
            className="h-11 rounded-full bg-primary text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Transfer
          </Button>
        </div>
      </div>
    </div>
  );
}
