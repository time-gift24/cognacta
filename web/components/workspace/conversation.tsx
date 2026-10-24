"use client";

import { useRef } from "react";
import { AnimatePresence } from "motion/react";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
  MessageTyping,
} from "@/components/agents/message";
import {
  MessageBubble,
  MessageBubbleContent,
} from "@/components/agents/message-bubble";
import { StreamingResponse } from "@/components/agents/streaming-response";
import { MessageScroller } from "@/components/agents/message-scroller";
import { BrandMark } from "../brand-mark";
import { Composer } from "./composer";
import type { ComposerProps, Message as ChatMessage } from "./types";

export function Conversation({
  title,
  messages,
  thinking,
  ...composerProps
}: ComposerProps & { title: string; messages: ChatMessage[] }) {
  const initialIds = useRef(new Set(messages.map((message) => message.id)));
  return (
    <div
      role="region"
      aria-label={title}
      className="mx-auto flex h-full min-h-0 w-full max-w-[48rem] flex-col"
    >
      <MessageScroller
        label={title}
        busy={thinking}
        className="flex-1"
        viewportProps={{ tabIndex: 0 }}
        contentClassName="px-4 sm:px-6"
      >
        <MessageGroup spacing="default" className="gap-7 pt-16 pb-6 lg:pt-10">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <Message
                key={
                  message.role === "assistant"
                    ? `reply-${messages[index - 1]?.id ?? message.id}`
                    : message.id
                }
                from={message.role}
                animateIn={
                  message.role === "user" && !initialIds.current.has(message.id)
                }
              >
                {message.role === "assistant" ? <AssistantAvatar /> : null}
                <MessageContent>
                  {message.role === "user" ? (
                    <MessageBubble variant="soft">
                      <MessageBubbleContent className="whitespace-pre-wrap break-words">
                        {message.content}
                        {message.context?.length ? (
                          <div className="mt-3 space-y-2 border-t border-border pt-2">
                            {message.context.map((item) =>
                              item.kind === "knowledge" ? (
                                <details key={item.id} className="text-xs">
                                  <summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-primary">
                                    {item.name}
                                  </summary>
                                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                                    {item.content || item.url}
                                  </p>
                                </details>
                              ) : (
                                <p
                                  key={item.id}
                                  className="text-xs text-muted-foreground"
                                >
                                  File: {item.name} · name only
                                </p>
                              ),
                            )}
                          </div>
                        ) : null}
                      </MessageBubbleContent>
                    </MessageBubble>
                  ) : (
                    <StreamingResponse
                      announce={false}
                      status="complete"
                      copyText={message.content}
                      contentClassName="whitespace-pre-wrap break-words text-sm leading-6"
                    >
                      {message.content}
                    </StreamingResponse>
                  )}
                </MessageContent>
              </Message>
            ))}
            {thinking ? (
              <Message key={`reply-${messages.at(-1)?.id}`} from="assistant">
                <AssistantAvatar />
                <MessageContent>
                  <MessageTyping
                    role="status"
                    label="Cognacta is thinking"
                    className="text-muted-foreground"
                  />
                </MessageContent>
              </Message>
            ) : null}
          </AnimatePresence>
        </MessageGroup>
      </MessageScroller>
      <div className="relative z-10 shrink-0 bg-background px-4 pt-3 pb-4 sm:px-6">
        <Composer compact thinking={thinking} {...composerProps} />
      </div>
    </div>
  );
}

function AssistantAvatar() {
  return (
    <MessageAvatar className="rounded-lg bg-primary text-primary-foreground">
      <BrandMark />
    </MessageAvatar>
  );
}
