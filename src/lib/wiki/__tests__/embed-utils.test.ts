import { describe, it, expect } from 'vitest'
import { parseEmbedUrl, isEmbeddableUrl } from '../embed-utils'

describe('embed-utils', () => {
  describe('parseEmbedUrl', () => {
    it('parses YouTube watch URLs', () => {
      const result = parseEmbedUrl(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      )
      expect(result).not.toBeNull()
      expect(result?.provider).toBe('youtube')
      expect(result?.embedUrl).toBe(
        'https://www.youtube.com/embed/dQw4w9WgXcQ'
      )
      expect(result?.src).toContain('youtube.com')
    })

    it('parses youtu.be short URLs', () => {
      const result = parseEmbedUrl('https://youtu.be/dQw4w9WgXcQ')
      expect(result).not.toBeNull()
      expect(result?.provider).toBe('youtube')
      expect(result?.embedUrl).toBe(
        'https://www.youtube.com/embed/dQw4w9WgXcQ'
      )
    })

    it('parses Loom share URLs', () => {
      const result = parseEmbedUrl('https://www.loom.com/share/abc123')
      expect(result).not.toBeNull()
      expect(result?.provider).toBe('loom')
      expect(result?.embedUrl).toBe('https://www.loom.com/embed/abc123')
    })

    it('parses Figma file URLs', () => {
      const result = parseEmbedUrl(
        'https://www.figma.com/file/abc123/Design-Name'
      )
      expect(result).not.toBeNull()
      expect(result?.provider).toBe('figma')
      expect(result?.embedUrl).toContain('figma.com/embed')
      expect(result?.embedUrl).toContain(
        encodeURIComponent('https://www.figma.com/file/abc123/Design-Name')
      )
    })

    it('parses Google Sheets URLs', () => {
      const result = parseEmbedUrl(
        'https://docs.google.com/spreadsheets/d/sheetId123/edit'
      )
      expect(result).not.toBeNull()
      expect(result?.provider).toBe('google-sheets')
      expect(result?.embedUrl).toBe(
        'https://docs.google.com/spreadsheets/d/sheetId123/pubhtml?widget=true'
      )
    })

    it('parses Google Docs URLs', () => {
      const result = parseEmbedUrl(
        'https://docs.google.com/document/d/docId123/edit'
      )
      expect(result).not.toBeNull()
      expect(result?.provider).toBe('google-docs')
      expect(result?.embedUrl).toBe(
        'https://docs.google.com/document/d/docId123/pub?embedded=true'
      )
    })

    it('returns generic for unknown https URLs', () => {
      const result = parseEmbedUrl('https://example.com/page')
      expect(result).not.toBeNull()
      expect(result?.provider).toBe('generic')
      expect(result?.embedUrl).toBe('https://example.com/page')
    })

    it('returns null for invalid URLs', () => {
      expect(parseEmbedUrl('')).toBeNull()
      expect(parseEmbedUrl('not a url')).toBeNull()
      expect(parseEmbedUrl('   ')).toBeNull()
    })
  })

  describe('isEmbeddableUrl', () => {
    it('returns true for embeddable URLs', () => {
      expect(isEmbeddableUrl('https://www.youtube.com/watch?v=abc')).toBe(true)
      expect(isEmbeddableUrl('https://www.loom.com/share/xyz')).toBe(true)
      expect(isEmbeddableUrl('https://example.com')).toBe(true)
    })

    it('returns false for invalid input', () => {
      expect(isEmbeddableUrl('')).toBe(false)
      expect(isEmbeddableUrl('   ')).toBe(false)
      expect(isEmbeddableUrl('not a url')).toBe(false)
    })
  })
})
