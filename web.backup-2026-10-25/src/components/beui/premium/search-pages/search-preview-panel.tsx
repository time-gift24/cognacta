"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";
import { INSTANT } from "./search-motion";

/**
 * Sticky desktop preview (xl+). One bordered panel morphs its height while
 * the content for each selection cross-fades in place.
 */
export function SearchPreviewPanel({
  selectionKey,
  reduce,
  children,
}: {
  /** Changes when the previewed result changes; `null` hides the panel. */
  selectionKey: string | null;
  reduce: boolean | null;
  children: ReactNode;
}) {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-8">
        {selectionKey ? (
          <motion.div
            layout
            transition={reduce ? INSTANT : SPRING_LAYOUT}
            className="overflow-hidden rounded-3xl border border-border"
            style={{ borderRadius: 24 }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={selectionKey}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: reduce
                    ? INSTANT
                    : { duration: 0.24, ease: EASE_OUT, delay: 0.04 },
                }}
                exit={
                  reduce
                    ? { opacity: 0, transition: INSTANT }
                    : { opacity: 0, transition: { duration: 0.12 } }
                }
                className="p-5"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ) : null}
      </div>
    </aside>
  );
}
