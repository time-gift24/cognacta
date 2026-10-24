"use client";

import { ArrowRight, Check, Minus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { Dither } from "./dither";

export type ComparisonValue = boolean | string;

export type ComparisonProduct = {
  id: string;
  name: string;
  note: string;
  recommended?: boolean;
};

export type ComparisonFeature = {
  name: string;
  description?: string;
  values: Record<string, ComparisonValue>;
};

const DEFAULT_PRODUCTS: ComparisonProduct[] = [
  {
    id: "signal",
    name: "Signal",
    note: "The complete experience",
    recommended: true,
  },
  { id: "workshop", name: "Workshop", note: "A flexible starting point" },
  { id: "legacy", name: "Legacy suite", note: "The traditional route" },
];

const DEFAULT_FEATURES: ComparisonFeature[] = [
  {
    name: "Ready to launch",
    description: "Typical time from setup to your first live workflow.",
    values: { signal: "18 minutes", workshop: "2–3 days", legacy: "2–4 weeks" },
  },
  {
    name: "Your source code",
    description: "Keep the complete implementation in your repository.",
    values: { signal: true, workshop: true, legacy: false },
  },
  {
    name: "Motion included",
    description: "Polished transitions with accessible reduced-motion states.",
    values: { signal: true, workshop: "Some", legacy: false },
  },
  {
    name: "Light and dark themes",
    description: "Both appearances are considered from the beginning.",
    values: { signal: "Included", workshop: "Manual setup", legacy: "Add-on" },
  },
  {
    name: "Future updates",
    description: "How new improvements make their way to your project.",
    values: {
      signal: "Always included",
      workshop: "Per release",
      legacy: "By contract",
    },
  },
  {
    name: "Hosted runtime required",
    description: "Whether your product depends on another hosted service.",
    values: { signal: false, workshop: false, legacy: true },
  },
];

export type FeatureComparisonProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  products?: readonly ComparisonProduct[];
  features?: readonly ComparisonFeature[];
  onSelectProduct?: (product: ComparisonProduct) => void;
  className?: string;
};

export function FeatureComparison({
  eyebrow = "A clearer comparison",
  title = "Choose the way you want to build.",
  description = "A thoughtful look at the details that matter after launch—not a wall of features designed to overwhelm you.",
  products = DEFAULT_PRODUCTS,
  features = DEFAULT_FEATURES,
  onSelectProduct,
  className,
}: FeatureComparisonProps) {
  const reduce = useReducedMotion();
  const tabId = useId();
  const recommended =
    products.find((product) => product.recommended) ?? products[0];
  const [focusedId, setFocusedId] = useState(recommended?.id ?? "");
  const focused =
    products.find((product) => product.id === focusedId) ?? products[0];

  if (!focused) return null;

  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-20 sm:px-8 sm:py-28",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-primary">{eyebrow}</p>
          <h2 className="mt-4 text-balance text-4xl font-medium text-foreground tracking-tight">
            {title}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground leading-7">
            {description}
          </p>
        </div>

        <div className="mt-12 md:hidden">
          <Tabs value={focused.id} onValueChange={setFocusedId} variant="pill">
            <TabsList
              aria-label="Compare products"
              className="max-w-full overflow-x-auto bg-muted"
            >
              {products.map((product, index) => (
                <TabsTrigger
                  key={product.id}
                  value={product.id}
                  id={`${tabId}-${product.id}`}
                  aria-controls={`${tabId}-panel`}
                  tabIndex={product.id === focused.id ? 0 : -1}
                  className="h-9 rounded-full text-xs focus-visible:ring-2 focus-visible:ring-ring"
                  onKeyDown={(event) => {
                    let next = index;
                    if (event.key === "ArrowRight")
                      next = (index + 1) % products.length;
                    else if (event.key === "ArrowLeft")
                      next = (index - 1 + products.length) % products.length;
                    else if (event.key === "Home") next = 0;
                    else if (event.key === "End") next = products.length - 1;
                    else return;
                    event.preventDefault();
                    setFocusedId(products[next].id);
                    document
                      .getElementById(`${tabId}-${products[next].id}`)
                      ?.focus();
                  }}
                >
                  {product.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={focused.id}
              id={`${tabId}-panel`}
              role="tabpanel"
              aria-labelledby={`${tabId}-${focused.id}`}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -5 }}
              transition={
                reduce ? { duration: 0 } : { duration: 0.28, ease: EASE_OUT }
              }
              className={cn(
                "mt-4 overflow-hidden rounded-3xl border border-border bg-background",
                focused.recommended && "border-primary/40",
              )}
            >
              <div className="flex items-start justify-between gap-4 px-5 py-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-xl text-foreground">
                      {focused.name}
                    </h3>
                    {focused.recommended ? <RecommendedBadge /> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {focused.note}
                  </p>
                </div>
              </div>

              <div className="mx-5 border-border border-t">
                {features.map((feature) => (
                  <div
                    key={feature.name}
                    className="flex min-h-20 items-center justify-between gap-5 border-border border-b py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {feature.name}
                      </p>
                      {feature.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-5">
                          {feature.description}
                        </p>
                      ) : null}
                    </div>
                    <ComparisonCell
                      value={feature.values[focused.id] ?? false}
                    />
                  </div>
                ))}
              </div>

              <div className="p-5 pt-2">
                <Button
                  onClick={() => onSelectProduct?.(focused)}
                  className="w-full text-xs focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
                  variant={focused.recommended ? "primary" : "secondary"}
                >
                  Choose {focused.name}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={
            reduce ? { duration: 0 } : { duration: 0.55, ease: EASE_OUT }
          }
          className="mt-14 hidden grid-cols-[minmax(240px,0.8fr)_minmax(0,2fr)] gap-4 md:grid"
        >
          <div className="relative isolate overflow-hidden rounded-3xl border border-border bg-background">
            <div className="pointer-events-none absolute inset-0 -z-10 opacity-10 invert dark:invert-0">
              <Dither
                waveColor={[0.9, 0.9, 0.9]}
                waveSpeed={0.035}
                waveFrequency={3.2}
                waveAmplitude={0.28}
                colorNum={4}
                pixelSize={3}
                disableAnimation={Boolean(reduce)}
                enableMouseInteraction={false}
              />
            </div>
            <div className="flex min-h-32 items-end px-7 py-7">
              <span className="text-sm font-semibold text-foreground">
                What matters
              </span>
            </div>
            {features.map((feature, index) => (
              <motion.div
                key={feature.name}
                initial={reduce ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { duration: 0.35, ease: EASE_OUT, delay: index * 0.035 }
                }
                className="flex min-h-24 flex-col justify-center border-border border-t px-7 py-4"
              >
                <span className="text-sm font-medium text-foreground">
                  {feature.name}
                </span>
                {feature.description ? (
                  <span className="mt-1 max-w-xs text-xs text-muted-foreground leading-5">
                    {feature.description}
                  </span>
                ) : null}
              </motion.div>
            ))}
            <div className="flex min-h-24 items-center border-border border-t px-7 py-5">
              <p className="max-w-48 text-sm text-muted-foreground leading-5">
                Pick the fit that feels right for your team.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-background">
            <div
              className="grid min-h-32 items-end"
              style={{
                gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))`,
              }}
            >
              {products.map((product) => (
                <div key={product.id} className="h-full px-4 py-7 lg:px-6">
                  {product.recommended ? <RecommendedBadge /> : null}
                  <span className="mt-3 block text-xl font-medium text-foreground">
                    {product.name}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {product.note}
                  </span>
                </div>
              ))}
            </div>

            {features.map((feature, index) => (
              <motion.div
                key={feature.name}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { duration: 0.35, ease: EASE_OUT, delay: index * 0.035 }
                }
                className="grid min-h-24 items-center border-border border-t"
                style={{
                  gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))`,
                }}
              >
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex h-full items-center px-4 py-4 lg:px-6"
                  >
                    <ComparisonCell
                      value={feature.values[product.id] ?? false}
                    />
                  </div>
                ))}
              </motion.div>
            ))}

            <div
              className="grid min-h-24 items-center border-border border-t"
              style={{
                gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))`,
              }}
            >
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex h-full items-center px-4 py-5 lg:px-6"
                >
                  <Button
                    onClick={() => onSelectProduct?.(product)}
                    variant={product.recommended ? "primary" : "secondary"}
                    className="w-full text-xs focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
                  >
                    Choose {product.name}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ComparisonCell({ value }: { value: ComparisonValue }) {
  if (typeof value === "boolean") {
    return value ? (
      <span className="flex items-center gap-2 text-sm text-foreground">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-foreground">
          <Check className="size-3.5" strokeWidth={2.5} />
        </span>
        Included
      </span>
    ) : (
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border">
          <Minus className="size-3.5" />
        </span>
        Not included
      </span>
    );
  }

  return <span className="text-sm font-medium text-foreground">{value}</span>;
}

function RecommendedBadge() {
  return (
    <span className="inline-flex rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground">
      Recommended
    </span>
  );
}
