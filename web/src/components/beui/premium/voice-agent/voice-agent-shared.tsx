"use client";

import { AudioLines, Mic, MicOff, PhoneOff } from "lucide-react";
import {
  AnimatePresence,
  isMotionValue,
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { VoiceOrb } from "@/components/beui/agents/voice-orb";
import {
  ActionSwapIcon,
  ActionSwapText,
} from "@/components/beui/motion/action-swap";
import { Button } from "@/components/beui/motion/button";
import {
  MorphicTooltip,
  MorphicTooltipProvider,
} from "@/components/beui/premium/morphic-tooltip";
import { EASE_OUT, SPRING_GLIDE, SPRING_PANEL, SPRING_PRESS } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type VoiceAgentStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "ended"
  | "error";

export interface VoiceAgentOrbOptions {
  /** A crisp liquid sphere or a soft halo with a glass rim. */
  appearance?: "liquid" | "halo";
  size?: "sm" | "md" | "lg";
  /** Multiplier for state-driven material motion. Zero freezes the flow. */
  speed?: number;
  className?: string;
}

/** Your voice service owns audio, microphone permission, and session state. */
export interface VoiceAgentProps {
  status: VoiceAgentStatus;
  muted?: boolean;
  /** Normalized audio activity (0–1). Use a MotionValue for streaming updates. */
  activity?: number | MotionValue<number>;
  /** Caller-owned analyser; sampled only while listening or speaking. */
  analyser?: AnalyserNode | null;
  title?: string;
  /** Latest utterance or a custom inline transcript. */
  transcript?: ReactNode;
  error?: string;
  /** Decorative orb pigment, highlight, and shadow (#RGB or #RRGGBB). */
  colors?: readonly [string, string, string];
  orbOptions?: VoiceAgentOrbOptions;
  /** Replace the default visualizer with your own React node. */
  orb?: ReactNode;
  surface?: "card" | "minimal";
  /** Defaults to true in the session and false in the compact dock. */
  showTranscript?: boolean;
  onStart: () => void;
  onEnd: () => void;
  onMutedChange: (muted: boolean) => void;
  className?: string;
}

const LABELS: Record<VoiceAgentStatus, string> = {
  idle: "Ready to talk",
  connecting: "Connecting…",
  listening: "Listening",
  thinking: "Thinking…",
  speaking: "Speaking",
  ended: "Session ended",
  error: "Unable to connect",
};

export const SESSION_COLORS = ["#45b9d8", "#e5fbff", "#16566b"] as const;
export const DOCK_COLORS = ["#ed9871", "#fff0da", "#486a62"] as const;

const SESSION_SIZES = { sm: "w-48", md: "w-56 sm:w-64", lg: "w-64 sm:w-72" };
const DOCK_SIZES = { sm: "w-14", md: "w-16", lg: "w-20" };

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function isVoiceAgentConnected(status: VoiceAgentStatus) {
  return (
    status === "connecting" ||
    status === "listening" ||
    status === "thinking" ||
    status === "speaking"
  );
}

export function VoiceAgentStatusLabel({
  status,
  muted = false,
  className,
}: Pick<VoiceAgentProps, "status" | "muted" | "className">) {
  const label =
    status === "listening" && muted ? "Microphone muted" : LABELS[status];

  return (
    <output aria-live="polite" aria-atomic="true" className={className}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">
        <ActionSwapText value={label} animation="roll">
          {label}
        </ActionSwapText>
      </span>
    </output>
  );
}

/** Keep the shader mounted across session states so its material stays continuous. */
export function VoiceAgentOrb({
  status,
  muted = false,
  activity = 0,
  analyser,
  colors = SESSION_COLORS,
  orbOptions,
  orb,
  compact = false,
  className,
}: Pick<
  VoiceAgentProps,
  | "status"
  | "muted"
  | "activity"
  | "analyser"
  | "colors"
  | "orbOptions"
  | "orb"
  | "className"
> & { compact?: boolean }) {
  const [unavailable, setUnavailable] = useState(false);
  const reduce = useReducedMotion();
  const target = useMotionValue(0);
  const energy = useSpring(target, SPRING_GLIDE);
  const audible = status === "speaking" || (status === "listening" && !muted);
  const paused =
    status === "ended" ||
    status === "error" ||
    (status === "listening" && muted);
  const busy = status === "connecting" || status === "thinking";
  const appearance = orbOptions?.appearance ?? (compact ? "liquid" : "halo");
  const size = orbOptions?.size ?? (compact ? "sm" : "lg");
  const requestedSpeed = orbOptions?.speed ?? 1;
  const speed = Number.isFinite(requestedSpeed)
    ? Math.max(0, requestedSpeed)
    : 1;
  const haloScale = useTransform(energy, (value) => 1 + value * 0.08);
  const haloOpacity = useTransform(energy, (value) => 0.28 + value * 0.3);

  useEffect(() => {
    const update = (value: number) => {
      target.set(
        audible && !reduce && Number.isFinite(value)
          ? Math.max(0, Math.min(1, value))
          : 0,
      );
    };
    update(isMotionValue(activity) ? activity.get() : activity);
    if (reduce) energy.jump(0);
    if (isMotionValue(activity)) return activity.on("change", update);
  }, [activity, audible, reduce, target, energy]);

  const frameClass = cn(
    "relative isolate aspect-square max-w-full shrink-0",
    (compact ? DOCK_SIZES : SESSION_SIZES)[size],
    orbOptions?.className,
    className,
  );

  if (orb != null)
    return (
      <div data-slot="voice-agent-orb" className={frameClass}>
        {orb}
      </div>
    );

  if (unavailable) {
    return (
      <div
        role="img"
        aria-label="Voice visualization unavailable"
        data-slot="voice-agent-orb"
        data-render-state="error"
        className={cn(
          "flex aspect-square shrink-0 flex-col items-center justify-center gap-2 rounded-full border border-border text-muted-foreground",
          frameClass,
        )}
      >
        <AudioLines aria-hidden="true" className="size-5" />
        <span aria-hidden="true" className="text-xs">
          No visual
        </span>
      </div>
    );
  }

  return (
    <div
      data-slot="voice-agent-orb"
      data-appearance={appearance}
      className={frameClass}
    >
      {appearance === "halo" && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-2xl"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${colors[1]}, transparent 55%), radial-gradient(circle at 65% 60%, ${colors[0]}, transparent 70%)`,
            scale: reduce ? 1 : haloScale,
            opacity: paused ? 0.12 : reduce ? 0.28 : haloOpacity,
          }}
        />
      )}
      <VoiceOrb
        activity={audible ? activity : 0}
        analyser={audible ? analyser : null}
        colors={colors}
        active={!paused}
        speed={speed * (busy ? 0.65 : audible ? 0.9 : 0.2)}
        onError={() => setUnavailable(true)}
        className={cn("size-full", appearance === "halo" && "saturate-125")}
      />
      {appearance === "halo" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[4.5%] rounded-full border border-foreground/10"
        />
      )}
    </div>
  );
}

export function VoiceAgentControls({
  status,
  muted = false,
  onStart,
  onEnd,
  onMutedChange,
  compact = false,
}: Pick<
  VoiceAgentProps,
  "status" | "muted" | "onStart" | "onEnd" | "onMutedChange"
> & { compact?: boolean }) {
  const reduce = useReducedMotion();
  const connected = isVoiceAgentConnected(status);
  const muteLabel = muted ? "Unmute microphone" : "Mute microphone";
  const endLabel = status === "connecting" ? "Cancel connection" : "End call";

  const startLabel =
    status === "idle"
      ? "Start talking"
      : status === "error"
        ? "Try again"
        : "Talk again";
  const primaryLabel = connected
    ? endLabel
    : compact
      ? status === "error"
        ? "Retry"
        : "Start"
      : startLabel;

  return (
    <MorphicTooltipProvider>
      <div
        data-slot="voice-agent-controls"
        className={cn("relative h-9 shrink-0", compact ? "w-20" : "w-44")}
      >
        <motion.div
          aria-hidden={!connected}
          className="absolute top-0 left-0"
          initial={false}
          animate={{ opacity: connected ? 1 : 0 }}
          style={{ pointerEvents: connected ? "auto" : "none" }}
          transition={{ duration: reduce ? 0 : 0.14, ease: EASE_OUT }}
        >
          <MorphicTooltip
            content={muteLabel}
            disabled={!connected || status === "connecting"}
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!connected || status === "connecting"}
              aria-label={muteLabel}
              aria-pressed={muted}
              className={cn("size-9 rounded-full", FOCUS)}
              onClick={() => onMutedChange(!muted)}
            >
              <ActionSwapIcon
                value={muted ? "muted" : "unmuted"}
                animation="roll"
              >
                {muted ? (
                  <MicOff aria-hidden="true" className="size-4" />
                ) : (
                  <Mic aria-hidden="true" className="size-4" />
                )}
              </ActionSwapIcon>
            </Button>
          </MorphicTooltip>
        </motion.div>
        <MorphicTooltip
          content={endLabel}
          disabled={!compact || !connected}
          className="absolute top-0 right-0"
        >
          <Button
            type="button"
            aria-label={primaryLabel}
            initial={false}
            animate={{
              width: compact ? (connected ? 36 : 80) : connected ? 132 : 176,
            }}
            transition={
              reduce
                ? { duration: 0 }
                : { ...SPRING_PRESS, width: SPRING_PANEL }
            }
            className={cn("h-9 gap-2 overflow-hidden rounded-full px-0", FOCUS)}
            onClick={connected ? onEnd : onStart}
          >
            <ActionSwapIcon
              value={connected ? "end" : "start"}
              animation="roll"
            >
              {connected ? (
                <PhoneOff aria-hidden="true" className="size-4" />
              ) : (
                <Mic aria-hidden="true" className="size-4" />
              )}
            </ActionSwapIcon>
            {(!compact || !connected) && (
              <span className="whitespace-nowrap text-sm">
                {connected
                  ? status === "connecting"
                    ? "Cancel"
                    : "End call"
                  : primaryLabel}
              </span>
            )}
          </Button>
        </MorphicTooltip>
      </div>
    </MorphicTooltipProvider>
  );
}

export function VoiceAgentTranscript({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn("relative", className)}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {children != null && (
          <motion.div
            key={typeof children === "string" ? children : "transcript"}
            initial={{ opacity: 0, y: reduce ? 0 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -4 }}
            transition={{ duration: reduce ? 0 : 0.14, ease: EASE_OUT }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
