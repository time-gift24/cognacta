"use client";

import { Layers, Mail } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { FOOTER_LANDSCAPE_ART } from "./footer-landscape-art";

export type FooterLandscapeLink = {
  label: string;
  href: string;
  external?: boolean;
};
export type FooterLandscapeColumn = {
  title: string;
  links: FooterLandscapeLink[];
  viewAll?: FooterLandscapeLink;
};
export type FooterLandscapeProps = {
  brand?: string;
  brandHref?: string;
  logo?: ReactNode;
  description?: string;
  credit?: ReactNode;
  socialLinks?: (FooterLandscapeLink & { icon: ReactNode })[];
  columns?: FooterLandscapeColumn[];
  /** Set to null to render the directory without artwork. */
  artworkSrc?: string | null;
  className?: string;
};
const defaultColumns: FooterLandscapeColumn[] = [
  {
    title: "Components",
    links: [
      { label: "Agent chat input", href: "/components/agent-chat-input" },
      { label: "Model picker", href: "/components/model-picker" },
      { label: "Stats", href: "/components/stats" },
    ],
    viewAll: { label: "Browse components", href: "/components" },
  },
  {
    title: "Blocks",
    links: [
      { label: "Hero sections", href: "/components/hero-sections" },
      { label: "CTA sections", href: "/components/cta-sections" },
      { label: "Footer sections", href: "/components/footer-sections" },
      { label: "Pricing", href: "/components/pricing" },
    ],
    viewAll: { label: "Browse blocks", href: "/components" },
  },
  {
    title: "Illustrations",
    links: [
      { label: "Explore illustrations", href: "/illustrations" },
      { label: "What’s new", href: "/changelog" },
      { label: "Source access", href: "/#pricing" },
    ],
  },
  {
    title: "Templates",
    links: [
      { label: "Landing pages", href: "/components/categories/templates" },
      { label: "Browse templates", href: "/components/categories/templates" },
      { label: "Installation", href: "/components/installation" },
    ],
  },
  {
    title: "Links",
    links: [
      { label: "Changelog", href: "/changelog" },
      { label: "Contact", href: "/contact" },
      { label: "Pricing", href: "/#pricing" },
      { label: "For AI agents", href: "/components/agents" },
      { label: "FAQs", href: "/#faqs" },
      { label: "beUI Free", href: "https://beui.dev", external: true },
    ],
  },
];
const defaultSocials = [
  {
    label: "Email",
    href: "mailto:hello@example.com",
    icon: <Mail className="size-4" />,
  },
];
const linkClass =
  "inline-flex min-h-9 items-center text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";

export function FooterLandscape({
  brand = "beUI Pro",
  brandHref = "/",
  logo = <Layers className="size-5" />,
  description = "Premium motion components, illustrations, blocks, and full templates — ready to make your own.",
  credit = (
    <>
      Created by <span className="text-foreground">Saurabh</span>
    </>
  ),
  socialLinks = defaultSocials,
  columns = defaultColumns,
  artworkSrc = FOOTER_LANDSCAPE_ART,
  className,
}: FooterLandscapeProps) {
  const reduce = useReducedMotion();
  return (
    <footer
      className={cn(
        "relative isolate w-full overflow-hidden border-t border-border bg-background text-foreground",
        className,
      )}
    >
      <div
        className={cn(
          "relative z-10 mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-5 pt-14 sm:px-8 lg:grid-cols-[1.5fr_repeat(5,minmax(0,1fr))]",
          artworkSrc ? "pb-48 sm:pb-64" : "pb-14",
        )}
      >
        <div className="col-span-2 max-w-xs lg:col-span-1">
          <a
            href={brandHref}
            className="inline-flex min-h-10 items-center gap-2.5 rounded-full text-lg font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-full border border-border"
            >
              {logo}
            </span>
            {brand}
          </a>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          {credit ? (
            <p className="mt-4 text-sm text-muted-foreground">{credit}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-1">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                aria-label={link.label}
                {...(link.external
                  ? { target: "_blank", rel: "noreferrer noopener" }
                  : {})}
                className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span aria-hidden>{link.icon}</span>
              </a>
            ))}
          </div>
        </div>
        {columns.map((column, index) => (
          <motion.nav
            key={column.title}
            aria-label={column.title}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.4,
              delay: Math.min(index, 5) * 0.05,
              ease: EASE_OUT,
            }}
          >
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {column.title}
            </h2>
            <ul className="mt-4 space-y-1">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    {...(link.external
                      ? { target: "_blank", rel: "noreferrer noopener" }
                      : {})}
                    className={linkClass}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              {column.viewAll ? (
                <li>
                  <a
                    href={column.viewAll.href}
                    {...(column.viewAll.external
                      ? { target: "_blank", rel: "noreferrer noopener" }
                      : {})}
                    className={cn(linkClass, "font-medium text-foreground")}
                  >
                    {column.viewAll.label}
                  </a>
                </li>
              ) : null}
            </ul>
          </motion.nav>
        ))}
      </div>
      {artworkSrc ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-96 [mask-image:linear-gradient(to_bottom,transparent,black_80%)] sm:h-[520px]"
        >
          {/* Native image keeps this installable outside Next.js. */}
          {/* biome-ignore lint/performance/noImgElement: framework-independent decorative artwork */}
          <img
            src={artworkSrc}
            alt=""
            loading="lazy"
            className="size-full object-cover object-bottom dark:brightness-50"
          />
        </div>
      ) : null}
    </footer>
  );
}
