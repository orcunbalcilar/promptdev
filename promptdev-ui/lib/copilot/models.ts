export interface CopilotModel {
  id: string;
  name: string;
  description: string;
  provider: "openai" | "anthropic" | "google" | "xai" | "custom";
  capabilities: { reasoning: boolean; vision: boolean };
}

export const COPILOT_MODELS: CopilotModel[] = [
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    description: "Latest OpenAI model",
    provider: "openai",
    capabilities: { reasoning: true, vision: true },
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    description: "Fast & affordable",
    provider: "openai",
    capabilities: { reasoning: true, vision: true },
  },
  {
    id: "o4-mini",
    name: "o4-mini",
    description: "Reasoning model",
    provider: "openai",
    capabilities: { reasoning: true, vision: false },
  },
  {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    description: "Anthropic model",
    provider: "anthropic",
    capabilities: { reasoning: true, vision: true },
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Google model",
    provider: "google",
    capabilities: { reasoning: true, vision: true },
  },
];

export const DEFAULT_MODEL_ID = "gpt-5-mini";
