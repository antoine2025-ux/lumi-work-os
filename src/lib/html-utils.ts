export function stripHtml(html: string): string {
  if (!html) return ''
  
  // Create a temporary DOM element to parse HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  
  // Get text content which automatically strips HTML tags and decodes entities
  const textContent = tempDiv.textContent || tempDiv.innerText || ''
  
  // Clean up extra whitespace
  return textContent.replace(/\s+/g, ' ').trim()
}

export function stripHtmlServerSide(html: string): string {
  if (!html) return ''
  
  // For server-side rendering, we need a different approach
  // This is a simple regex-based approach that handles common cases
  let text = html
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim()
  
  return text
}

