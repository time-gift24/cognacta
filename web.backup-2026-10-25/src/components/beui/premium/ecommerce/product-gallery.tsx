// biome-ignore-all lint/a11y/useSemanticElements: Carousel and slide groups follow the WAI media carousel pattern, not form fieldsets.

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import type { CommerceProduct } from "./ecommerce-data";

export function ProductGallery({ product }: { product: CommerceProduct }) {
  const images = product.images?.length
    ? product.images
    : [{ src: product.image, alt: product.imageAlt }];
  const [active, setActive] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const reduce = useReducedMotion();
  const current = Math.min(active, images.length - 1);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const next = Math.min(indexRef.current, images.length - 1);
      element.scrollTo({
        left: next * element.clientWidth,
        behavior: "instant",
      });
      indexRef.current = next;
      setActive(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [images.length]);
  function select(index: number) {
    const element = viewport.current;
    if (!element) return;
    element.scrollTo({
      left:
        Math.max(0, Math.min(index, images.length - 1)) * element.clientWidth,
      behavior: reduce ? "instant" : "smooth",
    });
  }
  return (
    <div className="min-w-0">
      <div className="relative overflow-hidden rounded-3xl bg-muted">
        <div
          ref={viewport}
          role="group"
          aria-roledescription="carousel"
          aria-label={`${product.name} images`}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Gallery supports arrow-key navigation and native scrolling.
          tabIndex={0}
          onScroll={(event) => {
            const element = event.currentTarget;
            if (!element.clientWidth) return;
            const next = Math.max(
              0,
              Math.min(
                images.length - 1,
                Math.round(element.scrollLeft / element.clientWidth),
              ),
            );
            indexRef.current = next;
            setActive(next);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              select(current + 1);
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              select(current - 1);
            } else if (event.key === "Home") {
              event.preventDefault();
              select(0);
            } else if (event.key === "End") {
              event.preventDefault();
              select(images.length - 1);
            }
          }}
          className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {images.map((image, index) => (
            <div
              key={image.src}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${images.length}`}
              aria-hidden={index !== current}
              className="aspect-square w-full shrink-0 snap-center snap-always"
            >
              {/* biome-ignore lint/performance/noImgElement: Gallery accepts external product media without requiring Next image configuration. */}
              <img
                src={image.src}
                alt={image.alt}
                width={1000}
                height={1000}
                loading={index === 0 ? "eager" : "lazy"}
                draggable={false}
                className="size-full object-cover"
              />
            </div>
          ))}
        </div>
        {product.label && (
          <span className="pointer-events-none absolute left-5 top-5 rounded-full bg-background/95 px-3 py-1.5 text-xs font-medium">
            {product.label}
          </span>
        )}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={() => select(current - 1)}
              disabled={current === 0}
              aria-label="Previous product image"
              className="size-9 border-0 bg-background focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => select(current + 1)}
              disabled={current === images.length - 1}
              aria-label="Next product image"
              className="size-9 border-0 bg-background focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex min-w-0 gap-2 overflow-x-auto p-1">
            {images.map((image, index) => (
              <Button
                key={image.src}
                variant="ghost"
                onClick={() => select(index)}
                aria-label={`Show product image ${index + 1}: ${image.alt}`}
                aria-pressed={current === index}
                className={cn(
                  "size-9 shrink-0 overflow-hidden p-0 focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9",
                  current === index
                    ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                    : "opacity-60 hover:opacity-100",
                )}
              >
                {/* biome-ignore lint/performance/noImgElement: Thumbnail reuses the gallery media resource. */}
                <img
                  src={image.src}
                  alt=""
                  width={56}
                  height={56}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </Button>
            ))}
          </div>
          <output className="shrink-0 text-xs tabular-nums text-muted-foreground">
            <span className="sr-only">Image </span>
            {current + 1} / {images.length}
          </output>
        </div>
      )}
    </div>
  );
}
