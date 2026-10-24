"use client";

import { AudioLines, Pause, Play, Volume2 } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { EASE_OUT_CSS } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

const waveformHeights = [
  14, 24, 18, 32, 21, 40, 26, 16, 29, 37, 21, 15, 27, 34, 23, 17, 31, 39, 25,
  14, 22, 33, 19, 28, 15, 24,
] as const;
const waveform = waveformHeights.map((height, index) => ({
  id: `wave-${index + 1}`,
  height,
}));

export type VoiceNoteLayout = "default" | "card";

export type VoiceNoteProps = {
  className?: string;
  title?: string;
  defaultPlaying?: boolean;
  layout?: VoiceNoteLayout;
};

export function VoiceNote({
  className,
  title = "A perspective transcript card paired with an animated audio player",
  defaultPlaying = true,
  layout = "default",
}: VoiceNoteProps) {
  const [playing, setPlaying] = useState(defaultPlaying);

  return (
    <figure
      aria-label={title}
      data-layout={layout}
      data-playing={playing}
      className={cn(
        "voice-note relative isolate m-0 aspect-[4/3] w-full overflow-hidden bg-[oklch(0.92_0.035_160)] text-foreground dark:bg-[oklch(0.18_0.02_160)]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,oklch(0.78_0.09_155/0.48),transparent_48%),linear-gradient(to_bottom,transparent_58%,oklch(0.98_0_0/0.58))] dark:bg-[radial-gradient(circle_at_50%_8%,oklch(0.43_0.07_155/0.42),transparent_48%),linear-gradient(to_bottom,transparent_58%,oklch(0.12_0_0/0.5))]"
      />

      <div className="absolute inset-0">
        <div
          aria-hidden="true"
          className="absolute top-[13%] left-1/2 h-[52%] w-[46%] rounded-[1.6rem] border border-white/45 bg-white/28 dark:border-white/8 dark:bg-white/4"
          style={{
            transform:
              "translateX(-50%) perspective(760px) rotateX(-8deg) translateY(-7%)",
            transformOrigin: "50% 100%",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute top-[15%] left-1/2 h-[53%] w-[50%] rounded-[1.7rem] border border-white/55 bg-white/46 dark:border-white/9 dark:bg-white/6"
          style={{
            transform:
              "translateX(-50%) perspective(760px) rotateX(-7deg) translateY(-3%)",
            transformOrigin: "50% 100%",
          }}
        />

        <div
          aria-hidden="true"
          className="absolute top-[17%] left-1/2 h-[55%] w-[54%] overflow-hidden rounded-[1.8rem] border border-black/6 bg-white/88 px-[6%] pt-[6%] shadow-[0_24px_64px_oklch(0.4_0.04_160/0.14)] [mask-image:linear-gradient(to_bottom,black_0%,black_70%,transparent_100%)] dark:border-white/10 dark:bg-[oklch(0.24_0.012_160/0.94)] dark:shadow-none"
          style={{
            transform: "translateX(-50%) perspective(760px) rotateX(-6deg)",
            transformOrigin: "50% 100%",
          }}
        >
          <div className="absolute top-[8%] right-[9%] grid size-[16%] place-items-center rounded-xl bg-[oklch(0.9_0.055_160)] text-[oklch(0.42_0.09_160)] dark:bg-[oklch(0.3_0.035_160)] dark:text-[oklch(0.78_0.09_160)]">
            <AudioLines className="size-[52%]" strokeWidth={1.7} />
          </div>

          <p
            className={cn(
              "max-w-[80%] leading-[1.55] tracking-[-0.025em]",
              layout === "card"
                ? "text-[clamp(0.5rem,1vw,0.75rem)]"
                : "text-[clamp(0.62rem,1.8vw,1rem)]",
            )}
          >
            The recording became a clear plan. Decisions stayed visible, owners
            were named, and every next step found its place.
          </p>
        </div>

        <div
          className={cn(
            "absolute z-20 flex items-center gap-2 rounded-[1.75rem] border border-white/85 bg-white/94 p-2 shadow-[0_22px_54px_oklch(0.35_0.03_160/0.16)] backdrop-blur-md dark:border-white/10 dark:bg-[oklch(0.23_0.01_160/0.96)] dark:shadow-none",
            layout === "card"
              ? "right-[20%] bottom-[12%] left-[20%] h-[16%] min-h-12"
              : "right-[18%] bottom-[15%] left-[18%] h-[16%] min-h-14",
          )}
        >
          <span
            aria-hidden="true"
            className="grid aspect-square h-full shrink-0 place-items-center rounded-full bg-[oklch(0.96_0.01_160)] dark:bg-[oklch(0.29_0.015_160)]"
          >
            <Volume2 className="size-[42%]" strokeWidth={2} />
          </span>

          <div
            aria-hidden="true"
            className="flex min-w-0 flex-1 items-center justify-between self-stretch overflow-hidden px-1"
          >
            {waveform.map((bar, index) => (
              <span
                key={bar.id}
                className={cn(
                  "voice-note__bar w-0.5 shrink-0 rounded-full",
                  index < 16
                    ? "bg-foreground"
                    : "bg-foreground/18 dark:bg-foreground/22",
                )}
                style={
                  {
                    height: bar.height,
                    "--voice-delay": `${index * -68}ms`,
                    "--voice-scale": 0.56 + ((index * 7) % 5) * 0.1,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <button
            type="button"
            aria-label={playing ? "Pause voice note" : "Play voice note"}
            aria-pressed={playing}
            onClick={() => setPlaying((current) => !current)}
            className="grid aspect-square h-full shrink-0 place-items-center rounded-full bg-foreground text-background transition-transform duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            style={{ transitionTimingFunction: EASE_OUT_CSS }}
          >
            {playing ? (
              <Pause
                className="size-[34%]"
                fill="currentColor"
                strokeWidth={1.6}
              />
            ) : (
              <Play
                className="ml-[4%] size-[36%]"
                fill="currentColor"
                strokeWidth={1.6}
              />
            )}
          </button>
        </div>
      </div>

      <style>{`
        .voice-note__bar {
          animation: voice-note-wave 1.3s
            cubic-bezier(0.77, 0, 0.175, 1) infinite;
          animation-delay: var(--voice-delay);
          transform-origin: center;
          will-change: transform, opacity;
        }

        .voice-note[data-playing="false"] .voice-note__bar {
          animation-play-state: paused;
          opacity: 0.42;
          transform: scaleY(0.4);
        }

        @keyframes voice-note-wave {
          0%,
          100% {
            opacity: 0.54;
            transform: scaleY(0.4);
          }
          50% {
            opacity: 1;
            transform: scaleY(var(--voice-scale));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .voice-note__bar {
            animation: none;
            opacity: 0.76;
            transform: scaleY(0.66);
          }
        }
      `}</style>
    </figure>
  );
}
