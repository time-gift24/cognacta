"use client";

import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  COMMERCE_CART,
  type CommerceCartItem,
  commercePrice,
} from "./ecommerce-data";

export type ShoppingCartProps = {
  initialItems?: readonly CommerceCartItem[];
  currency?: string;
  /** Estimated shipping in minor currency units. Taxes are calculated by the host checkout. */
  shipping?: number;
  onCheckout?: (items: CommerceCartItem[]) => void | Promise<void>;
  onContinueShopping?: () => void;
  className?: string;
};
export function ShoppingCart({
  initialItems = COMMERCE_CART,
  currency = "USD",
  shipping = 0,
  onCheckout,
  onContinueShopping,
  className,
}: ShoppingCartProps) {
  const [items, setItems] = useState<CommerceCartItem[]>(() =>
    initialItems
      .filter((item) => item.product.stock > 0 && item.quantity > 0)
      .map((item) => ({
        ...item,
        quantity: Math.min(
          item.product.stock,
          Math.max(1, Math.floor(item.quantity)),
        ),
      })),
  );
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const reduce = useReducedMotion();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const total = subtotal + (items.length ? shipping : 0);
  function changeQuantity(id: string, difference: number) {
    setNotice("");
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.min(
                item.product.stock,
                Math.max(1, item.quantity + difference),
              ),
            }
          : item,
      ),
    );
  }
  async function checkout() {
    if (lock.current || !items.length || !onCheckout) return;
    lock.current = true;
    setPending(true);
    setNotice("");
    try {
      await onCheckout(
        items.map((item) => ({ ...item, product: { ...item.product } })),
      );
      setNotice("Checkout request sent.");
    } catch {
      setNotice("Checkout couldn’t open. Your bag is still here. Try again.");
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
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">A few good choices</p>
            <h2 className="mt-3 tracking-tight text-xl font-medium">
              Your shopping bag
            </h2>
          </div>
          <span className="text-sm text-muted-foreground">
            {count} {count === 1 ? "item" : "items"}
          </span>
        </div>
        <div className="mt-9 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
          <div>
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: reduce ? 0 : -8 }}
                  transition={{ duration: reduce ? 0 : 0.18, ease: EASE_OUT }}
                  className="flex gap-4 border-b border-border py-6 first:pt-0 sm:gap-6"
                >
                  <div className="size-24 shrink-0 overflow-hidden rounded-2xl bg-muted sm:size-32">
                    {/* biome-ignore lint/performance/noImgElement: Installable cart accepts host-provided product image URLs. */}
                    <img
                      src={item.product.image}
                      alt={item.product.imageAlt}
                      width={256}
                      height={256}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-medium">
                          {item.product.name}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.option ?? item.product.category}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pending}
                        aria-label={`Remove ${item.product.name}`}
                        title="Remove item"
                        onClick={() => {
                          setItems((current) =>
                            current.filter((entry) => entry.id !== item.id),
                          );
                          setNotice(`${item.product.name} removed.`);
                        }}
                        className="size-9 shrink-0 focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-full bg-muted/60">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Decrease ${item.product.name} quantity`}
                          disabled={pending || item.quantity <= 1}
                          onClick={() => changeQuantity(item.id, -1)}
                          className="size-9 focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="min-w-7 text-center text-sm tabular-nums">
                          <span className="sr-only">Quantity: </span>
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Increase ${item.product.name} quantity`}
                          disabled={
                            pending || item.quantity >= item.product.stock
                          }
                          onClick={() => changeQuantity(item.id, 1)}
                          className="size-9 focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                      <span className="text-sm font-medium tabular-nums">
                        {commercePrice(
                          item.product.price * item.quantity,
                          currency,
                        )}
                      </span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
            {!items.length && (
              <div className="flex min-h-72 flex-col items-center justify-center text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-muted">
                  <ShoppingBag className="size-6" />
                </span>
                <h3 className="mt-5 text-xl font-medium">
                  Room for something good.
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your bag is empty. Find a new everyday favorite.
                </p>
              </div>
            )}
            {onContinueShopping && (
              <Button
                variant="ghost"
                onClick={onContinueShopping}
                disabled={pending}
                className="mt-5 px-0 focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
              >
                Continue shopping
                <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
          <aside
            aria-label="Order summary"
            className="rounded-3xl bg-muted/40 p-6 sm:p-7"
          >
            <h3 className="text-xl font-medium">Order summary</h3>
            <dl className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">
                  {commercePrice(subtotal, currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Estimated shipping</dt>
                <dd>
                  {!items.length
                    ? "—"
                    : shipping === 0
                      ? "Free"
                      : commercePrice(shipping, currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-4 font-medium">
                <dt>Estimated total</dt>
                <dd className="tabular-nums">
                  {commercePrice(total, currency)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Taxes and final shipping calculated at checkout.
            </p>
            <Button
              onClick={() => void checkout()}
              disabled={pending || !items.length || !onCheckout}
              className="mt-6 w-full focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
            >
              {pending ? "Opening checkout…" : "Continue to checkout"}
              <ArrowRight className="size-4" />
            </Button>
            {!onCheckout && (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Checkout is not connected in this preview.
              </p>
            )}
            <output className="mt-3 block min-h-5 text-xs leading-5 text-muted-foreground">
              {notice}
            </output>
          </aside>
        </div>
      </div>
    </section>
  );
}
