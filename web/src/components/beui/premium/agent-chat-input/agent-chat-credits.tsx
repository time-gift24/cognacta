"use client";

import { useReducedMotion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/beui/utils";
import {
  AgentChatComposer,
  type AgentChatComposerHandle,
  type ComposerValue,
} from "./composer";
import {
  type AgentComposerParts,
  type AgentComposerPresentation,
  useAgentComposerPresentation,
  AgentComposerProvider,
  type AgentComposerSlots,
  AgentComposerSurface,
} from "./composition";
import { DEFAULT_MODELS, DEFAULT_SKILLS } from "./constants";
import { CreditsAttachmentTray } from "./credits-attachment-tray";
import { CreditsImagePreview } from "./credits-image-preview";
import {
  type AgentChatCreditsLabels,
  DEFAULT_CREDITS_LABELS,
} from "./credits-labels";
import { CreditsToolbar } from "./credits-toolbar";
import { CreditsTopLayer } from "./credits-top-layer";
import { useControllableArray, useControllableString } from "./hooks";
import type {
  AgentChatAttachment,
  AgentChatInputOption,
  AgentChatInputStatus,
  AgentChatSkill,
} from "./types";
import { useAttachmentPreviewUrls } from "./use-attachment-preview-urls";
import { useSkillCommand } from "./use-skill-command";

export type AgentChatCreditsProps = {
  presentation?: AgentComposerPresentation;
  /** Allow a draft consisting only of attachments. Defaults to the template behavior. */
  allowAttachmentOnly?: boolean;
  /** Override parts while retaining the original animated layout. */
  slots?: AgentComposerSlots;
  /** Compose the wired parts instead of using the default layout. */
  children?: ReactNode;
  labels?: Partial<AgentChatCreditsLabels>;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  id?: string;
  maxLength?: number;
  autoFocus?: boolean;
  showSendingSpinner?: boolean;
  clearOnSubmit?: boolean;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Return false to keep the draft when submission is rejected. */
  onSubmit?: (
    value: string,
    attachments: readonly AgentChatAttachment[],
    skillIds: readonly string[],
    model: string,
  ) => void | boolean;
  onStop?: () => void;
  onFilesSelected?: (files: File[]) => void;
  attachments?: readonly AgentChatAttachment[];
  defaultAttachments?: readonly AgentChatAttachment[];
  onAttachmentsChange?: (attachments: AgentChatAttachment[]) => void;
  acceptedFileTypes?: string;
  skills?: readonly AgentChatSkill[];
  models?: readonly AgentChatInputOption[];
  model?: string;
  defaultModel?: string;
  onModelChange?: (model: string) => void;
  skillIds?: readonly string[];
  defaultSkillIds?: readonly string[];
  onSkillIdsChange?: (skillIds: string[]) => void;
  onVoiceClick?: () => void;
  searchEnabled?: boolean;
  defaultSearchEnabled?: boolean;
  onSearchEnabledChange?: (enabled: boolean) => void;
  onUpgradeClick?: () => void;
  onDismissClick?: () => void;
  creditsRemaining?: number;
  status?: AgentChatInputStatus;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function AgentChatCredits({
  labels: customLabels,
  presentation: presentationOverride,
  allowAttachmentOnly = true,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  id,
  maxLength,
  autoFocus,
  showSendingSpinner = true,
  clearOnSubmit = false,
  value,
  defaultValue = "",
  onValueChange,
  onSubmit,
  onStop,
  onFilesSelected,
  attachments,
  defaultAttachments = [],
  onAttachmentsChange,
  acceptedFileTypes,
  skills = DEFAULT_SKILLS,
  models = DEFAULT_MODELS,
  model,
  defaultModel = models[0]?.id ?? "gpt-5.6",
  onModelChange,
  skillIds,
  defaultSkillIds = [],
  onSkillIdsChange,
  onVoiceClick,
  searchEnabled,
  defaultSearchEnabled = false,
  onSearchEnabledChange,
  onUpgradeClick,
  onDismissClick,
  creditsRemaining = 490,
  status = "ready",
  placeholder = "What do you want to do today?",
  disabled = false,
  className,
  children,
  slots,
}: AgentChatCreditsProps) {
  const presentation = useAgentComposerPresentation(presentationOverride);
  const labels = { ...DEFAULT_CREDITS_LABELS, ...customLabels };
  const reduce = useReducedMotion();
  const composerRef = useRef<AgentChatComposerHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useControllableString({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const [internalSearchEnabled, setInternalSearchEnabled] =
    useState(defaultSearchEnabled);
  const [internalAttachments, setInternalAttachments] = useState<
    AgentChatAttachment[]
  >([...defaultAttachments]);
  const [previewAttachmentId, setPreviewAttachmentId] = useState<string | null>(
    null,
  );
  const [selectedSkillIds, setSelectedSkillIds] = useControllableArray<string>({
    value: skillIds,
    defaultValue: defaultSkillIds,
    onChange: onSkillIdsChange,
  });
  const [requestedModel, setSelectedModel] = useControllableString({
    value: model,
    defaultValue: defaultModel,
    onChange: onModelChange,
  });
  const selectedModel =
    models.find((option) => option.id === requestedModel)?.id ?? "";

  const currentAttachments = attachments ?? internalAttachments;
  const previewUrls = useAttachmentPreviewUrls(currentAttachments);
  const skillCommand = useSkillCommand({ skills, composerRef, disabled });
  const isSearchEnabled = searchEnabled ?? internalSearchEnabled;
  const previewAttachment = previewAttachmentId
    ? currentAttachments.find((item) => item.id === previewAttachmentId)
    : undefined;
  const previewUrl = previewAttachmentId
    ? previewUrls[previewAttachmentId]
    : undefined;
  const busy = status === "submitted" || status === "streaming";
  const canSubmit =
    !disabled &&
    !busy &&
    selectedModel.length > 0 &&
    (maxLength === undefined || text.length <= Math.max(0, maxLength)) &&
    (text.trim().length > 0 || (allowAttachmentOnly && currentAttachments.length > 0));

  useEffect(() => {
    if (
      previewAttachmentId &&
      !currentAttachments.some((item) => item.id === previewAttachmentId)
    ) {
      setPreviewAttachmentId(null);
    }
  }, [currentAttachments, previewAttachmentId]);

  const closePreview = useCallback(() => setPreviewAttachmentId(null), []);

  function handleComposerChange(next: ComposerValue) {
    setText(next.text);
    setSelectedSkillIds(next.skillIds);
  }

  function submit() {
    if (!canSubmit || !onSubmit) return;
    const composed = composerRef.current?.serialize() ?? {
      text,
      skillIds: [...selectedSkillIds],
    };
    const accepted = onSubmit(
      composed.text.trim(),
      currentAttachments,
      composed.skillIds,
      selectedModel,
    );
    if (accepted !== false && clearOnSubmit) composerRef.current?.clear();
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    if (disabled || busy) {
      event.target.value = "";
      return;
    }
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      const next = [
        ...currentAttachments,
        ...files.map((file) => ({
          id: `${file.name}-${file.lastModified}-${file.size}-${crypto.randomUUID()}`,
          name: file.name,
          type: file.type,
          size: file.size,
          file,
        })),
      ];
      if (attachments === undefined) setInternalAttachments(next);
      onAttachmentsChange?.(next);
      onFilesSelected?.(files);
    }
    event.target.value = "";
  }

  function removeAttachment(id: string) {
    if (disabled || busy) return;
    const next = currentAttachments.filter((item) => item.id !== id);
    if (attachments === undefined) setInternalAttachments(next);
    onAttachmentsChange?.(next);
  }

  function setSearch(next: boolean) {
    if (searchEnabled === undefined) setInternalSearchEnabled(next);
    onSearchEnabledChange?.(next);
  }

  const inputPart = (
    <AgentChatComposer
      ref={composerRef}
      skills={skills}
      value={value}
      defaultValue={defaultValue}
      id={id}
      aria-label={ariaLabel ?? labels.editor}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      maxLength={maxLength}
      autoFocus={autoFocus}
      placeholder={placeholder}
      disabled={disabled}
      minRows={presentation.creditsMinRows ?? 3}
      maxRows={6}
      onChange={handleComposerChange}
      onSlashQueryChange={skillCommand.onQueryChange}
      onNavKeyDown={skillCommand.onNavKeyDown}
      onSubmit={submit}
      className={presentation.classNames?.creditsEditor ?? "min-h-20 px-2.5 pt-2.5 pb-2 !text-base leading-6 sm:px-3 sm:pt-3"}
    />
  );
  const toolbarProps: ComponentProps<typeof CreditsToolbar> = {
    labels,
    showSendingSpinner,
    busy,
    canSubmit: canSubmit && !!onSubmit,
    disabled,
    reduce,
    models,
    selectedModel,
    searchEnabled: isSearchEnabled,
    onAttach: () => fileInputRef.current?.click(),
    onSearchChange: setSearch,
    onModelChange: setSelectedModel,
    onStop,
    onSubmit: submit,
    onVoice: onVoiceClick,
  };
  const toolbarPart = <CreditsToolbar {...toolbarProps} />;
  const headerPart = (
    <CreditsTopLayer
      labels={labels}
      creditsRemaining={creditsRemaining}
      skillsVisible={skillCommand.visible}
      skills={skillCommand.options}
      selectedSkillIds={selectedSkillIds}
      activeIndex={skillCommand.activeIndex}
      reduce={reduce}
      onActiveIndexChange={skillCommand.setActiveIndex}
      onDismiss={onDismissClick}
      onSelect={skillCommand.select}
      onUpgrade={onUpgradeClick}
    />
  );
  const attachmentsPart = (
    <CreditsAttachmentTray
      labels={labels}
      attachments={currentAttachments}
      previewUrls={previewUrls}
      disabled={disabled || busy}
      reduce={reduce}
      onPreview={setPreviewAttachmentId}
      onRemove={removeAttachment}
    />
  );
  const parts: AgentComposerParts = {
    input: inputPart,
    toolbar: toolbarPart,
    model: (props) => (
      <CreditsToolbar {...toolbarProps} {...props} part="model" />
    ),
    action: ({ showSpinner }) => (
      <CreditsToolbar
        {...toolbarProps}
        showSendingSpinner={showSpinner ?? showSendingSpinner}
        part="action"
      />
    ),
    attach: <CreditsToolbar {...toolbarProps} part="attach" />,
    voice: <CreditsToolbar {...toolbarProps} part="voice" />,
    search: <CreditsToolbar {...toolbarProps} part="search" />,
    header: headerPart,
    attachments: attachmentsPart,
  };
  return (
    <AgentComposerProvider
      presentation={presentation}
      parts={parts}
      state={{
        text,
        labels,
        showSendingSpinner,
        model: selectedModel,
        models,
        busy,
        disabled,
        canSubmit: canSubmit && !!onSubmit,
        setModel: setSelectedModel,
        submit,
        stop: onStop,
        attach: () => fileInputRef.current?.click(),
      }}
    >
      <div
        className={cn(
          presentation.classNames?.creditsShell ?? "relative w-full max-w-3xl bg-muted p-[3px] transition-[border-radius] duration-200",
          skillCommand.visible
            ? presentation.classNames?.creditsShellOpen ?? "rounded-b-2xl rounded-t-none"
            : presentation.classNames?.creditsShellClosed ?? "rounded-2xl",
          className,
        )}
      >
        {children === undefined ? (
          <>
            {headerPart}

            <AgentComposerSurface>
              {slots?.input === undefined ? inputPart : slots.input}
              {slots?.toolbar === undefined ? toolbarPart : slots.toolbar}
            </AgentComposerSurface>

            {slots?.attachments === undefined
              ? attachmentsPart
              : slots.attachments}
          </>
        ) : (
          children
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          disabled={disabled || busy}
          hidden
          accept={acceptedFileTypes}
          onChange={handleFiles}
        />
        <CreditsImagePreview
          labels={labels}
          attachment={previewAttachment}
          src={previewUrl}
          reduce={reduce}
          onClose={closePreview}
        />
      </div>
    </AgentComposerProvider>
  );
}
