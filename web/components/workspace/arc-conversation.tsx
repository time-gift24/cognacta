"use client";

import { useCallback, useMemo, useRef, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import {
  AiChat,
  type ChatModel,
  type ChatRespond,
  type ChatSuggestion,
} from "@/components/arc/blocks/ai-chat/ai-chat";
import {
  ClaudeMark,
  GeminiColorMark,
  OpenaiMark,
} from "@/components/arc/blocks/ai-chat/ai-chat-marks";
import { starterSeeds } from "./config";
import { Composer } from "./composer";
import {
  contextToAttachments,
  toChatMessages,
  toStoredMessages,
} from "./message-adapter";
import { useSessions } from "./session-provider";
import type { ComposerProps, Session } from "./types";

type ArcComposerProps = Pick<
  ComposerProps,
  | "value"
  | "setValue"
  | "model"
  | "setModel"
  | "webEnabled"
  | "setWebEnabled"
>;

const models: ChatModel[] = [
  {
    id: "claude-sonnet-5",
    name: "Sonnet 5",
    note: "Anthropic",
    mark: ClaudeMark,
    color: "#D97757",
  },
  {
    id: "claude-opus-5",
    name: "Opus 5",
    note: "Anthropic",
    mark: ClaudeMark,
    color: "#D97757",
  },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Haiku 4.5",
    note: "Anthropic",
    mark: ClaudeMark,
    color: "#D97757",
  },
  {
    id: "gpt-5.4-mini",
    name: "GPT-5.4 mini",
    note: "OpenAI",
    mark: OpenaiMark,
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 mini",
    note: "OpenAI",
    mark: OpenaiMark,
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    note: "Google",
    mark: GeminiColorMark,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    note: "Google",
    mark: GeminiColorMark,
  },
];

const suggestionIcons: Record<
  (typeof starterSeeds)[number]["key"],
  ChatSuggestion["icon"]
> = {
  runs: "activity",
  checklist: "search",
  workflow: "database",
  incident: "timer",
};

function replyFor(prompt: string, t: ReturnType<typeof useTranslations<"Demo">>) {
  const variants = ["one", "two", "three"] as const;
  let hash = 0;
  for (const char of prompt) hash = (hash + char.charCodeAt(0)) % variants.length;
  return t(`replies.${variants[hash]}`);
}

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done, { once: true });
  });
}

function* chunks(text: string) {
  const size = 6;
  for (let at = 0; at < text.length; at += size) {
    yield text.slice(at, at + size);
  }
}

export function ArcConversation({
  session,
  composer,
}: {
  session: Session;
  composer: ArcComposerProps;
}) {
  const store = useSessions();
  const tDemo = useTranslations("Demo");
  const tHome = useTranslations("Home");
  const tComposer = useTranslations("Composer");
  const run = useRef(0);

  const initialMessages = useMemo(
    () => toChatMessages(session.messages, store.model),
    [session.messages, store.model],
  );

  const suggestions = useMemo<ChatSuggestion[]>(
    () =>
      starterSeeds.map((starter) => ({
        label: tDemo(`starters.${starter.key}.title`),
        prompt: tDemo(`starters.${starter.key}.prompt`),
        icon: suggestionIcons[starter.key],
      })),
    [tDemo],
  );

  const respond = useCallback<ChatRespond>(
    async function* (messages, { signal, model }) {
      const token = ++run.current;
      const visible = toStoredMessages(messages, model.id);
      store.syncMessages(session.id, visible);
      store.beginReply(session.id);
      const prompt =
        [...messages].reverse().find((message) => message.role === "user")
          ?.content ?? "";
      const reply = replyFor(prompt, tDemo);
      let delivered = "";

      try {
        for (const chunk of chunks(reply)) {
          if (signal.aborted) break;
          delivered += chunk;
          yield { type: "text", delta: chunk };
          await delay(23, signal);
        }
      } finally {
        if (run.current !== token) return;
        const finished = [...visible];
        if (delivered) {
          finished.push({
            id: finished.length + 1,
            role: "assistant",
            content: delivered,
            status: "done",
            model: model.id,
          });
        } else if (signal.aborted) {
          finished.push({
            id: finished.length + 1,
            role: "assistant",
            content: "",
            status: "stopped",
            model: model.id,
          });
        }
        store.syncMessages(session.id, finished);
        store.finishReply(session.id);
      }
    },
    [session.id, store, tDemo],
  );

  const defaultModel = models.some((model) => model.id === store.model)
    ? store.model
    : models[0].id;

  return (
    <div
      className="relative h-full min-h-0"
      style={
        {
          "--chat-height": "100%",
          "--chat-background": "transparent",
          "--chat-column": "48rem",
        } as CSSProperties
      }
    >
      <AiChat
        models={models}
        defaultModel={defaultModel}
        model={composer.model}
        respond={respond}
        initialMessages={initialMessages}
        title={session.title}
        history={[]}
        suggestions={suggestions}
        greeting={tHome("heading")}
        placeholder={tComposer("placeholder")}
        autoPlay={false}
        showHeader={false}
        onModelChange={(model) => composer.setModel(model.id)}
        renderComposer={({ busy, send, stop }) => (
          <Composer
            compact
            value={composer.value}
            setValue={composer.setValue}
            onSubmit={(text, context) => {
              send(text, contextToAttachments(context) ?? []);
              composer.setValue("");
            }}
            onStop={stop}
            thinking={busy}
            webEnabled={composer.webEnabled}
            setWebEnabled={composer.setWebEnabled}
            model={composer.model}
            setModel={composer.setModel}
          />
        )}
      />
    </div>
  );
}
