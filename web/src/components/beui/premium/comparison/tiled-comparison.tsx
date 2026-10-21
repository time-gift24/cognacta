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

export type TiledComparisonProps = {
  title?: string;
  description?: string;
  products?: readonly MatrixComparisonProduct[];
  features?: readonly MatrixComparisonFeature[];
  footnote?: string;
  className?: string;
};

export function TiledComparison({
  title = "The whole picture. At a glance.",
  description = "Put your options side by side. See which workspace has the tools your team reaches for every day.",
  products = MATRIX_PRODUCTS,
  features = MATRIX_FEATURES,
  footnote = "Example comparison using illustrative products and features.",
  className,
}: TiledComparisonProps) {
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
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end md:gap-16">
          <h2
            id={id}
            className="max-w-md text-balance text-4xl font-medium tracking-tight"
          >
            {title}
          </h2>
          <p className="max-w-md text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        <section
          className="mt-10 overflow-x-auto rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-labelledby={id}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll this table horizontally.
          tabIndex={0}
        >
          <table
            className="w-full table-fixed border-separate border-spacing-2"
            style={{ minWidth: 224 + products.length * 132 }}
          >
            <caption className="sr-only">Product feature comparison</caption>
            <colgroup>
              <col style={{ width: 224 }} />
              {products.map((product) => (
                <col key={product.id} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="px-5 py-6 text-left text-sm font-medium text-muted-foreground"
                >
                  Choose what matters
                </th>
                {products.map((product) => {
                  const Icon = product.icon;
                  return (
                    <th
                      key={product.id}
                      scope="col"
                      className="rounded-2xl bg-background px-3 py-5 text-center text-sm font-medium"
                    >
                      <span className="flex flex-col items-center gap-3">
                        {Icon && (
                          <span className="flex size-9 items-center justify-center rounded-full bg-muted">
                            <Icon className="size-4" aria-hidden="true" />
                          </span>
                        )}
                        <span className="break-words">{product.name}</span>
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <motion.tr
                  key={feature.id}
                  initial={reduce ? false : { opacity: 0, y: 5 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    duration: reduce ? 0 : 0.3,
                    delay: reduce ? 0 : Math.min(index, 6) * 0.04,
                    ease: EASE_OUT,
                  }}
                >
                  <th
                    scope="row"
                    className="rounded-2xl bg-accent/10 px-5 py-5 text-left text-sm font-medium leading-6"
                  >
                    {feature.name}
                  </th>
                  {products.map((product) => (
                    <td
                      key={product.id}
                      className="rounded-2xl bg-background px-3 py-4 text-center"
                    >
                      <MatrixComparisonValue
                        value={feature.values[product.id]}
                      />
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </section>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-2 text-xs leading-5 text-muted-foreground">
          <p>{footnote}</p>
          <span className="inline-flex items-center gap-2 lg:hidden">
            <ArrowLeftRight className="size-3.5" aria-hidden="true" />
            Scroll to compare all options
          </span>
        </div>
      </div>
    </section>
  );
}
