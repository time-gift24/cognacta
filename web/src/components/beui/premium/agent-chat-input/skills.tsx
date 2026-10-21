"use client";

import { Box, Check } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import { SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type { AgentChatSkill } from "./types";

export function filterSkills(skills: readonly AgentChatSkill[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return skills;
  }

  return skills.filter((skill) => {
    const haystack = `${skill.label} ${skill.description ?? ""}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export interface SkillSelectorProps {
  skills: readonly AgentChatSkill[];
  selectedSkillIds: readonly string[];
  activeIndex: number;
  reduce?: boolean | null;
  onActiveIndexChange: (index: number) => void;
  onSelect: (skillId: string) => void;
}

export function SkillSelector({
  skills,
  selectedSkillIds,
  activeIndex,
  reduce,
  onActiveIndexChange,
  onSelect,
}: SkillSelectorProps) {
  return (
    <motion.div
      key="skill-selector"
      initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? undefined : { opacity: 0, y: 4, scale: 0.98 }}
      transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
      className="-top-2 absolute right-2 left-2 z-[70] max-h-80 -translate-y-full overflow-hidden rounded-2xl border border-border-strong/50 bg-background/20 p-1.5 backdrop-blur-xl"
    >
      <p className="px-2 py-1.5 font-medium text-muted-foreground text-xs">
        Skills
      </p>
      <div className="max-h-64 overflow-y-auto">
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
                className="group/row relative isolate flex min-h-9 w-full items-center gap-2 px-1.5 text-left text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                {/* The shared Button is always pill-shaped, so the row paints its surface here. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-0 -z-10 rounded-lg ring-ring ring-offset-2 ring-offset-background group-focus-visible/row:ring-2 transition-colors",
                    active && "bg-primary/5",
                  )}
                />
                <span className="grid size-6 shrink-0 place-items-center text-muted-foreground">
                  {skill.icon ?? <Box className="size-4" />}
                </span>
                <span className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span className="shrink-0 font-medium text-foreground">
                    {skill.label}
                  </span>
                  {skill.description ? (
                    <span className="min-w-0 truncate text-muted-foreground text-xs">
                      {skill.description}
                    </span>
                  ) : null}
                </span>
                {selected ? (
                  <Check className="size-4 shrink-0 text-accent" />
                ) : (
                  <span className="shrink-0 text-muted-foreground">
                    Personal
                  </span>
                )}
              </Button>
            );
          })
        ) : (
          <p className="px-2 py-3 text-muted-foreground text-sm">
            No matching skills
          </p>
        )}
      </div>
    </motion.div>
  );
}

export function getSlashQuery(text: string) {
  const match = /(?:^|\s)\/([^\s]*)$/.exec(text);

  if (!match) {
    return null;
  }

  return match[1] ?? "";
}

export function removeSlashQuery(text: string) {
  return text.replace(/(?:^|\s)\/[^\s]*$/, "").trimStart();
}
