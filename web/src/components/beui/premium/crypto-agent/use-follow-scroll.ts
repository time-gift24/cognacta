"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps a scroller pinned to the bottom while its content grows (new
 * messages, late-mounting cards, status changes), and lets go once the reader
 * scrolls up. Call `pin()` when the user sends something.
 */
export function useFollowScroll<
  Scroller extends HTMLElement,
  Content extends HTMLElement,
>(reduce: boolean) {
  const scroller = useRef<Scroller>(null);
  const content = useRef<Content>(null);
  const pinned = useRef(true);

  useEffect(() => {
    const node = scroller.current;
    const inner = content.current;
    if (!node || !inner) return;
    const onScroll = () => {
      pinned.current =
        node.scrollHeight - node.scrollTop - node.clientHeight < 80;
    };
    let lastHeight = inner.offsetHeight;
    const observer = new ResizeObserver(() => {
      const grew = inner.offsetHeight > lastHeight;
      lastHeight = inner.offsetHeight;
      if (grew && pinned.current)
        node.scrollTo({
          top: node.scrollHeight,
          behavior: reduce ? "auto" : "smooth",
        });
    });
    node.addEventListener("scroll", onScroll, { passive: true });
    observer.observe(inner);
    return () => {
      node.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [reduce]);

  const pin = () => {
    pinned.current = true;
  };

  return { scroller, content, pin };
}
