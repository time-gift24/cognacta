export const DEFAULT_CREDITS_LABELS = {
  editor: "Agent prompt",
  selectModel: "Select model",
  sendMessage: "Send message",
  stopResponse: "Stop response",
  sendingPrompt: "Sending prompt",
  attachFiles: "Attach files",
  voiceInput: "Voice input",
  skills: "Skills",
  noMatchingSkills: "No matching skills",
  search: "Search",
  enableSearch: "Enable web search",
  disableSearch: "Disable web search",
  upgrade: "Upgrade",
  dismissCredits: "Dismiss credits notice",
  closePreview: "Close image preview",
  creditsRemaining: (count: number) => `${count} Credits Remaining`,
  previewAttachment: (name: string) => `Preview ${name}`,
  removeAttachment: (name: string) => `Remove ${name}`,
};

export type AgentChatCreditsLabels = typeof DEFAULT_CREDITS_LABELS;
