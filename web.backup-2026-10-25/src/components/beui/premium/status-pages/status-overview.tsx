"use client";

import { ArrowUpRight, Clock3 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type FormEvent, useId, useMemo, useState } from "react";
import {
  AnimatedBadge,
  type AnimatedBadgeStatus,
} from "@/components/beui/motion/animated-badge";
import { type ButtonState, StatefulButton } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HISTORY_LENGTH = 42;

export type ServiceStatus =
  | "operational"
  | "degraded"
  | "maintenance"
  | "outage";

export type StatusService = {
  name: string;
  description: string;
  uptime: string;
  status: ServiceStatus;
  history: ServiceStatus[];
};

export type StatusIncident = {
  date: string;
  title: string;
  description: string;
  duration: string;
  status: "resolved" | "monitoring";
};

export type StatusOverviewProps = {
  supportHref?: string;
  overallStatus?: ServiceStatus;
  title?: string;
  description?: string;
  lastUpdated?: string;
  services?: readonly StatusService[];
  incidents?: readonly StatusIncident[];
  onSubscribe?: (email: string) => void | Promise<void>;
  className?: string;
};

const STATUS_META: Record<
  ServiceStatus,
  { label: string; badge: AnimatedBadgeStatus; bar: string }
> = {
  operational: {
    label: "Operational",
    badge: "success",
    bar: "bg-success/70",
  },
  degraded: {
    label: "Degraded",
    badge: "warning",
    bar: "bg-warning/75",
  },
  maintenance: {
    label: "Maintenance",
    badge: "info",
    bar: "bg-accent/70",
  },
  outage: {
    label: "Outage",
    badge: "danger",
    bar: "bg-destructive/75",
  },
};

function statusHistory(overrides: Partial<Record<number, ServiceStatus>> = {}) {
  return Array.from(
    { length: HISTORY_LENGTH },
    (_, index) => overrides[index] ?? "operational",
  );
}

const DEFAULT_SERVICES: StatusService[] = [
  {
    name: "Core API",
    description: "Requests, authentication, and webhooks",
    uptime: "99.99%",
    status: "operational",
    history: statusHistory({ 8: "degraded" }),
  },
  {
    name: "Dashboard",
    description: "Web application and account management",
    uptime: "100%",
    status: "operational",
    history: statusHistory(),
  },
  {
    name: "Background jobs",
    description: "Queues, scheduled work, and exports",
    uptime: "99.97%",
    status: "operational",
    history: statusHistory({ 26: "maintenance" }),
  },
  {
    name: "Edge network",
    description: "Global routing and asset delivery",
    uptime: "99.98%",
    status: "operational",
    history: statusHistory({ 17: "degraded", 18: "degraded" }),
  },
];

const DEFAULT_INCIDENTS: StatusIncident[] = [
  {
    date: "Sep 03",
    title: "Elevated API response times",
    description:
      "A routing issue increased latency for a subset of requests in US East. Traffic was shifted and performance returned to normal.",
    duration: "Resolved in 24 minutes",
    status: "resolved",
  },
  {
    date: "Aug 27",
    title: "Scheduled database maintenance",
    description:
      "Routine maintenance completed without customer-facing downtime.",
    duration: "Completed in 18 minutes",
    status: "resolved",
  },
];

function ServiceHistory({ service }: { service: StatusService }) {
  const days = service.history.length;

  return (
    <div
      role="img"
      aria-label={`${service.name}: ${service.uptime} uptime over the last ${days} days`}
      className="flex h-7 min-w-0 items-stretch gap-0.5"
    >
      {service.history.map((status, index) => (
        <span
          // The day index is stable within the fixed-length history series.
          key={`${service.name}-${index}`}
          title={`${days - index} days ago: ${STATUS_META[status].label}`}
          aria-hidden="true"
          className={cn("min-w-0 flex-1 rounded-full", STATUS_META[status].bar)}
        />
      ))}
    </div>
  );
}

export function StatusOverview({
  supportHref = "mailto:support@example.com",
  overallStatus = "operational",
  title = "All systems operational",
  description = "Every service is running normally. We continuously monitor performance across our global network.",
  lastUpdated = "Updated 2 minutes ago",
  services = DEFAULT_SERVICES,
  incidents = DEFAULT_INCIDENTS,
  onSubscribe,
  className,
}: StatusOverviewProps) {
  const reduceMotion = useReducedMotion();
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const overall = STATUS_META[overallStatus];

  const overallUptime = useMemo(() => {
    const values = services
      .map((service) => Number.parseFloat(service.uptime))
      .filter(Number.isFinite);
    const total = values.reduce((sum, value) => sum + value, 0);

    return values.length > 0 ? `${(total / values.length).toFixed(2)}%` : "—";
  }, [services]);
  const historyDays =
    services.reduce(
      (longest, service) => Math.max(longest, service.history.length),
      0,
    ) || HISTORY_LENGTH;
  const resolvedIncidents = incidents.filter(
    (incident) => incident.status === "resolved",
  ).length;
  const activeIncidents = incidents.length - resolvedIncidents;

  const reveal = (delay = 0, distance = 16) => ({
    initial: reduceMotion
      ? false
      : {
          opacity: 0,
          transform: `translateY(${distance}px)`,
          filter: "blur(6px)",
        },
    whileInView: {
      opacity: 1,
      transform: "translateY(0px)",
      filter: "blur(0px)",
    },
    viewport: { once: true, margin: "-48px" },
    transition: reduceMotion
      ? { duration: 0 }
      : { duration: 0.55, ease: EASE_OUT, delay },
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
      <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <motion.header {...reveal()} className="max-w-3xl">
          <AnimatedBadge status={overall.badge} size="md" pulse={false}>
            {overall.label}
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
              {lastUpdated}
            </span>
            <a
              href={supportHref}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Contact support
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </motion.header>

        <motion.section
          {...reveal(0.08)}
          aria-labelledby="uptime-heading"
          className="mt-12 overflow-hidden rounded-3xl border border-border"
        >
          <div className="flex flex-col justify-between gap-4 border-border border-b px-5 py-5 sm:flex-row sm:items-end sm:px-7">
            <div>
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-[0.14em]">
                Last {historyDays} days
              </p>
              <h2 id="uptime-heading" className="mt-1 text-4xl font-medium">
                Service uptime
              </h2>
            </div>
            <div className="sm:text-right">
              <p className="font-semibold text-2xl tabular-nums">
                {overallUptime}
              </p>
              <p className="text-muted-foreground text-xs">Average uptime</p>
            </div>
          </div>

          <div className="divide-y divide-border">
            {services.map((service) => {
              const status = STATUS_META[service.status];

              return (
                <article key={service.name} className="px-5 py-5 sm:px-7">
                  <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(180px,0.7fr)_minmax(260px,1.4fr)_auto] lg:items-center lg:gap-7">
                    <div className="min-w-0">
                      <h3 className="text-xl font-medium">{service.name}</h3>
                      <p className="mt-1 truncate text-muted-foreground text-xs">
                        {service.description}
                      </p>
                    </div>
                    <ServiceHistory service={service} />
                    <div className="flex items-center justify-between gap-4 lg:min-w-36 lg:justify-end">
                      <span className="font-mono text-muted-foreground text-xs tabular-nums">
                        {service.uptime}
                      </span>
                      <AnimatedBadge
                        status={status.badge}
                        size="sm"
                        pulse={false}
                      >
                        {status.label}
                      </AnimatedBadge>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          {...reveal(0.12)}
          id="incident-history"
          aria-labelledby="incident-heading"
          className="mt-14 scroll-mt-24"
        >
          <div className="flex items-end justify-between gap-4 border-border border-b pb-4">
            <div>
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-[0.14em]">
                Past 14 days
              </p>
              <h2 id="incident-heading" className="mt-1 text-4xl font-medium">
                Incident history
              </h2>
            </div>
            <span className="hidden text-muted-foreground text-xs sm:block">
              {resolvedIncidents} resolved · {activeIncidents} active
            </span>
          </div>

          <div className="divide-y divide-border">
            {incidents.length > 0 ? (
              incidents.map((incident) => (
                <article
                  key={`${incident.date}-${incident.title}`}
                  className="grid gap-3 py-6 sm:grid-cols-[80px_minmax(0,1fr)_auto] sm:gap-5"
                >
                  <time className="font-mono text-muted-foreground text-xs tabular-nums">
                    {incident.date}
                  </time>
                  <div>
                    <h3 className="text-xl font-medium">{incident.title}</h3>
                    <p className="mt-2 max-w-2xl text-muted-foreground text-sm leading-6">
                      {incident.description}
                    </p>
                    <p className="mt-3 text-muted-foreground text-xs">
                      {incident.duration}
                    </p>
                  </div>
                  <AnimatedBadge
                    status={incident.status === "resolved" ? "success" : "info"}
                    size="sm"
                    pulse={false}
                    className="w-fit self-start"
                  >
                    {incident.status === "resolved" ? "Resolved" : "Monitoring"}
                  </AnimatedBadge>
                </article>
              ))
            ) : (
              <p className="py-8 text-muted-foreground text-sm">
                No incidents reported during this period.
              </p>
            )}
          </div>
        </motion.section>

        <motion.section
          {...reveal(0.16)}
          id="subscribe"
          aria-labelledby="subscribe-heading"
          className="mt-14 scroll-mt-24 rounded-3xl border border-border px-5 py-7 sm:px-8 sm:py-8"
        >
          <div className="grid gap-6 md:grid-cols-[minmax(0,0.8fr)_minmax(320px,1.2fr)] md:items-center md:gap-10">
            <div>
              <h2 id="subscribe-heading" className="text-4xl font-medium">
                Get status updates
              </h2>
              <p className="mt-2 text-muted-foreground text-sm leading-6">
                Receive one concise email when an incident opens or resolves.
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
                    input: "px-4 text-sm placeholder:text-muted-foreground",
                  }}
                />
                <StatefulButton
                  type="submit"
                  state={buttonState}
                  size="md"
                  loadingText="Subscribing"
                  successText="Subscribed"
                  errorText="Try again"
                  className="shrink-0 rounded-full h-9"
                >
                  Subscribe
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
                    ? "You’ll receive the next service update."
                    : "No newsletters. Unsubscribe anytime.")}
              </p>
            </form>
          </div>
        </motion.section>
      </main>
    </section>
  );
}
