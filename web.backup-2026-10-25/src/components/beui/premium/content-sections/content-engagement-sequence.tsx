"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Bell, Check, Gauge, Route, Send } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useInView,
  usePageInView,
  useReducedMotion,
} from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { TextReveal } from "@/components/beui/motion/text-reveal";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

const DEFAULT_INTERVAL = 6200;

export type ContentEngagementSequenceItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  icon?: LucideIcon;
  visual?: ReactNode;
};

export type ContentEngagementSequenceProps = {
  title?: string;
  mutedTitle?: string;
  items?: ContentEngagementSequenceItem[];
  defaultItemId?: string;
  autoPlay?: boolean;
  interval?: number;
  backgroundImage?: string;
  className?: string;
};

const DEFAULT_ITEMS: ContentEngagementSequenceItem[] = [
  {
    id: "welcome",
    title: "Guide every first step",
    description:
      "Turn a new signup into a clear, personal path with timely prompts that respond to what each customer has already done.",
    href: "#",
    linkLabel: "Explore guided onboarding",
    icon: Send,
  },
  {
    id: "updates",
    title: "Share updates that matter",
    description:
      "Deliver product news, account alerts, and helpful reminders in the channel and moment most likely to earn attention.",
    href: "#",
    linkLabel: "Explore customer updates",
    icon: Bell,
  },
  {
    id: "journeys",
    title: "Build journeys that adapt",
    description:
      "Connect messages into thoughtful sequences that change course as customers engage, convert, or need more time.",
    href: "#",
    linkLabel: "Explore adaptive journeys",
    icon: Route,
  },
];

export function ContentEngagementSequence({
  title = "Meet customers",
  mutedTitle = "in the moment that matters.",
  items = DEFAULT_ITEMS,
  defaultItemId,
  autoPlay = true,
  interval = DEFAULT_INTERVAL,
  backgroundImage = "https://pro.beui.dev/content/journey-sketch.webp",
  className,
}: ContentEngagementSequenceProps) {
  const safeItems = useMemo(() => items.filter((item) => item.id), [items]);
  const initialId =
    safeItems.find((item) => item.id === defaultItemId)?.id ??
    safeItems[0]?.id ??
    "";
  const [activeId, setActiveId] = useState(initialId);
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const isInView = useInView(sectionRef, { margin: "120px" });
  const isPageInView = usePageInView();
  const shouldPlay =
    autoPlay &&
    !reduceMotion &&
    isInView &&
    isPageInView &&
    safeItems.length > 1;

  const activeIndex = Math.max(
    0,
    safeItems.findIndex((item) => item.id === activeId),
  );
  const activeItem = safeItems[activeIndex];

  useEffect(() => {
    if (safeItems.length === 0) {
      setActiveId("");
      return;
    }
    if (!safeItems.some((item) => item.id === activeId)) {
      setActiveId(safeItems[0].id);
    }
  }, [activeId, safeItems]);

  useEffect(() => {
    if (!shouldPlay) return;

    const timer = window.setTimeout(() => {
      setActiveId(safeItems[(activeIndex + 1) % safeItems.length].id);
    }, interval);

    return () => window.clearTimeout(timer);
  }, [activeIndex, interval, safeItems, shouldPlay]);

  function selectItem(id: string) {
    setActiveId(id);
  }

  if (!activeItem) return null;

  return (
    <section
      className={cn(
        "w-full overflow-hidden bg-background px-4 py-20 text-foreground sm:px-6 sm:py-24 lg:px-8 lg:py-28",
        className,
      )}
      ref={sectionRef}
    >
      <div className="mx-auto w-full max-w-7xl">
        <h2 className="max-w-3xl text-balance leading-tight tracking-[-0.055em] text-4xl font-medium">
          <TextReveal blur={10} text={title} whileInView yOffset="22%" />
          <TextReveal
            blur={10}
            className="text-muted-foreground/70"
            delay={0.16}
            text={mutedTitle}
            whileInView
            yOffset="22%"
          />
        </h2>

        <div className="mt-10 grid gap-4 sm:mt-12 lg:grid-cols-[1.45fr_1fr]">
          <CampaignStage
            backgroundImage={backgroundImage}
            itemCount={safeItems.length}
            activeIndex={activeIndex}
            activeItem={activeItem}
            reduceMotion={reduceMotion}
          />

          <div className="grid min-w-0 gap-3">
            {safeItems.map((item, index) => {
              const isActive = item.id === activeId;
              const Icon = item.icon ?? [Send, Bell, Route][index % 3];

              return (
                <article
                  className="relative flex flex-col overflow-hidden rounded-3xl border border-border bg-background"
                  key={item.id}
                >
                  {isActive && shouldPlay ? (
                    <motion.span
                      animate={{ scaleX: 1 }}
                      aria-hidden
                      className="absolute inset-x-6 bottom-0 h-0.5 origin-left rounded-full bg-primary"
                      initial={{ scaleX: 0 }}
                      key={item.id}
                      transition={{ duration: interval / 1000, ease: "linear" }}
                    />
                  ) : null}

                  <div className="group/row relative flex w-full flex-1 flex-col rounded-3xl px-5 pb-3 pt-5 text-left has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-ring sm:px-6">
                    <span className="flex w-full items-center justify-between">
                      <span className="font-medium text-muted-foreground text-xs tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "grid size-8 place-items-center rounded-full transition-colors duration-300",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground group-hover/row:text-foreground",
                        )}
                      >
                        <Icon
                          aria-hidden
                          className="size-3.5"
                          strokeWidth={1.8}
                        />
                      </span>
                    </span>

                    <span
                      className={cn(
                        "mt-3 font-medium text-xl tracking-tight transition-colors duration-300",
                        isActive
                          ? "text-foreground"
                          : "text-foreground/75 group-hover/row:text-foreground",
                      )}
                    >
                      {item.title}
                    </span>
                    <span className="mt-2 max-w-md text-pretty text-muted-foreground text-sm leading-6">
                      {item.description}
                    </span>
                    {/* Full-row control; the shared Button is always
                        pill-shaped, so the row keeps its own radius and this
                        sits on top. */}
                    <Button
                      variant="plain"
                      type="button"
                      aria-label={item.title}
                      aria-pressed={isActive}
                      onClick={() => selectItem(item.id)}
                      whileHover={undefined}
                      whileTap={undefined}
                      className="absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>

                  <ButtonLink
                    className="mb-5 ml-5 h-9 w-fit sm:mb-6 sm:ml-6"
                    href={item.href}
                    size="sm"
                    variant={isActive ? "secondary" : "ghost"}
                  >
                    {item.linkLabel}
                    <ArrowUpRight aria-hidden className="size-4" />
                  </ButtonLink>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function CampaignStage({
  backgroundImage,
  itemCount,
  activeItem,
  activeIndex,
  reduceMotion,
}: {
  backgroundImage: string;
  itemCount: number;
  activeItem: ContentEngagementSequenceItem;
  activeIndex: number;
  reduceMotion: boolean;
}) {
  return (
    <div className="relative isolate min-h-[30rem] overflow-hidden rounded-3xl border border-border bg-background sm:min-h-[36rem]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* biome-ignore lint/performance/noImgElement: portable decorative image, loaded only near the viewport */}
        <img
          src={backgroundImage}
          alt=""
          width={1536}
          height={1024}
          loading="lazy"
          decoding="async"
          className="size-full object-cover opacity-90 dark:opacity-50"
        />
        <div className="absolute inset-0 bg-background/15 dark:bg-background/20" />
      </div>

      <div className="absolute inset-x-4 top-5 flex items-center justify-between border-border/60 border-b pb-4 text-foreground/70 sm:inset-x-7 sm:top-7">
        <span className="font-medium text-xs uppercase tracking-[0.16em]">
          Customer journey
        </span>
        <span className="text-xs tabular-nums">
          {String(activeIndex + 1).padStart(2, "0")} /{" "}
          {String(itemCount).padStart(2, "0")}
        </span>
      </div>

      <AnimatePresence initial={false} mode="wait">
        <motion.div
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          className="absolute inset-x-0 bottom-0 top-16"
          exit={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: -18, filter: "blur(8px)" }
          }
          initial={
            reduceMotion ? false : { opacity: 0, y: 22, filter: "blur(8px)" }
          }
          key={activeItem.id}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 0.55, ease: EASE_OUT }
          }
        >
          {activeItem.visual ?? (
            <DefaultScene index={activeIndex} reduceMotion={reduceMotion} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function DefaultScene({
  index,
  reduceMotion,
}: {
  index: number;
  reduceMotion: boolean;
}) {
  if (index === 1) {
    return <UpdateScene reduceMotion={reduceMotion} />;
  }
  if (index === 2) {
    return <JourneyScene reduceMotion={reduceMotion} />;
  }
  return <WelcomeScene reduceMotion={reduceMotion} />;
}

function WelcomeScene({ reduceMotion }: { reduceMotion: boolean }) {
  const steps = [
    "Create your workspace",
    "Invite your first teammate",
    "Publish your first project",
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center p-5 sm:p-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-background/90 p-5 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/85 sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
              Getting started
            </p>
            <p className="mt-2 font-medium text-xl tracking-[-0.035em]">
              Your workspace is ready
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-full bg-muted">
            <Send aria-hidden className="size-4" strokeWidth={1.7} />
          </span>
        </div>

        <div className="mt-7 space-y-2">
          {steps.map((step, stepIndex) => (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-background/90 px-4 py-3.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/85"
              initial={reduceMotion ? false : { opacity: 0, x: -14 }}
              key={step}
              transition={{
                delay: reduceMotion ? 0 : 0.12 + stepIndex * 0.09,
                duration: reduceMotion ? 0 : 0.45,
                ease: EASE_OUT,
              }}
            >
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full border",
                  stepIndex === 0
                    ? "border-foreground bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {stepIndex === 0 ? (
                  <Check aria-hidden className="size-3" strokeWidth={2} />
                ) : (
                  <span className="text-xs tabular-nums">{stepIndex + 1}</span>
                )}
              </span>
              <span className="text-sm">{step}</span>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 h-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            animate={{ scaleX: 0.58 }}
            className="h-full origin-left bg-primary"
            initial={reduceMotion ? false : { scaleX: 0 }}
            transition={{
              delay: reduceMotion ? 0 : 0.32,
              duration: reduceMotion ? 0 : 0.8,
              ease: EASE_OUT,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function UpdateScene({ reduceMotion }: { reduceMotion: boolean }) {
  const notifications = [
    {
      label: "Product update",
      title: "The new project view is live",
      meta: "Sent to active teams",
    },
    {
      label: "Account alert",
      title: "Your weekly summary is ready",
      meta: "Delivered by email",
    },
    {
      label: "Helpful reminder",
      title: "Three tasks are waiting for review",
      meta: "Shown inside the workspace",
    },
  ];

  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-3 px-5 sm:px-12">
      {notifications.map((notification, notificationIndex) => (
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={cn(
            "w-full max-w-xl rounded-3xl border border-border bg-background/90 p-4 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/85 sm:p-5",
            notificationIndex === 1 && "self-end",
          )}
          initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.985 }}
          key={notification.title}
          transition={{
            delay: reduceMotion ? 0 : notificationIndex * 0.1,
            duration: reduceMotion ? 0 : 0.5,
            ease: EASE_OUT,
          }}
        >
          <div className="flex items-start gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">
              <Bell aria-hidden className="size-4" strokeWidth={1.7} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-muted-foreground text-xs">
                  {notification.label}
                </p>
                <span className="shrink-0 text-muted-foreground text-xs">
                  Just now
                </span>
              </div>
              <p className="mt-2 font-medium tracking-[-0.02em]">
                {notification.title}
              </p>
              <p className="mt-1.5 text-muted-foreground text-xs">
                {notification.meta}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function JourneyScene({ reduceMotion }: { reduceMotion: boolean }) {
  const stages = [
    { title: "Welcome sent", meta: "All new accounts", Icon: Send },
    { title: "Intent detected", meta: "Clicked product tour", Icon: Gauge },
    { title: "Follow-up ready", meta: "Personalized by activity", Icon: Route },
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center p-5 sm:p-10">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-background/90 p-5 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/85 sm:p-7">
        <div className="flex items-end justify-between gap-4 border-border/70 border-b pb-5">
          <div>
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
              Active journey
            </p>
            <p className="mt-2 font-medium text-xl tracking-[-0.035em]">
              New customer path
            </p>
          </div>
          <p className="text-right text-muted-foreground text-xs leading-5">
            68% completed
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {stages.map(({ title, meta, Icon }, stageIndex) => (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="relative flex items-center gap-4 rounded-2xl border border-border bg-background/90 p-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/85"
              initial={reduceMotion ? false : { opacity: 0, x: 16 }}
              key={title}
              transition={{
                delay: reduceMotion ? 0 : stageIndex * 0.1,
                duration: reduceMotion ? 0 : 0.48,
                ease: EASE_OUT,
              }}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">
                <Icon aria-hidden className="size-4" strokeWidth={1.7} />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-sm">{title}</p>
                <p className="mt-1 text-muted-foreground text-xs">{meta}</p>
              </div>
              <span className="ml-auto text-muted-foreground text-xs tabular-nums">
                0{stageIndex + 1}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
