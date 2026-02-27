import { describe, it, expect } from 'vitest'
import { WIKI_TEMPLATES, getTemplatesByCategory, getTemplateById } from '../templates'
import { isValidProseMirrorJSON } from '../text-extract'

describe('wiki templates', () => {
  describe('WIKI_TEMPLATES', () => {
    it('has 13 templates (Blank + 12 content templates)', () => {
      expect(WIKI_TEMPLATES).toHaveLength(13)
    })

    it('has Blank Page as first template', () => {
      expect(WIKI_TEMPLATES[0].id).toBe('blank')
      expect(WIKI_TEMPLATES[0].name).toBe('Blank Page')
    })

    it('all templates have valid ProseMirror JSON content', () => {
      for (const template of WIKI_TEMPLATES) {
        expect(isValidProseMirrorJSON(template.content), `Template ${template.id} has invalid content`).toBe(true)
      }
    })

    it('all templates have required fields', () => {
      const required = ['id', 'name', 'description', 'icon', 'category', 'content'] as const
      for (const template of WIKI_TEMPLATES) {
        for (const field of required) {
          expect(template[field], `Template ${template.id} missing ${field}`).toBeDefined()
        }
      }
    })

    it('all template IDs are unique', () => {
      const ids = WIKI_TEMPLATES.map((t) => t.id)
      const unique = new Set(ids)
      expect(unique.size).toBe(ids.length)
    })
  })

  describe('getTemplatesByCategory', () => {
    it('returns all templates for "all"', () => {
      const result = getTemplatesByCategory('all')
      expect(result).toHaveLength(13)
    })

    it('returns only meetings templates for "meetings"', () => {
      const result = getTemplatesByCategory('meetings')
      expect(result.every((t) => t.category === 'meetings')).toBe(true)
      expect(result.length).toBe(3)
    })

    it('returns only engineering templates for "engineering"', () => {
      const result = getTemplatesByCategory('engineering')
      expect(result.every((t) => t.category === 'engineering')).toBe(true)
      expect(result.length).toBe(3)
    })

    it('returns only product templates for "product"', () => {
      const result = getTemplatesByCategory('product')
      expect(result.every((t) => t.category === 'product')).toBe(true)
      expect(result.length).toBe(3)
    })

    it('returns only operations templates for "operations"', () => {
      const result = getTemplatesByCategory('operations')
      expect(result.every((t) => t.category === 'operations')).toBe(true)
      expect(result.length).toBe(2)
    })

    it('returns only general templates for "general"', () => {
      const result = getTemplatesByCategory('general')
      expect(result.every((t) => t.category === 'general')).toBe(true)
      expect(result.length).toBe(2) // Blank + Blank with Structure
    })
  })

  describe('getTemplateById', () => {
    it('returns template for valid id', () => {
      const template = getTemplateById('meeting-notes')
      expect(template).toBeDefined()
      expect(template?.name).toBe('Meeting Notes')
    })

    it('returns undefined for invalid id', () => {
      expect(getTemplateById('nonexistent')).toBeUndefined()
    })
  })
})
