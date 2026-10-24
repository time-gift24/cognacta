"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useId, useRef } from "react";
import { ButtonLink } from "@/components/beui/motion/button";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type CtaFloatingGalleryLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type CtaFloatingGalleryProps = {
  title?: string;
  description?: string;
  primaryAction?: CtaFloatingGalleryLink;
  secondaryAction?: CtaFloatingGalleryLink;
  stats?: {
    value: number;
    label: string;
    suffix?: string;
    decimals?: number;
  }[];
  /** Decorative images, arranged alternately along the left and right edges. */
  images?: string[];
  /** CSS background-image value for the decorative backdrop. */
  background?: string;
  className?: string;
};

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=480&q=85",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=480&q=85",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=480&q=85",
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=480&q=85",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=480&q=85",
  "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=480&q=85",
];

const DEFAULT_STATS = [
  { value: 120, suffix: "K+", label: "Weekend wanderers" },
  { value: 80, suffix: "+", label: "Countries explored" },
  { value: 2, suffix: "M+", label: "Spots bookmarked" },
  { value: 4.9, suffix: "/5", decimals: 1, label: "Rated by travelers" },
];

const CARD_POSITIONS = [
  "-left-10 -top-20 -rotate-25 md:-left-12 md:-top-16",
  "-right-10 -top-20 rotate-25 md:-right-8 md:-top-14",
  "-left-20 top-40 -rotate-25 hidden md:block",
  "-right-16 top-44 rotate-25 hidden md:block",
  "-left-10 top-96 -rotate-25 hidden md:block",
  "-right-6 top-96 rotate-25 hidden md:block",
];

export function CtaFloatingGallery({
  title = "Turn “someday” into Saturday.",
  description = "Find a quiet trail, a tiny cabin, or a town you’ve never heard of. Save your favorites and take the long way there.",
  primaryAction = { label: "Get it for iPhone", href: "#" },
  secondaryAction = { label: "Get it for Android", href: "#" },
  stats = DEFAULT_STATS,
  images = DEFAULT_IMAGES,
  background,
  className,
}: CtaFloatingGalleryProps) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const visible = useInView(panelRef, { amount: 0.15 });
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn("w-full px-4 py-8 md:px-8 md:py-12", className)}
    >
      <div
        ref={panelRef}
        className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-3xl bg-background text-foreground dark:bg-foreground dark:text-background"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-[position:72%_center] md:bg-center"
          style={{ backgroundImage: background }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_30%,transparent_92%)] md:[mask-image:linear-gradient(to_bottom,black_30%,transparent_100%),linear-gradient(to_right,black,transparent_30%,transparent_70%,black)] md:[mask-composite:intersect]"
        >
          {images.slice(0, CARD_POSITIONS.length).map((src, index) => (
            <div
              key={CARD_POSITIONS[index]}
              className={cn(
                "absolute w-32 md:w-44 lg:w-56",
                CARD_POSITIONS[index],
              )}
            >
              <motion.div
                animate={
                  !reduce && visible
                    ? { y: [0, index % 2 === 0 ? -14 : 14, 0] }
                    : { y: 0 }
                }
                transition={{
                  duration: 8 + index * 0.5,
                  ease: EASE_IN_OUT,
                  repeat: !reduce && visible ? Number.POSITIVE_INFINITY : 0,
                }}
                className="aspect-[4/5] overflow-hidden rounded-2xl border border-foreground/20 bg-background p-1.5 dark:border-background/20 dark:bg-foreground"
              >
                {/* biome-ignore lint/performance/noImgElement: portable registry block accepts consumer-hosted decorative images. */}
                <img
                  src={src}
                  alt=""
                  width={480}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  className="size-full rounded-xl object-cover"
                />
              </motion.div>
            </div>
          ))}
        </div>
        <div className="relative px-5 pt-28 pb-10 md:px-12 md:pt-24 md:pb-16 lg:pt-28 lg:pb-20">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
            className="mx-auto flex max-w-xl flex-col items-center text-center md:max-w-[60%]"
          >
            <h2
              id={headingId}
              className="max-w-lg text-balance text-4xl font-medium tracking-tight"
            >
              {title}
            </h2>
            <p className="mt-5 max-w-md text-pretty text-sm leading-relaxed text-foreground/80 md:text-base dark:text-background/80">
              {description}
            </p>
            <div className="mt-8 flex w-full max-w-64 flex-col items-stretch justify-center gap-3 md:mt-9 md:max-w-none md:flex-row md:flex-wrap md:items-center">
              {[primaryAction, secondaryAction].map((action, index) => (
                <ButtonLink
                  key={action.label}
                  href={action.href}
                  variant="primary"
                  className="relative h-9 text-sm after:absolute after:inset-x-0 after:-inset-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground dark:focus-visible:outline-background"
                  {...(action.external
                    ? { target: "_blank", rel: "noreferrer noopener" }
                    : {})}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="size-4 shrink-0"
                    fill="currentColor"
                  >
                    {index === 0 ? (
                      <path d="M17.05 12.54c.03 3.18 2.79 4.24 2.82 4.25-.02.08-.44 1.51-1.45 2.99-.88 1.28-1.8 2.56-3.24 2.59-1.41.03-1.87-.84-3.49-.84-1.61 0-2.12.81-3.46.87-1.39.05-2.45-1.39-3.34-2.66-1.81-2.61-3.19-7.38-1.33-10.6.93-1.6 2.59-2.61 4.39-2.64 1.37-.03 2.66.92 3.49.92.83 0 2.39-1.14 4.03-.97.69.03 2.61.28 3.84 2.08-.1.06-2.29 1.33-2.26 4.01ZM14.4 4.71c.74-.9 1.24-2.15 1.1-3.4-1.07.04-2.37.71-3.14 1.61-.69.8-1.29 2.08-1.13 3.31 1.19.09 2.41-.61 3.17-1.52Z" />
                    ) : (
                      <>
                        <path d="m6.1 6.3-1.7-3a.65.65 0 0 1 1.13-.65l1.72 3a11.6 11.6 0 0 1 9.5 0l1.72-3a.65.65 0 0 1 1.13.65l-1.7 3C21.3 8.4 23.5 12 24 16H0c.5-4 2.7-7.6 6.1-9.7Z" />
                        <circle
                          cx="7"
                          cy="12"
                          r="1"
                          className="fill-primary-foreground"
                        />
                        <circle
                          cx="17"
                          cy="12"
                          r="1"
                          className="fill-primary-foreground"
                        />
                      </>
                    )}
                  </svg>
                  {action.label}
                </ButtonLink>
              ))}
            </div>
          </motion.div>

          {stats.length > 0 && (
            <dl className="relative mx-auto mt-12 grid max-w-4xl grid-cols-2 justify-center gap-x-4 gap-y-9 md:mt-20 md:flex md:flex-wrap md:gap-x-0">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.6,
                    ease: EASE_OUT,
                    delay: index * 0.07,
                  }}
                  className="flex min-w-0 flex-col items-center gap-3 text-center md:flex-1 md:basis-1/4 md:px-3"
                >
                  <dt className="order-last text-xs text-foreground/75 md:text-sm dark:text-background/75">
                    {stat.label}
                  </dt>
                  <dd className="text-3xl font-medium tracking-tight tabular-nums md:text-4xl">
                    <NumberTicker
                      value={Math.round(
                        stat.value * 10 ** (stat.decimals ?? 0),
                      )}
                      format={(value) =>
                        (value / 10 ** (stat.decimals ?? 0)).toFixed(
                          stat.decimals ?? 0,
                        )
                      }
                      suffix={stat.suffix}
                      duration={1.2}
                      stagger={0.08}
                      blur
                    />
                  </dd>
                </motion.div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
