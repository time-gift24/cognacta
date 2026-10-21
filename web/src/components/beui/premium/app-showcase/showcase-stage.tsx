"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import type { PointerEvent, ReactNode } from "react";
import { ShaderBackground } from "@/components/beui/motion/shader-background";
import { SPRING_MOUSE, SPRING_PANEL } from "@/lib/beui/ease";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import type {
  AppShowcasePerson,
  AppShowcaseShaderColors,
} from "./app-showcase-data";
import { TILT_DEG } from "./app-showcase-motion";

/** Shader stage that tilts its device toward the pointer and pops a notice. */
export function ShowcaseStage({
  noticeKey,
  noticeText,
  noticePerson,
  shaderColors,
  reduce,
  children,
}: {
  /** Changing key replaces the activity chip. */
  noticeKey: string;
  noticeText: string;
  noticePerson?: AppShowcasePerson;
  shaderColors: AppShowcaseShaderColors;
  reduce: boolean | null;
  children: ReactNode;
}) {
  const canHover = useHoverCapable();
  const tilt = canHover && !reduce;
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(
    useTransform(pointerX, [-0.5, 0.5], [-TILT_DEG, TILT_DEG]),
    SPRING_MOUSE,
  );
  const rotateX = useSpring(
    useTransform(pointerY, [-0.5, 0.5], [TILT_DEG, -TILT_DEG]),
    SPRING_MOUSE,
  );

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!tilt) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  };
  const resetTilt = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <div
      onPointerMove={onPointerMove}
      onPointerLeave={resetTilt}
      className="relative mx-auto grid w-full max-w-md place-items-center overflow-hidden rounded-4xl border border-border px-6 py-10 sm:px-12 lg:w-md"
      style={{ perspective: 1200 }}
    >
      {/* Decorative shader backdrop. */}
      <div aria-hidden="true" className="absolute inset-0">
        <ShaderBackground
          variant="mesh-gradient"
          colors={[...shaderColors]}
          distortion={0.55}
          swirl={0.3}
          speed={0.14}
        />
        <div className="absolute inset-0 bg-background/10 dark:bg-background/30" />
      </div>

      <motion.div
        style={tilt ? { rotateX, rotateY } : undefined}
        className="relative"
      >
        {children}
      </motion.div>

      <div className="pointer-events-none absolute inset-x-4 bottom-5 flex justify-center sm:inset-x-6">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={noticeKey}
            initial={
              reduce
                ? false
                : { opacity: 0, y: 14, scale: 0.92, filter: "blur(4px)" }
            }
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              transition: reduce
                ? { duration: 0 }
                : { ...SPRING_PANEL, delay: 0.35 },
            }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0 } }
                : {
                    opacity: 0,
                    y: -8,
                    scale: 0.96,
                    transition: { duration: 0.15 },
                  }
            }
            className="flex items-center gap-2.5 rounded-full border border-border bg-background/85 py-1.5 pr-4 pl-1.5 text-sm backdrop-blur-md"
          >
            {noticePerson ? (
              // biome-ignore lint/performance/noImgElement: small remote avatar in decorative activity.
              <img
                src={noticePerson.avatar}
                alt=""
                width={28}
                height={28}
                className="size-7 rounded-full object-cover"
              />
            ) : null}
            <span className="whitespace-nowrap">{noticeText}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
