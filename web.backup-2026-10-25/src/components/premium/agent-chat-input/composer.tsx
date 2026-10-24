"use client";

import { forwardRef } from "react";
import {
  AgentChatComposer as BeuiAgentChatComposer,
  type AgentChatComposerHandle,
  type AgentChatComposerProps as BeuiAgentChatComposerProps,
} from "@/components/beui/premium/agent-chat-input/composer";
import { AGENT_COMPOSER_PRESENTATION } from "./presentation";

export type { AgentChatComposerHandle, ComposerValue } from "@/components/beui/premium/agent-chat-input/composer";
export type AgentChatComposerProps = Omit<BeuiAgentChatComposerProps, "presentation">;

export const AgentChatComposer = forwardRef<AgentChatComposerHandle, AgentChatComposerProps>(
  function AgentChatComposer(props, ref) {
    return <BeuiAgentChatComposer {...props} ref={ref} presentation={AGENT_COMPOSER_PRESENTATION} />;
  },
);
