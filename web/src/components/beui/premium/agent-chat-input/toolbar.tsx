"use client";

import {
  ArrowUp,
  Blocks,
  ChevronDown,
  Code2,
  ListChecks,
  LoaderCircle,
  Megaphone,
  Mic,
  Paperclip,
  Plus,
  Search,
  Square,
  Target,
  WandSparkles,
} from "lucide-react";
import type { RefObject } from "react";
import { useState } from "react";
import { Button } from "@/components/beui/motion/button";
import {
  AnimatedDropdown,
  AnimatedDropdownCheckboxItem,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
  AnimatedDropdownItemDescription,
  AnimatedDropdownItemIcon,
  AnimatedDropdownItemText,
  AnimatedDropdownLabel,
  AnimatedDropdownRadioGroup,
  AnimatedDropdownRadioItem,
  AnimatedDropdownSeparator,
  AnimatedDropdownSub,
  AnimatedDropdownSubContent,
  AnimatedDropdownSubTrigger,
  AnimatedDropdownTrigger,
} from "@/components/beui/premium/animated-dropdown";
import {
  MorphicTooltip,
  MorphicTooltipProvider,
} from "@/components/beui/premium/morphic-tooltip";
import { SPRING_PRESS } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { findLabel } from "./attachment-utils";
import type { AgentComposerModelProps } from "./composition";
import { ToolbarButton } from "./toolbar-button";
import type {
  AgentChatAgent,
  AgentChatInputClassNames,
  AgentChatInputOption,
} from "./types";

function agentIcon(agentId: string) {
  switch (agentId) {
    case "research-agent":
      return <Search className="size-4" />;
    case "marketing-agent":
      return <Megaphone className="size-4" />;
    case "coding-agent":
      return <Code2 className="size-4" />;
    default:
      return <WandSparkles className="size-4" />;
  }
}

export interface AgentChatInputToolbarProps {
  part?: "options" | "agent" | "model" | "voice" | "attach" | "action";
  side?: AgentComposerModelProps["side"];
  align?: AgentComposerModelProps["align"];
  showSpinner?: boolean;
  disabled?: boolean;
  reduce?: boolean | null;
  classNames?: AgentChatInputClassNames;
  actions: {
    allowFileUpload: boolean;
    fileInputRef: RefObject<HTMLInputElement | null>;
  };
  agentSelector: {
    agents: readonly AgentChatAgent[];
    selectedAgent: string;
    setSelectedAgent: (value: string) => void;
  };
  modelSelector: {
    models: readonly AgentChatInputOption[];
    selectedModel: string;
    setSelectedModel: (value: string) => void;
    reasoningLevels: readonly AgentChatInputOption[];
    selectedReasoning: string;
    setSelectedReasoning: (value: string) => void;
    speedModes: readonly AgentChatInputOption[];
    selectedSpeed: string;
    setSelectedSpeed: (value: string) => void;
  };
  submitState: {
    busy: boolean;
    canSubmit: boolean;
  };
  onVoiceClick?: () => void;
  onStop?: () => void;
  onSubmit: () => void;
}

export function AgentChatInputToolbar({
  part,
  side = "top",
  align = "end",
  showSpinner = true,
  disabled,
  reduce,
  classNames,
  actions,
  agentSelector,
  modelSelector,
  submitState,
  onVoiceClick,
  onStop,
  onSubmit,
}: AgentChatInputToolbarProps) {
  const { allowFileUpload, fileInputRef } = actions;
  const { agents, selectedAgent, setSelectedAgent } = agentSelector;
  const {
    models,
    selectedModel,
    setSelectedModel,
    reasoningLevels,
    selectedReasoning,
    setSelectedReasoning,
    speedModes,
    selectedSpeed,
    setSelectedSpeed,
  } = modelSelector;
  const { busy, canSubmit } = submitState;
  const [planMode, setPlanMode] = useState(false);
  const [pursueGoal, setPursueGoal] = useState(false);

  const options = (
    <AnimatedDropdown>
      <AnimatedDropdownTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled || busy}
          aria-label="Open agent actions"
          className="size-9 rounded-full h-9"
        >
          <Plus className="size-4" />
        </Button>
      </AnimatedDropdownTrigger>
      <AnimatedDropdownContent
        side="top"
        align="start"
        className={cn("w-64", classNames?.menu)}
      >
        {allowFileUpload && (
          <>
            <AnimatedDropdownItem
              onSelect={() => fileInputRef.current?.click()}
            >
              <AnimatedDropdownItemIcon>
                <Paperclip />
              </AnimatedDropdownItemIcon>
              <AnimatedDropdownItemText>
                Add photos & files
              </AnimatedDropdownItemText>
            </AnimatedDropdownItem>
            <AnimatedDropdownSeparator />
          </>
        )}
        <AnimatedDropdownCheckboxItem
          indicatorSide="right"
          checked={planMode}
          onCheckedChange={(checked) => setPlanMode(checked === true)}
          onSelect={(event) => event.preventDefault()}
        >
          <AnimatedDropdownItemIcon>
            <ListChecks />
          </AnimatedDropdownItemIcon>
          <AnimatedDropdownItemText>Plan mode</AnimatedDropdownItemText>
        </AnimatedDropdownCheckboxItem>
        <AnimatedDropdownCheckboxItem
          indicatorSide="right"
          checked={pursueGoal}
          onCheckedChange={(checked) => setPursueGoal(checked === true)}
          onSelect={(event) => event.preventDefault()}
        >
          <AnimatedDropdownItemIcon>
            <Target />
          </AnimatedDropdownItemIcon>
          <AnimatedDropdownItemText>Pursue goal</AnimatedDropdownItemText>
        </AnimatedDropdownCheckboxItem>
        <AnimatedDropdownSeparator />
        <AnimatedDropdownSub>
          <AnimatedDropdownSubTrigger>
            <AnimatedDropdownItemIcon>
              <WandSparkles />
            </AnimatedDropdownItemIcon>
            <AnimatedDropdownItemText>Create</AnimatedDropdownItemText>
          </AnimatedDropdownSubTrigger>
          <AnimatedDropdownSubContent alignOffset={-8} className="w-56">
            {["Component", "Block", "Template"].map((label) => (
              <AnimatedDropdownItem
                key={label}
                onSelect={(event) => event.preventDefault()}
              >
                {label}
              </AnimatedDropdownItem>
            ))}
          </AnimatedDropdownSubContent>
        </AnimatedDropdownSub>
        <AnimatedDropdownSub>
          <AnimatedDropdownSubTrigger>
            <AnimatedDropdownItemIcon>
              <Blocks />
            </AnimatedDropdownItemIcon>
            <AnimatedDropdownItemText>Plugins</AnimatedDropdownItemText>
          </AnimatedDropdownSubTrigger>
          <AnimatedDropdownSubContent alignOffset={-8} className="w-56">
            {["GitHub", "Supabase", "Linear"].map((label) => (
              <AnimatedDropdownItem
                key={label}
                onSelect={(event) => event.preventDefault()}
              >
                {label}
              </AnimatedDropdownItem>
            ))}
          </AnimatedDropdownSubContent>
        </AnimatedDropdownSub>
      </AnimatedDropdownContent>
    </AnimatedDropdown>
  );
  const agent = (
    <AnimatedDropdown>
      <AnimatedDropdownTrigger asChild>
        <Button
          variant="ghost"
          disabled={disabled || busy}
          aria-label="Select agent"
          className="group max-w-[7.5rem] gap-1.5 px-2 sm:max-w-[11rem] sm:px-2.5 rounded-full h-9"
        >
          <span className="truncate text-foreground">
            {findLabel(agents, selectedAgent)}
          </span>
          <ChevronDown className="size-4 shrink-0 transition-transform motion-reduce:transition-none group-data-[state=open]:rotate-180" />
        </Button>
      </AnimatedDropdownTrigger>
      <AnimatedDropdownContent
        side="top"
        align="start"
        className={cn("w-64", classNames?.menu)}
      >
        <AnimatedDropdownRadioGroup
          value={selectedAgent}
          onValueChange={setSelectedAgent}
        >
          {agents.map((option) => (
            <AnimatedDropdownRadioItem
              key={option.id}
              value={option.id}
              textValue={option.label}
            >
              <AnimatedDropdownItemIcon>
                {option.icon ?? agentIcon(option.id)}
              </AnimatedDropdownItemIcon>
              <AnimatedDropdownItemText>
                {option.label}
                {option.description && (
                  <AnimatedDropdownItemDescription>
                    {option.description}
                  </AnimatedDropdownItemDescription>
                )}
              </AnimatedDropdownItemText>
            </AnimatedDropdownRadioItem>
          ))}
        </AnimatedDropdownRadioGroup>
      </AnimatedDropdownContent>
    </AnimatedDropdown>
  );
  const model = (
    <AnimatedDropdown>
      <AnimatedDropdownTrigger asChild>
        <Button
          variant="ghost"
          disabled={disabled || busy}
          aria-label="Change model and reasoning"
          className="group gap-1.5 px-2 sm:px-3 rounded-full h-9"
        >
          <span className="text-foreground">
            {findLabel(models, selectedModel).replace("GPT-", "")}
          </span>
          <span className="hidden text-muted-foreground sm:inline">
            {findLabel(reasoningLevels, selectedReasoning)}
          </span>
          <ChevronDown className="size-4 shrink-0 transition-transform motion-reduce:transition-none group-data-[state=open]:rotate-180" />
        </Button>
      </AnimatedDropdownTrigger>
      <AnimatedDropdownContent
        side={side}
        align={align}
        className={cn("w-60", classNames?.menu)}
      >
        <AnimatedDropdownLabel>Reasoning</AnimatedDropdownLabel>
        <AnimatedDropdownRadioGroup
          value={selectedReasoning}
          onValueChange={setSelectedReasoning}
        >
          {reasoningLevels.map((option) => (
            <AnimatedDropdownRadioItem
              key={option.id}
              value={option.id}
              textValue={option.label}
            >
              <AnimatedDropdownItemText>
                {option.label}
                {option.description && (
                  <AnimatedDropdownItemDescription>
                    {option.description}
                  </AnimatedDropdownItemDescription>
                )}
              </AnimatedDropdownItemText>
            </AnimatedDropdownRadioItem>
          ))}
        </AnimatedDropdownRadioGroup>
        <AnimatedDropdownSeparator />
        <AnimatedDropdownSub>
          <AnimatedDropdownSubTrigger>
            <AnimatedDropdownItemText>
              {findLabel(models, selectedModel)}
            </AnimatedDropdownItemText>
          </AnimatedDropdownSubTrigger>
          <AnimatedDropdownSubContent alignOffset={-12} className="w-64">
            <AnimatedDropdownLabel>Model</AnimatedDropdownLabel>
            <AnimatedDropdownRadioGroup
              value={selectedModel}
              onValueChange={setSelectedModel}
            >
              {models.map((option) => (
                <AnimatedDropdownRadioItem
                  key={option.id}
                  value={option.id}
                  textValue={option.label}
                >
                  <AnimatedDropdownItemText>
                    {option.label}
                  </AnimatedDropdownItemText>
                </AnimatedDropdownRadioItem>
              ))}
            </AnimatedDropdownRadioGroup>
          </AnimatedDropdownSubContent>
        </AnimatedDropdownSub>
        <AnimatedDropdownSub>
          <AnimatedDropdownSubTrigger>
            <AnimatedDropdownItemText>Speed</AnimatedDropdownItemText>
          </AnimatedDropdownSubTrigger>
          <AnimatedDropdownSubContent alignOffset={-12} className="w-64">
            <AnimatedDropdownLabel>Speed</AnimatedDropdownLabel>
            <AnimatedDropdownRadioGroup
              value={selectedSpeed}
              onValueChange={setSelectedSpeed}
            >
              {speedModes.map((option) => (
                <AnimatedDropdownRadioItem
                  key={option.id}
                  value={option.id}
                  textValue={option.label}
                >
                  <AnimatedDropdownItemText>
                    {option.label}
                    {option.description && (
                      <AnimatedDropdownItemDescription>
                        {option.description}
                      </AnimatedDropdownItemDescription>
                    )}
                  </AnimatedDropdownItemText>
                </AnimatedDropdownRadioItem>
              ))}
            </AnimatedDropdownRadioGroup>
          </AnimatedDropdownSubContent>
        </AnimatedDropdownSub>
      </AnimatedDropdownContent>
    </AnimatedDropdown>
  );
  const voice = (
    <MorphicTooltip content="Voice input">
      <ToolbarButton
        label="Voice input"
        disabled={disabled || busy || !onVoiceClick}
        onClick={onVoiceClick}
      >
        <Mic className="size-4" />
      </ToolbarButton>
    </MorphicTooltip>
  );
  const action = (
    <MorphicTooltip
      content={
        busy ? (onStop ? "Stop response" : "Sending prompt") : "Send message"
      }
    >
      <Button
        variant="plain"
        type="button"
        disabled={disabled || (busy ? !onStop : !canSubmit)}
        aria-label={
          busy ? (onStop ? "Stop response" : "Sending prompt") : "Send message"
        }
        onClick={busy ? onStop : onSubmit}
        whileTap={reduce ? undefined : { scale: 0.96 }}
        transition={SPRING_PRESS}
        className={cn(
          "grid size-8 place-items-center rounded-full text-primary-foreground transition-colors",
          "bg-primary hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-45",
        )}
      >
        {busy && onStop ? (
          <Square className="size-4" />
        ) : busy && showSpinner ? (
          <LoaderCircle
            aria-hidden
            className="size-4 motion-safe:animate-spin"
          />
        ) : (
          <ArrowUp className="size-4.5" />
        )}
      </Button>
    </MorphicTooltip>
  );
  const attach = allowFileUpload ? (
    <ToolbarButton
      label="Attach files"
      disabled={disabled || busy}
      onClick={() => fileInputRef.current?.click()}
    >
      <Paperclip className="size-4" />
    </ToolbarButton>
  ) : null;
  const parts = { options, agent, model, voice, action, attach };
  return (
    <MorphicTooltipProvider delay={180} closeDelay={40}>
      {part ? (
        parts[part]
      ) : (
        <div
          className={cn(
            "flex items-center justify-between gap-2 px-2.5 pb-2 sm:gap-3 sm:px-4",
            classNames?.toolbar,
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            {options}
            {agent}
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {model}
            <div className="hidden sm:block">{voice}</div>
            {action}
          </div>
        </div>
      )}
    </MorphicTooltipProvider>
  );
}
