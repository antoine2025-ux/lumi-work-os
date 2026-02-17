/**
 * Unit tests for HTML to TipTap conversion utility
 */

import { describe, it, expect } from 'vitest'
import { convertHtmlToTipTap } from '../html-to-tiptap'

describe('convertHtmlToTipTap', () => {
  it('should convert empty HTML to empty paragraph', () => {
    const result = convertHtmlToTipTap('')
    
    expect(result.doc.type).toBe('doc')
    expect(result.doc.content).toBeDefined()
    expect(result.doc.content).toHaveLength(1)
    expect(result.doc.content?.[0]?.type).toBe('paragraph')
    expect(result.warnings).toHaveLength(0)
  })

  it('should convert basic paragraph', () => {
    const html = '<p>Hello world</p>'
    const result = convertHtmlToTipTap(html)
    
    expect(result.doc.type).toBe('doc')
    expect(result.doc.content).toBeDefined()
    expect(result.doc.content).toHaveLength(1)
    expect(result.doc.content?.[0]?.type).toBe('paragraph')
    expect(result.doc.content?.[0]?.content).toBeDefined()
    expect(result.doc.content?.[0]?.content?.length).toBeGreaterThan(0)
  })

  it('should convert headings', () => {
    const html = '<h1>Title</h1><h2>Subtitle</h2>'
    const result = convertHtmlToTipTap(html)
    
    expect(result.doc.content).toBeDefined()
    expect(result.doc.content).toHaveLength(2)
    expect(result.doc.content?.[0]?.type).toBe('heading')
    expect(result.doc.content?.[0]?.attrs?.level).toBe(1)
    expect(result.doc.content?.[1]?.type).toBe('heading')
    expect(result.doc.content?.[1]?.attrs?.level).toBe(2)
  })

  it('should convert lists', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
    const result = convertHtmlToTipTap(html)
    
    expect(result.doc.content).toBeDefined()
    expect(result.doc.content).toHaveLength(1)
    expect(result.doc.content?.[0]?.type).toBe('bulletList')
    expect(result.doc.content?.[0]?.content).toBeDefined()
    expect(result.doc.content?.[0]?.content?.length).toBe(2)
    expect(result.doc.content?.[0]?.content?.[0]?.type).toBe('listItem')
  })

  it('should convert ordered lists', () => {
    const html = '<ol><li>First</li><li>Second</li></ol>'
    const result = convertHtmlToTipTap(html)
    
    expect(result.doc.content).toBeDefined()
    expect(result.doc.content).toHaveLength(1)
    expect(result.doc.content?.[0]?.type).toBe('orderedList')
  })

  it('should convert blockquotes', () => {
    const html = '<blockquote>Quote text</blockquote>'
    const result = convertHtmlToTipTap(html)
    
    expect(result.doc.content).toBeDefined()
    expect(result.doc.content).toHaveLength(1)
    expect(result.doc.content?.[0]?.type).toBe('blockquote')
  })

  it('should convert embed placeholders', () => {
    const html = '<div class="embed-placeholder" data-embed-id="embed-123">Embed content</div>'
    const result = convertHtmlToTipTap(html)
    
    expect(result.doc.content).toBeDefined()
    expect(result.doc.content).toHaveLength(1)
    expect(result.doc.content?.[0]?.type).toBe('embed')
    expect(result.doc.content?.[0]?.attrs?.embedId).toBe('embed-123')
  })

  it('should convert embed placeholders with attribute order swapped', () => {
    const html = '<div data-embed-id="embed-456" class="embed-placeholder">Embed content</div>'
    const result = convertHtmlToTipTap(html)
    
    expect(result.doc.content).toBeDefined()
    expect(result.doc.content).toHaveLength(1)
    expect(result.doc.content?.[0]?.type).toBe('embed')
    expect(result.doc.content?.[0]?.attrs?.embedId).toBe('embed-456')
  })

  it('should convert embed placeholders with single quotes', () => {
    const html = "<div class='embed-placeholder' data-embed-id='embed-789'>Embed content</div>"
    const result = convertHtmlToTipTap(html)
    
    expect(result.doc.content).toBeDefined()
    expect(result.doc.content).toHaveLength(1)
    expect(result.doc.content?.[0]?.type).toBe('embed')
    expect(result.doc.content?.[0]?.attrs?.embedId).toBe('embed-789')
  })

  it('should convert embed placeholders with single quotes and swapped attributes', () => {
    const html = "<div data-embed-id='embed-abc' class='embed-placeholder'>Embed content</div>"
    const result = convertHtmlToTipTap(html)
    
    expect(result.doc.content).toBeDefined()
    expect(result.doc.content).toHaveLength(1)
    expect(result.doc.content?.[0]?.type).toBe('embed')
    expect(result.doc.content?.[0]?.attrs?.embedId).toBe('embed-abc')
  })

  it('should convert embed placeholders with extra attributes', () => {
    const html = '<div id="test" class="embed-placeholder" data-embed-id="embed-extra" style="margin: 10px">Embed content</div>'
    const result = convertHtmlToTipTap(html)
    
    expect(result.doc.content).toBeDefined()
    expect(result.doc.content).toHaveLength(1)
    expect(result.doc.content?.[0]?.type).toBe('embed')
    expect(result.doc.content?.[0]?.attrs?.embedId).toBe('embed-extra')
  })

  it('should convert embed placeholders with all variations combined', () => {
    const html = `
      <div class="embed-placeholder" data-embed-id="embed-1">First</div>
      <div data-embed-id="embed-2" class="embed-placeholder">Second</div>
      <div class='embed-placeholder' data-embed-id='embed-3'>Third</div>
      <div data-embed-id='embed-4' class='embed-placeholder' id="test">Fourth</div>
    `
    const result = convertHtmlToTipTap(html)
    
    expect(result.doc.content).toBeDefined()
    const embeds = result.doc.content?.filter(node => node.type === 'embed') ?? []
    expect(embeds).toHaveLength(4)
    expect(embeds[0]?.attrs?.embedId).toBe('embed-1')
    expect(embeds[1]?.attrs?.embedId).toBe('embed-2')
    expect(embeds[2]?.attrs?.embedId).toBe('embed-3')
    expect(embeds[3]?.attrs?.embedId).toBe('embed-4')
  })

  it('should handle multiple embeds', () => {
    const html = `
      <p>Before</p>
      <div class="embed-placeholder" data-embed-id="embed-1"></div>
      <p>Middle</p>
      <div class="embed-placeholder" data-embed-id="embed-2"></div>
      <p>After</p>
    `
    const result = convertHtmlToTipTap(html)
    
    expect(result.doc.content).toBeDefined()
    const embeds = result.doc.content?.filter(node => node.type === 'embed') ?? []
    expect(embeds).toHaveLength(2)
    expect(embeds[0]?.attrs?.embedId).toBe('embed-1')
    expect(embeds[1]?.attrs?.embedId).toBe('embed-2')
  })

  it('should handle mixed content', () => {
    const html = `
      <h1>Title</h1>
      <p>Paragraph with <strong>bold</strong> text</p>
      <ul>
        <li>List item</li>
      </ul>
      <div class="embed-placeholder" data-embed-id="embed-123"></div>
    `
    const result = convertHtmlToTipTap(html)
    
    expect(result.doc.content).toBeDefined()
    expect(result.doc.content?.length ?? 0).toBeGreaterThan(1)
    expect(result.doc.content?.some(node => node.type === 'heading')).toBe(true)
    expect(result.doc.content?.some(node => node.type === 'paragraph')).toBe(true)
    expect(result.doc.content?.some(node => node.type === 'bulletList')).toBe(true)
    expect(result.doc.content?.some(node => node.type === 'embed')).toBe(true)
  })

  it('should preserve HTML content field (not modify original)', () => {
    const html = '<p>Test</p>'
    const result = convertHtmlToTipTap(html)
    
    // Conversion should not modify the input
    expect(html).toBe('<p>Test</p>')
    expect(result.doc).toBeDefined()
  })

  it('should handle whitespace-only content', () => {
    const result = convertHtmlToTipTap('   \n\t  ')
    
    expect(result.doc.type).toBe('doc')
    expect(result.doc.content).toBeDefined()
    expect(result.doc.content?.length ?? 0).toBeGreaterThan(0)
  })
})

