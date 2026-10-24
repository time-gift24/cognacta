"use client";

import { AudioLines, Mic, MicOff, PhoneOff } from "lucide-react";
import {
  type MotionValue,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { type ReactNode, useEffect, useId } from "react";
import { ActionSwapIcon } from "@/components/beui/motion/action-swap";
import { Button } from "@/components/beui/motion/button";
import { SPRING_PANEL } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type VoiceConversationStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "ended"
  | "error";

export interface VoiceConversationProps {
  status: VoiceConversationStatus;
  muted?: boolean;
  /** Normalized audio amplitude from your voice service, between zero and one. */
  level?: number;
  title?: string;
  transcript?: ReactNode;
  error?: string;
  onStart: () => void;
  onEnd: () => void;
  onMutedChange: (muted: boolean) => void;
  className?: string;
}

const LABELS: Record<VoiceConversationStatus, string> = {
  idle: "Ready when you are",
  connecting: "Connecting…",
  listening: "Listening to you",
  thinking: "Thinking…",
  speaking: "Speaking",
  ended: "Conversation ended",
  error: "Unable to connect",
};
const BARS = Array.from({ length: 21 }, (_, index) => index);

function VoiceBar({
  index,
  energy,
  phase,
}: {
  index: number;
  energy: MotionValue<number>;
  phase: MotionValue<number>;
}) {
  const extent = useTransform(() => {
    const envelope = Math.sin(((index + 1) / (BARS.length + 1)) * Math.PI);
    const wave =
      0.65 +
      Math.sin(phase.get() - index * 0.42) * 0.22 +
      Math.sin(phase.get() * 0.63 + index * 0.31) * 0.13;
    return energy.get() * (8 + 27 * envelope) * wave;
  });
  const y1 = useTransform(extent, (value) => 44 - value);
  const y2 = useTransform(extent, (value) => 44 + value);
  return (
    <motion.line
      x1={7 + index * 10}
      x2={7 + index * 10}
      y1={y1}
      y2={y2}
      stroke="currentColor"
      strokeWidth={5}
      strokeLinecap="round"
    />
  );
}

/** Spring-filter incoming samples without restarting a timed animation on each update. */
function VoiceWaveform({
  level,
  audible,
  busy,
}: {
  level: number;
  audible: boolean;
  busy: boolean;
}) {
  const reduce = useReducedMotion();
  const energy = useSpring(0, SPRING_PANEL);
  const phase = useMotionValue(0);
  useEffect(() => {
    const target = audible ? level : busy ? 0.12 : 0;
    if (reduce) energy.jump(target > 0 ? 0.15 : 0);
    else energy.set(target);
  }, [level, audible, busy, reduce, energy]);
  useAnimationFrame((_, delta) => {
    if (reduce || (!audible && !busy && energy.get() < 0.001)) return;
    phase.set(phase.get() + Math.min(delta, 40) * (busy ? 0.0018 : 0.004));
  });
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 214 88"
      className="h-22 w-56 overflow-visible text-foreground"
    >
      {BARS.map((index) => (
        <VoiceBar key={index} index={index} energy={energy} phase={phase} />
      ))}
    </svg>
  );
}
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** A controlled voice UI. Your audio service owns the microphone, transcript and session lifecycle. */
export function VoiceConversation({
  status,
  muted = false,
  level = 0,
  title = "Voice conversation",
  transcript,
  error,
  onStart,
  onEnd,
  onMutedChange,
  className,
}: VoiceConversationProps) {
  const titleId = useId();
  const active =
    status === "listening" || status === "thinking" || status === "speaking";
  const connected = active || status === "connecting";
  const amplitude = Number.isFinite(level)
    ? Math.max(0, Math.min(1, level))
    : 0;
  const audible = status === "speaking" || (status === "listening" && !muted);
  const label =
    muted && status === "listening" ? "Microphone muted" : LABELS[status];

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "w-full max-w-sm rounded-3xl border border-border bg-background p-5 text-foreground",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-4xl font-medium">
          {title}
        </h2>
        <AudioLines
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
      <div
        aria-hidden="true"
        className="flex h-28 items-center justify-center gap-1.5"
      >
        <VoiceWaveform
          level={amplitude}
          audible={audible}
          busy={status === "connecting" || status === "thinking"}
        />
      </div>
      <div className="text-center">
        <output className="block text-sm font-medium">{label}</output>
        <div className="mt-2 flex min-h-12 items-start justify-center text-sm leading-relaxed text-muted-foreground">
          {status === "error"
            ? error || "Please try again."
            : transcript ||
              (status === "idle"
                ? "Talk through an idea, one thought at a time."
                : status === "ended"
                  ? "Start again whenever you’re ready."
                  : "Take your time. I’m here.")}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        {connected ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn("size-9 rounded-full h-9", FOCUS)}
              disabled={!active}
              aria-label={muted ? "Unmute microphone" : "Mute microphone"}
              aria-pressed={muted}
              onClick={() => onMutedChange(!muted)}
            >
              <ActionSwapIcon value={muted ? "muted" : "unmuted"}>
                {muted ? (
                  <MicOff aria-hidden="true" className="size-4" />
                ) : (
                  <Mic aria-hidden="true" className="size-4" />
                )}
              </ActionSwapIcon>
            </Button>
            <Button
              type="button"
              className={cn("gap-2 px-4 rounded-full h-9", FOCUS)}
              onClick={onEnd}
            >
              <PhoneOff className="size-4" aria-hidden="true" />
              {status === "connecting" ? "Cancel" : "End chat"}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            className={cn("gap-2 px-4 rounded-full h-9", FOCUS)}
            onClick={onStart}
          >
            <Mic className="size-4" aria-hidden="true" />
            {status === "idle" ? "Start talking" : "Start again"}
          </Button>
        )}
      </div>
    </section>
  );
}
