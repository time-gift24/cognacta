"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Paperclip, Plus } from "@/components/icons";
import {
  AnimatedDropdown,
  AnimatedDropdownCheckboxItem,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
  AnimatedDropdownItemIcon,
  AnimatedDropdownItemText,
  AnimatedDropdownSub,
  AnimatedDropdownSubContent,
  AnimatedDropdownSubTrigger,
  AnimatedDropdownTrigger,
} from "@/components/premium/animated-dropdown";
import { useKnowledge } from "./knowledge-provider";
import type { KnowledgeEntry } from "./knowledge-data";

export function ComposerContextMenu({
  onAttach,
  selectedIds,
  onToggle,
  disabled,
}: {
  onAttach: () => void;
  selectedIds: string[];
  onToggle: (entry: KnowledgeEntry) => void;
  disabled: boolean;
}) {
  const { entries, ready } = useKnowledge();
  const router = useRouter();
  return (
    <AnimatedDropdown modal={false}>
      <AnimatedDropdownTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Add context"
          className="grid size-9 place-items-center rounded-full hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Plus className="size-[18px]" />
        </button>
      </AnimatedDropdownTrigger>
      <AnimatedDropdownContent
        side="top"
        align="start"
        className="w-48 min-w-0"
      >
        <AnimatedDropdownItem onSelect={onAttach}>
          <AnimatedDropdownItemIcon>
            <Paperclip />
          </AnimatedDropdownItemIcon>
          <AnimatedDropdownItemText>Attach files</AnimatedDropdownItemText>
        </AnimatedDropdownItem>
        <AnimatedDropdownSub>
          <AnimatedDropdownSubTrigger disabled={!ready}>
            <AnimatedDropdownItemIcon>
              <BookOpen />
            </AnimatedDropdownItemIcon>
            <AnimatedDropdownItemText>Knowledge base</AnimatedDropdownItemText>
          </AnimatedDropdownSubTrigger>
          <AnimatedDropdownSubContent className="max-h-64 w-64 min-w-0 overflow-y-auto">
            {entries.map((entry) => (
              <AnimatedDropdownCheckboxItem
                key={entry.id}
                checked={selectedIds.includes(entry.id)}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={() => onToggle(entry)}
              >
                <span className="truncate">{entry.title}</span>
              </AnimatedDropdownCheckboxItem>
            ))}
            {!entries.length && (
              <AnimatedDropdownItem
                onSelect={() => router.push("/knowledge-base")}
              >
                Add your first source
              </AnimatedDropdownItem>
            )}
          </AnimatedDropdownSubContent>
        </AnimatedDropdownSub>
      </AnimatedDropdownContent>
    </AnimatedDropdown>
  );
}
