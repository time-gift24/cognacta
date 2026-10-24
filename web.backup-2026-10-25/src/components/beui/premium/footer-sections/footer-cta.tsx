"use client";

import { ArrowUpRight, Globe, Layers } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { GithubIcon } from "../auth/social-icons";

export type FooterCtaLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type FooterCtaProps = {
  brand?: string;
  brandHref?: string;
  logo?: ReactNode;
  subtext?: string;
  /** Primary product navigation. */
  links?: FooterCtaLink[];
  columns?: { title: string; links: FooterCtaLink[] }[];
  socialLinks?: (FooterCtaLink & { icon: ReactNode })[];
  legalLinks?: FooterCtaLink[];
  legal?: string;
  className?: string;
};

const DEFAULT_LINKS: FooterCtaLink[] = [
  { label: "Components", href: "/components" },
  { label: "Templates", href: "/components/categories/templates" },
  { label: "Illustrations", href: "/illustrations" },
  { label: "Pricing", href: "/#pricing" },
];
const DEFAULT_COLUMNS = [
  {
    title: "Resources",
    links: [
      { label: "Installation", href: "/components/installation" },
      { label: "For AI agents", href: "/components/agents" },
      { label: "Changelog", href: "/changelog" },
      { label: "Contact", href: "/contact" },
    ],
  },
];
const DEFAULT_SOCIALS: (FooterCtaLink & { icon: ReactNode })[] = [
  {
    label: "GitHub",
    icon: <GithubIcon className="size-4" />,
    href: "https://github.com/starc007/ui-components",
    external: true,
  },
  {
    label: "beUI Free",
    icon: <Globe className="size-4" />,
    href: "https://beui.dev",
    external: true,
  },
];
const DEFAULT_LEGAL: FooterCtaLink[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

// Retain the original export and install slug for existing consumers.
export function FooterCta({
  brand = "beUI Pro",
  brandHref = "/",
  logo = <Layers className="size-5" strokeWidth={1.5} />,
  subtext = "Thoughtful details for the things you’re building. Components, blocks, and templates, all yours to shape.",
  links = DEFAULT_LINKS,
  columns = DEFAULT_COLUMNS,
  socialLinks = DEFAULT_SOCIALS,
  legalLinks = DEFAULT_LEGAL,
  legal = "© 2026 beUI Pro. All rights reserved.",
  className,
}: FooterCtaProps) {
  const reduce = useReducedMotion();
  const navigation = [{ title: "Explore", links }, ...columns];

  return (
    <footer
      className={cn(
        "w-full bg-background px-4 py-6 text-foreground sm:px-8 sm:py-10",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl">
        <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
          <div className="flex flex-col items-start">
            <a
              href={brandHref}
              className="inline-flex min-h-10 items-center gap-3 rounded-full text-xl font-medium tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <span
                aria-hidden
                className="grid size-10 place-items-center rounded-full border border-border"
              >
                {logo}
              </span>
              {brand}
            </a>
            <p className="mt-5 max-w-xs text-pretty text-sm leading-6 text-muted-foreground">
              {subtext}
            </p>
            <nav
              aria-label="Elsewhere"
              className="mt-6 flex flex-wrap gap-2 lg:mt-auto lg:pt-6"
            >
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  aria-label={link.label}
                  title={link.label}
                  {...(link.external
                    ? { target: "_blank", rel: "noreferrer noopener" }
                    : {})}
                  className="grid size-10 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span aria-hidden>{link.icon}</span>
                </a>
              ))}
            </nav>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-8">
            {navigation.map((column, index) => (
              <motion.nav
                key={column.title}
                aria-label={column.title}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.06,
                  ease: EASE_OUT,
                }}
              >
                <h2 className="mb-3 text-xs font-medium text-muted-foreground">
                  {column.title}
                </h2>
                <ul className="space-y-1">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <FooterLink link={link} />
                    </li>
                  ))}
                </ul>
              </motion.nav>
            ))}
          </div>
        </div>
        <div className="mx-6 flex flex-col gap-3 border-t border-border py-5 sm:mx-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{legal}</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-1">
            {legalLinks.map((link) => (
              <FooterLink key={link.label} link={link} small />
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  link,
  small = false,
}: {
  link: FooterCtaLink;
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
