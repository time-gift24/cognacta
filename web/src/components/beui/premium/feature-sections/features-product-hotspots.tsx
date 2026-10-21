"use client";

import { ArrowUpRight, Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useId, useState } from "react";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { EASE_OUT, SPRING_BOUNCE } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type ProductHotspot = {
  id: string;
  title: string;
  description: string;
  /** Percentage coordinates within the 16:10 product image. */
  x: number;
  y: number;
  bullets?: string[];
  link?: { label: string; href: string; external?: boolean };
};
export type FeaturesProductHotspotsProps = {
  title?: string;
  description?: string;
  imageSrc?: string;
  imageAlt?: string;
  /** Optional custom product preview, displayed in the same 16:10 frame. */
  visual?: ReactNode;
  hotspots?: ProductHotspot[];
  defaultActiveId?: string;
  className?: string;
};
const defaultHotspots: ProductHotspot[] = [
  {
    id: "spaces",
    title: "A home for every project",
    description:
      "Keep your team’s work organized in shared spaces. Everything stays easy to find, from the first brief to the final handoff.",
    x: 18,
    y: 56,
    bullets: ["Group related work", "Give each team its own space"],
  },
  {
    id: "views",
    title: "See work your way",
    description:
      "Switch perspectives without rebuilding your workflow. Bring the right view to planning, progress reviews, and everyday work.",
    x: 60,
    y: 25,
    bullets: ["Board, list, and timeline views", "One source of truth"],
  },
  {
    id: "tasks",
    title: "Turn plans into progress",
    description:
      "Move from a promising idea to a finished task. Owners, deadlines, and context travel with the work.",
    x: 48,
    y: 60,
    bullets: [
      "Clear ownership and due dates",
      "Keep the conversation in context",
    ],
  },
  {
    id: "people",
    title: "Stay in the loop",
    description:
      "Bring the right people into the picture. Share progress and collaborate without another status meeting.",
    x: 87,
    y: 14,
    bullets: ["Invite teammates and guests", "Keep everyone on the same page"],
  },
];

export function FeaturesProductHotspots({
  title = "Get to know your next workspace.",
  description = "A place for the plan, the people, and the little details. Pick a marker to take a closer look.",
  imageSrc,
  imageAlt = "Product workspace with project navigation and a task board",
  visual,
  hotspots = defaultHotspots,
  defaultActiveId,
  className,
}: FeaturesProductHotspotsProps) {
  const [activeId, setActiveId] = useState(defaultActiveId ?? hotspots[0]?.id);
  const active = hotspots.find((item) => item.id === activeId) ?? hotspots[0];
  const reduce = useReducedMotion();
  const detailId = useId();
  const markerId = useId();
  if (!active) return null;
  return (
    <section
      className={cn(
        "w-full bg-background px-6 py-12 text-foreground sm:px-10 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-9 max-w-2xl">
          <p className="mb-3 text-xs font-medium text-muted-foreground">
            A closer look
          </p>
          <h2 className="text-balance text-4xl font-medium tracking-tight">
            {title}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        <div className="grid items-start gap-7 lg:grid-cols-[2fr_1fr] lg:gap-10">
          <div className="min-w-0">
            <div
              className="relative rounded-3xl p-3 sm:p-5"
              style={{
                background:
                  "linear-gradient(130deg, rgba(159,211,208,.12), transparent 50%, rgba(233,198,153,.15))",
              }}
            >
              <div className="mb-3 flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="size-1.5 rounded-full bg-foreground/20" />
                  <span className="size-1.5 rounded-full bg-foreground/20" />
                  <span className="size-1.5 rounded-full bg-foreground/20" />
                </span>
                <span>Workspace tour</span>
                <span className="font-mono tabular-nums">
                  {String(hotspots.indexOf(active) + 1).padStart(2, "0")} /{" "}
                  {String(hotspots.length).padStart(2, "0")}
                </span>
              </div>
              <div className="relative aspect-[16/10] rounded-2xl border border-border bg-background">
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  {imageSrc ? (
                    // biome-ignore lint/performance/noImgElement: portable user-supplied product screenshot
                    <img
                      src={imageSrc}
                      alt={imageAlt}
                      className="size-full object-contain"
                    />
                  ) : (
                    (visual ?? <WorkspacePreview />)
                  )}
                </div>
                {hotspots.map((item, index) => (
                  <Button
                    variant="plain"
                    key={item.id}
                    type="button"
                    aria-label={`Explore ${item.title}`}
                    aria-pressed={active.id === item.id}
                    aria-controls={detailId}
                    onClick={() => setActiveId(item.id)}
                    className={cn(
                      "absolute z-10 hidden size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-medium transition-colors before:absolute before:-inset-1 before:rounded-full before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:flex",
                      active.id === item.id
                        ? "border-transparent text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-foreground/40",
                    )}
                    style={{
                      left: `${Math.max(5, Math.min(95, item.x))}%`,
                      top: `${Math.max(7, Math.min(93, item.y))}%`,
                    }}
                  >
                    {active.id === item.id && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0"
                      >
                        {!reduce &&
                          [0, 1].map((trail) => (
                            <motion.span
                              key={trail}
                              layoutId={`${markerId}-trail-${trail}`}
                              className="absolute -inset-1 rounded-full bg-primary/10"
                              transition={{
                                ...SPRING_BOUNCE,
                                delay: (trail + 1) * 0.045,
                              }}
                            />
                          ))}
                        <motion.span
                          layoutId={reduce ? undefined : `${markerId}-active`}
                          className="absolute -inset-px rounded-full bg-primary ring-4 ring-primary/15"
                          transition={reduce ? { duration: 0 } : SPRING_BOUNCE}
                        />
                        {!reduce && (
                          <motion.span
                            key={active.id}
                            className="absolute -inset-1 rounded-full border border-primary/50"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{
                              scale: [0.8, 1, 2.2],
                              opacity: [0, 0.65, 0],
                            }}
                            transition={{
                              duration: 0.7,
                              delay: 0.25,
                              ease: EASE_OUT,
                            }}
                          />
                        )}
                      </span>
                    )}
                    <motion.span
                      aria-hidden="true"
                      key={`${item.id}-${active.id === item.id}`}
                      className="relative z-10 inline-block"
                      initial={
                        reduce || active.id !== item.id
                          ? false
                          : { y: 9, scale: 0.5, rotate: -35, opacity: 0 }
                      }
                      animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
                      transition={
                        reduce
                          ? { duration: 0 }
                          : { ...SPRING_BOUNCE, delay: 0.12 }
                      }
                    >
                      {index + 1}
                    </motion.span>
                  </Button>
                ))}
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="hidden sm:inline">Click a marker or </span>
              <span className="sm:lowercase">Choose a feature</span> to explore
              the workspace.
            </p>
          </div>
          <div className="min-w-0">
            <nav aria-label="Product features" className="space-y-2">
              {hotspots.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    "relative flex min-h-12 w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                    active.id === item.id
                      ? "border-border text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted font-mono text-xs tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">{item.title}</span>
                  {active.id === item.id && (
                    <Check aria-hidden className="size-4" />
                  )}
                  {/* Full-row control; the shared Button is always pill-shaped, so the
                      row keeps its own radius and this sits on top. */}
                  <Button
                    variant="plain"
                    type="button"
                    aria-label={item.title}
                    aria-pressed={active.id === item.id}
                    aria-controls={detailId}
                    onClick={() => setActiveId(item.id)}
                    whileHover={undefined}
                    whileTap={undefined}
                    className="absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              ))}
            </nav>
            <div
              id={detailId}
              aria-live="polite"
              aria-atomic="true"
              className="mt-7 min-h-56 px-1"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active.id}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: reduce ? 0 : 0.18, ease: EASE_OUT }}
                >
                  <h3 className="text-xl font-medium tracking-tight">
                    {active.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {active.description}
                  </p>
                  {active.bullets && (
                    <ul className="mt-5 space-y-3">
                      {active.bullets.map((point) => (
                        <li
                          key={point}
                          className="flex gap-2 text-xs leading-5 text-muted-foreground"
                        >
                          <Check
                            aria-hidden
                            className="mt-0.5 size-3.5 shrink-0"
                          />
                          {point}
                        </li>
                      ))}
                    </ul>
                  )}
                  {active.link && (
                    <ButtonLink
                      href={active.link.href}
                      {...(active.link.external
                        ? { target: "_blank", rel: "noreferrer noopener" }
                        : {})}
                      variant="outline"
                      className="mt-5 h-9 text-xs hover:bg-muted"
                    >
                      {active.link.label}
                      <ArrowUpRight aria-hidden className="size-3.5" />
                    </ButtonLink>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkspacePreview() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 800 500"
      className="size-full bg-background text-foreground"
      fill="none"
    >
      <path d="M172 0V500M172 100H800" className="stroke-border" />
      <circle
        cx="28"
        cy="32"
        r="9"
        className="stroke-foreground"
        strokeWidth="2"
      />
      <text x="46" y="38" className="fill-foreground text-base font-medium">
        Outline
      </text>
      <text x="22" y="91" className="fill-muted-foreground text-xs">
        WORKSPACE
      </text>
      {["Overview", "Inbox", "My tasks"].map((text, index) => (
        <g key={text}>
          <rect
            x="22"
            y={114 + index * 32}
            width="10"
            height="10"
            rx="3"
            className="stroke-muted-foreground"
          />
          <text
            x="44"
            y={124 + index * 32}
            className="fill-muted-foreground text-xs"
          >
            {text}
          </text>
        </g>
      ))}
      <text x="22" y="245" className="fill-muted-foreground text-xs">
        PROJECTS
      </text>
      <rect
        x="12"
        y="261"
        width="148"
        height="34"
        rx="8"
        className="fill-muted"
      />
      {["Website launch", "Brand refresh", "Customer stories"].map(
        (text, index) => (
          <text
            key={text}
            x="23"
            y={282 + index * 36}
            className={cn(
              "text-xs",
              index === 0 ? "fill-foreground" : "fill-muted-foreground",
            )}
          >
            {text}
          </text>
        ),
      )}
      <text x="198" y="40" className="fill-foreground text-xl font-medium">
        Website launch
      </text>
      <text x="198" y="65" className="fill-muted-foreground text-xs">
        A fresh home for what comes next.
      </text>
      {[0, 1, 2].map((n) => (
        <circle
          key={n}
          cx={692 + n * 23}
          cy="36"
          r="15"
          className="fill-muted stroke-background"
          strokeWidth="3"
        />
      ))}
      <text x="198" y="125" className="fill-foreground text-xs font-medium">
        Board
      </text>
      <text x="268" y="125" className="fill-muted-foreground text-xs">
        List
      </text>
      <text x="320" y="125" className="fill-muted-foreground text-xs">
        Timeline
      </text>
      <path d="M198 138H238" className="stroke-foreground" strokeWidth="2" />
      {[
        {
          name: "To do",
          tasks: [
            "Explore directions",
            "Write the story",
            "Collect references",
          ],
        },
        {
          name: "In progress",
          tasks: ["Design the homepage", "Build the components"],
        },
        { name: "Done", tasks: ["Project kickoff", "Agree on the brief"] },
      ].map((col, i) => (
        <g key={col.name} transform={`translate(${198 + i * 198} 166)`}>
          <circle cx="4" cy="1" r="3" className="fill-muted-foreground" />
          <text x="16" y="5" className="fill-muted-foreground text-xs">
            {col.name}
          </text>
          {col.tasks.map((task, j) => (
            <g key={task} transform={`translate(0 ${24 + j * 90})`}>
              <rect
                width="178"
                height="76"
                rx="10"
                className="fill-background stroke-border"
              />
              <text x="12" y="24" className="fill-foreground text-xs">
                {task}
              </text>
              <rect
                x="12"
                y="39"
                width="44"
                height="16"
                rx="8"
                className="fill-muted"
              />
              <text x="19" y="50" className="fill-muted-foreground text-xs">
                {i === 2 ? "Ready" : "Design"}
              </text>
              <circle cx="155" cy="49" r="9" className="fill-muted" />
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}
