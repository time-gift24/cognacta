export type AgentConfiguration = {
  name: string;
  description: string;
  instructions: string;
  model: string;
  sourceIds: string[];
  toolIds: string[];
  requireApproval: boolean;
};
export type AgentResource = { id: string; name: string; description: string };
export type AgentModel = { id: string; label: string; description?: string };
export type AgentTestMessage = { role: "user" | "assistant"; content: string };
export type AgentTestRequest = {
  configuration: AgentConfiguration;
  messages: AgentTestMessage[];
  signal: AbortSignal;
};
export const DEFAULT_AGENT: AgentConfiguration = {
  name: "Customer support",
  description: "Clear answers. Thoughtful follow-ups.",
  instructions:
    "You are a helpful customer support assistant. Answer using the connected knowledge sources. Keep responses clear and concise. If you cannot verify an answer, say so and suggest contacting the support team. Ask for approval before taking actions that change customer data.",
  model: "balanced",
  sourceIds: ["help-center", "product-guide"],
  toolIds: ["search"],
  requireApproval: true,
};
export const AGENT_MODELS: readonly AgentModel[] = [
  {
    id: "balanced",
    label: "Balanced",
    description: "For everyday questions and multi-step tasks",
  },
  {
    id: "fast",
    label: "Fast",
    description: "For quick answers and simple tasks",
  },
  {
    id: "reasoning",
    label: "Reasoning",
    description: "For complex questions and careful analysis",
  },
];
export const AGENT_SOURCES: readonly AgentResource[] = [
  {
    id: "help-center",
    name: "Help center",
    description: "Setup guides and common questions",
  },
  {
    id: "product-guide",
    name: "Product handbook",
    description: "Features, plans, and workspace basics",
  },
  {
    id: "tone-guide",
    name: "Voice & tone",
    description: "How we communicate with customers",
  },
];
export const AGENT_TOOLS: readonly AgentResource[] = [
  {
    id: "search",
    name: "Search knowledge",
    description: "Find relevant passages in connected sources",
  },
  {
    id: "lookup",
    name: "Look up an order",
    description: "Read order details from your connected system",
  },
  {
    id: "ticket",
    name: "Create support ticket",
    description: "Escalate an issue for a human to review",
  },
];
