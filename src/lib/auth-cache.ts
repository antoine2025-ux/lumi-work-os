/**
 * Request-level auth caching
 * Caches auth results within a single request to avoid duplicate queries
 */

const requestCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 1000 // 1 second - only for request duration

export function getCachedAuth(key: string): any | null {
  const cached = requestCache.get(key)
  if (!cached) return null
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    requestCache.delete(key)
    return null
  }
  
  return cached.data
}

export function setCachedAuth(key: string, data: any): void {
  requestCache.set(key, { data, timestamp: Date.now() })
  
  // Clean up old entries
  if (requestCache.size > 100) {
    const now = Date.now()
    for (const [k, v] of requestCache.entries()) {
      if (now - v.timestamp > CACHE_TTL) {
        requestCache.delete(k)
      }
    }
  }
}

export function clearAuthCache(): void {
  requestCache.clear()
}



