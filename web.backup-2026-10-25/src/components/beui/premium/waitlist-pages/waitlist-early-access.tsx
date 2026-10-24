"use client";

import { ArrowUp, Bot, Link2, Wifi } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useEffect, useId, useState } from "react";
import { type ButtonState, StatefulButton } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { EASE_OUT, SPRING_PANEL } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_SECONDS = 200 * 86_400 + 4 * 3_600 + 56 * 60 + 4;

const AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&fm=webp&q=80&w=96",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&fm=webp&q=80&w=96",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&fm=webp&q=80&w=96",
];

type CountdownValue = {
  label: string;
  value: number;
};

export type WaitlistEarlyAccessProps = {
  brand?: string;
  title?: string;
  description?: string;
  socialProof?: string;
  countdownSeconds?: number;
  onJoin?: (email: string) => void | Promise<void>;
  className?: string;
};

function getCountdown(totalSeconds: number): CountdownValue[] {
  const safeSeconds = Math.max(0, totalSeconds);
  const days = Math.floor(safeSeconds / 86_400);
  const hours = Math.floor((safeSeconds % 86_400) / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);
  const seconds = safeSeconds % 60;

  return [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Minutes", value: minutes },
    { label: "Seconds", value: seconds },
  ];
}

function AvatarStack() {
  return (
    <div className="flex -space-x-2" aria-hidden>
      {AVATARS.map((avatar) => (
        // biome-ignore lint/performance/noImgElement: small remote avatar used as social proof.
        <img
          key={avatar}
          src={avatar}
          alt=""
          className="size-9 rounded-full border-2 border-background object-cover"
        />
      ))}
    </div>
  );
}

function Countdown({ totalSeconds }: { totalSeconds: number }) {
  const values = getCountdown(totalSeconds);

  return (
    <div>
      <span className="sr-only">
        {values.map((item) => `${item.value} ${item.label}`).join(", ")}
      </span>
      <div
        aria-hidden
        className="flex items-center justify-center gap-2 sm:gap-3"
      >
        {values.map((item, index) => (
          <div key={item.label} className="contents">
            {index > 0 ? (
              <span className="font-medium text-muted-foreground">:</span>
            ) : null}
            <div className="flex size-16 flex-col items-center justify-center border border-border bg-background sm:size-20 rounded-full">
              <NumberTicker
                value={item.value}
                pad={item.label === "Days" ? 3 : 2}
                duration={0.45}
                startOnView={false}
                animateOnMount={false}
                className="font-medium text-lg tabular-nums"
              />
              <span className="mt-1 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                {item.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductPreview() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<
    "composing" | "sent" | "typing" | "answered"
  >(reduceMotion ? "answered" : "composing");

  useEffect(() => {
    if (reduceMotion) {
      setPhase("answered");
      return;
    }

    const timers: number[] = [];
    const play = () => {
      setPhase("composing");
      timers.push(
        window.setTimeout(() => setPhase("sent"), 900),
        window.setTimeout(() => setPhase("typing"), 1700),
        window.setTimeout(() => setPhase("answered"), 3000),
      );
    };

    play();
    const loop = window.setInterval(play, 6800);

    return () => {
      window.clearInterval(loop);
      timers.forEach((timer) => {
        window.clearTimeout(timer);
      });
    };
  }, [reduceMotion]);

  const messageSent = phase !== "composing";

  return (
    <motion.div
      initial={
        reduceMotion ? false : { opacity: 0, transform: "translateY(64px)" }
      }
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.8, ease: EASE_OUT, delay: 0.18 }
      }
      className="relative mx-auto mt-14 h-[500px] w-full max-w-md overflow-hidden sm:mt-16 sm:h-[540px]"
    >
      <figure className="absolute left-1/2 top-5 h-[40rem] w-80 -translate-x-1/2 rounded-3xl border-[8px] border-foreground/15 bg-background/70 text-foreground backdrop-blur-xl">
        <figcaption className="sr-only">Relay AI chat on iPhone</figcaption>
        <span className="absolute -left-3 top-28 h-10 w-1.5 rounded-full bg-foreground/20" />
        <span className="absolute -left-3 top-40 h-16 w-1.5 rounded-full bg-foreground/20" />
        <span className="absolute -left-3 top-60 h-16 w-1.5 rounded-full bg-foreground/20" />
        <span className="absolute -right-3 top-40 h-24 w-1.5 rounded-full bg-foreground/20" />

        <div className="relative h-full overflow-hidden rounded-3xl border border-border bg-background px-4 pt-5">
          <div className="absolute left-1/2 top-3 z-10 h-7 w-24 -translate-x-1/2 rounded-full bg-foreground" />

          <div className="flex items-center justify-between px-1 pt-1 text-xs">
            <span className="font-medium tabular-nums">9:41</span>
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="flex items-end gap-px">
                {[3, 5, 7, 9].map((height) => (
                  <span
                    key={height}
                    className="w-0.5 rounded-full bg-current"
                    style={{ height }}
                  />
                ))}
              </span>
              <Wifi className="size-3.5" />
              <span className="h-2.5 w-5 rounded-full border border-current" />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 border-border border-b pb-4">
            <span className="grid size-8 place-items-center rounded-full bg-muted">
              <Bot aria-hidden className="size-4" />
            </span>
            <div>
              <p className="font-medium text-sm">Relay AI</p>
              <p className="text-muted-foreground text-xs">Online</p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-end gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted">
                <Bot aria-hidden className="size-3.5" />
              </span>
              <div className="max-w-[78%] rounded-2xl rounded-bl-md border border-border bg-background px-3 py-2.5">
                What should we work on?
              </div>
            </div>

            <AnimatePresence initial={false} mode="popLayout">
              {messageSent ? (
                <motion.div
                  key="user-message"
                  initial={
                    reduceMotion
                      ? false
                      : {
                          opacity: 0,
                          transform: "translateY(28px) scale(0.94)",
                        }
                  }
                  animate={{
                    opacity: 1,
                    transform: "translateY(0px) scale(1)",
                  }}
                  transition={reduceMotion ? { duration: 0 } : SPRING_PANEL}
                  className="ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-primary px-3 py-2.5 text-primary-foreground"
                >
                  Draft a launch plan for Friday.
                </motion.div>
              ) : null}

              {phase === "typing" ? (
                <motion.div
                  key="typing"
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, transform: "translateY(6px)" }
                  }
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  exit={{ opacity: 0, transform: "translateY(-4px)" }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.25, ease: EASE_OUT }
                  }
                  className="flex items-center gap-1.5 pl-9"
                  aria-label="Relay AI is typing"
                >
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      className="size-1.5 rounded-full bg-muted-foreground"
                      animate={
                        reduceMotion
                          ? undefined
                          : { opacity: [0.35, 1, 0.35], y: [0, -2, 0] }
                      }
                      transition={{
                        duration: 0.7,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: dot * 0.12,
                        ease: EASE_OUT,
                      }}
                    />
                  ))}
                </motion.div>
              ) : null}

              {phase === "answered" ? (
                <motion.div
                  key="agent-answer"
                  initial={
                    reduceMotion
                      ? false
                      : {
                          opacity: 0,
                          transform: "translateY(8px)",
                          filter: "blur(3px)",
                        }
                  }
                  animate={{
                    opacity: 1,
                    transform: "translateY(0px)",
                    filter: "blur(0px)",
                  }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.4, ease: EASE_OUT }
                  }
                  className="flex items-end gap-2"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted">
                    <Bot aria-hidden className="size-3.5" />
                  </span>
                  <div className="max-w-[82%] rounded-2xl rounded-bl-md border border-border bg-background px-3 py-2.5 leading-5">
                    Done. I organized the brief into launch, review, and release
                    steps.
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="absolute inset-x-4 bottom-4 flex min-h-12 items-center gap-2 rounded-full border border-border bg-background p-1.5 pl-4">
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {phase === "composing"
                ? "Draft a launch plan for Friday."
                : "Message Relay AI…"}
            </span>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <ArrowUp aria-hidden className="size-4" />
            </span>
          </div>
        </div>
      </figure>
    </motion.div>
  );
}

export function WaitlistEarlyAccess({
  brand = "Relay",
  title = "Get early access",
  description = "We’re getting close. Join the waitlist and be first to try a calmer way to plan, focus, and ship.",
  socialProof = "Join 1,000+ others on the waitlist",
  countdownSeconds = DEFAULT_SECONDS,
  onJoin,
  className,
}: WaitlistEarlyAccessProps) {
  const reduceMotion = useReducedMotion();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [state, setState] = useState<ButtonState>("idle");
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
      setState("error");
      return;
    }

    setError(undefined);
    setState("loading");
    try {
      if (onJoin) await onJoin(normalizedEmail);
      else await new Promise((resolve) => setTimeout(resolve, 700));
      setState("success");
    } catch {
      setError("Couldn’t join right now. Please try again.");
      setState("error");
    }
  };

  return (
    <section
      className={cn(
        "relative isolate min-h-[860px] w-full overflow-hidden bg-background px-4 pt-14 text-foreground sm:pt-16",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[58%] bg-[radial-gradient(ellipse_at_bottom,var(--accent)_0%,transparent_66%)] opacity-20"
      />

      <motion.div
        initial={
          reduceMotion
            ? false
            : { opacity: 0, transform: "translateY(14px)", filter: "blur(6px)" }
        }
        animate={{
          opacity: 1,
          transform: "translateY(0px)",
          filter: "blur(0px)",
        }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: 0.55, ease: EASE_OUT }
        }
        className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center"
      >
        <a
          href="/"
          aria-label={`${brand} home`}
          className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Link2 aria-hidden className="size-6" />
        </a>

        <h1 className="mt-6 text-balance tracking-tight text-4xl md:text-5xl font-medium">
          {title}
        </h1>
        <p className="mt-3 max-w-md text-pretty text-muted-foreground text-sm leading-6 sm:text-base">
          {description}
        </p>

        <form onSubmit={submit} noValidate className="mt-6 w-full max-w-xl">
          <div className="flex items-center gap-2">
            <label htmlFor={`${errorId}-email`} className="sr-only">
              Email address
            </label>
            <Input
              id={`${errorId}-email`}
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event);
                setError(undefined);
                if (state !== "idle") setState("idle");
              }}
              placeholder="Your email address"
              error={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className="w-full min-w-0 flex-1"
              classNames={{
                input: "text-base placeholder:text-muted-foreground sm:text-sm",
              }}
            />
            <StatefulButton
              type="submit"
              state={state}
              size="lg"
              loadingText="Joining"
              successText="You’re in"
              errorText="Try again"
              className="shrink-0 px-5 text-sm rounded-full h-9"
            >
              Join waitlist
            </StatefulButton>
          </div>
          <p
            id={errorId}
            aria-live="polite"
            className={cn(
              "mt-2 min-h-5 text-xs",
              error ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {error ?? "No spam. We’ll only email when access is ready."}
          </p>
        </form>

        <div className="mt-4 flex items-center gap-3">
          <AvatarStack />
          <span className="text-muted-foreground text-xs sm:text-sm">
            {socialProof}
          </span>
        </div>

        <div className="mt-6">
          <Countdown totalSeconds={remaining} />
        </div>
      </motion.div>

      <div className="relative z-10 mx-auto max-w-xl">
        <ProductPreview />
      </div>

      <span className="sr-only" aria-live="polite">
        {state === "success" ? "You joined the waitlist." : null}
      </span>
    </section>
  );
}
