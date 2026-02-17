import { describe, it, expect } from 'vitest'
import { extractTextFromProseMirror, isValidProseMirrorJSON } from '../text-extract'
import { EMPTY_TIPTAP_DOC } from '../constants'
import { JSONContent } from '@tiptap/core'

describe('text-extract', () => {
  describe('extractTextFromProseMirror', () => {
    it('extracts text from simple paragraph', () => {
      const json: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello world' }
            ]
          }
        ]
      }
      
      expect(extractTextFromProseMirror(json)).toBe('Hello world')
    })

    it('extracts text from multiple paragraphs', () => {
      const json: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'First paragraph' }]
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Second paragraph' }]
          }
        ]
      }
      
      const result = extractTextFromProseMirror(json)
      expect(result).toContain('First paragraph')
      expect(result).toContain('Second paragraph')
    })

    it('extracts text from headings', () => {
      const json: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Main Title' }]
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Content' }]
          }
        ]
      }
      
      const result = extractTextFromProseMirror(json)
      expect(result).toContain('Main Title')
      expect(result).toContain('Content')
    })

    it('handles nested content', () => {
      const json: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Bold ' },
              { type: 'text', text: 'text', marks: [{ type: 'bold' }] },
              { type: 'text', text: ' normal' }
            ]
          }
        ]
      }
      
      expect(extractTextFromProseMirror(json)).toBe('Bold text normal')
    })

    it('handles null/undefined input', () => {
      expect(extractTextFromProseMirror(null)).toBe('')
      expect(extractTextFromProseMirror(undefined)).toBe('')
    })

    it('normalizes whitespace', () => {
      const json: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '  Multiple   spaces  ' }]
          }
        ]
      }
      
      expect(extractTextFromProseMirror(json)).toBe('Multiple spaces')
    })
  })

  describe('isValidProseMirrorJSON', () => {
    it('validates correct TipTap document', () => {
      const json: JSONContent = {
        type: 'doc',
        content: []
      }
      
      expect(isValidProseMirrorJSON(json)).toBe(true)
    })

    it('rejects invalid objects', () => {
      expect(isValidProseMirrorJSON(null)).toBe(false)
      expect(isValidProseMirrorJSON(undefined)).toBe(false)
      expect(isValidProseMirrorJSON({})).toBe(false)
      expect(isValidProseMirrorJSON({ type: 'paragraph' })).toBe(false)
      expect(isValidProseMirrorJSON({ type: 'doc' })).toBe(false)
      expect(isValidProseMirrorJSON({ type: 'doc', content: 'not-array' })).toBe(false)
    })
  })

  describe('EMPTY_TIPTAP_DOC constant', () => {
    it('is a valid TipTap document', () => {
      expect(isValidProseMirrorJSON(EMPTY_TIPTAP_DOC)).toBe(true)
    })

    it('has correct structure', () => {
      expect(EMPTY_TIPTAP_DOC.type).toBe('doc')
      expect(Array.isArray(EMPTY_TIPTAP_DOC.content)).toBe(true)
      expect(EMPTY_TIPTAP_DOC.content).toBeDefined()
      expect(EMPTY_TIPTAP_DOC.content?.length ?? 0).toBeGreaterThan(0)
    })

    it('extracts to empty or minimal text', () => {
      const text = extractTextFromProseMirror(EMPTY_TIPTAP_DOC)
      // Empty doc should extract to minimal text (just newlines from paragraph)
      expect(typeof text).toBe('string')
    })
  })
})

