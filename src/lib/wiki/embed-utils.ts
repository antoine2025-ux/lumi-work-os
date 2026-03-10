/**
 * Embed URL parsing and transformation utilities
 * Supports YouTube, Loom, Figma, Google Sheets, Google Docs, and generic iframes
 */

export type EmbedProvider =
  | 'figma'
  | 'loom'
  | 'youtube'
  | 'google-sheets'
  | 'google-docs'
  | 'generic'

export interface ParseEmbedResult {
  provider: EmbedProvider
  embedUrl: string
  title: string
  src: string
}

const URL_PATTERN =
  /^https?:\/\/(www\.)?([^/]+)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i

function ensureHttps(url: string): string {
  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('http://')) return url.replace('http://', 'https://')
  if (!url.startsWith('https://')) return `https://${url}`
  return url
}

function extractVideoId(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([^&]+)/)
  if (watchMatch) return watchMatch[1]
  const shortMatch = url.match(/youtu\.be\/([^/?]+)/)
  if (shortMatch) return shortMatch[1]
  const embedMatch = url.match(/youtube\.com\/embed\/([^/?]+)/)
  if (embedMatch) return embedMatch[1]
  return null
}

function extractLoomId(url: string): string | null {
  const shareMatch = url.match(/loom\.com\/share\/([^/?]+)/)
  if (shareMatch) return shareMatch[1]
  const embedMatch = url.match(/loom\.com\/embed\/([^/?]+)/)
  if (embedMatch) return embedMatch[1]
  return null
}

function extractGoogleDocId(url: string, path: string): string | null {
  const match = url.match(new RegExp(`${path}/d/([^/]+)`, 'i'))
  return match ? match[1] : null
}

/**
 * Parse a URL and return embed metadata if it's a supported embeddable URL
 */
export function parseEmbedUrl(url: string): ParseEmbedResult | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  const normalized = ensureHttps(trimmed)
  if (!URL_PATTERN.test(normalized)) return null

  try {
    const parsed = new URL(normalized)
    const host = parsed.hostname.toLowerCase()

    // YouTube
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      const videoId = extractVideoId(normalized)
      if (!videoId) return null
      const embedUrl = `https://www.youtube.com/embed/${videoId}`
      return {
        provider: 'youtube',
        embedUrl,
        title: `YouTube video ${videoId}`,
        src: normalized,
      }
    }

    // Loom
    if (host.includes('loom.com')) {
      const loomId = extractLoomId(normalized)
      if (!loomId) return null
      const embedUrl = `https://www.loom.com/embed/${loomId}`
      return {
        provider: 'loom',
        embedUrl,
        title: `Loom video ${loomId}`,
        src: normalized,
      }
    }

    // Figma
    if (host.includes('figma.com')) {
      const figmaMatch = normalized.match(
        /figma\.com\/(file|design|proto)\/([^/?]+)/
      )
      if (!figmaMatch) return null
      const embedUrl = `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(normalized)}`
      const fileId = figmaMatch[2]
      return {
        provider: 'figma',
        embedUrl,
        title: `Figma ${figmaMatch[1]} ${fileId}`,
        src: normalized,
      }
    }

    // Google Sheets
    if (host.includes('docs.google.com') && normalized.includes('/spreadsheets/')) {
      const sheetId = extractGoogleDocId(normalized, 'spreadsheets')
      if (!sheetId) return null
      const embedUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/pubhtml?widget=true`
      return {
        provider: 'google-sheets',
        embedUrl,
        title: `Google Sheet ${sheetId}`,
        src: normalized,
      }
    }

    // Google Docs
    if (host.includes('docs.google.com') && normalized.includes('/document/')) {
      const docId = extractGoogleDocId(normalized, 'document')
      if (!docId) return null
      const embedUrl = `https://docs.google.com/document/d/${docId}/pub?embedded=true`
      return {
        provider: 'google-docs',
        embedUrl,
        title: `Google Doc ${docId}`,
        src: normalized,
      }
    }

    // Generic: any https URL
    if (normalized.startsWith('https://')) {
      return {
        provider: 'generic',
        embedUrl: normalized,
        title: parsed.pathname.split('/').filter(Boolean).pop() || 'Embed',
        src: normalized,
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Check if a string looks like a URL that could be embeddable
 */
export function isEmbeddableUrl(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > 2048) return false
  return parseEmbedUrl(trimmed) !== null
}
