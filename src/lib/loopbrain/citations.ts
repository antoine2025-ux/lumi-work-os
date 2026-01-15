/**
 * Citation Utilities
 * 
 * Extract and validate citations from LLM responses.
 * Citations use human-readable format: (source: type:id)
 */

/**
 * Extracted citation from text
 */
export interface Citation {
  type: string
  id: string
}

/**
 * Source that was sent to the model
 */
export interface SourceUsed {
  type: string
  id: string
  title: string
}

/**
 * Citation validation result
 */
export interface CitationValidation {
  valid: Citation[]
  invalid: Citation[]
  missing: boolean
}

/**
 * Extract citations from text
 * 
 * Looks for patterns: (source: type:id)
 * Examples:
 * - (source: project:abc123)
 * - (source: task:xyz789)
 * - (source: page:doc456)
 * 
 * @param text - Text to extract citations from
 * @returns Array of extracted citations
 */
export function extractCitations(text: string): Citation[] {
  // Pattern: (source: <type>:<id>)
  // Type and ID can contain alphanumerics, hyphens, underscores
  const citationPattern = /\(source:\s*([a-z0-9_-]+):([a-z0-9_-]+)\)/gi
  
  const citations: Citation[] = []
  const seen = new Set<string>()
  
  let match
  while ((match = citationPattern.exec(text)) !== null) {
    const type = match[1].toLowerCase()
    const id = match[2]
    const key = `${type}:${id}`
    
    // De-duplicate
    if (!seen.has(key)) {
      seen.add(key)
      citations.push({ type, id })
    }
  }
  
  return citations
}

/**
 * Validate citations against sources that were sent to the model
 * 
 * @param citations - Extracted citations
 * @param sourcesUsed - Sources that were actually sent to the model
 * @returns Validation result with valid/invalid citations and missing flag
 */
export function validateCitations(
  citations: Citation[],
  sourcesUsed: SourceUsed[]
): CitationValidation {
  // Build lookup map for fast validation
  const sourcesMap = new Map<string, SourceUsed>()
  for (const source of sourcesUsed) {
    const key = `${source.type}:${source.id}`
    sourcesMap.set(key, source)
  }
  
  const valid: Citation[] = []
  const invalid: Citation[] = []
  
  for (const citation of citations) {
    const key = `${citation.type}:${citation.id}`
    if (sourcesMap.has(key)) {
      valid.push(citation)
    } else {
      invalid.push(citation)
    }
  }
  
  const missing = citations.length === 0
  
  return { valid, invalid, missing }
}

/**
 * Replace invalid citations with neutral marker
 * 
 * @param text - Text containing citations
 * @param invalidCitations - Invalid citations to replace
 * @returns Text with invalid citations replaced
 */
export function replaceInvalidCitations(
  text: string,
  invalidCitations: Citation[]
): string {
  let result = text
  
  for (const citation of invalidCitations) {
    const pattern = new RegExp(
      `\\(source:\\s*${citation.type}:${citation.id}\\)`,
      'gi'
    )
    result = result.replace(pattern, '(source: unknown)')
  }
  
  return result
}

/**
 * Format sources for display
 * 
 * @param sourcesUsed - Sources that were sent to the model
 * @returns Formatted string for footer
 */
export function formatSourcesFooter(sourcesUsed: SourceUsed[]): string {
  if (sourcesUsed.length === 0) {
    return ''
  }
  
  // Limit to 8 items for footer
  const displaySources = sourcesUsed.slice(0, 8)
  const items = displaySources.map(
    source => `- ${source.title} (source: ${source.type}:${source.id})`
  )
  
  return `\n\n---\n**Sources used:**\n${items.join('\n')}`
}

