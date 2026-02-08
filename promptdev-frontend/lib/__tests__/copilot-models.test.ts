import { describe, expect, it } from 'vitest'
import { COPILOT_MODELS, DEFAULT_MODEL_ID, mergeModels } from '../copilot/models'

describe('COPILOT_MODELS', () => {
  it('should have at least 10 models', () => {
    expect(COPILOT_MODELS.length).toBeGreaterThanOrEqual(10)
  })

  it('should have unique model IDs', () => {
    const ids = COPILOT_MODELS.map((m) => m.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should have the default model in the list', () => {
    const defaultModel = COPILOT_MODELS.find((m) => m.id === DEFAULT_MODEL_ID)
    expect(defaultModel).toBeDefined()
    expect(defaultModel?.name).toBeTruthy()
  })

  it('every model should have required fields', () => {
    for (const model of COPILOT_MODELS) {
      expect(model.id).toBeTruthy()
      expect(model.name).toBeTruthy()
      expect(model.description).toBeTruthy()
      expect(model.provider).toBeTruthy()
      expect(model.capabilities).toHaveProperty('reasoning')
      expect(model.capabilities).toHaveProperty('vision')
    }
  })

  it('should include models from multiple providers', () => {
    const providers = new Set(COPILOT_MODELS.map((m) => m.provider))
    expect(providers.size).toBeGreaterThanOrEqual(3) // at least openai, anthropic, google
  })

  it('should include reasoning models', () => {
    const reasoningModels = COPILOT_MODELS.filter((m) => m.capabilities.reasoning)
    expect(reasoningModels.length).toBeGreaterThan(0)
  })
})

describe('mergeModels', () => {
  it('should return static models when dynamic is empty', () => {
    const result = mergeModels([])
    expect(result).toEqual(COPILOT_MODELS)
  })

  it('should merge dynamic models with static metadata', () => {
    const dynamicModels = [
      { id: 'gpt-5.2', name: 'GPT-5.2' },
      { id: 'new-model', name: 'New Model' },
    ]

    const result = mergeModels(dynamicModels)

    // Should include the dynamic model with static metadata
    const gpt = result.find((m) => m.id === 'gpt-5.2')
    expect(gpt?.description).toBeTruthy()
    expect(gpt?.provider).toBe('openai')

    // Should include the new model with defaults
    const newModel = result.find((m) => m.id === 'new-model')
    expect(newModel).toBeDefined()
    expect(newModel?.name).toBe('New Model')

    // Should still include other static models not in dynamic list
    const hasStatic = result.some((m) => m.id !== 'gpt-5.2' && m.id !== 'new-model')
    expect(hasStatic).toBe(true)
  })

  it('should infer provider from model ID', () => {
    const dynamicModels = [
      { id: 'claude-4', name: 'Claude 4' },
      { id: 'gemini-ultra', name: 'Gemini Ultra' },
      { id: 'grok-beta', name: 'Grok Beta' },
      { id: 'custom-local', name: 'Custom Local' },
    ]

    const result = mergeModels(dynamicModels, [])

    expect(result.find((m) => m.id === 'claude-4')?.provider).toBe('anthropic')
    expect(result.find((m) => m.id === 'gemini-ultra')?.provider).toBe('google')
    expect(result.find((m) => m.id === 'grok-beta')?.provider).toBe('xai')
    expect(result.find((m) => m.id === 'custom-local')?.provider).toBe('custom')
  })

  it('should prioritize dynamic models in order', () => {
    const dynamicModels = [
      { id: 'gpt-5.2', name: 'GPT-5.2' },
      { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
    ]

    const result = mergeModels(dynamicModels)

    // First two should be the dynamic models
    expect(result[0].id).toBe('gpt-5.2')
    expect(result[1].id).toBe('claude-sonnet-4.5')
  })
})
