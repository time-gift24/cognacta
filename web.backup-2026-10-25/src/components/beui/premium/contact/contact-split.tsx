"use client";

import {
  ArrowUpRight,
  Calendar,
  Mail,
  MessageCircle,
  Send,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useState } from "react";
import {
  Button,
  type ButtonState,
  StatefulButton,
} from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { EASE_OUT, SPRING_BOUNCE, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type ContactSplitProps = {
  eyebrow?: string;
  title?: string;
  subtext?: string;
  email?: string;
  topics?: string[];
  className?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_TOPICS = ["General", "Sales", "Support", "Partnership"];

const CHANNELS = [
  {
    icon: Mail,
    label: "Email us",
    value: "hello@beui.dev",
    href: "mailto:hello@beui.dev",
  },
  {
    icon: MessageCircle,
    label: "Live chat",
    value: "Replies in minutes",
    href: "/",
  },
  {
    icon: Calendar,
    label: "Book a demo",
    value: "30-min walkthrough",
    href: "/",
  },
];

const TEAM = ["Maya", "Dev", "Lior", "Ana"];

export function ContactSplit({
  eyebrow = "Contact",
  title = "Let's build something great.",
  subtext = "Questions, demos, or partnerships — tell us what you need and a human gets back to you fast.",
  email: contactEmail = "hello@beui.dev",
  topics = DEFAULT_TOPICS,
  className,
}: ContactSplitProps) {
  const reduce = useReducedMotion();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [topic, setTopic] = useState(topics[0]);
  const [state, setState] = useState<ButtonState>("idle");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !EMAIL.test(email) || message.trim().length < 4) {
      setState("error");
      return;
    }
    setState("loading");
    setTimeout(() => setState("success"), 1100);
  };

  const clearError = () => {
    if (state === "error") setState("idle");
  };

  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-20 text-foreground sm:px-8",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid overflow-hidden rounded-3xl border border-border bg-background lg:grid-cols-[0.9fr_1.1fr]">
          {/* Info column. */}
          <div className="flex flex-col gap-8 border-border border-b p-6 sm:p-8 lg:border-r lg:border-b-0">
            <div>
              {eyebrow ? (
                <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 font-medium text-muted-foreground text-xs">
                  {eyebrow}
                </span>
              ) : null}
              <h2 className="mt-4 text-balance font-sans text-foreground leading-tight text-4xl font-medium">
                {title}
              </h2>
              {subtext ? (
                <p className="mt-3 text-pretty text-muted-foreground text-sm leading-7">
                  {subtext}
                </p>
              ) : null}
            </div>

            {/* Channels. */}
            <div className="flex flex-col gap-2">
              {CHANNELS.map((ch) => {
                const Icon = ch.icon;
                return (
                  <a
                    key={ch.label}
                    href={ch.icon === Mail ? `mailto:${contactEmail}` : ch.href}
                    className="group flex items-center gap-3 rounded-2xl border border-border bg-background p-3 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="grid size-9 shrink-0 place-items-center bg-muted text-muted-foreground rounded-full">
                      <Icon className="size-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium text-foreground text-sm">
                        {ch.label}
                      </span>
                      <span className="block text-muted-foreground text-xs">
                        {ch.icon === Mail ? contactEmail : ch.value}
                      </span>
                    </span>
                    <ArrowUpRight className="size-4 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
                  </a>
                );
              })}
            </div>

            {/* Team + response time. */}
            <div className="mt-auto flex items-center gap-3">
              <div className="flex">
                {TEAM.map((seed, i) => (
                  // biome-ignore lint/performance/noImgElement: small remote SVG avatar
                  <motion.img
                    key={seed}
                    src={`https://api.dicebear.com/10.x/notionists/svg?seed=${seed}`}
                    alt=" "
                    aria-hidden
                    initial={reduce ? false : { opacity: 0, scale: 0.5, x: -6 }}
                    whileInView={{ opacity: 1, scale: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { ...SPRING_BOUNCE, delay: 0.1 + i * 0.07 }
                    }
                    className="-ml-2 size-8 rounded-full bg-muted ring-2 ring-background first:ml-0"
                  />
                ))}
              </div>
              <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <span className="relative flex size-1.5">
                  {!reduce ? (
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/70" />
                  ) : null}
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                </span>
                Real humans · avg reply &lt; 2h
              </p>
            </div>
          </div>

          {/* Form column. */}
          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait" initial={false}>
              {state === "success" ? (
                <motion.div
                  key="done"
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    reduce ? { duration: 0 } : { duration: 0.4, ease: EASE_OUT }
                  }
                  className="flex h-full min-h-[20rem] flex-col items-center justify-center text-center"
                >
                  <motion.span
                    initial={reduce ? false : { scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={reduce ? { duration: 0 } : SPRING_BOUNCE}
                    className="grid size-14 place-items-center bg-muted text-foreground rounded-full"
                  >
                    <Send className="size-6" />
                  </motion.span>
                  <h3 className="mt-5 font-sans text-foreground text-xl font-medium">
                    Message sent
                  </h3>
                  <p className="mt-2 max-w-xs text-pretty text-muted-foreground text-sm leading-6">
                    Thanks{name.trim() ? `, ${name.trim().split(" ")[0]}` : " "}{" "}
                    — we'll reply to{" "}
                    <span className="text-foreground">{email}</span> shortly.
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={onSubmit}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
                  transition={
                    reduce ? { duration: 0 } : { duration: 0.2, ease: EASE_OUT }
                  }
                  className="flex flex-col gap-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Name"
                      value={name}
                      onChange={(e) => {
                        setName(e);
                        clearError();
                      }}
                      placeholder="Ada Lovelace"
                      error={state === "error" && !name.trim()}
                      className="w-full"
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e);
                        clearError();
                      }}
                      placeholder="you@company.com"
                      error={state === "error" && !EMAIL.test(email)}
                      className="w-full"
                    />
                  </div>

                  {/* Topic segmented chips. */}
                  <div>
                    <span className="mb-1.5 block font-medium text-foreground text-sm">
                      Topic
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {topics.map((t) => {
                        const active = t === topic;
                        return (
                          <Button
                            variant="plain"
                            key={t}
                            type="button"
                            onClick={() => setTopic(t)}
                            aria-pressed={active}
                            className={cn(
                              "relative h-9 rounded-full px-3.5 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              active
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {active ? (
                              <motion.span
                                layoutId="contact-topic-pill"
                                transition={
                                  reduce ? { duration: 0 } : SPRING_LAYOUT
                                }
                                className="absolute inset-0 rounded-full border border-border bg-muted"
                              />
                            ) : null}
                            <span className="relative">{t}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <Field label="Message">
                    <textarea
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        clearError();
                      }}
                      rows={4}
                      placeholder="Tell us a little about what you're building…"
                      aria-invalid={
                        state === "error" && message.trim().length < 4
                      }
                      className={cn(
                        inputClass(
                          state === "error" && message.trim().length < 4,
                        ),
                        "h-auto resize-none rounded-2xl py-3 leading-6",
                      )}
                    />
                  </Field>

                  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <p className="text-muted-foreground/80 text-xs">
                      {state === "error"
                        ? "Add your name, a valid email, and a short message."
                        : `Or email ${contactEmail}`}
                    </p>
                    <StatefulButton
                      type="submit"
                      state={state === "error" ? "idle" : state}
                      size="md"
                      className="rounded-full h-9"
                      loadingText="Sending"
                      successText="Sent"
                    >
                      Send message
                    </StatefulButton>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the field control is passed in as children
    <label className="flex flex-col gap-1.5">
      <span className="font-medium text-foreground text-sm">{label}</span>
      {children}
    </label>
  );
}

function inputClass(invalid: boolean) {
  return cn(
    "h-10 w-full rounded-full border bg-background px-4 text-foreground text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/30",
    invalid ? "border-destructive" : "border-border",
  );
}
