import type { ModelPickerOption } from "./model-picker";

// Sample catalog, not a statement of account availability or model pricing.
export const SAMPLE_MODELS: ModelPickerOption[] = [
  ...[
    "GPT-5.4",
    "GPT-5.4 mini",
    "GPT-5.4 nano",
    "GPT-5.2",
    "GPT-4.1",
    "GPT-4.1 mini",
    "o3",
    "o4-mini",
  ].map((name) => ({
    id: name.toLowerCase().replaceAll(" ", "-"),
    name,
    provider: "OpenAI",
    providerId: "openai",
  })),
  ...[
    "Claude Fable 5.1",
    "Claude Opus 5",
    "Claude Sonnet 5",
    "Claude Haiku 4.5",
  ].map((name) => ({
    id: name.toLowerCase().replaceAll(" ", "-"),
    name,
    provider: "Anthropic",
    providerId: "anthropic",
  })),
  ...[
    "Gemini 3.1 Pro",
    "Gemini 3.1 Flash",
    "Gemini 3.1 Flash-Lite",
    "Gemini 2.5 Pro",
    "Gemini 2.5 Flash",
  ].map((name) => ({
    id: name.toLowerCase().replaceAll(" ", "-"),
    name,
    provider: "Google",
    providerId: "google",
  })),
  ...["Mistral Large", "Mistral Small", "Codestral", "Devstral"].map(
    (name) => ({
      id: name.toLowerCase().replaceAll(" ", "-"),
      name,
      provider: "Mistral",
      providerId: "mistral",
    }),
  ),
];
