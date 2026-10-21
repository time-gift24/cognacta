"use client";

import {
  ArrowUp,
  AudioLines,
  Blocks,
  File,
  Layers,
  ListChecks,
  Mic,
  Paperclip,
  Plus,
  Square,
  Target,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { ActionSwapIcon } from "@/components/beui/motion/action-swap";
import { Button } from "@/components/beui/motion/button";
import {
  AnimatedDropdown,
  AnimatedDropdownCheckboxItem,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
  AnimatedDropdownItemIcon,
  AnimatedDropdownItemText,
  AnimatedDropdownSeparator,
  AnimatedDropdownSub,
  AnimatedDropdownSubContent,
  AnimatedDropdownSubTrigger,
  AnimatedDropdownTrigger,
} from "@/components/beui/premium/animated-dropdown";
import {
  ModelPicker,
  type ModelPickerOption,
} from "@/components/beui/premium/model-picker";
import { SAMPLE_MODELS } from "@/components/beui/premium/model-picker/sample-models";
import { EASE_OUT, SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  type AgentComposerModelProps,
  type AgentComposerParts,
  AgentComposerProvider,
  type AgentComposerSlots,
} from "./composition";
import { useControllableString } from "./hooks";
import type { AgentChatInputStatus } from "./types";

const ICON_BUTTON =
  "relative size-9 shrink-0 rounded-full text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring after:absolute after:-inset-0.5";

export interface AgentChatPillPayload {
  text: string;
  model: string;
  files: File[];
  planMode: boolean;
  pursueGoal: boolean;
}

export interface AgentChatPillProps {
  /** Override parts while retaining the original animated layout. */
  slots?: AgentComposerSlots;
  /** Compose the wired parts instead of using the default layout. */
  children?: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  models?: readonly ModelPickerOption[];
  model?: string;
  defaultModel?: string;
  onModelChange?: (model: string) => void;
  onSubmit?: (payload: AgentChatPillPayload) => void;
  onStop?: () => void;
  onCreate?: (kind: string) => void;
  onPluginSelect?: (plugin: string) => void;
  /** Connect to your application's dictation service. */
  onDictationClick?: () => void;
  /** Connect to your application's voice conversation flow. */
  onVoiceClick?: () => void;
  status?: AgentChatInputStatus;
  disabled?: boolean;
  placeholder?: string;
  acceptedFileTypes?: string;
  allowFileUpload?: boolean;
  /** Show the “+” actions menu (plan mode, create, plugins). */
  showOptions?: boolean;
  clearOnSubmit?: boolean;
  className?: string;
}

/** A compact, single-row composer with a voice-to-send action swap. */
export function AgentChatPill({
  value,
  defaultValue = "",
  onValueChange,
  models = SAMPLE_MODELS,
  model,
  defaultModel = models[0]?.id ?? "",
  onModelChange,
  onSubmit,
  onStop,
  onCreate,
  onPluginSelect,
  onDictationClick,
  onVoiceClick,
  status = "ready",
  disabled = false,
  placeholder = "Ask anything",
  acceptedFileTypes,
  allowFileUpload = true,
  showOptions = true,
  clearOnSubmit = true,
  className,
  children,
  slots,
}: AgentChatPillProps) {
  const [text, setText] = useControllableString({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const [selectedModel, setSelectedModel] = useControllableString({
    value: model,
    defaultValue: defaultModel,
    onChange: onModelChange,
  });
  const reduce = useReducedMotion();
  const expanded = text.includes("\n");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [planMode, setPlanMode] = useState(false);
  const [pursueGoal, setPursueGoal] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const measurementRef = useRef<HTMLTextAreaElement>(null);
  const [textareaHeight, setTextareaHeight] = useState(40);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [controlsWidth, setControlsWidth] = useState(160);
  const composerTransition = reduce
    ? { duration: 0 }
    : { duration: 0.28, ease: EASE_OUT };

  useLayoutEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const measure = () => setControlsWidth(controls.offsetWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(controls);
    return () => observer.disconnect();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Re-measure the DOM after controlled text changes, including clearing on submit.
  useLayoutEffect(() => {
    const textarea = input.current;
    const measurement = measurementRef.current;
    if (!textarea || !measurement) return;
    function resize() {
      if (!textarea || !measurement) return;
      // Measure a separate field so the focused editor never collapses or scrolls
      // its caret while the shell is expanding.
      measurement.style.width = `${textarea.clientWidth}px`;
      setTextareaHeight(
        Math.min(160, Math.max(expanded ? 60 : 40, measurement.scrollHeight)),
      );
    }
    resize();
    let width = textarea.clientWidth;
    const observer = new ResizeObserver(() => {
      if (textarea.clientWidth !== width) {
        width = textarea.clientWidth;
        resize();
      }
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [text, expanded]);
  const busy = status === "submitted" || status === "streaming";
  const hasContent = text.trim().length > 0 || files.length > 0;
  const action = busy ? "stop" : hasContent ? "send" : "voice";
  const actionLabel = busy
    ? "Stop response"
    : hasContent
      ? "Send message"
      : "Start voice chat";

  function submit() {
    if (disabled || busy || !hasContent || !onSubmit) return;
    onSubmit({
      text: text.trim(),
      model: selectedModel,
      files: [...files],
      planMode,
      pursueGoal,
    });
    if (clearOnSubmit) {
      setText("");
      setFiles([]);
    }
    input.current?.focus();
  }

  const inputPart = (
    <motion.textarea
      initial={false}
      animate={
        children !== undefined
          ? undefined
          : {
              left: expanded || !showOptions ? 12 : 46,
              right: expanded ? 12 : controlsWidth + 12,
            }
      }
      transition={composerTransition}
      style={{
        height:
          children !== undefined
            ? Math.max(60, textareaHeight)
            : expanded
              ? Math.max(60, textareaHeight)
              : 40,
        overflowY: textareaHeight >= 160 ? "auto" : "hidden",
      }}
      rows={1}
      ref={input}
      aria-label="Message"
      value={text}
      onChange={(event) => setText(event.target.value)}
      placeholder={placeholder}
      disabled={disabled || busy}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" &&
          !event.shiftKey &&
          !event.nativeEvent.isComposing
        ) {
          event.preventDefault();
          submit();
        }
      }}
      className={cn(
        "min-w-0 resize-none rounded-2xl bg-transparent px-1 py-2.5 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50",
        children === undefined
          ? "absolute top-1.5 z-10"
          : "relative block w-full",
      )}
    />
  );
  const modelPart = ({
    side = "top",
    align = "end",
    className,
  }: AgentComposerModelProps = {}) =>
    models.length > 0 && (
      <ModelPicker
        models={models}
        variant="catalog"
        value={selectedModel}
        onValueChange={setSelectedModel}
        disabled={disabled || busy}
        side={side}
        align={align}
        className={cn(
          "h-10 min-w-0 max-w-28 gap-1 border-0 bg-transparent px-2 hover:bg-foreground/5 sm:max-w-40",
          className,
        )}
      />
    );
  const optionsPart = (
    <AnimatedDropdown
      open={actionsOpen && !disabled && !busy}
      onOpenChange={setActionsOpen}
    >
      <AnimatedDropdownTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={ICON_BUTTON}
          aria-label="Open agent actions"
          title="Agent actions"
          disabled={disabled || busy}
        >
          <motion.span
            aria-hidden
            animate={{
              rotate: actionsOpen && !disabled && !busy ? 45 : 0,
            }}
            transition={reduce ? { duration: 0 } : SPRING_SWAP}
            className="inline-flex"
          >
            <Plus className="size-5" />
          </motion.span>
        </Button>
      </AnimatedDropdownTrigger>
      <AnimatedDropdownContent side="top" align="start" className="w-64">
        {allowFileUpload && (
          <>
            <AnimatedDropdownItem onSelect={() => fileInput.current?.click()}>
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
              <Layers />
            </AnimatedDropdownItemIcon>
            <AnimatedDropdownItemText>Create</AnimatedDropdownItemText>
          </AnimatedDropdownSubTrigger>
          <AnimatedDropdownSubContent alignOffset={-8} className="w-56">
            {["Component", "Block", "Template"].map((kind) => (
              <AnimatedDropdownItem
                key={kind}
                onSelect={() => {
                  if (onCreate) onCreate(kind);
                  else setText(`Create a ${kind.toLowerCase()}`);
                }}
              >
                {kind}
              </AnimatedDropdownItem>
            ))}
          </AnimatedDropdownSubContent>
        </AnimatedDropdownSub>
        <AnimatedDropdownSub>
          <AnimatedDropdownSubTrigger disabled={!onPluginSelect}>
            <AnimatedDropdownItemIcon>
              <Blocks />
            </AnimatedDropdownItemIcon>
            <AnimatedDropdownItemText>Plugins</AnimatedDropdownItemText>
          </AnimatedDropdownSubTrigger>
          <AnimatedDropdownSubContent alignOffset={-8} className="w-56">
            {["GitHub", "Supabase", "Linear"].map((plugin) => (
              <AnimatedDropdownItem
                key={plugin}
                onSelect={() => onPluginSelect?.(plugin)}
              >
                {plugin}
              </AnimatedDropdownItem>
            ))}
          </AnimatedDropdownSubContent>
        </AnimatedDropdownSub>
      </AnimatedDropdownContent>
    </AnimatedDropdown>
  );
  const actionPart = (
    <Button
      size="icon"
      className={cn(
        ICON_BUTTON,
        "bg-foreground text-background hover:bg-foreground/90 rounded-full h-9",
      )}
      aria-label={actionLabel}
      title={actionLabel}
      disabled={
        disabled || (busy ? !onStop : hasContent ? !onSubmit : !onVoiceClick)
      }
      onClick={() => {
        if (busy) onStop?.();
        else if (hasContent) submit();
        else onVoiceClick?.();
      }}
    >
      <ActionSwapIcon value={action} animation="roll" className="size-5">
        {busy ? (
          <Square className="size-4 fill-current" />
        ) : hasContent ? (
          <ArrowUp className="size-5" />
        ) : (
          <AudioLines className="size-5" />
        )}
      </ActionSwapIcon>
    </Button>
  );
  const voicePart = onDictationClick && (
    <Button
      variant="ghost"
      size="icon"
      className={ICON_BUTTON}
      aria-label="Dictate message"
      title="Dictate message"
      disabled={disabled || busy}
      onClick={onDictationClick}
    >
      <Mic aria-hidden className="size-5" />
    </Button>
  );
  const attachPart = allowFileUpload ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={ICON_BUTTON}
      aria-label="Attach files"
      disabled={disabled || busy}
      onClick={() => fileInput.current?.click()}
    >
      <Paperclip aria-hidden className="size-5" />
    </Button>
  ) : null;
  const toolbarPart = (
    <div
      className={cn(
        "flex h-10 items-center gap-1",
        children === undefined &&
          "pointer-events-none absolute inset-x-1.5 bottom-1.5",
      )}
    >
      {showOptions ? (
        <div className="pointer-events-auto flex shrink-0 items-center">
          {optionsPart}
        </div>
      ) : null}
      <div aria-hidden className="flex-1" />
      <div
        ref={controlsRef}
        className="pointer-events-auto flex shrink-0 items-center gap-1"
      >
        {modelPart()}
        {voicePart}
        {actionPart}
      </div>
    </div>
  );
  const attachmentsPart = files.length > 0 && (
    <ul aria-label="Attachments" className="mb-3 flex flex-wrap gap-2 px-3">
      {files.map((file, index) => (
        <li
          key={`${file.name}-${file.lastModified}-${index}`}
          className="flex max-w-full items-center gap-2 rounded-full border border-border bg-background py-1 pl-3 pr-1 text-sm"
        >
          <File aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="max-w-40 truncate">{file.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className={ICON_BUTTON}
            aria-label={`Remove ${file.name}`}
            title={`Remove ${file.name}`}
            disabled={disabled || busy}
            onClick={() =>
              setFiles(files.filter((_, itemIndex) => itemIndex !== index))
            }
          >
            <X className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
  const parts: AgentComposerParts = {
    input: inputPart,
    toolbar: toolbarPart,
    attach: attachPart,
    voice: voicePart,
    model: modelPart,
    options: optionsPart,
    action: actionPart,
    attachments: attachmentsPart,
  };
  return (
    <AgentComposerProvider
      parts={parts}
      state={{
        text,
        model: selectedModel,
        models: models.map((item) => ({ id: item.id, label: item.name })),
        busy,
        disabled,
        canSubmit: !disabled && !busy && hasContent && !!onSubmit,
        setModel: setSelectedModel,
        submit,
        stop: onStop,
        attach: allowFileUpload ? () => fileInput.current?.click() : undefined,
      }}
    >
      <div className={cn("w-full max-w-2xl", className)} data-status={status}>
        {children === undefined &&
          (slots?.attachments === undefined
            ? attachmentsPart
            : slots.attachments)}
        <motion.form
          initial={false}
          animate={
            children === undefined
              ? { height: expanded ? Math.max(60, textareaHeight) + 58 : 54 }
              : undefined
          }
          transition={composerTransition}
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className={cn(
            "relative min-w-0 border border-border bg-background",
            expanded || children !== undefined ? "rounded-3xl" : "rounded-full",
          )}
        >
          {children === undefined ? (
            <>
              {slots?.input === undefined ? inputPart : slots.input}
              {slots?.toolbar === undefined ? toolbarPart : slots.toolbar}
            </>
          ) : (
            children
          )}
        </motion.form>
        <textarea
          ref={measurementRef}
          aria-hidden
          tabIndex={-1}
          readOnly
          value={text}
          rows={1}
          className="pointer-events-none invisible absolute h-0 min-h-0 resize-none overflow-hidden border-0 px-1 py-2.5 text-sm leading-5"
        />
        <input
          ref={fileInput}
          type="file"
          hidden
          multiple
          accept={acceptedFileTypes}
          disabled={disabled || busy}
          onChange={(event) => {
            setFiles([...files, ...Array.from(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
      </div>
    </AgentComposerProvider>
  );
}
