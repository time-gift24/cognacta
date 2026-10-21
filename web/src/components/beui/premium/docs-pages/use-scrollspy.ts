"use client";

import { useEffect, useState, type RefObject } from "react";
import { docsSectionId } from "./docs-data";

function findHeading(container: HTMLElement | null, id: string) {
  return (container ?? document).querySelector<HTMLElement>(
    `#${CSS.escape(docsSectionId(id))}`,
  );
}

/** Tracks the last heading above the reading line within a page or reader. */
export function useScrollspy(
  ids: readonly string[],
  containerRef?: RefObject<HTMLElement | null>,
  resolveHeading = findHeading,
) {
  const key = ids.join("\u0000");
  const [active, setActive] = useState<string | undefined>(ids[0]);

  useEffect(() => {
    const sectionIds = key ? key.split("\u0000") : [];
    if (!sectionIds.length) return;
    const container = containerRef?.current ?? null;
    if (containerRef && !container) return;
    const update = () => {
      const height = container?.clientHeight ?? window.innerHeight;
      const line = (container?.getBoundingClientRect().top ?? 0) + height * 0.3;
      let current = sectionIds[0];
      for (const id of sectionIds) {
        const heading = resolveHeading(container, id);
        if (heading && heading.getBoundingClientRect().top <= line) current = id;
      }
      const scrollHeight = container?.scrollHeight ?? document.documentElement.scrollHeight;
      const scrollTop = container?.scrollTop ?? window.scrollY;
      const atEnd = scrollHeight > height && height + scrollTop >= scrollHeight - 2;
      setActive(atEnd ? sectionIds[sectionIds.length - 1] : current);
    };
    const target = container ?? window;
    target.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(container ?? document.documentElement);
    if (!container) window.addEventListener("resize", update);
    const frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener("scroll", update);
      observer.disconnect();
      if (!container) window.removeEventListener("resize", update);
    };
  }, [key, containerRef, resolveHeading]);

  return active && ids.includes(active) ? active : ids[0];
}
