"use client";

import type { ComponentProps } from "react";
import { CreditsModelSelector as BeuiCreditsModelSelector } from "@/components/beui/premium/agent-chat-input/credits-model-selector";
import { AGENT_COMPOSER_PRESENTATION } from "./presentation";

export function CreditsModelSelector(props: Omit<ComponentProps<typeof BeuiCreditsModelSelector>, "presentation">) {
  return <BeuiCreditsModelSelector {...props} presentation={AGENT_COMPOSER_PRESENTATION} />;
}
