"use client";

import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { useId } from "react";
import { ButtonLink } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import { LIQUID_LANDSCAPE } from "./cta-glow-landscape";

export type CtaGlowLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type CtaGlowProps = {
  eyebrow?: string;
  headline?: string[];
  subtext?: string;
  primaryCta?: CtaGlowLink;
  secondaryCta?: CtaGlowLink;
  note?: string;
  /** Additional styling for the landscape frame. */
  gradientClassName?: string;
  className?: string;
};

export function CtaGlow({
  eyebrow = "A starting point with a point of view",
  headline = ["Less setup.", "More possibility."],
  subtext = "Build on the details that make a difference. Polished foundations, full source, and room to make something unmistakably yours.",
  primaryCta = { label: "Find your starting point", href: "#" },
  secondaryCta = { label: "See what’s inside", href: "#" },
  note = "Ready to adapt. Yours to keep.",
  gradientClassName,
  className,
}: CtaGlowProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn("w-full px-4 py-8 md:px-8 md:py-12", className)}
    >
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-border bg-background text-foreground">
        <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:p-14">
          <div className="relative z-10 flex min-w-0 max-w-lg flex-col items-start">
            {eyebrow && (
              <p className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground">
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full bg-primary"
                />
                {eyebrow}
              </p>
            )}
            <h2
              id={headingId}
              className="mt-7 text-balance text-4xl font-medium leading-tight tracking-tight"
            >
              {headline.map((line, index) => (
                <span
                  key={line}
                  className={cn("block", index > 0 && "text-muted-foreground")}
                >
                  {line}
                </span>
              ))}
            </h2>
            <p className="mt-5 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              {subtext}
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <ButtonLink
                href={primaryCta.href}
                className="relative h-9 after:absolute after:inset-x-0 after:-inset-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                {...(primaryCta.external
                  ? { target: "_blank", rel: "noreferrer noopener" }
                  : {})}
              >
                {primaryCta.label}
                <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
              {secondaryCta && (
                <ButtonLink
                  href={secondaryCta.href}
                  variant="outline"
                  className="relative h-9 after:absolute after:inset-x-0 after:-inset-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                  {...(secondaryCta.external
                    ? { target: "_blank", rel: "noreferrer noopener" }
                    : {})}
                >
                  {secondaryCta.label}
                  <ArrowUpRight aria-hidden className="size-4" />
                </ButtonLink>
              )}
            </div>
            {note && (
              <p className="mt-5 flex items-center gap-2 text-xs leading-relaxed text-muted-foreground">
                <Check aria-hidden className="size-3.5 shrink-0" />
                {note}
              </p>
            )}
          </div>
          <div
            className={cn(
              "aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border",
              gradientClassName,
            )}
          >
            {/* biome-ignore lint/performance/noImgElement: image is included in the portable registry bundle. */}
            <img
              src={LIQUID_LANDSCAPE}
              alt="A hand-painted countryside with a turquoise river, wildflower meadows, and sunlit clouds"
              width={1000}
              height={750}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 border-t border-border px-6 py-4 text-xs text-muted-foreground sm:justify-start sm:px-10 lg:px-14">
          <span>Built for React</span>
          <span>Theme ready</span>
          <span>Source included</span>
        </div>
      </div>
    </section>
  );
}
