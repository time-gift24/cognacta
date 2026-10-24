"use client";

import {
  AIThinkingLoader as BeuiAIThinkingLoader,
  type AIThinkingLoaderProps as BeuiAIThinkingLoaderProps,
  type AIThinkingLoaderVariant,
} from "@/components/beui/premium/ai-thinking-loader";

export type { AIThinkingLoaderVariant };
export type AIThinkingLoaderProps = Omit<
  BeuiAIThinkingLoaderProps,
  "visualClassName"
>;

const colors: Record<AIThinkingLoaderVariant, string> = {
  orbit: "text-primary",
  scan: "text-violet-600 dark:text-violet-400",
  wave: "text-primary",
  assemble: "text-muted-foreground",
  diamond: "text-yellow-600 dark:text-yellow-400",
  nodes: "text-primary",
};

export function AIThinkingLoader({
  variant = "orbit",
  ...props
}: AIThinkingLoaderProps) {
  return (
    <BeuiAIThinkingLoader
      {...props}
      variant={variant}
      visualClassName={colors[variant]}
    />
  );
}
