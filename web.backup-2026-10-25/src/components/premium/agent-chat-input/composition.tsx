"use client";

import type { ComponentProps } from "react";
import { AgentComposerProvider as BeuiAgentComposerProvider } from "@/components/beui/premium/agent-chat-input/composition";
import { AGENT_COMPOSER_PRESENTATION } from "./presentation";

export * from "@/components/beui/premium/agent-chat-input/composition";

export function AgentComposerProvider(props: Omit<ComponentProps<typeof BeuiAgentComposerProvider>, "presentation">) {
  return <BeuiAgentComposerProvider {...props} presentation={AGENT_COMPOSER_PRESENTATION} />;
}
