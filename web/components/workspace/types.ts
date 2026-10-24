export type Mode = "Chat" | "Agent" | "Design";
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
