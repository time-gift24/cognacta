"use client";

import { AudioLines } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/beui/utils";
import {
  SESSION_COLORS,
  VoiceAgentControls,
  VoiceAgentOrb,
  type VoiceAgentProps,
  VoiceAgentStatusLabel,
  VoiceAgentTranscript,
} from "./voice-agent-shared";

/** A centered, controlled voice session with an audio-reactive liquid orb. */
export function VoiceAgentSession({
  title = "Voice assistant",
  status,
  muted = false,
  activity,
  analyser,
  colors = SESSION_COLORS,
  orbOptions,
  orb,
  surface = "card",
  showTranscript = true,
  transcript,
  error,
  onStart,
  onEnd,
  onMutedChange,
  className,
}: VoiceAgentProps) {
  const titleId = useId();
  const message =
    status === "error"
      ? error || "Connection failed. Try again when you’re ready."
      : transcript ||
        (status === "idle"
          ? "Start a conversation with your agent."
          : status === "ended"
            ? "You can start another conversation anytime."
            : status === "listening" && muted
              ? "Unmute when you’re ready to continue."
              : "");

  return (
    <section
      aria-labelledby={titleId}
      data-slot="voice-agent-session"
      data-status={status}
      className={cn(
        "w-full max-w-md rounded-3xl p-6 text-foreground sm:p-8",
        surface === "card"
          ? "border border-border bg-background"
          : "bg-transparent",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-xl font-medium">
          {title}
        </h2>
        <AudioLines
          aria-hidden="true"
          className="size-4 text-muted-foreground"
        />
      </header>

      <div className="my-6 flex justify-center">
        <VoiceAgentOrb
          status={status}
          muted={muted}
          activity={activity}
          analyser={analyser}
          colors={colors}
          orbOptions={orbOptions}
          orb={orb}
        />
      </div>

      <div className="text-center">
        <VoiceAgentStatusLabel
          status={status}
          muted={muted}
          className="block text-base font-medium"
        />
        {(showTranscript || status === "error") && (
          <VoiceAgentTranscript className="mx-auto mt-2 min-h-12 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {message}
          </VoiceAgentTranscript>
        )}
      </div>

      <div className="mt-6 flex justify-center">
        <VoiceAgentControls
          status={status}
          muted={muted}
          onStart={onStart}
          onEnd={onEnd}
          onMutedChange={onMutedChange}
        />
      </div>
    </section>
  );
}
