"use client";

import { type AgentComposerPresentation, useAgentComposerPresentation } from "./composition";

import { Box, Check, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import { SPRING_PANEL } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  type AgentChatCreditsLabels,
  DEFAULT_CREDITS_LABELS,
} from "./credits-labels";
import type { AgentChatSkill } from "./types";

export function CreditsTopLayer({
  labels = DEFAULT_CREDITS_LABELS,
  presentation: presentationOverride,
  creditsRemaining,
  skillsVisible,
  skills,
  selectedSkillIds,
  activeIndex,
  reduce,
  onActiveIndexChange,
  onDismiss,
  onSelect,
  onUpgrade,
}: {
  labels?: AgentChatCreditsLabels;
  presentation?: AgentComposerPresentation;
  creditsRemaining: number;
  skillsVisible: boolean;
  skills: readonly AgentChatSkill[];
  selectedSkillIds: readonly string[];
  activeIndex: number;
  reduce?: boolean | null;
  onActiveIndexChange: (index: number) => void;
  onDismiss?: () => void;
  onSelect: (skillId: string) => void;
  onUpgrade?: () => void;
}) {
  const presentation = useAgentComposerPresentation(presentationOverride);
  const SkillIcon = presentation.icons?.skill ?? Box;
  const CheckIcon = presentation.icons?.check ?? Check;
  const CloseIcon = presentation.icons?.close ?? X;
  const visibleRows = Math.min(Math.max(skills.length, 1), 4);
  const expandedHeight = 44 + visibleRows * 36;

  return (
    <div
      data-slot="credits-top-layer"
      data-state={skillsVisible ? "skills" : "credits"}
      className="relative z-20 h-9"
    >
      <AnimatePresence initial={false}>
        {skillsVisible ? (
          <motion.div
            key="skills-panel"
            data-slot="credits-skill-panel"
            initial={reduce ? false : { height: 36, opacity: 0.7 }}
            animate={{ height: expandedHeight, opacity: 1 }}
            exit={reduce ? undefined : { height: 36, opacity: 0 }}
            transition={reduce ? { duration: 0 } : SPRING_PANEL}
            className="absolute -right-[3px] bottom-0 -left-[3px] overflow-hidden rounded-t-2xl bg-muted"
          >
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: 6 }}
              transition={reduce ? { duration: 0 } : SPRING_PANEL}
              className="absolute inset-x-0 bottom-0 p-2"
            >
              <p className="px-1 pb-1.5 font-medium text-muted-foreground text-xs">
                {labels.skills}
              </p>
              <div className="flex max-h-44 flex-col overflow-y-auto">
                {skills.length > 0 ? (
                  skills.map((skill, index) => {
                    const selected = selectedSkillIds.includes(skill.id);
                    const active = index === activeIndex;

                    return (
                      <Button
                        variant="plain"
                        key={skill.id}
                        type="button"
                        onPointerEnter={() => onActiveIndexChange(index)}
                        onClick={() => onSelect(skill.id)}
                        className="group/row relative isolate flex min-h-9 items-center gap-2 px-2 text-left text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                      >
                        {/* The shared Button is always pill-shaped, so the row paints its surface here. */}
                        <span
                          aria-hidden="true"
                          className={cn(
                            "pointer-events-none absolute inset-0 -z-10 rounded-lg ring-ring ring-offset-2 ring-offset-background group-focus-visible/row:ring-2 transition-colors",
                            active && "bg-background/75",
                          )}
                        />
                        <span className="grid size-6 shrink-0 place-items-center text-muted-foreground">
                          {skill.icon ?? <SkillIcon className="size-4" />}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                          {skill.label}
                        </span>
                        {skill.description ? (
                          <span className="hidden max-w-64 truncate text-muted-foreground text-xs sm:block">
                            {skill.description}
                          </span>
                        ) : null}
                        {selected ? (
                          <CheckIcon className="size-4 shrink-0 text-accent" />
                        ) : null}
                      </Button>
                    );
                  })
                ) : (
                  <p className="px-2 py-3 text-muted-foreground text-sm">
                    {labels.noMatchingSkills}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="credits"
            initial={reduce ? false : { opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 5 }}
            transition={reduce ? { duration: 0 } : SPRING_PANEL}
            className="absolute inset-0 flex items-center justify-between gap-3 px-3 text-muted-foreground text-sm sm:px-3.5"
          >
            <span>{labels.creditsRemaining(creditsRemaining)}</span>
            <div className="flex items-center gap-2.5">
              <Button
                variant="plain"
                type="button"
                onClick={onUpgrade}
                className="font-medium text-foreground transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {labels.upgrade}
              </Button>
              <Button
                variant="plain"
                type="button"
                aria-label={labels.dismissCredits}
                onClick={onDismiss}
                className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CloseIcon className="size-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
