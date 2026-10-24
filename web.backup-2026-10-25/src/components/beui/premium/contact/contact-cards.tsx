"use client";

import { ArrowUpRight, Briefcase, LifeBuoy, Users } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/beui/motion/button";
import { EASE_OUT, SPRING_BOUNCE } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type ContactCardsProps = {
  eyebrow?: string;
  title?: string;
  subtext?: string;
  email?: string;
  className?: string;
};

const METHODS = [
  {
    icon: Briefcase,
    title: "Talk to sales",
    body: "Pricing, demos, and procurement for teams.",
    action: "Contact sales",
    href: "/",
  },
  {
    icon: LifeBuoy,
    title: "Get support",
    body: "Bugs, account issues, and integration help.",
    action: "Open a ticket",
    href: "/",
  },
  {
    icon: Users,
    title: "Join the community",
    body: "Chat with builders and share what you ship.",
    action: "Join Discord",
    href: "/",
  },
];

const TEAM = ["Maya", "Dev", "Lior", "Ana"];

export function ContactCards({
  eyebrow = "Contact",
  title = "How can we help?",
  subtext = "Pick the lane that fits — sales, support, or community. Real humans, fast replies.",
  email = "hello@beui.dev",
  className,
}: ContactCardsProps) {
  const reduce = useReducedMotion();

  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-20 text-foreground sm:px-8",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl">
        {/* Header. */}
        <div className="mx-auto max-w-xl text-center">
          {eyebrow ? (
            <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 font-medium text-muted-foreground text-xs">
              {eyebrow}
            </span>
          ) : null}
          <h2 className="mt-5 text-balance font-sans text-foreground leading-[1.1] text-4xl font-medium">
            {title}
          </h2>
          {subtext ? (
            <p className="mx-auto mt-4 max-w-md text-pretty text-muted-foreground text-sm leading-7">
              {subtext}
            </p>
          ) : null}
        </div>

        {/* Method cards. */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {METHODS.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.a
                key={m.title}
                href={m.href}
                initial={reduce ? false : { opacity: 0, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={
                  reduce
                    ? undefined
                    : { duration: 0.5, ease: EASE_OUT, delay: i * 0.08 }
                }
                className="group relative flex flex-col rounded-3xl border border-border bg-background p-6 transition-colors duration-200 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="grid size-11 place-items-center bg-muted text-muted-foreground transition-colors duration-300 group-hover:text-foreground rounded-full">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-foreground text-xl font-medium">
                  {m.title}
                </h3>
                <p className="mt-1.5 flex-1 text-pretty text-muted-foreground text-sm leading-6">
                  {m.body}
                </p>
                <span className="mt-5 inline-flex items-center gap-1 font-medium text-foreground text-sm">
                  {m.action}
                  <ArrowUpRight className="size-4 " />
                </span>
              </motion.a>
            );
          })}
        </div>

        {/* Featured "talk to us" strip. */}
        <div className="mt-4 flex flex-col items-center justify-between gap-6 rounded-3xl border border-border bg-background p-6 lg:flex-row sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex">
              {TEAM.map((seed, i) => (
                // biome-ignore lint/performance/noImgElement: small remote SVG avatar
                <motion.img
                  key={seed}
                  src={`https://api.dicebear.com/10.x/notionists/svg?seed=${seed}`}
                  alt=""
                  aria-hidden
                  initial={reduce ? false : { opacity: 0, scale: 0.5, x: -6 }}
                  whileInView={{ opacity: 1, scale: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { ...SPRING_BOUNCE, delay: 0.1 + i * 0.07 }
                  }
                  className="-ml-2 size-9 rounded-full bg-muted ring-2 ring-background first:ml-0"
                />
              ))}
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">
                Prefer to talk it through?
              </p>
              <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <span className="relative flex size-1.5">
                  {!reduce ? (
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/70" />
                  ) : null}
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                </span>
                Book a 30-min call · avg reply &lt; 2h
              </p>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-auto sm:flex-row">
            <ButtonLink
              href="/"
              size="md"
              className="flex-1 sm:flex-none rounded-full h-9"
            >
              Book a demo
            </ButtonLink>
            <ButtonLink
              href={`mailto:${email}`}
              variant="outline"
              size="md"
              className="flex-1 sm:flex-none rounded-full h-9"
            >
              {email}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
