"use client";

import { motion, useReducedMotion } from "motion/react";
import { type FormEvent, useEffect, useId, useState } from "react";
import { type ButtonState, StatefulButton } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_SECONDS = 9 * 86_400 + 12 * 3_600 + 48 * 60 + 22;
const DEFAULT_AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&fm=webp&q=80&w=96",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&fm=webp&q=80&w=96",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&fm=webp&q=80&w=96",
] as const;

type CountdownPart = {
  label: string;
  value: number;
};

export type WaitlistBlueprintProps = {
  brand?: string;
  titleBefore?: string;
  highlightedWord?: string;
  titleAfter?: string;
  memberCount?: number;
  countdownSeconds?: number;
  avatarUrls?: readonly string[];
  onJoin?: (email: string) => void | Promise<void>;
  className?: string;
};

function getCountdown(totalSeconds: number): CountdownPart[] {
  const safeSeconds = Math.max(0, totalSeconds);

  return [
    { label: "Days", value: Math.floor(safeSeconds / 86_400) },
    {
      label: "Hours",
      value: Math.floor((safeSeconds % 86_400) / 3_600),
    },
    {
      label: "Minutes",
      value: Math.floor((safeSeconds % 3_600) / 60),
    },
    { label: "Seconds", value: safeSeconds % 60 },
  ];
}

function SelectedWord({ children }: { children: string }) {
  return (
    <span className="relative mx-2 inline-block -rotate-2 border border-foreground px-2 italic">
      {children}
      <span className="absolute -left-1.5 -top-1.5 size-2 rounded-full border border-background bg-foreground" />
      <span className="absolute -right-1.5 -top-1.5 size-2 rounded-full border border-background bg-foreground" />
      <span className="absolute -bottom-1.5 -left-1.5 size-2 rounded-full border border-background bg-foreground" />
      <span className="absolute -bottom-1.5 -right-1.5 size-2 rounded-full border border-background bg-foreground" />
    </span>
  );
}

function AvatarStack({ avatarUrls }: { avatarUrls: readonly string[] }) {
  return (
    <div className="flex -space-x-2" aria-hidden>
      {avatarUrls.slice(0, 3).map((avatarUrl) => (
        // biome-ignore lint/performance/noImgElement: remote portraits keep the installable page framework-agnostic.
        <img
          key={avatarUrl}
          src={avatarUrl}
          alt=""
          className="size-9 rounded-full object-cover"
        />
      ))}
    </div>
  );
}

function BlueprintCountdown({ totalSeconds }: { totalSeconds: number }) {
  const parts = getCountdown(totalSeconds);

  return (
    <div className="relative mx-auto grid w-full max-w-6xl grid-cols-2 gap-x-6 gap-y-5 px-5 sm:grid-cols-4 sm:gap-x-10 sm:px-8">
      <span className="sr-only">
        {parts.map((part) => `${part.value} ${part.label}`).join(", ")}
      </span>
      {parts.map((part, index) => (
        <div key={part.label} className="relative text-center" aria-hidden>
          <p className="relative z-10 mb-7 font-medium text-xs uppercase tracking-widest opacity-65">
            {part.label}
          </p>
          <span className="relative inline-flex origin-bottom scale-105 sm:scale-110 md:scale-125">
            <NumberTicker
              value={part.value}
              pad={2}
              startOnView={false}
              animateOnMount={false}
              duration={0.5}
              className="font-medium text-7xl leading-none tracking-tight [mask-image:linear-gradient(to_bottom,black_0%,black_50%,transparent_100%)] sm:text-8xl md:text-9xl"
            />
            <NumberTicker
              value={part.value}
              pad={2}
              startOnView={false}
              animateOnMount={false}
              duration={0.5}
              className="absolute inset-0 mix-blend-screen font-medium text-7xl text-primary/30 leading-none tracking-tight blur-sm [mask-image:linear-gradient(to_bottom,transparent_35%,black_100%)] sm:text-8xl md:text-9xl"
            />
          </span>
          {index < parts.length - 1 ? (
            <span className="absolute -right-5 bottom-4 z-20 hidden text-5xl opacity-45 sm:block md:text-6xl">
              :
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function WaitlistBlueprint({
  brand = "Forward",
  titleBefore = "Make the",
  highlightedWord = "future",
  titleAfter = "feel ready now",
  memberCount = 1288,
  countdownSeconds = DEFAULT_SECONDS,
  avatarUrls = DEFAULT_AVATARS,
  onJoin,
  className,
}: WaitlistBlueprintProps) {
  const reduceMotion = useReducedMotion();
  const fieldId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const [remaining, setRemaining] = useState(countdownSeconds);

  useEffect(() => {
    const timer = window.setInterval(
      () => setRemaining((current) => Math.max(0, current - 1)),
      1000,
    );

    return () => window.clearInterval(timer);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      setButtonState("error");
      return;
    }

    setError(undefined);
    setButtonState("loading");
    try {
      if (onJoin) await onJoin(normalizedEmail);
      else await new Promise((resolve) => setTimeout(resolve, 700));
      setButtonState("success");
    } catch {
      setError("Couldn’t join right now. Try again.");
      setButtonState("error");
    }
  };

  const enter = (delay: number, distance = 16) => ({
    initial: reduceMotion
      ? false
      : {
          opacity: 0,
          transform: `translateY(${distance}px)`,
          filter: "blur(5px)",
        },
    animate: {
      opacity: 1,
      transform: "translateY(0px)",
      filter: "blur(0px)",
    },
    transition: reduceMotion
      ? { duration: 0 }
      : { duration: 0.6, ease: EASE_OUT, delay },
  });

  return (
    <section className={cn("w-full bg-background p-2 sm:p-4", className)}>
      <div className="relative isolate min-h-[840px] overflow-hidden rounded-3xl border border-border bg-background text-foreground">
        <nav className="relative z-20 mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 sm:px-10">
          <a
            href="/"
            className="flex min-h-10 items-center rounded-full font-medium tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {brand}
          </a>
          <div className="flex items-center gap-1">
            <a
              href="#about"
              className="flex min-h-10 items-center rounded-full px-3 text-sm opacity-75 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            >
              About
            </a>
            <a
              href="#faqs"
              className="flex min-h-10 items-center rounded-full px-3 text-sm opacity-75 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            >
              FAQs
            </a>
          </div>
        </nav>

        <main className="relative z-10 mx-auto flex min-h-[510px] w-full max-w-4xl flex-col items-center justify-center px-5 pb-28 text-center sm:px-8 sm:pb-24">
          <motion.div {...enter(0)} className="mb-7">
            <AvatarStack avatarUrls={avatarUrls} />
          </motion.div>

          <motion.h1
            {...enter(0.07, 24)}
            className="max-w-4xl text-balance tracking-tight text-4xl md:text-5xl font-medium"
          >
            {titleBefore} <SelectedWord>{highlightedWord}</SelectedWord>
            <span className="mt-2 block">{titleAfter}</span>
          </motion.h1>

          <motion.form
            {...enter(0.15)}
            onSubmit={submit}
            noValidate
            className="mt-10 w-full max-w-xl"
          >
            <div className="flex items-center gap-2">
              <label htmlFor={`${fieldId}-blueprint-email`} className="sr-only">
                Email address
              </label>
              <Input
                id={`${fieldId}-blueprint-email`}
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event);
                  setError(undefined);
                  if (buttonState !== "idle") setButtonState("idle");
                }}
                placeholder="Enter your email address"
                error={Boolean(error)}
                aria-describedby={
                  error ? `${fieldId}-blueprint-error` : undefined
                }
                className="w-full min-w-0 flex-1"
                classNames={{
                  input:
                    "text-sm placeholder:text-muted-foreground sm:text-base",
                }}
              />
              <StatefulButton
                type="submit"
                state={buttonState}
                size="lg"
                loadingText="Joining"
                successText="You’re in"
                errorText="Try again"
                className="shrink-0 bg-primary px-5 text-primary-foreground hover:bg-primary/90 rounded-full h-9"
              >
                Join waitlist
              </StatefulButton>
            </div>
            <p
              id={`${fieldId}-blueprint-error`}
              aria-live="polite"
              className="mt-2 flex min-h-5 items-center justify-center gap-1 text-xs leading-none opacity-75"
            >
              {error ?? (
                <>
                  <NumberTicker
                    value={memberCount}
                    locale
                    duration={0.75}
                    className="font-normal leading-none"
                  />
                  <span>people already joined</span>
                </>
              )}
            </p>
          </motion.form>
        </main>

        <motion.div
          {...enter(0.24, 36)}
          className="absolute inset-x-0 bottom-[-2.5rem] z-10"
        >
          <BlueprintCountdown totalSeconds={remaining} />
        </motion.div>
      </div>
    </section>
  );
}
