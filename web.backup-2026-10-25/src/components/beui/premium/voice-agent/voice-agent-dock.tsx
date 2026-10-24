"use client";

import { useId } from "react";
import { cn } from "@/lib/beui/utils";
import {
  DOCK_COLORS,
  VoiceAgentControls,
  VoiceAgentOrb,
  type VoiceAgentProps,
  VoiceAgentStatusLabel,
  VoiceAgentTranscript,
} from "./voice-agent-shared";

/** A compact voice dock. Position its wrapper wherever your app needs it. */
export function VoiceAgentDock({
  title = "Voice assistant",
  status,
  muted = false,
  activity,
  analyser,
  colors = DOCK_COLORS,
  orbOptions,
  orb,
  surface = "card",
  showTranscript = false,
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
      ? error || "Connection failed. Please try again."
      : transcript;

  return (
    <section
      aria-labelledby={titleId}
      data-slot="voice-agent-dock"
      data-status={status}
      className={cn(
        "w-full max-w-md rounded-3xl p-3 text-foreground",
        surface === "card"
          ? "border border-border bg-background"
          : "bg-transparent",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <VoiceAgentOrb
          compact
          status={status}
          muted={muted}
          activity={activity}
          analyser={analyser}
          colors={colors}
          orbOptions={orbOptions}
          orb={orb}
        />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="truncate text-sm font-medium">
            {title}
          </h2>
          <VoiceAgentStatusLabel
            status={status}
            muted={muted}
            className="mt-0.5 block truncate text-xs text-muted-foreground"
          />
        </div>
        <VoiceAgentControls
          compact
          status={status}
          muted={muted}
          onStart={onStart}
          onEnd={onEnd}
          onMutedChange={onMutedChange}
        />
      </div>
      {(showTranscript || status === "error") && (
        <div className="mt-3 border-t border-border px-1 pt-3">
          <VoiceAgentTranscript className="h-12 overflow-y-auto text-sm leading-relaxed text-muted-foreground">
            {message}
          </VoiceAgentTranscript>
        </div>
      )}
    </section>
  );
}
