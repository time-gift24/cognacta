"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Check,
  Compass,
  FileText,
  Globe,
  X,
} from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useId, useRef, useState } from "react";
import {
  AnimatedModal,
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { AnalyticsFlowChart } from "./analytics-flow-chart";
import {
  ANALYTICS_REPORTS,
  formatReportValue,
  reportChange,
  reportTotal,
} from "./analytics-flow-data";
import { AnalyticsFlowRibbons } from "./analytics-flow-ribbons";
import { HERO_HEADING_CLASS } from "./hero-heading";

export type HeroAnalyticsFlowProps = {
  eyebrow?: string;
  title?: string;
  titleAccent?: string;
  description?: string;
  brandName?: string;
  siteLabel?: string;
  primaryLabel?: string;
  /** Connect the primary CTA to onboarding. Defaults to focusing the demo. */
  onPrimaryAction?: () => void;
  className?: string;
};

export function HeroAnalyticsFlow({
  eyebrow = "A little context changes everything",
  title = "Know what’s working.",
  titleAccent = "Build on it.",
  description = "Follow the paths people take, see the actions that stick, and find the channels worth your time. The next step starts with a clearer picture.",
  brandName = "Fieldnote",
  siteLabel = "fieldnote.example",
  primaryLabel = "Explore the demo",
  onPrimaryAction,
  className,
}: HeroAnalyticsFlowProps) {
  const reduce = useReducedMotion();
  const id = useId();
  const demoRef = useRef<HTMLDivElement>(null);
  const inView = useInView(demoRef, { amount: 0.2 });
  const [selected, setSelected] = useState("reach");
  const [briefOpen, setBriefOpen] = useState(false);
  const report =
    ANALYTICS_REPORTS.find((item) => item.id === selected) ??
    ANALYTICS_REPORTS[0];
  const total = reportTotal(report);
  const change = reportChange(report);
  const rise = (delay: number) => ({
    initial: reduce ? (false as const) : { opacity: 0, y: 12 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: {
      duration: reduce ? 0 : 0.55,
      delay: reduce ? 0 : delay,
      ease: EASE_OUT,
    },
  });

  function exploreDemo() {
    demoRef.current?.scrollIntoView({
      behavior: reduce ? "instant" : "smooth",
      block: "start",
    });
    document
      .getElementById(`${id}-tab-${selected}`)
      ?.focus({ preventScroll: true });
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        "relative isolate w-full overflow-hidden bg-background px-4 py-16 text-foreground sm:px-8 sm:py-20",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <motion.p
            {...rise(0)}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
          >
            <span className="size-1.5 rounded-full bg-foreground" />
            {eyebrow}
          </motion.p>
          <motion.h1
            {...rise(0.04)}
            id={`${id}-title`}
            className={cn(HERO_HEADING_CLASS, "mt-7")}
          >
            <span className="block">{title}</span>
            <span className="mt-2 block text-muted-foreground">
              {titleAccent}
            </span>
          </motion.h1>
          <motion.p
            {...rise(0.1)}
            className="mx-auto mt-6 max-w-xl text-pretty text-sm leading-7 text-muted-foreground sm:text-base"
          >
            {description}
          </motion.p>
          <motion.div
            {...rise(0.16)}
            className="mt-7 flex flex-wrap justify-center gap-3"
          >
            <Button onClick={onPrimaryAction ?? exploreDemo}>
              {primaryLabel}
              <ArrowDown aria-hidden className="size-3.5" />
            </Button>
            <Button variant="outline" onClick={() => setBriefOpen(true)}>
              Read the brief
              <ArrowUpRight aria-hidden className="size-3.5" />
            </Button>
          </motion.div>
          <motion.p
            {...rise(0.22)}
            className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Check aria-hidden className="size-3.5" />
            Three reports. One connected view.
          </motion.p>
        </div>

        <div
          ref={demoRef}
          className="relative isolate mt-16 scroll-mt-6 sm:mt-20"
        >
          <AnalyticsFlowRibbons />
          <motion.div
            {...rise(0.18)}
            className="overflow-hidden rounded-3xl border border-border bg-background"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-border border-b px-5 py-4 sm:px-7">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border">
                  <Compass aria-hidden className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{brandName}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {siteLabel}
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-border px-2.5 py-1.5 text-xs text-muted-foreground">
                Sample report
              </span>
            </div>
            <Tabs
              value={selected}
              onValueChange={setSelected}
              variant="underline"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-border border-b px-5 sm:px-7">
                <TabsList
                  aria-label="Analytics reports"
                  className="gap-2 border-0"
                  onKeyDown={(event) => {
                    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
                    if (!keys.includes(event.key)) return;
                    const currentIndex = ANALYTICS_REPORTS.findIndex(
                      (item) => item.id === selected,
                    );
                    const index =
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? ANALYTICS_REPORTS.length - 1
                          : (currentIndex +
                              (event.key === "ArrowRight" ? 1 : -1) +
                              ANALYTICS_REPORTS.length) %
                            ANALYTICS_REPORTS.length;
                    const next = ANALYTICS_REPORTS[index].id;
                    event.preventDefault();
                    setSelected(next);
                    document.getElementById(`${id}-tab-${next}`)?.focus();
                  }}
                >
                  {ANALYTICS_REPORTS.map((item) => (
                    <TabsTrigger
                      key={item.id}
                      value={item.id}
                      id={`${id}-tab-${item.id}`}
                      aria-controls={`${id}-report`}
                      tabIndex={selected === item.id ? 0 : -1}
                      className="relative py-4 text-xs focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:text-sm"
                    >
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <span className="hidden text-xs text-muted-foreground sm:block">
                  Sep 26 – Oct 9 · 14 days
                </span>
              </div>
              <div
                id={`${id}-report`}
                role="tabpanel"
                aria-labelledby={`${id}-tab-${selected}`}
                className="p-5 sm:p-7"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-medium">
                    {report.label} at a glance
                  </h2>
                  <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                    <Globe aria-hidden className="size-3.5" />
                    All channels
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="col-span-2 rounded-2xl border border-border px-4 py-4 sm:col-span-1 sm:px-5">
                    <p className="text-xs text-muted-foreground">
                      Total {report.unit}
                    </p>
                    <NumberTicker
                      value={total}
                      prefix={report.currency ? "$" : undefined}
                      locale
                      className="mt-3 text-3xl font-medium"
                      duration={0.6}
                    />
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <ArrowUpRight aria-hidden className="size-3" />
                      {change.toFixed(1)}% vs. previous period
                    </p>
                  </div>
                  {report.supportingMetrics.map((metric, index) => (
                    <div
                      key={metric.label}
                      className="rounded-2xl border border-border px-4 py-4 sm:px-5"
                    >
                      <p className="text-xs text-muted-foreground">
                        {metric.label}
                      </p>
                      <NumberTicker
                        value={metric.value}
                        prefix={
                          report.currency && index === 1 ? "$" : undefined
                        }
                        suffix={metric.suffix}
                        locale
                        className="mt-3 text-2xl font-medium sm:text-3xl"
                        duration={0.6}
                      />
                      <p className="mt-2 text-xs text-muted-foreground">
                        Across this sample period
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[1.8fr_1fr]">
                  <figure
                    aria-labelledby={`${id}-chart-title`}
                    className="min-w-0 rounded-2xl border border-border p-4 sm:p-5"
                  >
                    <figcaption>
                      <h3
                        id={`${id}-chart-title`}
                        className="text-xl font-medium"
                      >
                        {report.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-0.5 w-3 rounded-full bg-primary" />
                          This period
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 border-muted-foreground border-t border-dashed" />
                          Previous period
                        </span>
                      </div>
                    </figcaption>
                    <div className="mt-4">
                      <AnalyticsFlowChart
                        report={report}
                        animate={inView && !reduce}
                      />
                    </div>
                  </figure>
                  <div className="rounded-2xl border border-border p-4 sm:p-5">
                    <h3 className="text-xl font-medium">
                      {report.breakdownTitle}
                    </h3>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Share of{" "}
                      {report.currency
                        ? "attributed sales"
                        : report.id === "activation"
                          ? "first actions"
                          : "sessions"}
                    </p>
                    <ul className="mt-7 space-y-5">
                      {report.sources.map((source, index) => (
                        <li key={source.name}>
                          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                            <span>{source.name}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {source.share}%
                            </span>
                          </div>
                          <div className="h-1 overflow-hidden rounded-full border border-border">
                            <motion.div
                              className="h-full origin-left rounded-full bg-foreground/60"
                              style={{ width: `${source.share}%` }}
                              initial={reduce ? false : { scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              key={`${report.id}-${index}`}
                              transition={{
                                duration: reduce ? 0 : 0.5,
                                delay: reduce ? 0 : index * 0.04,
                                ease: EASE_OUT,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-4 flex flex-col items-start gap-4 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:p-5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border">
                    <ChartNoAxesCombined aria-hidden className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">A useful next step</p>
                    <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                      {report.insight}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setBriefOpen(true)}
                    className="shrink-0"
                  >
                    Open brief
                    <ArrowRight aria-hidden className="size-3.5" />
                  </Button>
                </div>
              </div>
            </Tabs>
            <div className="flex flex-wrap items-center justify-between gap-2 border-border border-t px-5 py-3 text-xs text-muted-foreground sm:px-7">
              <span>Illustrative data · USD for revenue</span>
              <span>Try a report or explore the chart</span>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatedModal
        open={briefOpen}
        onOpenChange={setBriefOpen}
        panelClassName="max-w-lg"
      >
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText aria-hidden className="size-4" />
              Sample {report.label.toLowerCase()} brief
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close report brief"
              onClick={() => setBriefOpen(false)}
            >
              <X aria-hidden className="size-4" />
            </Button>
          </div>
          <AnimatedModalTitle className="text-xl font-medium">
            {report.title}
          </AnimatedModalTitle>
          <AnimatedModalDescription className="mt-3 text-sm leading-6 text-muted-foreground">
            {report.insight}
          </AnimatedModalDescription>
          <div className="mt-6 rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">
              Total {report.unit} · Sample period
            </p>
            <p className="mt-2 text-3xl font-medium tabular-nums">
              {formatReportValue(report, total)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {change.toFixed(1)}% above the previous sample period
            </p>
          </div>
          <p className="mt-6 text-sm font-medium">Where to focus</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {report.nextStep}
          </p>
          <div className="mt-7 flex justify-end">
            <Button variant="outline" onClick={() => setBriefOpen(false)}>
              Back to the report
            </Button>
          </div>
        </div>
      </AnimatedModal>
    </section>
  );
}
