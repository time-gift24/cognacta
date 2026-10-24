"use client";

import {
  ArrowUp,
  ChevronDown,
  ImageIcon,
  LoaderCircle,
  type LucideIcon,
  Monitor,
  Paperclip,
  RectangleHorizontal,
  RectangleVertical,
  Square,
  Video,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownLabel,
  AnimatedDropdownRadioGroup,
  AnimatedDropdownRadioItem,
  AnimatedDropdownTrigger,
} from "@/components/beui/premium/animated-dropdown";
import {
  ModelPicker,
  type ModelPickerOption,
} from "@/components/beui/premium/model-picker";
import { SAMPLE_MODELS } from "@/components/beui/premium/model-picker/sample-models";
import { cn } from "@/lib/beui/utils";
import {
  type AgentComposerActionProps,
  type AgentComposerModelProps,
  type AgentComposerParts,
  AgentComposerProvider,
  type AgentComposerSlots,
} from "./composition";

export type CreativePromptPayload = {
  prompt: string;
  model: string;
  options: string[];
  files: File[];
};
export type CreativePromptModel = Omit<
  ModelPickerOption,
  "name" | "provider"
> & { label: string; provider?: string };

export type AgentChatCreativeProps = {
  /** Override parts while retaining the default layout. */
  slots?: AgentComposerSlots;
  /** Compose the wired parts instead of using the default layout. */
  children?: ReactNode;
  placeholder?: string;
  models?: readonly CreativePromptModel[];
  initialOptions?: string[];
  onSubmit?: (payload: CreativePromptPayload) => void | Promise<void>;
  className?: string;
};
const MODELS: CreativePromptModel[] = SAMPLE_MODELS.map(
  ({ name, ...model }) => ({ ...model, label: name }),
);
const OPTIONS = ["Image", "4K", "16:9"];
type CreativeChoice = { value: string; label: string; icon?: LucideIcon };
const TYPES: CreativeChoice[] = [
  { value: "Image", label: "Image", icon: ImageIcon },
  { value: "Video", label: "Video", icon: Video },
];
const RESOLUTIONS: CreativeChoice[] = [
  { value: "HD", label: "HD · 1080p", icon: Monitor },
  { value: "2K", label: "2K · 1440p", icon: Monitor },
  { value: "4K", label: "4K · 2160p", icon: Monitor },
];
const RATIOS: CreativeChoice[] = [
  { value: "16:9", label: "Landscape · 16:9", icon: RectangleHorizontal },
  { value: "9:16", label: "Portrait · 9:16", icon: RectangleVertical },
  { value: "1:1", label: "Square · 1:1", icon: Square },
  { value: "4:3", label: "Landscape · 4:3", icon: RectangleHorizontal },
  { value: "3:4", label: "Portrait · 3:4", icon: RectangleVertical },
];

function CreativeOptionPicker({
  label,
  value,
  choices,
  disabled,
  onChange,
  align = "start",
  showLabel = false,
}: {
  label: string;
  value: string;
  choices: CreativeChoice[];
  disabled: boolean;
  onChange: (value: string) => void;
  align?: "start" | "end";
  showLabel?: boolean;
}) {
  const choice = choices.find((item) => item.value === value) ?? choices[0];
  const Icon = choice?.icon;
  return (
    <AnimatedDropdown>
      <AnimatedDropdownTrigger asChild>
        <Button
          tabIndex={0}
          type="button"
          variant="outline"
          disabled={disabled || !choice}
          aria-label={`Select ${label}`}
          className="h-10 gap-1.5 rounded-full bg-background px-3"
        >
          {Icon && (
            <Icon aria-hidden className="size-4 text-muted-foreground" />
          )}
          {choice ? (showLabel ? choice.label : choice.value) : "No models"}
          <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
        </Button>
      </AnimatedDropdownTrigger>
      <AnimatedDropdownContent side="top" align={align} className="w-56">
        <AnimatedDropdownLabel>{label}</AnimatedDropdownLabel>
        <AnimatedDropdownRadioGroup value={value} onValueChange={onChange}>
          {choices.map((item) => (
            <AnimatedDropdownRadioItem key={item.value} value={item.value}>
              {item.icon && (
                <item.icon
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
              )}
              {item.label}
            </AnimatedDropdownRadioItem>
          ))}
        </AnimatedDropdownRadioGroup>
      </AnimatedDropdownContent>
    </AnimatedDropdown>
  );
}

export function AgentChatCreative({
  placeholder = "What would you like to create?",
  models = MODELS,
  initialOptions = OPTIONS,
  onSubmit,
  className,
  children,
  slots,
}: AgentChatCreativeProps) {
  const input = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(models[0]?.id ?? "");
  const [outputType, setOutputType] = useState(
    initialOptions.find((value) =>
      TYPES.some((item) => item.value === value),
    ) ?? "Image",
  );
  const [resolution, setResolution] = useState(
    initialOptions.find((value) =>
      RESOLUTIONS.some((item) => item.value === value),
    ) ?? "4K",
  );
  const [ratio, setRatio] = useState(
    initialOptions.find((value) =>
      RATIOS.some((item) => item.value === value),
    ) ?? "16:9",
  );
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = models.find((item) => item.id === model) ?? models[0];
  async function submit() {
    if (!prompt.trim() || busy || !selected || !onSubmit) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit({
        prompt: prompt.trim(),
        model: selected.id,
        options: [outputType, resolution, ratio],
        files,
      });
      setPrompt("");
      setFiles([]);
    } catch {
      setError("Couldn’t send your prompt. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const inputPart = (
    <textarea
      aria-label="Prompt"
      value={prompt}
      onChange={(event) => setPrompt(event.target.value)}
      disabled={busy}
      placeholder={placeholder}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" &&
          !event.shiftKey &&
          !event.nativeEvent.isComposing
        ) {
          event.preventDefault();
          void submit();
        }
      }}
      className="block min-h-40 w-full resize-none rounded-2xl bg-background p-5 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
    />
  );
  const optionsPart = (
    <>
      <CreativeOptionPicker
        label="Output type"
        value={outputType}
        choices={TYPES}
        disabled={busy}
        onChange={setOutputType}
      />
      <CreativeOptionPicker
        label="Resolution"
        value={resolution}
        choices={RESOLUTIONS}
        disabled={busy}
        onChange={setResolution}
      />
      <CreativeOptionPicker
        label="Aspect ratio"
        value={ratio}
        choices={RATIOS}
        disabled={busy}
        onChange={setRatio}
      />
    </>
  );
  const modelPart = ({
    side = "top",
    align = "end",
    className,
  }: AgentComposerModelProps = {}) => (
    <ModelPicker
      models={models.map(({ label, ...item }) => ({
        ...item,
        name: label,
        provider: item.provider ?? "Models",
      }))}
      value={selected?.id ?? ""}
      onValueChange={setModel}
      disabled={busy || !models.length}
      side={side}
      align={align}
      className={cn(
        "h-10 min-w-0 max-w-40 rounded-full bg-background px-3",
        className,
      )}
    />
  );
  const actionPart = ({
    showSpinner = true,
  }: AgentComposerActionProps = {}) => (
    <Button
      tabIndex={0}
      type="submit"
      size="icon"
      aria-label={busy ? "Sending prompt" : "Send prompt"}
      disabled={!prompt.trim() || busy || !selected || !onSubmit}
      className="size-10 rounded-full"
    >
      {busy && showSpinner ? (
        <LoaderCircle className="size-4 motion-safe:animate-spin" />
      ) : (
        <ArrowUp aria-hidden className="size-5" />
      )}
    </Button>
  );
  const attachPart = (
    <Button
      tabIndex={0}
      type="button"
      variant="outline"
      size="icon"
      disabled={busy}
      className="size-10 rounded-full bg-background hover:bg-muted"
      aria-label="Attach images"
      onClick={() => input.current?.click()}
    >
      <Paperclip aria-hidden className="size-5" />
    </Button>
  );
  const toolbarPart = (
    <div className="flex flex-wrap items-center gap-2 p-2">
      {attachPart}
      {optionsPart}

      <div className="ml-auto flex items-center gap-2">
        {modelPart()}
        {actionPart()}
      </div>
    </div>
  );
  const attachmentsPart = files.length > 0 && (
    <ul aria-label="Attachments" className="flex flex-wrap gap-2 px-3 pb-3">
      {files.map((file, index) => (
        <li
          key={`${file.name}-${index}`}
          className="flex max-w-full items-center rounded-full border border-border bg-background pl-3 text-xs"
        >
          <span className="truncate">{file.name}</span>
          <Button
            tabIndex={0}
            type="button"
            variant="ghost"
            size="icon"
            disabled={busy}
            className="size-9 rounded-full"
            aria-label={`Remove attachment ${file.name}`}
            onClick={() =>
              setFiles((previous) => previous.filter((_, i) => i !== index))
            }
          >
            <X className="size-3" />
          </Button>
        </li>
      ))}
    </ul>
  );
  const errorPart = error && (
    <p role="alert" className="px-3 pb-3 text-sm text-destructive">
      {error}
    </p>
  );
  const parts: AgentComposerParts = {
    input: inputPart,
    toolbar: toolbarPart,
    attach: attachPart,
    options: optionsPart,
    model: modelPart,
    action: actionPart,
    attachments: attachmentsPart,
    error: errorPart,
  };
  return (
    <AgentComposerProvider
      parts={parts}
      state={{
        text: prompt,
        model: selected?.id ?? "",
        models,
        busy,
        disabled: false,
        canSubmit: !!prompt.trim() && !busy && !!selected && !!onSubmit,
        setModel,
        submit,
        attach: () => input.current?.click(),
      }}
    >
      <form
        aria-label="Creative prompt"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className={cn(
          "w-full max-w-3xl rounded-3xl bg-muted p-1.5 text-foreground",
          className,
        )}
      >
        {children === undefined ? (
          <>
            {slots?.input === undefined ? inputPart : slots.input}

            {slots?.toolbar === undefined ? toolbarPart : slots.toolbar}
            {slots?.attachments === undefined
              ? attachmentsPart
              : slots.attachments}
            {errorPart}
          </>
        ) : (
          children
        )}
        <input
          ref={input}
          type="file"
          multiple
          accept="image/*"
          aria-label="Attach images"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            setFiles((previous) => [
              ...previous,
              ...Array.from(event.target.files ?? []),
            ]);
            event.target.value = "";
          }}
        />
      </form>
    </AgentComposerProvider>
  );
}
