"use client";

import { Aperture, ArrowUpRight, Mail } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { GithubIcon } from "../auth/social-icons";
import { FOOTER_PANORAMA_ART } from "./footer-panorama-art";

export type FooterPanoramaLink = {
  label: string;
  href: string;
  external?: boolean;
};
export type FooterPanoramaProps = {
  title?: string;
  highlight?: string;
  description?: string;
  primaryAction?: FooterPanoramaLink | null;
  secondaryAction?: FooterPanoramaLink | null;
  brand?: string;
  brandHref?: string;
  logo?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  links?: FooterPanoramaLink[];
  socialLinks?: (FooterPanoramaLink & { icon: ReactNode })[];
  legalLinks?: FooterPanoramaLink[];
  copyright?: string;
  className?: string;
};
const defaultLinks: FooterPanoramaLink[] = [
  { label: "Our approach", href: "/about" },
  { label: "Field notes", href: "/journal" },
  { label: "Say hello", href: "mailto:hello@example.com" },
];
const defaultSocials = [
  {
    label: "GitHub",
    href: "https://github.com",
    external: true,
    icon: <GithubIcon className="size-4" />,
  },
  {
    label: "Email",
    href: "mailto:hello@example.com",
    icon: <Mail className="size-4" />,
  },
];
const defaultLegal = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

export function FooterPanorama({
  title = "A little space for",
  highlight = "your next idea.",
  description = "Bring your curiosity. Find the tools, the people, and the perspective to take it somewhere new.",
  primaryAction = { label: "Explore the collection", href: "/collection" },
  secondaryAction = { label: "Meet the team", href: "/about" },
  brand = "Openfield",
  brandHref = "/",
  logo = <Aperture className="size-7" strokeWidth={1.5} />,
  imageSrc = FOOTER_PANORAMA_ART,
  imageAlt = "Painted coastal cliffs overlooking a quiet inlet in soft morning light",
  links = defaultLinks,
  socialLinks = defaultSocials,
  legalLinks = defaultLegal,
  copyright = "© 2026 Openfield. Room for what’s next.",
  className,
}: FooterPanoramaProps) {
  const reduce = useReducedMotion();
  return (
    <footer
      className={cn(
        "w-full border-t border-border bg-background text-foreground",
        className,
      )}
    >
      <div className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 sm:pt-14">
        <div className="grid gap-6 px-1 pb-9 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-12">
          <div>
            <h2 className="text-balance text-3xl font-normal tracking-tight">
              {title} <span className="text-primary">{highlight}</span>
            </h2>
            <p className="mt-4 max-w-lg text-pretty text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            {primaryAction ? (
              <ButtonLink
                href={primaryAction.href}
                {...externalProps(primaryAction)}
                className="h-9 gap-2 px-4 text-xs"
              >
                {primaryAction.label}
                <ArrowUpRight aria-hidden className="size-4" />
              </ButtonLink>
            ) : null}
            {secondaryAction ? (
              <ButtonLink
                href={secondaryAction.href}
                {...externalProps(secondaryAction)}
                variant="outline"
                className="h-9 gap-2 px-4 text-xs hover:bg-muted"
              >
                {secondaryAction.label}
                <ArrowUpRight aria-hidden className="size-4" />
              </ButtonLink>
            ) : null}
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl">
          <motion.div
            initial={reduce ? false : { scale: 1.04, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.9, ease: EASE_OUT }}
          >
            {/* biome-ignore lint/performance/noImgElement: portable artwork for non-Next.js installations */}
            <img
              src={imageSrc}
              alt={imageAlt}
              loading="lazy"
              className="h-44 w-full object-cover object-center sm:h-52 lg:h-60 dark:brightness-75"
            />
          </motion.div>
        </div>
        <div className="flex flex-col gap-5 py-6 lg:flex-row lg:items-center lg:justify-between">
          <a
            href={brandHref}
            className="inline-flex w-fit items-center gap-2.5 rounded-full text-xl font-medium tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <span aria-hidden>{logo}</span>
            {brand}
          </a>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-1">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                {...externalProps(link)}
                className="inline-flex min-h-10 items-center rounded-full text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <nav aria-label="Social links" className="flex items-center gap-1">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                {...externalProps(link)}
                aria-label={link.label}
                title={link.label}
                className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span aria-hidden>{link.icon}</span>
              </a>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border py-4 text-xs text-muted-foreground">
          <p>{copyright}</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-5">
            {legalLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                {...externalProps(link)}
                className="inline-flex min-h-10 items-center rounded-full transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

function externalProps(link: FooterPanoramaLink) {
  return link.external ? { target: "_blank", rel: "noreferrer noopener" } : {};
}
