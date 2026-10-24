"use client";

import { Check, Minus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Checkbox } from "@/components/beui/motion/checkbox";
import { Select } from "@/components/beui/premium/select/select";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type HeadToHeadProduct = { id: string; name: string; note: string };
export type HeadToHeadFeature = {
  id: string;
  name: string;
  values: Record<string, boolean | string>;
};
export type HeadToHeadComparisonProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  product?: HeadToHeadProduct;
  alternatives?: readonly HeadToHeadProduct[];
  features?: readonly HeadToHeadFeature[];
  footnote?: string;
  className?: string;
};
const PRODUCT: HeadToHeadProduct = {
  id: "forma",
  name: "Forma",
  note: "A workspace that grows with you",
};
const ALTERNATIVES: HeadToHeadProduct[] = [
  { id: "essentials", name: "Essentials", note: "The basics, ready to go" },
  { id: "custom", name: "Custom stack", note: "Build and maintain your own" },
];
const FEATURES: HeadToHeadFeature[] = [
  {
    id: "projects",
    name: "Projects",
    values: { forma: "Unlimited", essentials: "Up to 10", custom: "Unlimited" },
  },
  {
    id: "members",
    name: "Team members",
    values: { forma: "Unlimited", essentials: "Up to 5", custom: "Unlimited" },
  },
  {
    id: "knowledge",
    name: "Shared knowledge base",
    values: { forma: true, essentials: false, custom: "Separate tool" },
  },
  {
    id: "search",
    name: "Search across your work",
    values: { forma: true, essentials: true, custom: "Manual setup" },
  },
  {
    id: "automation",
    name: "Workflow automation",
    values: { forma: true, essentials: false, custom: "Manual setup" },
  },
  {
    id: "export",
    name: "Export your data",
    values: { forma: true, essentials: true, custom: true },
  },
  {
    id: "support",
    name: "Support",
    values: {
      forma: "Priority",
      essentials: "Community",
      custom: "Self-managed",
    },
  },
];

export function HeadToHeadComparison({
  eyebrow = "Find your fit",
  title = "The details make the difference.",
  description = "Compare the essentials, then focus on what matters to your team.",
  product = PRODUCT,
  alternatives = ALTERNATIVES,
  features = FEATURES,
  footnote = "Illustrative products and features. Replace with your own comparison data.",
  className,
}: HeadToHeadComparisonProps) {
  const reduce = useReducedMotion();
  const [alternativeId, setAlternativeId] = useState(
    alternatives[0]?.id ?? " ",
  );
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const alternative =
    alternatives.find((entry) => entry.id === alternativeId) ?? alternatives[0];
  if (!alternative) return null;
  const differs = (feature: HeadToHeadFeature) =>
    feature.values[product.id] !== feature.values[alternative.id];
  const differenceCount = features.filter(differs).length;
  const visibleFeatures = differencesOnly ? features.filter(differs) : features;
  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-20 text-foreground sm:px-8 sm:py-24",
        className,
      )}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-4 text-balance text-4xl font-medium tracking-tight">
            {title}
          </h2>
          <p className="mt-5 text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Compare {product.name} with
            </span>
            <Select
              label="Compare against"
              value={alternative.id}
              onValueChange={setAlternativeId}
              options={alternatives.map((entry) => ({
                id: entry.id,
                label: entry.name,
                description: entry.note,
              }))}
              portal
              buttonClassName="h-10 rounded-full bg-background focus-visible:ring-2 focus-visible:ring-ring"
              optionsClassName="shadow-none"
            />
          </div>
          <Checkbox
            checked={differencesOnly}
            onCheckedChange={setDifferencesOnly}
            label="Only differences"
            className="text-sm"
          />
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: reduce ? 0 : 0.4, ease: EASE_OUT }}
          className="mt-6 overflow-hidden rounded-3xl border border-border bg-background"
        >
          <table className="w-full table-fixed text-left">
            <caption className="sr-only">
              {product.name} compared with {alternative.name}
              {differencesOnly ? ", differences only" : " "}
            </caption>
            <colgroup>
              <col className="w-2/5" />
              <col className="w-[30%]" />
              <col className="w-[30%]" />
            </colgroup>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="px-4 py-7 align-bottom text-sm font-medium text-muted-foreground sm:px-6"
                >
                  What you get
                </th>
                {[product, alternative].map((entry) => (
                  <th
                    scope="col"
                    key={entry.id}
                    className="break-words px-3 py-7 align-top sm:px-6"
                  >
                    <span className="block text-xl font-medium">
                      {entry.name}
                    </span>
                    <span className="mt-2 hidden text-xs font-normal leading-5 text-muted-foreground sm:block">
                      {entry.note}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleFeatures.map((feature) => (
                <tr key={feature.id} className="border-t border-border">
                  <th
                    scope="row"
                    className="break-words px-4 py-5 text-xs font-medium leading-5 sm:px-6 sm:text-sm"
                  >
                    {feature.name}
                  </th>
                  {[product, alternative].map((entry) => (
                    <td
                      key={entry.id}
                      className="break-words px-3 py-5 text-xs leading-5 sm:px-6 sm:text-sm"
                    >
                      <motion.div
                        key={`${entry.id}-${String(feature.values[entry.id])}`}
                        initial={reduce ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          duration: reduce ? 0 : 0.18,
                          ease: EASE_OUT,
                        }}
                      >
                        <FeatureValue value={feature.values[entry.id]} />
                      </motion.div>
                    </td>
                  ))}
                </tr>
              ))}
              {!visibleFeatures.length && (
                <tr>
                  <td
                    colSpan={3}
                    className="border-t border-border px-6 py-10 text-center text-sm text-muted-foreground"
                  >
                    {features.length
                      ? "Both options match on every listed feature."
                      : "No features to compare yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </motion.div>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-3 text-xs leading-5 text-muted-foreground">
          <p className="max-w-lg">{footnote}</p>
          <output>
            {differenceCount}{" "}
            {differenceCount === 1 ? "difference" : "differences"} across{" "}
            {features.length} {features.length === 1 ? "feature" : "features"}
          </output>
        </div>
      </div>
    </section>
  );
}

function FeatureValue({ value }: { value: boolean | string | undefined }) {
  if (typeof value === "string") return <span>{value}</span>;
  if (value === undefined)
    return <span className="text-muted-foreground">Not specified</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
        {value ? (
          <Check className="size-3.5" aria-hidden="true" />
        ) : (
          <Minus className="size-3.5" aria-hidden="true" />
        )}
      </span>
      <span className="sr-only sm:not-sr-only">
        {value ? "Included" : "Not included"}
      </span>
    </span>
  );
}
