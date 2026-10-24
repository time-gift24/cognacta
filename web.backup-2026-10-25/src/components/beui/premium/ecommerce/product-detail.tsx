"use client";

import { Check, ShoppingBag, Truck } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Select } from "@/components/beui/premium/select/select";
import { cn } from "@/lib/beui/utils";
import {
  COMMERCE_PRODUCTS,
  type CommerceProduct,
  commercePrice,
} from "./ecommerce-data";

import { ProductGallery } from "./product-gallery";

export type CommerceBundle = {
  id: string;
  name: string;
  description: string;
  extraPrice: number;
};
export type ProductDetailProps = {
  product?: CommerceProduct;
  bundles?: readonly CommerceBundle[];
  currency?: string;
  highlights?: readonly string[];
  shippingNote?: string;
  onAddToCart?: (selection: {
    product: CommerceProduct;
    bundle?: CommerceBundle;
    quantity: number;
    unitPrice: number;
  }) => void | Promise<void>;
  className?: string;
};
const BUNDLES: CommerceBundle[] = [
  {
    id: "standard",
    name: "Standard",
    description: "Headphones and charging cable",
    extraPrice: 0,
  },
  {
    id: "travel",
    name: "Travel set",
    description: "Add a protective case and cable pouch",
    extraPrice: 2500,
  },
];
export function ProductDetail({
  product = COMMERCE_PRODUCTS[0],
  bundles = BUNDLES,
  currency = "USD",
  highlights = [
    "Comfortable over-ear fit",
    "Wireless listening, wired when you need it",
    "A simple design made for daily use",
  ],
  shippingNote = "Shipping calculated at checkout",
  onAddToCart,
  className,
}: ProductDetailProps) {
  const [bundleId, setBundleId] = useState(bundles[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const bundle = bundles.find((item) => item.id === bundleId) ?? bundles[0];
  const unitPrice = product.price + (bundle?.extraPrice ?? 0);
  async function add() {
    if (lock.current || product.stock <= 0) return;
    lock.current = true;
    setPending(true);
    setNotice("");
    try {
      await onAddToCart?.({ product, bundle, quantity: 1, unitPrice });
      setNotice(
        `${product.name}${bundle ? ` · ${bundle.name}` : ""} added to ${onAddToCart ? "your" : "the demo"} bag.`,
      );
    } catch {
      setNotice("Couldn’t add this item. Please try again.");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-16 text-foreground sm:px-8 sm:py-20",
        className,
      )}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-16">
        <ProductGallery key={product.id} product={product} />
        <div className="max-w-lg">
          <p className="text-sm text-muted-foreground">
            {product.category} / The everyday collection
          </p>
          <h2 className="mt-4 tracking-tight text-xl font-medium">
            {product.name}
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
            {product.description}
          </p>
          <p className="mt-5 text-xl font-medium tabular-nums">
            {commercePrice(unitPrice, currency)}
          </p>
          <ul className="mt-7 space-y-3">
            {highlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-3 text-sm">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Check className="size-3" aria-hidden="true" />
                </span>
                {highlight}
              </li>
            ))}
          </ul>
          {bundles.length > 0 && (
            <div className="mt-8">
              <p className="mb-2 text-sm font-medium">Choose your set</p>
              <Select
                label="Product bundle"
                options={bundles.map((item) => ({
                  id: item.id,
                  label: item.name,
                  description: item.description,
                }))}
                value={bundle?.id}
                onValueChange={setBundleId}
                disabled={pending}
                portal
                className="w-full"
                buttonClassName="h-10 w-full justify-between rounded-full bg-background px-4 focus-visible:ring-2 focus-visible:ring-ring"
                optionsClassName="shadow-none"
              />
              <p className="mt-2 min-h-5 text-xs text-muted-foreground">
                {bundle?.description}
              </p>
            </div>
          )}
          <Button
            onClick={() => void add()}
            disabled={pending || product.stock <= 0}
            className="mt-6 w-full focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
          >
            <ShoppingBag className="size-4" />
            {product.stock <= 0
              ? "Sold out"
              : pending
                ? "Adding…"
                : "Add to bag"}
          </Button>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Truck className="size-4" aria-hidden="true" />
            {shippingNote}
          </p>
          <output className="mt-4 block min-h-10 text-sm text-muted-foreground">
            {notice}
          </output>
        </div>
      </div>
    </section>
  );
}
