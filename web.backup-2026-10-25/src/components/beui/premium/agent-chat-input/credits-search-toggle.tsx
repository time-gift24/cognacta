"use client";

import { type AgentComposerPresentation, useAgentComposerPresentation } from "./composition";

import { Globe2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import { EASE_OUT, SPRING_PRESS } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  type AgentChatCreditsLabels,
  DEFAULT_CREDITS_LABELS,
} from "./credits-labels";

export function CreditsSearchToggle({
  labels = DEFAULT_CREDITS_LABELS,
  presentation: presentationOverride,
  disabled,
  enabled,
  reduce,
  onChange,
}: {
  labels?: AgentChatCreditsLabels;
  presentation?: AgentComposerPresentation;
  disabled?: boolean;
  enabled: boolean;
  reduce?: boolean | null;
  onChange: (enabled: boolean) => void;
}) {
  const presentation = useAgentComposerPresentation(presentationOverride);
  const SearchIcon = presentation.icons?.search ?? Globe2;
  return (
    <Button
      variant="plain"
      type="button"
      disabled={disabled}
      aria-label={enabled ? labels.disableSearch : labels.enableSearch}
      aria-pressed={enabled}
      onClick={() => onChange(!enabled)}
      whileTap={reduce ? undefined : { scale: 0.96 }}
      initial={false}
      animate={{ width: enabled ? "auto" : 36 }}
      transition={{
        width: { duration: reduce ? 0 : 0.3, ease: EASE_OUT },
        scale: SPRING_PRESS,
      }}
      className={cn(
        presentation.classNames?.search ?? "relative h-9 shrink-0 overflow-hidden rounded-full text-sm transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] [--search-bg:#dceeff] [--search-fg:#1677d2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:[--search-bg:#15324a] dark:[--search-fg:#70baff]",
        enabled
          ? presentation.classNames?.searchEnabled ?? "bg-(--search-bg) text-(--search-fg)"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <SearchIcon className="absolute top-1/2 left-[9px] size-[18px] -translate-y-1/2" />
      <motion.span
        aria-hidden={!enabled}
        initial={false}
        animate={{ opacity: enabled ? 1 : 0, x: enabled || reduce ? 0 : -4 }}
        transition={{
          duration: reduce ? 0 : 0.2,
          delay: reduce || !enabled ? 0 : 0.075,
          ease: EASE_OUT,
        }}
        className="inline-block pl-8 pr-3 font-medium whitespace-nowrap"
      >
        {labels.search}
      </motion.span>
    </Button>
  );
}
