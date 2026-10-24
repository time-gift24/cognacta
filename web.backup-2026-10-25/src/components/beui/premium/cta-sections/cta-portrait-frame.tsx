"use client";

import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { ButtonLink } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";
import { PORTRAIT_FRAME_IMAGE } from "./cta-portrait-frame-image";

export type CtaPortraitFrameLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type CtaPortraitFrameProps = {
  title?: string;
  description?: string;
  note?: string;
  primaryAction?: CtaPortraitFrameLink;
  secondaryAction?: CtaPortraitFrameLink;
  image?: { src: string; alt: string; position?: string };
  className?: string;
};

const DEFAULT_IMAGE = {
  src: PORTRAIT_FRAME_IMAGE,
  alt: "Coral over-ear headphones on a mint display plinth against a blue studio backdrop",
  position: "center",
};

// Four circular cutouts preserve the photographed frame's inward corners.
const PORTRAIT_MASK = [
  "radial-gradient(circle at top left, transparent 27px, black 28px)",
  "radial-gradient(circle at top right, transparent 27px, black 28px)",
  "radial-gradient(circle at bottom left, transparent 27px, black 28px)",
  "radial-gradient(circle at bottom right, transparent 27px, black 28px)",
].join(",");

export function CtaPortraitFrame({
  title = "Too good to stay a side project.",
  description = "Open a shop that feels like you, from the first product drop to the thank-you page.",
  note = "Your products. Your name on the door.",
  primaryAction = { label: "Create my shop", href: "#" },
  secondaryAction = { label: "See it in action", href: "#" },
  image = DEFAULT_IMAGE,
  className,
}: CtaPortraitFrameProps) {
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const id = useId();
  const titleId = `${id}-title`;
  const grainId = `${id}-grain`;

  return (
    <section
      aria-labelledby={titleId}
      className={cn("w-full px-4 py-8 md:px-8 md:py-12", className)}
    >
      <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-3xl bg-background p-3 sm:p-5 lg:p-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          {/* biome-ignore lint/performance/noImgElement: the same portable image supplies the decorative frame and portrait. */}
          <img
            src={image.src}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full scale-125 object-cover blur-2xl saturate-150"
          />
          <svg
            aria-hidden="true"
            className="absolute inset-0 size-full opacity-25"
          >
            <defs>
              <filter id={grainId} x="0%" y="0%" width="100%" height="100%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency=".85"
                  numOctaves="3"
                  stitchTiles="stitch"
                />
                <feColorMatrix type="saturate" values="0" />
              </filter>
            </defs>
            <rect width="100%" height="100%" filter={`url(#${grainId})`} />
          </svg>
        </div>
        <div className="dark relative grid gap-10 rounded-2xl bg-background p-6 text-foreground md:grid-cols-2 md:gap-8 md:p-8 lg:gap-14 lg:p-11">
          <div className="flex min-w-0 flex-col items-start justify-between gap-12 md:gap-20">
            <motion.h2
              id={titleId}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              className="max-w-sm text-balance text-4xl font-medium leading-tight tracking-tight"
            >
              {title}
            </motion.h2>
            <div>
              <p className="max-w-sm text-pretty text-sm leading-relaxed md:text-base">
                {description}
              </p>
              {note && (
                <p className="mt-1 text-sm leading-relaxed text-foreground/70">
                  {note}
                </p>
              )}
              <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                {[primaryAction, secondaryAction].map((action, index) => (
                  <ButtonLink
                    key={action.label}
                    href={action.href}
                    variant={index === 0 ? "primary" : "outline"}
                    className={cn(
                      "relative h-9 text-xs after:absolute after:inset-x-0 after:-inset-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground",
                      index === 0
                        ? "bg-foreground text-background hover:bg-foreground/90"
                        : "border-foreground/30 hover:bg-foreground/10",
                    )}
                    {...(action.external
                      ? { target: "_blank", rel: "noreferrer noopener" }
                      : {})}
                  >
                    {action.label}
                    {index === 0 && (
                      <ArrowUpRight aria-hidden className="size-3.5" />
                    )}
                  </ButtonLink>
                ))}
              </div>
            </div>
          </div>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: EASE_OUT, delay: 0.08 }}
            className="relative aspect-[4/3] w-full self-center overflow-hidden md:aspect-[5/4] lg:aspect-[4/3]"
            style={{ maskImage: PORTRAIT_MASK, maskComposite: "intersect" }}
          >
            {/* biome-ignore lint/performance/noImgElement: portable registry source accepts consumer-hosted imagery. */}
            <motion.img
              src={image.src}
              alt={image.alt}
              loading="lazy"
              decoding="async"
              width={1440}
              height={1080}
              whileHover={canHover && !reduce ? { scale: 1.035 } : undefined}
              transition={{ duration: 0.6, ease: EASE_OUT }}
              className="size-full object-cover"
              style={{ objectPosition: image.position }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
