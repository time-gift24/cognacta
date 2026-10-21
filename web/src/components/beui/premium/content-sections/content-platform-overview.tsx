"use client";

import {
  ArrowUpRight,
  Boxes,
  Cable,
  FileText,
  Layers3,
  LockKeyhole,
  Workflow,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useId } from "react";
import { EASE_OUT } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";

export type PlatformOverviewLink = {
  label: string;
  href: string;
  icon?: ReactNode;
  external?: boolean;
};
export type PlatformOverviewColumn = {
  id: string;
  title: string;
  description: string;
  visual: ReactNode;
  links?: PlatformOverviewLink[];
  metrics?: { label: string; value: string }[];
};
export type ContentPlatformOverviewProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  columns?: PlatformOverviewColumn[];
  className?: string;
};

/** Decorative scenes are original SVG compositions; replace with your own media. */
function PlatformArtwork({ scene }: { scene: "build" | "connect" | "scale" }) {
  const id = useId();
  const reduce = useReducedMotion();
  const colors =
    scene === "build"
      ? ["#dce9f2", "#a6c4d8", "#f3e8da"]
      : scene === "connect"
        ? ["#f7e5cf", "#e6b99b", "#f7eddc"]
        : ["#d9e8df", "#a8c9bc", "#e8f0de"];
  return (
    <motion.svg
      aria-hidden="true"
      viewBox="0 0 480 280"
      className="h-full w-full"
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x2="1" y2="1">
          <stop stopColor={colors[0]} />
          <stop offset="1" stopColor={colors[2]} />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x2="0.8" y2="1">
          <stop stopColor="white" stopOpacity="0.9" />
          <stop offset="1" stopColor={colors[1]} stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id={`${id}-light`}>
          <stop stopColor="white" stopOpacity="0.8" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path fill={`url(#${id}-bg)`} d="M0 0h480v280H0z" />
      <ellipse cx="240" cy="105" rx="230" ry="175" fill={`url(#${id}-light)`} />
      {[0, 1, 2].map((i) => (
        <ellipse
          key={i}
          cx="240"
          cy="245"
          rx={90 + i * 70}
          ry={20 + i * 18}
          fill="none"
          stroke="white"
          strokeOpacity="0.35"
        />
      ))}
      {scene === "build" ? (
        [0, 1, 2, 3].map((i) => (
          <motion.g
            key={i}
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{
              duration: reduce ? 0 : 0.8,
              delay: reduce ? 0 : i * 0.12,
              ease: EASE_OUT,
            }}
          >
            <path
              d={`M130 ${157 - i * 29} L240 ${108 - i * 29} L350 ${157 - i * 29} L240 ${210 - i * 29} Z`}
              fill={`url(#${id}-glass)`}
              stroke="white"
              strokeWidth="1.5"
            />
            <path
              d={`M130 ${157 - i * 29} L130 ${166 - i * 29} L240 ${218 - i * 29} L350 ${166 - i * 29} L350 ${157 - i * 29} L240 ${210 - i * 29} Z`}
              fill={colors[1]}
              fillOpacity="0.45"
              stroke="white"
              strokeOpacity="0.65"
            />
          </motion.g>
        ))
      ) : scene === "connect" ? (
        <>
          <motion.path
            d="M120 90 H205 Q240 90 240 125 V155 Q240 190 275 190 H360 M120 190 H205 Q240 190 240 155 V125 Q240 90 275 90 H360"
            fill="none"
            stroke="white"
            strokeWidth="2"
            variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1 } }}
            transition={{ duration: reduce ? 0 : 1.4, ease: EASE_OUT }}
          />
          {[
            [120, 90],
            [360, 90],
            [120, 190],
            [360, 190],
            [240, 140],
          ].map(([x, y], i) => (
            <motion.g
              key={`${x}-${y}`}
              style={{ transformOrigin: `${x}px ${y}px` }}
              variants={{
                hidden: { opacity: 0, scale: 0.7 },
                visible: { opacity: 1, scale: 1 },
              }}
              transition={{
                duration: reduce ? 0 : 0.6,
                delay: reduce ? 0 : i * 0.1,
                ease: EASE_OUT,
              }}
            >
              <rect
                x={x - 30}
                y={y - 30}
                width="60"
                height="60"
                rx="20"
                fill={`url(#${id}-glass)`}
                stroke="white"
                strokeWidth="1.5"
              />
              <circle
                cx={x}
                cy={y}
                r={i === 4 ? 12 : 7}
                fill="white"
                fillOpacity="0.85"
              />
            </motion.g>
          ))}
        </>
      ) : (
        <>
          {[0, 1, 2].map((i) => (
            <motion.ellipse
              key={i}
              cx="240"
              cy="140"
              rx={60 + i * 28}
              ry={95}
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              transform={`rotate(${i * 60} 240 140)`}
              variants={{
                hidden: { opacity: 0, pathLength: 0 },
                visible: { opacity: 0.8, pathLength: 1 },
              }}
              transition={{
                duration: reduce ? 0 : 1.2,
                delay: reduce ? 0 : i * 0.15,
                ease: EASE_OUT,
              }}
            />
          ))}
          <motion.circle
            cx="240"
            cy="140"
            r="42"
            fill={`url(#${id}-glass)`}
            stroke="white"
            strokeWidth="1.5"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            transition={{ duration: reduce ? 0 : 0.8 }}
          />
          <path
            d="m224 141 11 11 23-25"
            fill="none"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="240" cy="45" r="6" fill="white" />
          <circle cx="327" cy="187" r="5" fill="white" />
          <circle cx="158" cy="184" r="4" fill="white" />
        </>
      )}
    </motion.svg>
  );
}

const defaultColumns: PlatformOverviewColumn[] = [
  {
    id: "build",
    title: "A place to build",
    description:
      "Bring ideas, knowledge, and everyday work into one space. Give your team the building blocks to make something their own.",
    visual: <PlatformArtwork scene="build" />,
    links: [
      {
        label: "Shared workspaces",
        href: "#workspaces",
        icon: <Boxes className="size-4" />,
      },
      {
        label: "Living documents",
        href: "#documents",
        icon: <FileText className="size-4" />,
      },
      {
        label: "Reusable collections",
        href: "#collections",
        icon: <Layers3 className="size-4" />,
      },
    ],
  },
  {
    id: "connect",
    title: "Everything, connected",
    description:
      "Keep your tools talking and your projects moving. Turn the small steps between people and systems into a smoother working day.",
    visual: <PlatformArtwork scene="connect" />,
    links: [
      {
        label: "Connected tools",
        href: "#integrations",
        icon: <Cable className="size-4" />,
      },
      {
        label: "Flexible workflows",
        href: "#workflows",
        icon: <Workflow className="size-4" />,
      },
      {
        label: "Thoughtful permissions",
        href: "#permissions",
        icon: <LockKeyhole className="size-4" />,
      },
    ],
  },
  {
    id: "scale",
    title: "Room for what comes next",
    description:
      "Start with a small team. Grow without starting over. A dependable foundation keeps the details handled as your ambitions get bigger.",
    visual: <PlatformArtwork scene="scale" />,
    metrics: [
      { label: "Connected tools", value: "120+" },
      { label: "Regions supported", value: "32" },
      { label: "Availability", value: "99.9%" },
    ],
  },
];

export function ContentPlatformOverview({
  eyebrow = "THE WHOLE PICTURE",
  title = "More than a tool. A place to do your best work.",
  description = "Three connected layers. One less thing to work around.",
  columns = defaultColumns,
  className,
}: ContentPlatformOverviewProps) {
  const reduce = useReducedMotion();
  const hover = useHoverCapable();
  return (
    <section
      className={cn(
        "w-full bg-background px-6 py-12 text-foreground sm:px-10 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-4 font-mono text-xs tracking-widest text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="text-balance text-4xl font-medium tracking-tight">
            {title}
          </h2>
          <p className="mt-4 text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        <div className="grid gap-10 md:grid-cols-3 md:gap-7">
          {columns.map((column, index) => (
            <motion.article
              key={column.id}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{
                duration: 0.6,
                delay: reduce ? 0 : index * 0.08,
                ease: EASE_OUT,
              }}
              className="flex min-w-0 flex-col"
            >
              <div className="mb-6 aspect-[12/7] overflow-hidden rounded-2xl">
                {column.visual}
              </div>
              <h3 className="text-xl font-medium tracking-tight">
                {column.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {column.description}
              </p>
              <div className="mt-auto pt-7">
                {column.links && (
                  <ul className="divide-y divide-border">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <motion.a
                          href={link.href}
                          {...(link.external
                            ? { target: "_blank", rel: "noreferrer noopener" }
                            : {})}
                          whileHover={hover && !reduce ? { x: 3 } : undefined}
                          transition={{ duration: 0.2, ease: EASE_OUT }}
                          className="flex min-h-12 items-center gap-3 rounded-lg py-3 text-sm outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span aria-hidden className="text-muted-foreground">
                            {link.icon}
                          </span>
                          {link.label}
                          <ArrowUpRight
                            aria-hidden
                            className="ml-auto size-4 text-muted-foreground"
                          />
                        </motion.a>
                      </li>
                    ))}
                  </ul>
                )}
                {column.metrics && (
                  <dl className="divide-y divide-border">
                    {column.metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="flex min-h-12 items-center justify-between gap-3 py-3"
                      >
                        <dt className="text-sm text-muted-foreground">
                          {metric.label}
                        </dt>
                        <dd className="text-xl font-medium tabular-nums tracking-tight">
                          {metric.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
