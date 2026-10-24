"use client";

import {
  AgentChatCredits as BeuiAgentChatCredits,
  type AgentChatCreditsProps as BeuiAgentChatCreditsProps,
} from "@/components/beui/premium/agent-chat-input/agent-chat-credits";
import { AGENT_COMPOSER_PRESENTATION } from "./presentation";

export type AgentChatCreditsProps = Omit<
  BeuiAgentChatCreditsProps,
  "presentation" | "allowAttachmentOnly"
>;

export function AgentChatCredits(props: AgentChatCreditsProps) {
  return (
    <BeuiAgentChatCredits
      {...props}
      presentation={AGENT_COMPOSER_PRESENTATION}
      allowAttachmentOnly={false}
    />
  );
}
