"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ComposerContextMenu } from "./composer-context-menu";
import { useKnowledge } from "./knowledge-provider";
import type { AgentChatAttachment } from "../premium/agent-chat-input/types";
import type { MessageContext } from "./types";
import { AgentChatCredits } from "../premium/agent-chat-input/agent-chat-credits";
import type { ComposerProps } from "./types";
export function Composer({
  value,
  setValue,
  onSubmit,
  onStop,
  thinking,
  webEnabled,
  setWebEnabled,
  model,
  setModel,
  compact = false,
}: ComposerProps & { compact?: boolean }) {
  const { entries } = useKnowledge();
  const t = useTranslations("Composer");
  const [attachments, setAttachments] = useState<AgentChatAttachment[]>([]);
  return (
    <AgentChatCredits
      compact={compact}
      key={thinking ? "responding" : "ready"}
      value={value}
      onValueChange={setValue}
      attachments={attachments}
      onAttachmentsChange={setAttachments}
      renderAttachControl={(openFilePicker) => (
        <ComposerContextMenu
          disabled={thinking}
          onAttach={openFilePicker}
          selectedIds={attachments
            .filter((item) => item.id.startsWith("knowledge:"))
            .map((item) => item.id.slice(10))}
          onToggle={(entry) => {
            const id = `knowledge:${entry.id}`;
            setAttachments((items) =>
              items.some((item) => item.id === id)
                ? items.filter((item) => item.id !== id)
                : [
                    ...items,
                    {
                      id,
                      name: entry.title,
                      type: "application/x-cognacta-knowledge",
                    },
                  ],
            );
          }}
        />
      )}
      onSubmit={(text, attached) => {
        const context: MessageContext[] = attached.map((item) => {
          const entry = item.id.startsWith("knowledge:")
            ? entries.find((entry) => entry.id === item.id.slice(10))
            : undefined;
          return entry
            ? {
                id: entry.id,
                name: entry.title,
                kind: "knowledge",
                content: entry.content,
                url: entry.url,
              }
            : { id: item.id, name: item.name, kind: "file" };
        });
        onSubmit(text || t("reviewContext"), context);
        setAttachments([]);
      }}
      onStop={onStop}
      status={thinking ? "submitted" : "ready"}
      model={model}
      onModelChange={setModel}
      models={[
        { id: "claude-sonnet-5", label: "Sonnet 5", group: "Claude" },
        { id: "claude-opus-5", label: "Opus 5", group: "Claude" },
        {
          id: "claude-haiku-4-5-20251001",
          label: "Haiku 4.5",
          group: "Claude",
        },
        { id: "gpt-5.4-mini", label: "GPT-5.4 mini", group: "OpenAI" },
        { id: "gpt-5-mini", label: "GPT-5 mini", group: "OpenAI" },
        { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", group: "Gemini" },
        { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", group: "Gemini" },
      ]}
      searchEnabled={webEnabled}
      onSearchEnabledChange={setWebEnabled}
      placeholder={t("placeholder")}
      className="max-w-none"
    />
  );
}
