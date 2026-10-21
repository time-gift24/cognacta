"use client";

import { useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useRef, useState } from "react";

function stepFromProgress(progress: number, count: number) {
  return Math.min(count - 1, Math.floor(progress * count));
}

/**
 * Maps scroll progress through the track to a step while pinned, and
 * jumps to a step's scroll range (or sets it directly when unpinned).
 */
export function useScrollStep({
  count,
  pinned,
  reduce,
}: {
  count: number;
  pinned: boolean;
  reduce: boolean | null;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (pinned) setStep(stepFromProgress(progress, count));
  });

  // Restored scroll positions do not emit a change, so read the current
  // progress once pinning turns on.
  useEffect(() => {
    if (pinned) setStep(stepFromProgress(scrollYProgress.get(), count));
  }, [pinned, scrollYProgress, count]);

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!pinned || !track) {
      setStep(index);
      return;
    }
    const top = track.getBoundingClientRect().top + window.scrollY;
    const range = track.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: top + range * ((index + 0.2) / count),
      behavior: reduce ? "auto" : "smooth",
    });
  };

  return {
    trackRef,
    step: Math.max(0, Math.min(step, count - 1)),
    scrollYProgress,
    goTo,
  };
}
