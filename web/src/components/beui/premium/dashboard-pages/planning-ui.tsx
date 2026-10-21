"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useId } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownRadioGroup,
  AnimatedDropdownRadioItem,
  AnimatedDropdownTrigger,
} from "@/components/beui/premium/animated-dropdown";
import { KpiHeaderCards } from "@/components/beui/premium/dashboard/kpi-header-cards";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export function planningDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function PlanningFilter({
  label,
  value,
  options,
  onChange,
  icon: Icon,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string; icon: LucideIcon }[];
  onChange: (value: string) => void;
  icon: LucideIcon;
}) {
  return (
    <AnimatedDropdown>
      <AnimatedDropdownTrigger
        aria-label={`${label}: ${options.find((option) => option.value === value)?.label}`}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon aria-hidden className="size-4 text-muted-foreground" />
        {options.find((option) => option.value === value)?.label}
        <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
      </AnimatedDropdownTrigger>
      <AnimatedDropdownContent align="end" className="min-w-48">
        <AnimatedDropdownRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <AnimatedDropdownRadioItem key={option.value} value={option.value}>
              <option.icon
                aria-hidden
                className="size-4 text-muted-foreground"
              />
              {option.label}
            </AnimatedDropdownRadioItem>
          ))}
        </AnimatedDropdownRadioGroup>
      </AnimatedDropdownContent>
    </AnimatedDropdown>
  );
}

export function PlanningTabs({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <Tabs value={value} onValueChange={onChange} variant="pill">
      <TabsList
        aria-label={label}
        className="w-fit max-w-full flex-wrap rounded-full border border-border bg-background p-1"
      >
        {options.map((option, index) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            tabIndex={value === option.value ? 0 : -1}
            className="h-9 rounded-full px-3 py-0 text-xs sm:text-sm"
            indicatorClassName="bg-muted"
            onKeyDown={(event) => {
              const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
              if (!keys.includes(event.key)) return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? options.length - 1
                    : (index +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        options.length) %
                      options.length;
              onChange(options[next].value);
              const buttons = event.currentTarget
                .closest('[role="tablist"]')
                ?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
              buttons?.[next]?.focus();
            }}
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function PlanningProgress({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(bounded)}
      className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}
    >
      <motion.div
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: bounded / 100 }}
        transition={{ duration: reduce ? 0 : 0.5, ease: EASE_OUT }}
        className="h-full origin-left rounded-full bg-primary"
      />
    </div>
  );
}

export function PlanningMetrics({
  items,
}: {
  items: readonly {
    label: string;
    value: number;
    unit?: string;
    note: string;
    icon: ReactNode;
  }[];
}) {
  return (
    <KpiHeaderCards
      compact
      metrics={items.map((item) => ({
        id: item.label,
        label: item.label,
        value: item.value,
        format: { decimals: Number.isInteger(item.value) ? 0 : 1 },
        unit: item.unit,
        note: item.note,
        icon: item.icon,
      }))}
    />
  );
}

export function PlanningShell({
  eyebrow,
  title,
  name = "Avery",
  description,
  controls,
  children,
  asOf,
  className,
}: {
  eyebrow: string;
  title: string;
  name?: string;
  description: string;
  controls: ReactNode;
  children: ReactNode;
  asOf: string;
  className?: string;
}) {
  const heading = useId();
  const reduce = useReducedMotion();
  return (
    <main
      aria-labelledby={heading}
      className={cn(
        "@container/planning min-h-screen w-full bg-muted/20 text-foreground",
        className,
      )}
    >
      <div className="mx-auto max-w-screen-2xl space-y-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <motion.header
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.45, ease: EASE_OUT }}
          className="flex flex-col justify-between gap-5 @5xl/planning:flex-row @5xl/planning:items-end"
        >
          <div>
            <p className="mb-3 text-xs text-muted-foreground">
              Workspace <span className="px-2 text-border">/</span>
              {eyebrow}
            </p>
            <h1
              id={heading}
              className="text-2xl font-normal tracking-tight sm:text-3xl"
            >
              <span className="text-muted-foreground">{title},</span> {name}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">{controls}</div>
        </motion.header>
        {children}
        <footer className="text-xs text-muted-foreground">
          Demo workspace · Snapshot {planningDate(asOf)}, {asOf.slice(0, 4)}
        </footer>
      </div>
    </main>
  );
}
