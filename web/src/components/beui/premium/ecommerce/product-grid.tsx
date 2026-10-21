"use client";

import { Check, Plus, Search, ShoppingBag } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { Select } from "@/components/beui/premium/select/select";
import { EASE_OUT } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";
import {
  COMMERCE_PRODUCTS,
  type CommerceProduct,
  commercePrice,
} from "./ecommerce-data";

export type ProductGridProps = {
  title?: string;
  description?: string;
  products?: readonly CommerceProduct[];
  currency?: string;
  onAddToCart?: (product: CommerceProduct) => void | Promise<void>;
  className?: string;
};
export function ProductGrid({
  title = "Good things. Every day.",
  description = "Considered objects for your desk, your downtime, and everything in between.",
  products = COMMERCE_PRODUCTS,
  currency = "USD",
  onAddToCart,
  className,
}: ProductGridProps) {
  const [category, setCategory] = useState("All objects");
  const [sort, setSort] = useState("featured");
  const [added, setAdded] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const id = useId();
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const categories = [
    "All objects",
    ...new Set(products.map((product) => product.category)),
  ];
  const activeCategory = categories.includes(category)
    ? category
    : "All objects";
  const visible = products
    .filter(
      (product) =>
        activeCategory === "All objects" || product.category === activeCategory,
    )
    .slice()
    .sort((a, b) =>
      sort === "price-low"
        ? a.price - b.price
        : sort === "price-high"
          ? b.price - a.price
          : 0,
    );
  const count = Object.values(added).reduce(
    (total, quantity) => total + quantity,
    0,
  );
  async function add(product: CommerceProduct) {
    if (lock.current || (added[product.id] ?? 0) >= product.stock) return;
    lock.current = true;
    setPending(product.id);
    setNotice("");
    try {
      await onAddToCart?.(product);
      setAdded((current) => ({
        ...current,
        [product.id]: (current[product.id] ?? 0) + 1,
      }));
      setNotice(
        `${product.name} added to ${onAddToCart ? "your" : "the demo"} bag.`,
      );
    } catch {
      setNotice("Couldn’t add this item. Please try again.");
    } finally {
      lock.current = false;
      setPending(null);
    }
  }
  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-16 text-foreground sm:px-8 sm:py-20",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-sm text-muted-foreground">
              The everyday collection
            </p>
            <h2 className="mt-3 text-balance tracking-tight text-xl font-medium">
              {title}
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-2 rounded-full bg-muted px-3 py-2 text-sm">
            <ShoppingBag className="size-4" aria-hidden="true" />
            <span className="sr-only">Items added: </span>
            {count}
          </span>
        </div>
        <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
          <Tabs
            value={activeCategory}
            onValueChange={setCategory}
            variant="pill"
            className="min-w-0 max-w-full"
          >
            <TabsList
              aria-label="Product categories"
              className="max-w-full overflow-x-auto bg-muted"
            >
              {categories.map((item, index) => (
                <TabsTrigger
                  key={item}
                  value={item}
                  id={`${id}-tab-${index}`}
                  aria-controls={`${id}-products`}
                  tabIndex={activeCategory === item ? 0 : -1}
                  className="h-9 rounded-full text-sm focus-visible:ring-2 focus-visible:ring-ring"
                  onKeyDown={(event) => {
                    let next = index;
                    if (event.key === "ArrowRight")
                      next = (index + 1) % categories.length;
                    else if (event.key === "ArrowLeft")
                      next =
                        (index - 1 + categories.length) % categories.length;
                    else if (event.key === "Home") next = 0;
                    else if (event.key === "End") next = categories.length - 1;
                    else return;
                    event.preventDefault();
                    setCategory(categories[next]);
                    document.getElementById(`${id}-tab-${next}`)?.focus();
                  }}
                >
                  {item}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Select
            label="Sort products"
            align="end"
            value={sort}
            onValueChange={setSort}
            portal
            options={[
              { id: "featured", label: "Featured" },
              { id: "price-low", label: "Price: high to low" },
              { id: "price-high", label: "Price: high to low" },
            ]}
            buttonClassName="h-10 rounded-full bg-background focus-visible:ring-2 focus-visible:ring-ring"
            optionsClassName="w-64 shadow-none"
          />
        </div>
        <div
          role="tabpanel"
          id={`${id}-products`}
          aria-labelledby={`${id}-tab-${categories.indexOf(activeCategory)}`}
          className="mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4"
        >
          {visible.map((product) => {
            const quantity = added[product.id] ?? 0;
            return (
              <motion.article
                key={product.id}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.3, ease: EASE_OUT }}
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted">
                  {/* biome-ignore lint/performance/noImgElement: Installable block supports external product image URLs without Next image configuration. */}
                  <motion.img
                    src={product.image}
                    alt={product.imageAlt}
                    loading="lazy"
                    width={600}
                    height={750}
                    whileHover={
                      canHover && !reduce ? { scale: 1.04 } : undefined
                    }
                    transition={{ duration: 0.45, ease: EASE_OUT }}
                    className="size-full object-cover"
                  />
                  {product.label && (
                    <span className="absolute left-3 top-3 rounded-full bg-background/95 px-3 py-1.5 text-xs font-medium">
                      {product.label}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {product.category}
                    </p>
                    <h3 className="mt-1 text-xl font-medium">{product.name}</h3>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium tabular-nums">
                    {commercePrice(product.price, currency)}
                  </span>
                  <Button
                    variant="outline"
                    disabled={pending !== null || quantity >= product.stock}
                    onClick={() => void add(product)}
                    className="px-3 text-xs focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
                  >
                    {pending === product.id ? (
                      "Adding…"
                    ) : product.stock === 0 ? (
                      "Sold out"
                    ) : quantity >= product.stock ? (
                      "Limit reached"
                    ) : quantity ? (
                      <>
                        <Check className="size-3.5" />
                        Add another
                      </>
                    ) : (
                      <>
                        <Plus className="size-3.5" />
                        Add to bag
                      </>
                    )}
                  </Button>
                </div>
              </motion.article>
            );
          })}
          {!visible.length && (
            <div className="col-span-full py-16 text-center">
              <Search className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No products in this collection yet.
              </p>
            </div>
          )}
        </div>
        <output className="mt-5 block min-h-5 text-sm text-muted-foreground">
          {notice}
        </output>
      </div>
    </section>
  );
}
