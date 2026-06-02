import { describe, it, expect } from 'vitest'
import {
  fillTemplate,
  getTemplatesByCategory,
  getTemplateById,
  SDLC_TEMPLATES,
} from '@/lib/sdlc'

describe('SDLC Templates', () => {
  describe('SDLC_TEMPLATES', () => {
    it('should have at least 10 templates', () => {
      expect(SDLC_TEMPLATES.length).toBeGreaterThanOrEqual(10)
    })

    it('should have unique IDs for all templates', () => {
      const ids = SDLC_TEMPLATES.map(t => t.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('should have required fields for every template', () => {
      for (const template of SDLC_TEMPLATES) {
        expect(template.id).toBeTruthy()
        expect(template.name).toBeTruthy()
        expect(template.category).toBeTruthy()
        expect(template.description).toBeTruthy()
        expect(template.promptTemplate).toBeTruthy()
        expect(template.systemMessage).toBeTruthy()
        expect(template.reasoningEffort).toBeTruthy()
        expect(template.estimatedDuration).toBeTruthy()
        expect(template.tags.length).toBeGreaterThan(0)
      }
    })

    it('should cover all expected categories', () => {
      const categories = new Set(SDLC_TEMPLATES.map(t => t.category))
      expect(categories).toContain('feature')
      expect(categories).toContain('testing')
      expect(categories).toContain('review')
      expect(categories).toContain('documentation')
    })
  })

  describe('fillTemplate', () => {
    it('should replace template variables with provided values', () => {
      const template = 'Hello {{name}}, welcome to {{project}}'
      const result = fillTemplate(template, { name: 'Alice', project: 'PromptDev' })
      expect(result).toBe('Hello Alice, welcome to PromptDev')
    })

    it('should leave unreplaced variables as-is', () => {
      const template = 'Deploy {{service}} to {{environment}}'
      const result = fillTemplate(template, { service: 'backend' })
      expect(result).toBe('Deploy backend to {{environment}}')
    })

    it('should handle templates with no variables', () => {
      const template = 'No variables here'
      const result = fillTemplate(template, {})
      expect(result).toBe('No variables here')
    })

    it('should replace all occurrences of the same variable', () => {
      const template = '{{name}} is great. {{name}} is awesome.'
      const result = fillTemplate(template, { name: 'React' })
      expect(result).toBe('React is great. React is awesome.')
    })
  })

  describe('getTemplatesByCategory', () => {
    it('should return templates matching the category', () => {
      const devTemplates = getTemplatesByCategory('feature')
      expect(devTemplates.length).toBeGreaterThan(0)
      for (const t of devTemplates) {
        expect(t.category).toBe('feature')
      }
    })

    it('should return testing templates', () => {
      const testTemplates = getTemplatesByCategory('testing')
      expect(testTemplates.length).toBeGreaterThan(0)
    })

    it('should return empty array for non-existing category', () => {
      // @ts-expect-error Testing with invalid category
      const result = getTemplatesByCategory('nonexistent')
      expect(result).toEqual([])
    })
  })

  describe('getTemplateById', () => {
    it('should return the correct template by ID', () => {
      const template = getTemplateById('feature-implement')
      expect(template).toBeDefined()
      expect(template?.name).toBe('Implement Feature')
    })

    it('should return undefined for non-existing ID', () => {
      const template = getTemplateById('nonexistent-id')
      expect(template).toBeUndefined()
    })

    it('should return bugfix template', () => {
      const template = getTemplateById('bugfix-investigate')
      expect(template).toBeDefined()
      expect(template?.category).toBe('bugfix')
    })
  })
})
