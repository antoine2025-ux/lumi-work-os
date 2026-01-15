/**
 * HTML to TipTap JSON conversion utility
 * Converts legacy HTML content to structured TipTap/ProseMirror JSON format
 * 
 * This is used for upgrading HTML pages to JSON format in Stage 2 migration
 * 
 * Note: This uses a simple regex-based parser. For production with complex HTML,
 * consider using node-html-parser for more robust parsing.
 */

import { JSONContent } from '@tiptap/core'

interface ConversionResult {
  doc: JSONContent
  warnings: string[]
}

/**
 * Convert HTML string to TipTap JSON document
 * 
 * @param html - HTML string to convert
 * @returns Conversion result with doc and warnings
 */
export function convertHtmlToTipTap(html: string): ConversionResult {
  const warnings: string[] = []
  
  if (!html || html.trim() === '') {
    return {
      doc: {
        type: 'doc',
        content: [
          {
            type: 'paragraph'
          }
        ]
      },
      warnings: []
    }
  }

  // Extract embed placeholders first (before other parsing)
  // Handle both double and single quotes, attribute order variations, extra attributes
  // Pattern must match:
  //   - class="embed-placeholder" or class='embed-placeholder'
  //   - data-embed-id="..." or data-embed-id='...'
  //   - Attributes can be in any order
  //   - Extra attributes are allowed anywhere
  const embedRegex = /<div[^>]*class=["']embed-placeholder["'][^>]*data-embed-id=["']([^"']+)["'][^>]*>.*?<\/div>|<div[^>]*data-embed-id=["']([^"']+)["'][^>]*class=["']embed-placeholder["'][^>]*>.*?<\/div>/gis
  const embeds: Array<{ index: number; embedId: string; length: number }> = []
  let embedMatch
  
  while ((embedMatch = embedRegex.exec(html)) !== null) {
    // Match group 1 or 2 will have the embedId (depending on attribute order)
    const embedId = embedMatch[1] || embedMatch[2]
    if (embedId) {
      embeds.push({
        index: embedMatch.index,
        embedId: embedId,
        length: embedMatch[0].length
      })
    }
  }

  // Build content array
  const content: JSONContent[] = []
  let lastIndex = 0

  // Process embeds and content between them
  embeds.forEach(embed => {
    // Add content before embed
    if (embed.index > lastIndex) {
      const beforeHtml = html.substring(lastIndex, embed.index)
      const beforeContent = parseHtmlContent(beforeHtml, warnings)
      content.push(...beforeContent)
    }
    
    // Add embed node
    content.push({
      type: 'embed',
      attrs: { embedId: embed.embedId }
    })
    
    lastIndex = embed.index + embed.length
  })

  // Add remaining content after last embed
  if (lastIndex < html.length) {
    const remainingHtml = html.substring(lastIndex)
    const remainingContent = parseHtmlContent(remainingHtml, warnings)
    content.push(...remainingContent)
  }

  // If no content was created, add empty paragraph
  if (content.length === 0) {
    content.push({ type: 'paragraph' })
  }

  return {
    doc: {
      type: 'doc',
      content
    },
    warnings
  }
}

/**
 * Parse HTML content into TipTap nodes
 */
function parseHtmlContent(html: string, warnings: string[]): JSONContent[] {
  const content: JSONContent[] = []
  
  // Remove embed placeholders (already processed)
  html = html.replace(/<div[^>]*class=["']embed-placeholder["'][^>]*>.*?<\/div>/gis, '')
  
  // Split by block-level elements
  const blockRegex = /<(h[1-6]|p|ul|ol|blockquote|pre|code|div|br\s*\/?)[^>]*>(.*?)<\/\1>|<(h[1-6]|p|ul|ol|blockquote|pre|code|div|br\s*\/?)[^>]*\/>|<br\s*\/?>/gis
  const blocks: Array<{ type: string; content: string; start: number; end: number }> = []
  let match
  
  while ((match = blockRegex.exec(html)) !== null) {
    const tag = (match[1] || match[3] || 'br').toLowerCase()
    const content = match[2] || ''
    blocks.push({
      type: tag,
      content,
      start: match.index,
      end: match.index + match[0].length
    })
  }

  // Process blocks
  let lastPos = 0
  blocks.forEach(block => {
    // Add text before block
    if (block.start > lastPos) {
      const textBefore = stripHtmlTags(html.substring(lastPos, block.start))
      if (textBefore.trim()) {
        content.push({
          type: 'paragraph',
          content: [{ type: 'text', text: textBefore.trim() }]
        })
      }
    }

    // Process block
    if (block.type.startsWith('h')) {
      const level = parseInt(block.type.substring(1)) || 1
      const headingContent = parseInlineContent(block.content, warnings)
      content.push({
        type: 'heading',
        attrs: { level: Math.min(Math.max(level, 1), 6) },
        content: headingContent.length > 0 ? headingContent : []
      })
    } else if (block.type === 'p' || block.type === 'div') {
      const paragraphContent = parseInlineContent(block.content, warnings)
      content.push({
        type: 'paragraph',
        content: paragraphContent.length > 0 ? paragraphContent : []
      })
    } else if (block.type === 'ul') {
      const listItems = parseListItems(block.content, false, warnings)
      if (listItems.length > 0) {
        content.push({
          type: 'bulletList',
          content: listItems
        })
      }
    } else if (block.type === 'ol') {
      const listItems = parseListItems(block.content, true, warnings)
      if (listItems.length > 0) {
        content.push({
          type: 'orderedList',
          content: listItems
        })
      }
    } else if (block.type === 'blockquote') {
      const blockquoteContent = parseBlockContent(block.content, warnings)
      content.push({
        type: 'blockquote',
        content: blockquoteContent
      })
    } else if (block.type === 'pre' || block.type === 'code') {
      const code = stripHtmlTags(block.content)
      content.push({
        type: 'codeBlock',
        content: code ? [{ type: 'text', text: code }] : []
      })
    } else if (block.type === 'br') {
      // Hard break - add as paragraph with hard break
      content.push({
        type: 'paragraph',
        content: [{ type: 'hardBreak' }]
      })
    }

    lastPos = block.end
  })

  // Add remaining text
  if (lastPos < html.length) {
    const remainingText = stripHtmlTags(html.substring(lastPos))
    if (remainingText.trim()) {
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: remainingText.trim() }]
      })
    }
  }

  // If no content, add empty paragraph
  if (content.length === 0) {
    content.push({ type: 'paragraph' })
  }

  return content
}

/**
 * Parse inline content (text with marks: bold, italic, underline, code, links)
 */
function parseInlineContent(html: string, warnings: string[]): JSONContent[] {
  if (!html || html.trim() === '') {
    return []
  }

  // Extract links first (they can contain other marks)
  const links: Array<{ start: number; end: number; href: string; text: string }> = []
  const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis
  let linkMatch
  
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    links.push({
      start: linkMatch.index,
      end: linkMatch.index + linkMatch[0].length,
      href: linkMatch[1],
      text: stripHtmlTags(linkMatch[2])
    })
  }

  // Build text nodes with marks
  const result: JSONContent[] = []
  let lastPos = 0

  // Process links
  links.forEach(link => {
    // Add text before link
    if (link.start > lastPos) {
      const beforeHtml = html.substring(lastPos, link.start)
      const beforeNodes = parseTextWithMarks(beforeHtml, warnings)
      result.push(...beforeNodes)
    }

    // Add link node
    const linkText = parseTextWithMarks(link.text, warnings)
    linkText.forEach(node => {
      if (node.type === 'text') {
        node.marks = [
          ...(node.marks || []),
          { type: 'link', attrs: { href: link.href } }
        ]
      }
    })
    result.push(...linkText)

    lastPos = link.end
  })

  // Add remaining text
  if (lastPos < html.length) {
    const remainingHtml = html.substring(lastPos)
    const remainingNodes = parseTextWithMarks(remainingHtml, warnings)
    result.push(...remainingNodes)
  }

  // If no links, parse entire content
  if (result.length === 0) {
    return parseTextWithMarks(html, warnings)
  }

  return result
}

/**
 * Parse text with formatting marks (bold, italic, underline, code)
 */
function parseTextWithMarks(html: string, warnings: string[]): JSONContent[] {
  const result: JSONContent[] = []
  
  // Remove all tags and get plain text
  const plainText = stripHtmlTags(html)
  
  if (!plainText) {
    return []
  }

  // Simple approach: extract text and detect marks
  // For more complex nested marks, we'd need a proper parser
  const marks: string[] = []
  
  if (/<strong[^>]*>|<b[^>]*>/i.test(html)) {
    marks.push('bold')
  }
  if (/<em[^>]*>|<i[^>]*>/i.test(html)) {
    marks.push('italic')
  }
  if (/<u[^>]*>/i.test(html)) {
    marks.push('underline')
  }
  if (/<code[^>]*>/i.test(html)) {
    marks.push('code')
  }

  const node: JSONContent = {
    type: 'text',
    text: plainText
  }

  if (marks.length > 0) {
    node.marks = marks.map(mark => ({ type: mark }))
  }

  result.push(node)
  return result
}

/**
 * Parse list items from HTML
 */
function parseListItems(html: string, ordered: boolean, warnings: string[]): JSONContent[] {
  const items: JSONContent[] = []
  const liRegex = /<li[^>]*>(.*?)<\/li>/gis
  let match
  
  while ((match = liRegex.exec(html)) !== null) {
    const itemContent = match[1]
    const paragraphContent = parseInlineContent(itemContent, warnings)
    
    items.push({
      type: 'listItem',
      content: paragraphContent.length > 0 
        ? [{ type: 'paragraph', content: paragraphContent }]
        : [{ type: 'paragraph' }]
    })
  }

  return items
}

/**
 * Parse block content (for blockquotes)
 */
function parseBlockContent(html: string, warnings: string[]): JSONContent[] {
  // Split by paragraphs or treat as single paragraph
  const paragraphs = html.split(/<p[^>]*>/i)
  const result: JSONContent[] = []
  
  paragraphs.forEach(para => {
    const cleanPara = para.replace(/<\/p>/gi, '').trim()
    if (cleanPara) {
      const content = parseInlineContent(cleanPara, warnings)
      result.push({
        type: 'paragraph',
        content: content.length > 0 ? content : []
      })
    }
  })

  return result.length > 0 ? result : [{ type: 'paragraph' }]
}

/**
 * Strip HTML tags and decode entities
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

