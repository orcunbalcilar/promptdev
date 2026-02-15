import { describe, expect, it } from 'vitest'
import { mergeModels } from '../copilot/models'
import type { ModelInfo } from '@github/copilot-sdk'

describe('mergeModels', () => {
  it('should return empty array when dynamic is empty', () => {
    const result = mergeModels([])
    expect(result).toEqual([])
  })

  it('should format dynamic models correctly', () => {
    const dynamicModels: ModelInfo[] = [
      { 
        id: 'gpt-5.2', 
        name: 'GPT-5.2',
        capabilities: {
          supports: { reasoningEffort: true, vision: true },
          limits: { max_context_window_tokens: 1000 }
        },
        billing: { multiplier: 1 }
      },
      { 
        id: 'new-model', 
        name: 'New Model',
        capabilities: {
          supports: { reasoningEffort: false, vision: false },
          limits: { max_context_window_tokens: 1000 }
        }
      },
    ]

    const result = mergeModels(dynamicModels)

    expect(result).toHaveLength(2)

    // Check formatting
    const gpt = result.find((m) => m.id === 'gpt-5.2')
    expect(gpt?.name).toBe('GPT-5.2')
    expect(gpt?.provider).toBe('openai')
    expect(gpt?.capabilities.reasoning).toBe(true)
    expect(gpt?.capabilities.vision).toBe(true)
    expect(gpt?.multiplier).toBe('1x')

    const newModel = result.find((m) => m.id === 'new-model')
    expect(newModel?.name).toBe('New Model')
    expect(newModel?.capabilities.reasoning).toBe(false)
  })

  it('should infer provider from model ID', () => {
    const dynamicModels: ModelInfo[] = [
      { id: 'claude-4', name: 'Claude 4', capabilities: { supports: { reasoningEffort: false, vision: false }, limits: { max_context_window_tokens: 0 } } },
      { id: 'gemini-ultra', name: 'Gemini Ultra', capabilities: { supports: { reasoningEffort: false, vision: false }, limits: { max_context_window_tokens: 0 } } },
      { id: 'grok-beta', name: 'Grok Beta', capabilities: { supports: { reasoningEffort: false, vision: false }, limits: { max_context_window_tokens: 0 } } },
      { id: 'custom-local', name: 'Custom Local', capabilities: { supports: { reasoningEffort: false, vision: false }, limits: { max_context_window_tokens: 0 } } },
    ]

    const result = mergeModels(dynamicModels)

    expect(result.find((m) => m.id === 'claude-4')?.provider).toBe('anthropic')
    expect(result.find((m) => m.id === 'gemini-ultra')?.provider).toBe('google')
    expect(result.find((m) => m.id === 'grok-beta')?.provider).toBe('xai')
    expect(result.find((m) => m.id === 'custom-local')?.provider).toBe('custom')
  })
})
