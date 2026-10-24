"use client";

import { X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";
import type {
  WhatsNewLabels,
  WhatsNewRelease,
  WhatsNewSlide,
  WhatsNewTeaserPlacement,
} from "./whats-new-data";
import { teaserMotion } from "./whats-new-motion";
import { WhatsNewThumbStack } from "./whats-new-thumb-stack";

export type WhatsNewTeaserProps = {
  release: WhatsNewRelease;
  slides: WhatsNewSlide[];
  labels: WhatsNewLabels;
  placement: WhatsNewTeaserPlacement;
  reduceMotion: boolean;
  onOpen: () => void;
  onDismiss: () => void;
  className?: string;
};

const PLACEMENT: Record<WhatsNewTeaserPlacement, string> = {
  "bottom-right": "absolute right-4 bottom-4 z-10",
  "bottom-left": "absolute bottom-4 left-4 z-10",
  inline: "relative",
};

/**
 * Small floating announcement. The primary button's overlay makes the whole
 * card open the spotlight; the dismiss button sits above that overlay.
 */
export function WhatsNewTeaser({
  release,
  slides,
  labels,
  placement,
  reduceMotion,
  onOpen,
  onDismiss,
  className,
}: WhatsNewTeaserProps) {
  const canHover = useHoverCapable();
  const [hovered, setHovered] = useState(false);
  const headline = release.headline ?? slides[0]?.title ?? release.label;

  return (
    <motion.aside
      aria-label={release.label}
      {...teaserMotion(reduceMotion)}
      onPointerEnter={() => canHover && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cn(
        PLACEMENT[placement],
        "w-80 max-w-[calc(100%-2rem)] rounded-3xl border border-border bg-background p-3 text-foreground transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring hover:border-foreground/20",
        placement === "inline" && "max-w-full",
        className,
      )}
    >
      <div className="flex items-start gap-3 p-1">
        <WhatsNewThumbStack
          slides={slides}
          spread={hovered && !reduceMotion}
          reduceMotion={reduceMotion}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="relative flex size-2">
              {reduceMotion ? null : (
                <span className="absolute inset-0 animate-ping rounded-full bg-teal-500/60 [animation-iteration-count:3]" />
              )}
              <span className="relative size-2 rounded-full bg-teal-500" />
            </span>
            <span className="font-medium text-foreground">{release.label}</span>
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-pretty">{headline}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={labels.dismissTeaser}
          onClick={onDismiss}
          className="relative z-10 -mt-1 -mr-1 shrink-0"
        >
          <X aria-hidden className="size-4" />
        </Button>
      </div>
      <Button
        onClick={onOpen}
        aria-haspopup="dialog"
        whileHover={undefined}
        whileTap={undefined}
        className="mt-2 h-9 w-full text-sm focus-visible:ring-0 focus-visible:ring-offset-0 after:absolute after:inset-0 after:rounded-3xl after:content-['']"
      >
        {labels.teaserCta}
      </Button>
    </motion.aside>
  );
}
