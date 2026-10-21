"use client";

import type { KeyboardEvent, RefObject } from "react";
import { useState } from "react";
import type { AgentChatComposerHandle } from "./composer";
import { filterSkills } from "./skills";
import type { AgentChatSkill } from "./types";

export type UseSkillCommandParams = {
  skills: readonly AgentChatSkill[];
  composerRef: RefObject<AgentChatComposerHandle | null>;
  disabled?: boolean;
};

export function useSkillCommand({
  skills,
  composerRef,
  disabled = false,
}: UseSkillCommandParams) {
  const [query, setQuery] = useState<string | null>(null);
  const [requestedIndex, setActiveIndex] = useState(0);

  const options = query === null ? [] : filterSkills(skills, query);
  const activeIndex = Math.min(requestedIndex, Math.max(0, options.length - 1));
  const visible = !disabled && query !== null && skills.length > 0;

  function onQueryChange(nextQuery: string | null) {
    if (nextQuery === query) return;
    setQuery(skills.length > 0 ? nextQuery : null);
    setActiveIndex(0);
  }

  function select(skillId: string) {
    if (disabled) return;
    const skill = skills.find((entry) => entry.id === skillId);
    if (skill) {
      composerRef.current?.insertSkill(skill);
    }
    setQuery(null);
    setActiveIndex(0);
  }

  function onNavKeyDown(event: KeyboardEvent<HTMLDivElement>): boolean {
    if (disabled || query === null) {
      return false;
    }
    const currentQuery = composerRef.current?.getSlashQuery() ?? null;
    if (currentQuery !== query) {
      onQueryChange(currentQuery);
      return false;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setQuery(null);
      return true;
    }

    if (options.length === 0) {
      return false;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((activeIndex + 1) % options.length);
      return true;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((activeIndex - 1 + options.length) % options.length);
      return true;
    }

    if (event.key === "Enter" && options[activeIndex]) {
      event.preventDefault();
      select(options[activeIndex].id);
      return true;
    }

    return false;
  }

  return {
    activeIndex,
    options,
    visible,
    onNavKeyDown,
    onQueryChange,
    select,
    setActiveIndex,
  };
}
