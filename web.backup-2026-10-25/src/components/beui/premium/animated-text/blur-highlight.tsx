"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { type ElementType, useEffect, useMemo, useRef, useState } from "react";
import { EASE_OUT, SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

const WORD_STAGGER = 0.045;
const REVEAL_DURATION = 0.55;
const HIGHLIGHT_INTERVAL = 1800;

export type BlurHighlightMode = "cycle" | "accumulate";

export interface BlurHighlightProps {
  text: string;
  highlights: readonly string[];
  as?: ElementType;
  className?: string;
  highlightClassName?: string;
  highlightInterval?: number;
  highlightTextClassName?: string;
  mode?: BlurHighlightMode;
}

function normalizeWord(word: string) {
  return word.toLocaleLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, "");
}

function createHighlightMap(
  words: readonly string[],
  highlights: readonly string[],
) {
  const normalizedWords = words.map(normalizeWord);
  const map = Array.from({ length: words.length }, () => -1);

  highlights.forEach((highlight, highlightIndex) => {
    const phrase = highlight
      .trim()
      .split(/\s+/)
      .map(normalizeWord)
      .filter(Boolean);

    if (phrase.length === 0) return;

    for (
      let index = 0;
      index <= normalizedWords.length - phrase.length;
      index += 1
    ) {
      const matches = phrase.every(
        (word, phraseIndex) => normalizedWords[index + phraseIndex] === word,
      );
      if (!matches) continue;

      for (let offset = 0; offset < phrase.length; offset += 1) {
        if (map[index + offset] === -1) map[index + offset] = highlightIndex;
      }
    }
  });

  return map;
}

export function BlurHighlight({
  text,
  highlights,
  as: Comp = "p",
  className,
  highlightClassName,
  highlightInterval = HIGHLIGHT_INTERVAL,
  highlightTextClassName,
  mode = "cycle",
}: BlurHighlightProps) {
  const rootRef = useRef<HTMLParagraphElement>(null);
  const isInView = useInView(rootRef, { amount: 0.45 });
  const reduce = useReducedMotion();
  const [hasRevealed, setHasRevealed] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState(-1);
  const words = useMemo(() => text.trim().split(/\s+/), [text]);
  const highlightMap = useMemo(
    () => createHighlightMap(words, highlights),
    [highlights, words],
  );
  const highlightCount = highlights.length;
  const HighlightRoot = Comp as "p";

  useEffect(() => {
    if (isInView) setHasRevealed(true);
  }, [isInView]);

  useEffect(() => {
    if (!isInView || highlightCount === 0) return;
    if (mode === "accumulate" && activeHighlight >= highlightCount - 1) return;

    const firstDelay =
      activeHighlight === -1
        ? reduce
          ? 200
          : Math.min(
              (words.length - 1) * WORD_STAGGER * 1000 +
                REVEAL_DURATION * 1000 +
                300,
              1800,
            )
        : highlightInterval;

    const timeoutId = setTimeout(() => {
      setActiveHighlight((current) => {
        if (current < 0) return 0;
        if (mode === "accumulate") {
          return Math.min(current + 1, highlightCount - 1);
        }
        return (current + 1) % highlightCount;
      });
    }, firstDelay);

    return () => clearTimeout(timeoutId);
  }, [
    activeHighlight,
    highlightCount,
    highlightInterval,
    isInView,
    mode,
    reduce,
    words.length,
  ]);

  return (
    <HighlightRoot ref={rootRef} className={cn("text-pretty", className)}>
      {words.map((word, index) => {
        const occurrence = words
          .slice(0, index)
          .filter((item) => item === word).length;
        const group = highlightMap[index];
        const isHighlighted = group >= 0;
        const continuesHighlight =
          isHighlighted && highlightMap[index + 1] === group;
        const isActive =
          isHighlighted &&
          (mode === "accumulate"
            ? group <= activeHighlight
            : group === activeHighlight);

        return (
          <span key={`${word}-${occurrence}`}>
            <motion.span
              initial={
                reduce
                  ? { opacity: 0 }
                  : {
                      transform: "translateY(30%)",
                      opacity: 0,
                      filter: "blur(10px)",
                    }
              }
              animate={
                hasRevealed
                  ? reduce
                    ? { opacity: 1 }
                    : {
                        transform: "translateY(0%)",
                        opacity: 1,
                        filter: "blur(0px)",
                      }
                  : undefined
              }
              transition={{
                duration: reduce ? 0.2 : REVEAL_DURATION,
                ease: EASE_OUT,
                delay: reduce ? 0 : index * WORD_STAGGER,
              }}
              className={cn(
                "relative isolate inline-block transition-colors duration-200",
                isActive && "text-orange-950",
                isActive && highlightTextClassName,
              )}
            >
              {isHighlighted ? (
                <motion.span
                  aria-hidden
                  initial={false}
                  animate={
                    reduce
                      ? { opacity: isActive ? 1 : 0 }
                      : {
                          transform: isActive ? "scaleX(1)" : "scaleX(0.78)",
                          opacity: isActive ? 1 : 0,
                        }
                  }
                  transition={
                    reduce ? { duration: 0.18, ease: EASE_OUT } : SPRING_SWAP
                  }
                  className={cn(
                    "absolute inset-y-[0.03em] -right-[0.12em] -left-[0.12em] -z-10 bg-orange-200",
                    continuesHighlight && "-right-[0.3em]",
                    mode === "accumulate" && "origin-left",
                    highlightClassName,
                  )}
                />
              ) : null}
              {word}
            </motion.span>
            {index < words.length - 1 ? " " : null}
          </span>
        );
      })}
    </HighlightRoot>
  );
}
