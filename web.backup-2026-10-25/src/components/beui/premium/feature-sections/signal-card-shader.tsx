"use client";

import { MeshGradient } from "@paper-design/shaders-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/beui/ease";

const PALETTES = [
  ["#f9d5b4", "#f4b6c8", "#c9b8ee", "#9ed5ea", "#b7e6d1"],
  ["#d9efcf", "#a9dcd3", "#a9d3ef", "#c6b7e9", "#efbfd0"],
  ["#f4d7aa", "#efb8a8", "#d1b9e8", "#add9e3", "#c4e3c4"],
] as const;

let webGl2Available: boolean | undefined;

function supportsWebGl2() {
  if (webGl2Available !== undefined) return webGl2Available;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    failIfMajorPerformanceCaveat: true,
    powerPreference: "low-power",
  });

  webGl2Available = context !== null;
  context?.getExtension("WEBGL_lose_context")?.loseContext();
  return webGl2Available;
}

type SignalCardShaderProps = {
  active: boolean;
  palette: number;
};

export function SignalCardShader({ active, palette }: SignalCardShaderProps) {
  const reduce = useReducedMotion() ?? false;
  const [available, setAvailable] = useState(false);
  const [renderShader, setRenderShader] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const shaderHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const supported = supportsWebGl2();
    setAvailable(supported);
    if (supported) setRenderShader(true);
  }, [active]);

  useEffect(() => {
    if (!active || !available || !renderShader) {
      setRevealed(false);
      return;
    }

    const host = shaderHostRef.current;
    if (!host) return;
    let firstFrame = 0;
    let secondFrame = 0;

    const revealAfterPaint = () => {
      if (!host?.querySelector("canvas")) return false;
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => setRevealed(true));
      });
      return true;
    };

    if (revealAfterPaint()) {
      return () => {
        window.cancelAnimationFrame(firstFrame);
        window.cancelAnimationFrame(secondFrame);
      };
    }

    const observer = new MutationObserver(() => {
      if (revealAfterPaint()) observer.disconnect();
    });
    observer.observe(host, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [active, available, renderShader]);

  useEffect(() => {
    if (active || !renderShader) return;
    const timeout = window.setTimeout(() => setRenderShader(false), 220);
    return () => window.clearTimeout(timeout);
  }, [active, renderShader]);

  const colors = PALETTES[palette % PALETTES.length];

  return (
    <AnimatePresence initial={false}>
      {available && renderShader ? (
        <motion.div
          key="signal-card-shader"
          aria-hidden="true"
          initial={false}
          animate={{
            clipPath:
              revealed && active ? "inset(0% 0 0% 0)" : "inset(86% 0 0% 0)",
            opacity: revealed && active ? 0.58 : 0,
            transform:
              (revealed && active) || reduce
                ? "translateY(0%) scaleY(1)"
                : "translateY(30%) scaleY(0.72)",
          }}
          exit={
            reduce
              ? { opacity: 0 }
              : {
                  clipPath: "inset(86% 0 0% 0)",
                  opacity: 0,
                  transform: "translateY(24%) scaleY(0.82)",
                }
          }
          transition={{
            duration: reduce ? 0.18 : revealed && active ? 0.48 : 0.18,
            ease: revealed && active && !reduce ? EASE_IN_OUT : EASE_OUT,
          }}
          className="pointer-events-none absolute inset-x-[-16%] -bottom-16 h-[112%] origin-bottom will-change-[transform,opacity,clip-path] [mask-image:linear-gradient(to_top,black_0%,black_44%,transparent_88%)]"
        >
          <div ref={shaderHostRef} className="size-full">
            <MeshGradient
              className="size-full"
              colors={[...colors]}
              distortion={1.18}
              swirl={0.72}
              grainMixer={0.08}
              grainOverlay={0.035}
              speed={reduce ? 0 : 0.32}
              scale={1.16}
              offsetY={0.2}
              minPixelRatio={1}
              maxPixelCount={180_000}
              webGlContextAttributes={{
                alpha: true,
                antialias: false,
                failIfMajorPerformanceCaveat: true,
                powerPreference: "low-power",
              }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
