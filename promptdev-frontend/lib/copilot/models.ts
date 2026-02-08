export interface CopilotModel {
  id: string
  name: string
  description: string
  provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'custom'
  multiplier?: string
  sampleMessage?: string
  capabilities: {
    reasoning: boolean
    vision: boolean
  }
}

/**
 * Static list of well-known Copilot models.
 * Used as fallback when dynamic listing is unavailable.
 * 
 * Models are fetched from `copilot --help` output.
 */
export const COPILOT_MODELS: CopilotModel[] = [
  // Auto
  {
    id: 'auto',
    name: 'Auto',
    description: 'Automatically selects the best model for the task.',
    provider: 'custom',
    multiplier: 'Auto',
    sampleMessage: 'I\'ll analyze your request and pick the best tool for the job. How can I help?',
    capabilities: { reasoning: true, vision: true }
  },
  // Anthropic Claude
  {
    id: 'claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    description: 'Anthropic\'s most intelligent model, excelling at coding and complex tasks.',
    provider: 'anthropic',
    multiplier: '1x',
    sampleMessage: 'I can help with complex coding tasks and architectural decisions. What are you building today?',
    capabilities: { reasoning: true, vision: true }
  },
  {
    id: 'claude-haiku-4.5',
    name: 'Claude Haiku 4.5',
    description: 'Anthropic\'s fastest model, optimized for speed and efficiency.',
    provider: 'anthropic',
    multiplier: '0x (Free)',
    sampleMessage: 'Need a quick answer or simple code snippet? I\'m optimized for speed.',
    capabilities: { reasoning: false, vision: true }
  },
  {
    id: 'claude-opus-4.6',
    name: 'Claude Opus 4.6',
    description: 'Anthropic\'s newest Opus model for highly complex tasks.',
    provider: 'anthropic',
    multiplier: '3x',
    sampleMessage: 'I excel at deep reasoning and complex problem-solving. Present your challenge.',
    capabilities: { reasoning: true, vision: true }
  },
  {
    id: 'claude-opus-4.6-fast',
    name: 'Claude Opus 4.6 Fast',
    description: 'Faster Opus 4.6 variant for low-latency responses.',
    provider: 'anthropic',
    multiplier: '3x',
    sampleMessage: 'High intelligence with faster response times. How can I assist?',
    capabilities: { reasoning: true, vision: true }
  },
  {
    id: 'claude-opus-4.5',
    name: 'Claude Opus 4.5',
    description: 'Anthropic\'s most powerful model for highly complex tasks.',
    provider: 'anthropic',
    multiplier: '3x',
    sampleMessage: 'I provide comprehensive analysis for your most difficult problems.',
    capabilities: { reasoning: true, vision: true }
  },
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    description: 'Previous generation Claude Sonnet model.',
    provider: 'anthropic',
    multiplier: '1x',
    sampleMessage: 'Reliable assistance for coding and general tasks.',
    capabilities: { reasoning: true, vision: true }
  },
  // Google Gemini
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro (Preview)',
    description: 'Google\'s latest multimodal model with massive context window.',
    provider: 'google',
    multiplier: '0x (Free)',
    sampleMessage: 'I can process large amounts of context and multimodal inputs. Share your code or images.',
    capabilities: { reasoning: true, vision: true }
  },
  // OpenAI GPT
  {
    id: 'gpt-5.2-codex',
    name: 'GPT-5.2-Codex',
    description: 'OpenAI\'s specialized coding model.',
    provider: 'openai',
    multiplier: '1x',
    sampleMessage: 'Specialized in code generation and refactoring. Show me your code.',
    capabilities: { reasoning: false, vision: true }
  },
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    description: 'Latest flagship model from OpenAI, optimized for complex tasks.',
    provider: 'openai',
    multiplier: '1x',
    sampleMessage: 'Ready to tackle complex logic and creative tasks.',
    capabilities: { reasoning: true, vision: true }
  },
  {
    id: 'gpt-5.1-codex-max',
    name: 'GPT-5.1-Codex-Max',
    description: 'Maximum performance OpenAI coding model.',
    provider: 'openai',
    multiplier: '3x',
    sampleMessage: 'Maximum coding capability for critical systems.',
    capabilities: { reasoning: false, vision: true }
  },
  {
    id: 'gpt-5.1-codex',
    name: 'GPT-5.1-Codex',
    description: 'OpenAI coding-specialized model.',
    provider: 'openai',
    multiplier: '1x',
    sampleMessage: 'Efficient and accurate code generation.',
    capabilities: { reasoning: false, vision: true }
  },
  {
    id: 'gpt-5.1',
    name: 'GPT-5.1',
    description: 'Previous-generation flagship OpenAI model.',
    provider: 'openai',
    multiplier: '1x',
    sampleMessage: 'Versatile assistant for various tasks.',
    capabilities: { reasoning: true, vision: true }
  },
  {
    id: 'gpt-5',
    name: 'GPT-5',
    description: 'OpenAI general-purpose model.',
    provider: 'openai',
    multiplier: '1x',
    sampleMessage: 'General purpose assistant ready to help.',
    capabilities: { reasoning: true, vision: true }
  },
  {
    id: 'gpt-5.1-codex-mini',
    name: 'GPT-5.1-Codex-Mini',
    description: 'Fast and efficient OpenAI coding model.',
    provider: 'openai',
    multiplier: '0x (Free)',
    sampleMessage: 'Quick code snippets and fixes.',
    capabilities: { reasoning: false, vision: true }
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 mini',
    description: 'Fast and efficient model for everyday tasks.',
    provider: 'openai',
    multiplier: '0x (Free)',
    sampleMessage: 'Fast responses for everyday questions.',
    capabilities: { reasoning: false, vision: true }
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: 'Previous-generation OpenAI model.',
    provider: 'openai',
    multiplier: '1x',
    sampleMessage: 'Reliable performance for standard tasks.',
    capabilities: { reasoning: true, vision: true }
  },
]

export const DEFAULT_MODEL_ID = 'claude-sonnet-4.5'

/**
 * Merge dynamically fetched models with static list.
 * Dynamic models take precedence; unknown models get default capabilities.
 */
export function mergeModels(
  dynamicModels: Array<{ id: string; name?: string }>,
  staticModels: CopilotModel[] = COPILOT_MODELS
): CopilotModel[] {
  const staticMap = new Map(staticModels.map(m => [m.id, m]))
  const merged: CopilotModel[] = []
  const seen = new Set<string>()

  // Add dynamic models (with static metadata if available)
  for (const dm of dynamicModels) {
    const existing = staticMap.get(dm.id)
    if (existing) {
      merged.push(existing)
    } else {
      merged.push({
        id: dm.id,
        name: dm.name ?? dm.id,
        description: 'Available model',
        provider: inferProvider(dm.id),
        capabilities: { reasoning: false, vision: false }
      })
    }
    seen.add(dm.id)
  }

  // Add remaining static models not in dynamic list
  for (const sm of staticModels) {
    if (!seen.has(sm.id)) {
      merged.push(sm)
    }
  }

  return merged
}

/**
 * Infer provider from model ID prefix
 */
function inferProvider(modelId: string): CopilotModel['provider'] {
  const id = modelId.toLowerCase()
  if (id.startsWith('gpt') || id.startsWith('o1') || id.startsWith('o3') || id.startsWith('o4')) return 'openai'
  if (id.startsWith('claude')) return 'anthropic'
  if (id.startsWith('gemini')) return 'google'
  if (id.startsWith('grok')) return 'xai'
  return 'custom'
}
