"use client";

import { ArrowUpRight, Pause, Play } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { type CSSProperties, useId, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { EASE_IN_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { SunflowerArt } from "./cta-sunflower-art";

export type CtaSunflowerProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: { label: string; href: string; external?: boolean };
  note?: string;
  className?: string;
};

const FLOWERS = [
  {
    id: "far-right",
    position: "-right-16 bottom-0 h-72 w-32 lg:-right-12 lg:h-[28rem] lg:w-52",
    lean: 12,
    duration: 7.4,
    delay: -2,
  },
  {
    id: "back-left",
    position:
      "left-[12%] -bottom-16 h-72 w-32 lg:left-[49%] lg:-bottom-20 lg:h-[26rem] lg:w-48",
    lean: -10,
    duration: 8.2,
    delay: -4,
  },
  {
    id: "tall-back",
    position:
      "right-[24%] -bottom-10 h-80 w-36 lg:right-[19%] lg:bottom-0 lg:h-[31rem] lg:w-56",
    lean: -12,
    duration: 7,
    delay: -1.5,
  },
  {
    id: "main",
    position:
      "right-[1%] -bottom-16 h-96 w-44 lg:right-[3%] lg:-bottom-20 lg:h-[40rem] lg:w-72",
    lean: 8,
    duration: 8.8,
    delay: -3,
  },
  {
    id: "front-left",
    position:
      "-left-10 -bottom-32 h-80 w-36 lg:left-[5%] lg:-bottom-72 lg:h-[29rem] lg:w-52",
    lean: -9,
    duration: 7.8,
    delay: -5,
  },
  {
    id: "front-middle",
    position:
      "left-[39%] -bottom-36 h-72 w-32 lg:left-[37%] lg:-bottom-56 lg:h-[30rem] lg:w-56",
    lean: 8,
    duration: 8.5,
    delay: -1,
  },
];

export function CtaSunflower({
  eyebrow = "For the idea still in your notebook",
  title = "Make today day one.",
  description = "Collect your ideas, choose a first step, and give that side project a little time each day.",
  action = { label: "Start a project", href: "#" },
  note = "No perfect plan needed.",
  className,
}: CtaSunflowerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.1 });
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const titleId = useId();
  const moving = visible && !reduce && !paused;

  return (
    <section
      aria-labelledby={titleId}
      className={cn("w-full px-4 py-8 lg:px-8 lg:py-12", className)}
    >
      <div
        ref={ref}
        className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-3xl border border-border bg-background text-foreground"
      >
        <div className="relative z-10 px-6 pt-12 lg:px-20 lg:pt-24">
          <div className="max-w-md lg:max-w-[48%]">
            <p className="text-xs font-medium tracking-wide opacity-85">
              {eyebrow}
            </p>
            <h2
              id={titleId}
              className="mt-5 max-w-md text-balance text-4xl font-medium leading-tight tracking-tight"
            >
              {title}
            </h2>
            <p className="mt-5 max-w-sm text-pretty text-sm leading-relaxed opacity-90 lg:text-base">
              {description}
            </p>
            <ButtonLink
              href={action.href}
              className="relative mt-7 h-9 after:absolute after:inset-x-0 after:-inset-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              {...(action.external
                ? { target: "_blank", rel: "noreferrer noopener" }
                : {})}
            >
              {action.label}
              <ArrowUpRight aria-hidden className="size-4" />
            </ButtonLink>
            <p className="mt-8 max-w-60 text-xs leading-relaxed opacity-80 lg:mt-12">
              {note}
            </p>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none relative h-80 lg:h-40"
        >
          <div className="absolute inset-x-0 bottom-0 h-80 lg:h-[40rem]">
            {FLOWERS.map((flower) => (
              <div
                key={flower.id}
                className={cn("absolute origin-bottom", flower.position)}
                style={{ transform: `rotate(${flower.lean}deg)` }}
              >
                <div
                  className="beui-sunflower-wind size-full origin-bottom"
                  style={
                    {
                      "--wind-duration": `${flower.duration}s`,
                      "--wind-delay": `${flower.delay}s`,
                      "--wind-ease": `cubic-bezier(${EASE_IN_OUT.join(",")})`,
                      animationPlayState: moving ? "running" : "paused",
                    } as CSSProperties
                  }
                >
                  <SunflowerArt />
                </div>
              </div>
            ))}
          </div>
        </div>
        {!reduce && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              paused ? "Resume flower animation" : "Pause flower animation"
            }
            aria-pressed={paused}
            onClick={() => setPaused(!paused)}
            className="absolute right-4 bottom-4 z-20 size-9 rounded-full border border-border bg-background/90 text-foreground hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {paused ? (
              <Play aria-hidden className="size-3.5" />
            ) : (
              <Pause aria-hidden className="size-3.5" />
            )}
          </Button>
        )}
        <style>{`
          @keyframes beui-sunflower-wind {
            0%, 100% { transform: rotate(-2deg); }
            50% { transform: rotate(2deg); }
          }
          .beui-sunflower-wind {
            animation: beui-sunflower-wind var(--wind-duration) var(--wind-ease) var(--wind-delay) infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .beui-sunflower-wind { animation: none; }
          }
        `}</style>
      </div>
    </section>
  );
}
