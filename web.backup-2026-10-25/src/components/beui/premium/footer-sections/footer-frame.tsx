"use client";

import { ArrowUpRight, Orbit } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { GithubIcon } from "../auth/social-icons";

export type FooterFrameLink = {
  label: string;
  href: string;
  external?: boolean;
};
export type FooterFrameProps = {
  brand?: string;
  brandHref?: string;
  logo?: ReactNode;
  description?: string;
  columns?: { title: string; links: FooterFrameLink[] }[];
  legalLinks?: FooterFrameLink[];
  socialLinks?: (FooterFrameLink & { icon: ReactNode })[];
  copyright?: string;
  credit?: ReactNode;
  className?: string;
};
const columnsDefault = [
  {
    title: "Workspace",
    links: [
      { label: "Projects", href: "/projects" },
      { label: "Team spaces", href: "/teams" },
      { label: "Integrations", href: "/integrations" },
      { label: "Plans & pricing", href: "/pricing" },
    ],
  },
  {
    title: "Discover",
    links: [
      { label: "Our story", href: "/about" },
      { label: "Customer stories", href: "/customers" },
      { label: "What’s new", href: "/changelog" },
      { label: "Journal", href: "/journal" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Getting started", href: "/docs" },
      { label: "Help center", href: "/help" },
      { label: "Community", href: "/community" },
      { label: "Contact us", href: "mailto:hello@example.com" },
    ],
  },
];
const legalDefault = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Accessibility", href: "/accessibility" },
];
const socialsDefault = [
  {
    label: "GitHub",
    href: "https://github.com",
    external: true,
    icon: <GithubIcon className="size-4" />,
  },
];

export function FooterFrame({
  brand = "Waymark",
  brandHref = "/",
  logo = <Orbit className="size-7" strokeWidth={1.5} />,
  description = "A calmer place to plan your work and keep good ideas moving.",
  columns = columnsDefault,
  legalLinks = legalDefault,
  socialLinks = socialsDefault,
  copyright,
  credit = "Made for a little more focus.",
  className,
}: FooterFrameProps) {
  const reduce = useReducedMotion();
  return (
    <footer
      className={cn(
        "relative isolate w-full overflow-hidden p-3 text-foreground sm:p-5 lg:p-8",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(115deg,#b7d3ec_0%,#e6edf7_45%,#b3e8d9_100%)] dark:opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-1/4 -top-full -z-10 h-[180%] w-[150%] rotate-12 rounded-full bg-background/25"
      />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
        className="mx-auto max-w-7xl rounded-3xl bg-background px-6 pt-8 sm:px-10 sm:pt-10 lg:px-12 lg:pt-12"
      >
        <div className="grid gap-10 pb-10 lg:grid-cols-[1.2fr_2.8fr] lg:gap-16 lg:pb-12">
          <div>
            <a
              href={brandHref}
              className="inline-flex min-h-10 items-center gap-3 rounded-full text-xl font-medium tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <span aria-hidden className="text-primary">
                {logo}
              </span>
              {brand}
            </a>
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 sm:gap-x-10">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {column.title}
                </h2>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <FrameLink link={link} />
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 border-t border-border py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <p>{copyright ?? `© 2026 ${brand}`}</p>
            <nav aria-label="Legal" className="flex flex-wrap gap-x-5">
              {legalLinks.map((link) => (
                <FrameLink key={link.label} link={link} small />
              ))}
            </nav>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">{credit}</span>
            <nav aria-label="Social links" className="flex gap-2">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  {...externalProps(link)}
                  aria-label={link.label}
                  title={link.label}
                  className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span aria-hidden>{link.icon}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>
      </motion.div>
    </footer>
  );
}
function externalProps(link: FooterFrameLink) {
  return link.external ? { target: "_blank", rel: "noreferrer noopener" } : {};
}
function FrameLink({
  link,
  small = false,
}: {
  link: FooterFrameLink;
  small?: boolean;
}) {
  return (
    <a
      href={link.href}
      {...externalProps(link)}
      className={cn(
        "inline-flex min-h-10 items-center gap-1 rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        small ? "text-xs" : "text-sm",
      )}
    >
      {link.label}
      {link.external ? <ArrowUpRight aria-hidden className="size-3.5" /> : null}
    </a>
  );
}
