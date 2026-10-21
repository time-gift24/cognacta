"use client";

import { ArrowLeftRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  MATRIX_FEATURES,
  MATRIX_PRODUCTS,
  type MatrixComparisonFeature,
  type MatrixComparisonProduct,
} from "./matrix-comparison-data";
import { MatrixComparisonValue } from "./matrix-comparison-value";

export type SpotlightComparisonProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  products?: readonly MatrixComparisonProduct[];
  features?: readonly MatrixComparisonFeature[];
  featuredId?: string;
  featuredLabel?: string;
  footnote?: string;
  className?: string;
};
const PRODUCTS = MATRIX_PRODUCTS.slice(0, 4);

export function SpotlightComparison({
  eyebrow = "Compare the possibilities",
  title = "Built for the way your team works.",
  description = "All the essentials, together. See how Forma compares with other ways to organize your work.",
  products = PRODUCTS,
  features = MATRIX_FEATURES,
  featuredId = "forma",
  featuredLabel = "Our pick",
  footnote = "Example comparison using illustrative products and features.",
  className,
}: SpotlightComparisonProps) {
  const reduce = useReducedMotion();
  const id = useId();
  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-20 text-foreground sm:px-8 sm:py-24",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
          <h2
            id={id}
            className="mt-4 text-balance text-4xl font-medium tracking-tight"
          >
            {title}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: reduce ? 0 : 0.4, ease: EASE_OUT }}
          className="mt-12 bg-background"
        >
          <section
            className="overflow-x-auto rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-labelledby={id}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll this table horizontally.
            tabIndex={0}
          >
            <table
              className="w-full table-fixed border-separate border-spacing-0"
              style={{ minWidth: 192 + products.length * 144 }}
            >
              <caption className="sr-only">
                Product capabilities with{" "}
                {products.find((product) => product.id === featuredId)?.name ??
                  "no product"}{" "}
                featured
              </caption>
              <colgroup>
                <col style={{ width: 192 }} />
                {products.map((product) => (
                  <col key={product.id} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-background px-4 pb-6 pt-8 text-left align-bottom text-sm font-medium text-muted-foreground"
                  >
                    Features
                  </th>
                  {products.map((product) => {
                    const featured = product.id === featuredId;
                    const Icon = product.icon;
                    return (
                      <th
                        key={product.id}
                        scope="col"
                        className={cn(
                          "px-4 pb-6 pt-4 text-center align-top",
                          featured && "rounded-t-2xl bg-accent/10",
                        )}
                      >
                        <div className="mb-4 flex h-6 items-center justify-center">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs font-medium",
                              featured
                                ? "bg-accent/20 text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {featured ? featuredLabel : "Alternative"}
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                          {Icon && (
                            <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                              <Icon className="size-5" aria-hidden="true" />
                            </span>
                          )}
                          <span className="break-words text-xl font-medium">
                            {product.name}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {features.map((feature, index) => (
                  <tr key={feature.id}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-t border-border/60 bg-background px-4 py-4 text-left text-sm font-medium leading-6"
                    >
                      {feature.name}
                    </th>
                    {products.map((product) => (
                      <td
                        key={product.id}
                        className={cn(
                          "px-4 py-4 text-center",
                          product.id === featuredId
                            ? "bg-accent/10"
                            : "border-t border-border/60",
                        )}
                      >
                        <motion.div
                          initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true, amount: 0.5 }}
                          transition={{
                            duration: reduce ? 0 : 0.25,
                            delay: reduce ? 0 : Math.min(index, 6) * 0.035,
                            ease: EASE_OUT,
                          }}
                        >
                          <MatrixComparisonValue
                            value={feature.values[product.id]}
                            emphasized={product.id === featuredId}
                          />
                        </motion.div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-t border-border/60 bg-background px-4 py-6 text-left text-xs font-medium text-muted-foreground"
                  >
                    Features marked included
                  </th>
                  {products.map((product) => (
                    <td
                      key={product.id}
                      className={cn(
                        "px-4 py-6 text-center",
                        product.id === featuredId
                          ? "rounded-b-2xl bg-accent/10"
                          : "border-t border-border/60",
                      )}
                    >
                      <span className="text-xl font-medium tabular-nums">
                        {
                          features.filter(
                            (feature) => feature.values[product.id] === true,
                          ).length
                        }
                      </span>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </section>
          <p className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground lg:hidden">
            <ArrowLeftRight className="size-3.5" aria-hidden="true" />
            Scroll to compare all options
          </p>
        </motion.div>
        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          {footnote}
        </p>
      </div>
    </section>
  );
}
