"use client";

import { ArrowUpRight, Clock3, MapPin, Radio, ShieldAlert } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type FormEvent, useId, useState } from "react";
import {
  AnimatedBadge,
  type AnimatedBadgeStatus,
} from "@/components/beui/motion/animated-badge";
import { type ButtonState, StatefulButton } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type IncidentUpdateState = "investigating" | "identified" | "monitoring";

export type IncidentUpdate = {
  time: string;
  state: IncidentUpdateState;
  title: string;
  description: string;
};

export type ImpactedService = {
  name: string;
  detail: string;
  status: "degraded" | "operational";
};

export type StatusIncidentProps = {
  title?: string;
  description?: string;
  startedAt?: string;
  lastUpdated?: string;
  nextUpdate?: string;
  supportHref?: string;
  regions?: readonly string[];
  updates?: readonly IncidentUpdate[];
  services?: readonly ImpactedService[];
  onSubscribe?: (email: string) => void | Promise<void>;
  className?: string;
};

const UPDATE_META: Record<
  IncidentUpdateState,
  { label: string; badge: AnimatedBadgeStatus }
> = {
  investigating: { label: "Investigating", badge: "danger" },
  identified: { label: "Identified", badge: "warning" },
  monitoring: { label: "Monitoring", badge: "info" },
};

const DEFAULT_UPDATES: IncidentUpdate[] = [
  {
    time: "10:42 UTC",
    state: "monitoring",
    title: "Queue times are returning to normal",
    description:
      "Additional capacity is online and response latency continues to improve. We are monitoring recovery before resolving the incident.",
  },
  {
    time: "10:18 UTC",
    state: "identified",
    title: "Capacity issue identified",
    description:
      "A traffic spike exhausted available inference capacity in two regions. Requests are being redistributed across healthy regions.",
  },
  {
    time: "09:57 UTC",
    state: "investigating",
    title: "Elevated response times detected",
    description:
      "Some agent runs are taking longer than expected. Successful responses are unaffected and no customer data is at risk.",
  },
];

const DEFAULT_SERVICES: ImpactedService[] = [
  {
    name: "Agent runtime",
    detail: "Elevated queue time",
    status: "degraded",
  },
  {
    name: "Inference API",
    detail: "Intermittent latency",
    status: "degraded",
  },
  {
    name: "Dashboard",
    detail: "Operating normally",
    status: "operational",
  },
  {
    name: "Authentication",
    detail: "Operating normally",
    status: "operational",
  },
];

export function StatusIncident({
  title = "Agent responses are delayed",
  description = "We’re investigating elevated queue times affecting a subset of agent runs. Requests remain safe and continue to process.",
  startedAt = "Started 45 minutes ago",
  lastUpdated = "Updated 3 minutes ago",
  nextUpdate = "Within 20 minutes",
  supportHref = "mailto:support@example.com",
  regions = ["US East", "Europe West"],
  updates = DEFAULT_UPDATES,
  services = DEFAULT_SERVICES,
  onSubscribe,
  className,
}: StatusIncidentProps) {
  const reduceMotion = useReducedMotion();
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [buttonState, setButtonState] = useState<ButtonState>("idle");

  const reveal = (delay = 0, distance = 14) => ({
    initial: reduceMotion
      ? false
      : {
          opacity: 0,
          transform: `translateY(${distance}px)`,
          filter: "blur(5px)",
        },
    whileInView: {
      opacity: 1,
      transform: "translateY(0px)",
      filter: "blur(0px)",
    },
    viewport: { once: true, margin: "-48px" },
    transition: reduceMotion
      ? { duration: 0 }
      : { duration: 0.5, delay, ease: EASE_OUT },
  });

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
      if (onSubscribe) await onSubscribe(normalizedEmail);
      else await new Promise((resolve) => setTimeout(resolve, 650));
      setButtonState("success");
    } catch {
      setError("Couldn’t subscribe right now. Try again.");
      setButtonState("error");
    }
  };

  return (
    <section
      className={cn(
        "min-h-screen w-full bg-background text-foreground",
        className,
      )}
    >
      <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <motion.header {...reveal()} className="max-w-3xl">
          <AnimatedBadge status="warning" size="md" pulse>
            Partial service disruption
          </AnimatedBadge>
          <h1 className="mt-6 text-balance tracking-tight text-4xl md:text-5xl font-medium">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-muted-foreground leading-7 sm:text-lg">
            {description}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-muted-foreground text-sm">
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-4" />
              {startedAt}
            </span>
            <span>{lastUpdated}</span>
            <a
              href={supportHref}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Contact support
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </motion.header>

        <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.75fr)]">
          <motion.section
            {...reveal(0.08)}
            aria-labelledby="live-updates-heading"
            className="overflow-hidden rounded-3xl border border-border"
          >
            <div className="flex items-center justify-between gap-4 border-border border-b px-5 py-5 sm:px-7">
              <div>
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-[0.14em]">
                  Incident timeline
                </p>
                <h2
                  id="live-updates-heading"
                  className="mt-1 text-4xl font-medium"
                >
                  Live updates
                </h2>
              </div>
              <span className="inline-flex items-center gap-2 text-muted-foreground text-xs">
                <Radio className="size-3.5" />
                Live
              </span>
            </div>

            <div className="divide-y divide-border">
              {updates.map((update, index) => {
                const meta = UPDATE_META[update.state];

                return (
                  <motion.article
                    key={`${update.time}-${update.title}`}
                    {...reveal(0.1 + index * 0.05, 10)}
                    className="grid gap-3 px-5 py-6 sm:grid-cols-[90px_minmax(0,1fr)] sm:gap-5 sm:px-7"
                  >
                    <time className="font-mono text-muted-foreground text-xs tabular-nums">
                      {update.time}
                    </time>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-medium text-xl">{update.title}</h3>
                        <AnimatedBadge
                          status={meta.badge}
                          size="sm"
                          pulse={update.state === "monitoring"}
                        >
                          {meta.label}
                        </AnimatedBadge>
                      </div>
                      <p className="mt-2 max-w-2xl text-pretty text-muted-foreground text-sm leading-6">
                        {update.description}
                      </p>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </motion.section>

          <motion.aside
            {...reveal(0.12)}
            aria-labelledby="impact-heading"
            className="rounded-3xl border border-border p-5 sm:p-7"
          >
            <div className="flex size-10 items-center justify-center rounded-full border border-border">
              <ShieldAlert className="size-4.5" />
            </div>
            <p className="mt-6 font-mono text-xs text-muted-foreground uppercase tracking-[0.14em]">
              Current incident
            </p>
            <h2 id="impact-heading" className="mt-1 text-4xl font-medium">
              Customer impact
            </h2>

            <dl className="mt-6 divide-y divide-border border-border border-y">
              <div className="py-4">
                <dt className="text-muted-foreground text-xs">Severity</dt>
                <dd className="mt-1 font-medium text-sm">
                  Degraded performance
                </dd>
              </div>
              <div className="py-4">
                <dt className="text-muted-foreground text-xs">
                  Affected regions
                </dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {regions.map((region) => (
                    <span
                      key={region}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs"
                    >
                      <MapPin className="size-3" />
                      {region}
                    </span>
                  ))}
                </dd>
              </div>
              <div className="py-4">
                <dt className="text-muted-foreground text-xs">Next update</dt>
                <dd className="mt-1 font-medium text-sm">{nextUpdate}</dd>
              </div>
            </dl>
          </motion.aside>
        </div>

        <motion.section
          {...reveal(0.16)}
          aria-labelledby="service-health-heading"
          className="mt-12"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-[0.14em]">
                Right now
              </p>
              <h2
                id="service-health-heading"
                className="mt-1 text-4xl font-medium"
              >
                Service health
              </h2>
            </div>
            <span className="hidden text-muted-foreground text-xs sm:block">
              {
                services.filter((service) => service.status === "degraded")
                  .length
              }{" "}
              affected
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service, index) => {
              const degraded = service.status === "degraded";

              return (
                <motion.article
                  key={service.name}
                  {...reveal(0.18 + index * 0.04, 8)}
                  className="rounded-2xl border border-border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium text-xl">{service.name}</h3>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-1 size-2 shrink-0 rounded-full",
                        degraded ? "bg-warning" : "bg-success",
                      )}
                    />
                  </div>
                  <p className="mt-2 text-muted-foreground text-xs">
                    {service.detail}
                  </p>
                  <AnimatedBadge
                    status={degraded ? "warning" : "success"}
                    size="sm"
                    pulse={false}
                    className="mt-4"
                  >
                    {degraded ? "Degraded" : "Operational"}
                  </AnimatedBadge>
                </motion.article>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          {...reveal(0.2)}
          aria-labelledby="incident-subscribe-heading"
          className="mt-12 rounded-3xl border border-border px-5 py-6 sm:px-7"
        >
          <div className="grid gap-6 md:grid-cols-[minmax(0,0.8fr)_minmax(320px,1.2fr)] md:items-center md:gap-10">
            <div>
              <h2
                id="incident-subscribe-heading"
                className="text-4xl font-medium"
              >
                Follow this incident
              </h2>
              <p className="mt-2 text-muted-foreground text-sm leading-6">
                Get one email when a new update is published.
              </p>
            </div>

            <form onSubmit={submit} noValidate>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor={emailId} className="sr-only">
                  Email address
                </label>
                <Input
                  id={emailId}
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event);
                    setError(undefined);
                    if (buttonState !== "idle") setButtonState("idle");
                  }}
                  placeholder="you@company.com"
                  autoComplete="email"
                  error={Boolean(error)}
                  aria-describedby={`${emailId}-message`}
                  className="w-full min-w-0 flex-1"
                  classNames={{
                    input:
                      "px-4 text-base placeholder:text-muted-foreground sm:text-sm",
                  }}
                />
                <StatefulButton
                  type="submit"
                  state={buttonState}
                  size="md"
                  loadingText="Following"
                  successText="Following"
                  errorText="Try again"
                  className="shrink-0 rounded-full h-9"
                >
                  Follow updates
                </StatefulButton>
              </div>
              <p
                id={`${emailId}-message`}
                aria-live="polite"
                className={cn(
                  "mt-2 min-h-5 text-xs",
                  error ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {error ??
                  (buttonState === "success"
                    ? "You’ll receive the next incident update."
                    : "No newsletters. Unsubscribe anytime.")}
              </p>
            </form>
          </div>
        </motion.section>
      </main>
    </section>
  );
}
