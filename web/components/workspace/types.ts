import type {
  ChatSource,
  ChatTool,
} from "@/components/arc/blocks/ai-chat/chat-data";

export type Mode = "chat" | "agent" | "design";
export type Project = { id: string; title: string };
export type MessageContext = {
  id: string;
  name: string;
  kind: "file" | "knowledge";
  content?: string;
  url?: string;
};
export type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  context?: MessageContext[];
  status?: "done" | "stopped" | "error";
  error?: string;
  model?: string;
  reasoning?: string;
  thoughtFor?: number;
  tools?: ChatTool[];
  sources?: ChatSource[];
};
export type Session = {
  id: string;
  title: string;
  messages: Message[];
  archived: boolean;
  projectId?: string;
};
export type ComposerProps = {
  value: string;
  setValue: (value: string) => void;
  onSubmit: (value: string, context?: MessageContext[]) => void;
  onStop: () => void;
  thinking: boolean;
  webEnabled: boolean;
  setWebEnabled: (enabled: boolean) => void;
  model: string;
  setModel: (model: string) => void;
};
