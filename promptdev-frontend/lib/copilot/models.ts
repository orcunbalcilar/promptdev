export const DEFAULT_MODEL_ID = "gpt-5-mini";

/**
 * Infer provider from model ID prefix
 */
export function getModelProvider(
  modelId: string,
): "openai" | "anthropic" | "google" | "xai" | "custom" {
  const id = modelId.toLowerCase();
  if (
    id.startsWith("gpt") ||
    id.startsWith("o1") ||
    id.startsWith("o3") ||
    id.startsWith("o4")
  )
    return "openai";
  if (id.startsWith("claude")) return "anthropic";
  if (id.startsWith("gemini")) return "google";
  if (id.startsWith("grok")) return "xai";
  return "custom";
}
