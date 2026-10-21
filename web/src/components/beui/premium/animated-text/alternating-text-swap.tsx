"use client";

import { motion, type Transition, useReducedMotion } from "motion/react";
import { type ElementType, useState } from "react";
import { EASE_OUT, SPRING_SWAP } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";

const LETTER_STAGGER = 0.014;
const BLUR_DURATION = 0.18;

function createLetterKeys(letters: readonly string[]) {
  const occurrences = new Map<string, number>();

  return letters.map((letter) => {
    const occurrence = occurrences.get(letter) ?? 0;
    occurrences.set(letter, occurrence + 1);
    return { key: `${letter}-${occurrence}`, letter };
  });
}

function SwapLine({
  active,
  entering,
  letters,
  reduce,
}: {
  active: boolean;
  entering: boolean;
  letters: readonly { key: string; letter: string }[];
  reduce: boolean;
}) {
  return (
    <span className="col-start-1 row-start-1 inline-flex whitespace-pre">
      {letters.map(({ key, letter }, index) => {
        const direction = index % 2 === 0 ? -1 : 1;
        const visible = entering ? active : !active;
        const restingTransform = entering
          ? `translateY(${-direction * 115}%)`
          : `translateY(${direction * 115}%)`;
        const delay = reduce ? 0 : index * LETTER_STAGGER;
        const transition: Transition = reduce
          ? { duration: 0.15, ease: EASE_OUT }
          : {
              transform: { ...SPRING_SWAP, delay },
              opacity: { duration: BLUR_DURATION, ease: EASE_OUT, delay },
              filter: { duration: BLUR_DURATION, ease: EASE_OUT, delay },
            };

        return (
          <span key={key} className="inline-grid overflow-hidden align-bottom">
            <motion.span
              initial={false}
              animate={
                reduce
                  ? { opacity: visible ? 1 : 0 }
                  : {
                      transform: visible ? "translateY(0%)" : restingTransform,
                      opacity: visible ? 1 : 0,
                      filter: visible ? "blur(0px)" : "blur(7px)",
                    }
              }
              transition={transition}
              className="col-start-1 row-start-1 inline-block will-change-[transform,filter,opacity]"
            >
              {letter === " " ? "\u00a0" : letter}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

export interface AlternatingTextSwapProps {
  text: string;
  hoverText: string;
  as?: ElementType;
  className?: string;
}

export function AlternatingTextSwap({
  text,
  hoverText,
  as: Comp = "span",
  className,
}: AlternatingTextSwapProps) {
  const [active, setActive] = useState(false);
  const canHover = useHoverCapable();
  const reduce = useReducedMotion();
  const currentLetters = createLetterKeys(Array.from(text));
  const nextLetters = createLetterKeys(Array.from(hoverText));
  const SwapRoot = Comp as "span";

  return (
    <SwapRoot
      className={cn("inline-grid", className)}
      onPointerEnter={() => {
        if (canHover) setActive(true);
      }}
      onPointerLeave={() => {
        if (canHover) setActive(false);
      }}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-grid whitespace-pre">
        <SwapLine
          active={active}
          entering={false}
          letters={currentLetters}
          reduce={Boolean(reduce)}
        />
        <SwapLine
          active={active}
          entering
          letters={nextLetters}
          reduce={Boolean(reduce)}
        />
      </span>
    </SwapRoot>
  );
}
