"use client";

import { ArrowUpRight, Flower2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type FooterWordmarkLink = {
  label: string;
  href: string;
  external?: boolean;
};
export type FooterWordmarkColumn = {
  title: string;
  links: FooterWordmarkLink[];
};
export type FooterWordmarkProps = {
  brand?: string;
  headline?: string;
  secondaryLine?: string;
  action?: FooterWordmarkLink | null;
  columns?: FooterWordmarkColumn[];
  logo?: ReactNode;
  copyright?: string;
  location?: string;
  className?: string;
};
const defaultColumns: FooterWordmarkColumn[] = [
  {
    title: "Company",
    links: [
      { label: "Our story", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Journal", href: "/blog" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Instagram", href: "https://instagram.com", external: true },
      { label: "X", href: "https://x.com", external: true },
      { label: "LinkedIn", href: "https://linkedin.com", external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
    ],
  },
];

export function FooterWordmark({
  brand = "Bloom",
  headline = "Less busywork.",
  secondaryLine = "More room to grow.",
  action = { label: "Explore Bloom", href: "/" },
  columns = defaultColumns,
  logo = <Flower2 className="size-8" strokeWidth={1.5} />,
  copyright = "© 2026 Bloom. All rights reserved.",
  location = "Made with care, from everywhere.",
  className,
}: FooterWordmarkProps) {
  const reduce = useReducedMotion();
  return (
    <footer
      className={cn(
        "isolate w-full overflow-hidden bg-primary/10 text-foreground",
        className,
      )}
    >
      <div className="relative z-10 rounded-b-3xl border-b border-border bg-background">
        <div className="mx-auto grid max-w-7xl gap-x-16 gap-y-12 px-6 pt-12 pb-8 sm:px-10 sm:pt-16 lg:grid-cols-2 lg:gap-y-28">
          <div>
            <h2 className="max-w-md text-balance text-3xl font-normal leading-tight tracking-tight">
              {headline}
              <span className="block text-muted-foreground">
                {secondaryLine}
              </span>
            </h2>
            {action ? (
              <ButtonLink
                href={action.href}
                {...(action.external
                  ? { target: "_blank", rel: "noreferrer noopener" }
                  : {})}
                className="mt-6 h-9 gap-2 px-4"
              >
                {action.label}
                <ArrowUpRight aria-hidden className="size-4" />
              </ButtonLink>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h3 className="mb-3 text-sm text-muted-foreground">
                  {column.title}
                </h3>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        {...(link.external
                          ? { target: "_blank", rel: "noreferrer noopener" }
                          : {})}
                        className="inline-flex min-h-10 items-center rounded-full text-sm text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
          <div className="lg:col-start-2">
            <div className="mb-4 flex items-center gap-2.5">
              <span aria-hidden>{logo}</span>
              <span className="text-sm font-medium">{brand}</span>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {copyright}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              {location}
            </p>
          </div>
        </div>
      </div>
      <div aria-hidden className="w-full overflow-hidden pt-5 sm:pt-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
        >
          <svg
            aria-hidden="true"
            viewBox={`0 38 ${Math.max(160, brand.length * 78)} 98`}
            className="block h-auto w-full overflow-visible text-background dark:text-foreground/80"
          >
            <text
              x="0"
              y="136"
              textLength={Math.max(160, brand.length * 78)}
              lengthAdjust="spacingAndGlyphs"
              fill="currentColor"
              className="font-sans text-9xl font-medium"
            >
              {brand}
            </text>
          </svg>
        </motion.div>
      </div>
    </footer>
  );
}
