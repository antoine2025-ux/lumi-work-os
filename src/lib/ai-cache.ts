// Simple in-memory cache for AI responses
const cache = new Map<string, { response: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function getCachedResponse(key: string): string | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response
  }
  cache.delete(key)
  return null
}

export function setCachedResponse(key: string, response: string): void {
  cache.set(key, {
    response,
    timestamp: Date.now()
  })
}

export function generateCacheKey(message: string, sessionId: string): string {
  return `ai_${sessionId}_${message.slice(0, 100).replace(/\s+/g, '_')}`
}
