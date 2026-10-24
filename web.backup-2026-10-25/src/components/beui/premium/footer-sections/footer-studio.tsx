"use client";

import { ArrowUpRight, Asterisk, Mail, MapPin } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { GithubIcon } from "../auth/social-icons";
import { FOOTER_PANORAMA_ART } from "./footer-panorama-art";

export type FooterStudioLink = {
  label: string;
  href: string;
  external?: boolean;
};
export type FooterStudioProps = {
  brand?: string;
  brandHref?: string;
  logo?: ReactNode;
  email?: string;
  introduction?: string;
  availability?: string;
  location?: string;
  locationNote?: string;
  imageSrc?: string;
  imageAlt?: string;
  links?: FooterStudioLink[];
  socialLinks?: (FooterStudioLink & { icon: ReactNode })[];
  legalLinks?: FooterStudioLink[];
  copyright?: string;
  className?: string;
};
const defaultLinks = [
  { label: "Selected work", href: "/work" },
  { label: "The studio", href: "/about" },
  { label: "Our process", href: "/process" },
];
const defaultSocials = [
  {
    label: "Instagram",
    href: "https://instagram.com",
    external: true,
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="size-4"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "GitHub",
    href: "https://github.com",
    external: true,
    icon: <GithubIcon className="size-4" />,
  },
];
const defaultLegal = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export function FooterStudio({
  brand = "Still Studio",
  brandHref = "/",
  logo = <Asterisk className="size-7" strokeWidth={1.5} />,
  email = "hello@still.example",
  introduction = "Good things start with a conversation.",
  availability = "Open for new collaborations",
  location = "By the coast. Working everywhere.",
  locationNote = "A small studio with a wider outlook.",
  imageSrc = FOOTER_PANORAMA_ART,
  imageAlt = "A painted view of coastal cliffs and a quiet blue inlet",
  links = defaultLinks,
  socialLinks = defaultSocials,
  legalLinks = defaultLegal,
  copyright,
  className,
}: FooterStudioProps) {
  const reduce = useReducedMotion();
  return (
    <footer
      className={cn(
        "w-full bg-background px-6 py-8 text-foreground sm:px-10 sm:py-12",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <a
            href={brandHref}
            className="inline-flex min-h-10 items-center gap-2 rounded-full text-xl font-medium tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <span aria-hidden>{logo}</span>
            {brand}
          </a>
          <p className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs text-muted-foreground">
            <span aria-hidden className="size-1.5 rounded-full bg-foreground" />
            {availability}
          </p>
        </div>
        <div className="grid gap-10 py-10 md:grid-cols-[1.6fr_1fr] md:items-end md:gap-16 sm:py-12">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="min-w-0"
          >
            <p className="mb-4 text-sm text-muted-foreground">{introduction}</p>
            <a
              href={`mailto:${email}`}
              className="inline-flex max-w-full items-center gap-3 rounded-lg text-3xl font-medium tracking-tight underline decoration-border underline-offset-8 transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-ring sm:text-4xl"
            >
              <span className="min-w-0 break-all">{email}</span>
              <ArrowUpRight
                aria-hidden
                className="size-7 shrink-0"
                strokeWidth={1.5}
              />
            </a>
            <nav
              aria-label="Studio"
              className="mt-8 flex flex-wrap gap-x-6 gap-y-1"
            >
              {links.map((link) => (
                <StudioLink key={link.label} link={link} />
              ))}
            </nav>
          </motion.div>
          <div className="max-w-sm md:justify-self-end">
            <div className="overflow-hidden rounded-2xl">
              <motion.div
                initial={reduce ? false : { opacity: 0, scale: 1.04 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: EASE_OUT }}
              >
                {/* biome-ignore lint/performance/noImgElement: portable artwork for non-Next.js installations */}
                <img
                  src={imageSrc}
                  alt={imageAlt}
                  loading="lazy"
                  className="aspect-[2/1] w-full object-cover dark:brightness-75"
                />
              </motion.div>
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs">
              <MapPin
                aria-hidden
                className="size-3.5 shrink-0 text-muted-foreground"
              />
              {location}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {locationNote}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-border pt-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <p>{copyright ?? `© 2026 ${brand}`}</p>
            <nav aria-label="Legal" className="flex gap-5">
              {legalLinks.map((link) => (
                <StudioLink key={link.label} link={link} small />
              ))}
            </nav>
          </div>
          <nav aria-label="Social links" className="flex gap-2">
            {[
              ...socialLinks,
              {
                label: "Email",
                href: `mailto:${email}`,
                icon: <Mail className="size-4" />,
              },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                {...externalProps(link)}
                aria-label={link.label}
                title={link.label}
                className="grid size-10 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span aria-hidden>{link.icon}</span>
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
function externalProps(link: FooterStudioLink) {
  return link.external ? { target: "_blank", rel: "noreferrer noopener" } : {};
}
function StudioLink({
  link,
  small = false,
}: {
  link: FooterStudioLink;
  small?: boolean;
}) {
  return (
    <a
      href={link.href}
      {...externalProps(link)}
      className={cn(
        "inline-flex min-h-10 items-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        small ? "text-xs" : "text-sm",
      )}
    >
      {link.label}
    </a>
  );
}
