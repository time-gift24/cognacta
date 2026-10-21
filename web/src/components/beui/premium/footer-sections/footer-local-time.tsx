"use client";

import { ArrowUpRight, Compass } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type FooterLocalTimeLink = {
  label: string;
  href: string;
  external?: boolean;
};
export type FooterLocalTimeProps = {
  brand?: string;
  brandHref?: string;
  logo?: ReactNode;
  description?: string;
  city?: string;
  /** An IANA time zone, such as Asia/Kolkata. */
  timeZone?: string;
  columns?: { title: string; links: FooterLocalTimeLink[] }[];
  legalLinks?: FooterLocalTimeLink[];
  copyright?: string;
  className?: string;
};
const defaultColumns = [
  {
    title: "Explore",
    links: [
      { label: "Selected work", href: "/work" },
      { label: "Our approach", href: "/about" },
      { label: "Notes", href: "/journal" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Email us", href: "mailto:hello@example.com" },
      { label: "Instagram", href: "https://instagram.com", external: true },
      { label: "LinkedIn", href: "https://linkedin.com", external: true },
    ],
  },
];
const defaultLegal = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export function FooterLocalTime({
  brand = "Dayform",
  brandHref = "/",
  logo = <Compass className="size-6" strokeWidth={1.5} />,
  description = "Independent minds, shared direction. We build thoughtful digital experiences for everyday life.",
  city = "Copenhagen",
  timeZone = "Europe/Copenhagen",
  columns = defaultColumns,
  legalLinks = defaultLegal,
  copyright,
  className,
}: FooterLocalTimeProps) {
  const reduce = useReducedMotion();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  const parts = now
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).formatToParts(now)
    : [];
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const second = parts.find((part) => part.type === "second")?.value ?? "00";
  const date = now
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone,
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(now)
    : "Local time";
  return (
    <footer
      className={cn(
        "w-full bg-background px-6 py-8 text-foreground sm:px-10 sm:py-12",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
          className="grid gap-10 pb-10 md:grid-cols-2 md:gap-20"
        >
          <div>
            <a
              href={brandHref}
              className="inline-flex min-h-10 items-center gap-3 rounded-full text-xl font-medium tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <span aria-hidden>{logo}</span>
              {brand}
            </a>
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="mb-3 text-xs font-medium text-muted-foreground">
                  {column.title}
                </h2>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <LocalLink link={link} />
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </motion.div>
        <div className="flex flex-col gap-6 border-y border-border py-7 sm:flex-row sm:items-center sm:justify-between sm:py-9">
          <div className="flex items-center gap-4">
            <svg
              aria-hidden="true"
              viewBox="0 0 64 64"
              className="size-14 shrink-0 text-foreground"
            >
              <circle
                cx="32"
                cy="32"
                r="29"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.15"
              />
              {[0, 90, 180, 270].map((angle) => (
                <path
                  key={angle}
                  d="M32 7v4"
                  stroke="currentColor"
                  strokeOpacity="0.4"
                  transform={`rotate(${angle} 32 32)`}
                />
              ))}
              <path
                d="M32 32V18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                transform={`rotate(${(Number(hour) % 12) * 30 + Number(minute) * 0.5} 32 32)`}
              />
              <path
                d="M32 32V12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                transform={`rotate(${Number(minute) * 6} 32 32)`}
              />
              <circle cx="32" cy="32" r="2" fill="currentColor" />
            </svg>
            <div>
              <p className="text-sm font-medium">{city}</p>
              <p className="mt-1 text-xs text-muted-foreground">{date}</p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground sm:text-right">
              A moment in our corner of the world
            </p>
            <time
              dateTime={now?.toISOString()}
              className="flex items-baseline font-mono text-5xl font-normal tracking-tight tabular-nums sm:text-6xl"
            >
              {now ? hour : "--"}
              <span className="px-1 text-muted-foreground">:</span>
              {now ? minute : "--"}
              <span className="ml-3 text-2xl text-muted-foreground">
                {now ? second : "--"}
              </span>
            </time>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-5 text-xs text-muted-foreground">
          <p>{copyright ?? `© 2026 ${brand}. Made with intention.`}</p>
          <nav aria-label="Legal" className="flex gap-5">
            {legalLinks.map((link) => (
              <LocalLink key={link.label} link={link} small />
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
function LocalLink({
  link,
  small = false,
}: {
  link: FooterLocalTimeLink;
  small?: boolean;
}) {
  return (
    <a
      href={link.href}
      {...(link.external
        ? { target: "_blank", rel: "noreferrer noopener" }
        : {})}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        small ? "text-xs" : "text-sm",
      )}
    >
      {link.label}
      {link.external ? <ArrowUpRight aria-hidden className="size-3.5" /> : null}
    </a>
  );
}
