"use client";

import { motion } from "motion/react";
import { useContext, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { Highlight } from "./highlight";
import type { SearchResult } from "./search-data";
import { CASCADE_WINDOW_MS, EXIT, INSTANT, ROW_STAGGER } from "./search-motion";
import { CascadeContext } from "./search-result-group";

export const resultRowId = (id: string) => `search-result-${id}`;

/**
 * One result card. Blur-rises in (cascading with its group), leaves with a
 * quick blur, and hosts the gliding selection ring when selected.
 */
export function SearchResultRow({
  index,
  result,
  words,
  selected,
  reduce,
  onHover,
  onOpen,
}: {
  index: number;
  result: SearchResult;
  words: readonly string[];
  selected: boolean;
  reduce: boolean | null;
  onHover: () => void;
  onOpen: () => void;
}) {
  const born = useContext(CascadeContext);
  const [delay] = useState(() =>
    performance.now() - born < CASCADE_WINDOW_MS ? index * ROW_STAGGER : 0,
  );
  const avatar = result.type === "community";

  return (
    <motion.li
      id={resultRowId(result.id)}
      layout="position"
      initial={reduce ? false : { opacity: 0, y: 12, filter: "blur(6px)" }}
      animate={{
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: reduce
          ? INSTANT
          : { duration: 0.45, ease: EASE_OUT, delay },
      }}
      exit={
        reduce
          ? { opacity: 0, transition: INSTANT }
          : {
              opacity: 0,
              scale: 0.97,
              filter: "blur(4px)",
              transition: EXIT,
            }
      }
      transition={reduce ? INSTANT : SPRING_LAYOUT}
      onPointerEnter={onHover}
      className="relative rounded-2xl has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground"
    >
      {selected ? (
        <motion.span
          layoutId="search-result-selection"
          transition={reduce ? INSTANT : SPRING_SWAP}
          className="pointer-events-none absolute inset-0 rounded-2xl border border-foreground/30"
        />
      ) : null}
      <article className="relative flex gap-4 rounded-2xl border border-border p-4">
        {result.image ? (
          // biome-ignore lint/performance/noImgElement: remote cover or author photo in result content.
          <img
            src={result.image}
            alt=""
            width={avatar ? 36 : 56}
            height={avatar ? 36 : 56}
            className={cn(
              "shrink-0 object-cover",
              avatar ? "size-9 rounded-full" : "size-14 rounded-xl",
            )}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-muted-foreground text-xs">
            {result.path.join(" / ")} · {result.meta}
          </p>
          <h3 className="mt-1 font-medium">
            <Button
              variant="plain"
              type="button"
              onClick={onOpen}
              aria-haspopup="dialog"
              whileHover={undefined}
              whileTap={undefined}
              className="text-left font-medium text-base after:absolute after:inset-0 after:content-[''] focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <Highlight text={result.title} words={words} />
            </Button>
          </h3>
          <p className="mt-1 line-clamp-2 text-muted-foreground text-sm leading-6">
            <Highlight text={result.snippet} words={words} />
          </p>
        </div>
      </article>
    </motion.li>
  );
}
