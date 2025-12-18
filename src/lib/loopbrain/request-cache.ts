/**
 * Request-Scoped Cache
 * 
 * In-memory cache scoped to a single request lifecycle.
 * Prevents duplicate fetches within the same request.
 * 
 * Rules:
 * - Cache is per-request only (in-memory map)
 * - No persistence across requests
 * - Thread-safe for single-threaded Node.js
 */

export type CacheKey = string

/**
 * Request-scoped cache implementation
 */
export class RequestCache {
  private cache: Map<CacheKey, unknown> = new Map()

  /**
   * Get a value from cache
   * 
   * @param key - Cache key
   * @returns Cached value or undefined
   */
  get<T>(key: CacheKey): T | undefined {
    return this.cache.get(key) as T | undefined
  }

  /**
   * Set a value in cache
   * 
   * @param key - Cache key
   * @param value - Value to cache
   */
  set<T>(key: CacheKey, value: T): void {
    this.cache.set(key, value)
  }

  /**
   * Check if a key exists in cache
   * 
   * @param key - Cache key
   * @returns True if key exists
   */
  has(key: CacheKey): boolean {
    return this.cache.has(key)
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache size
   * 
   * @returns Number of cached entries
   */
  size(): number {
    return this.cache.size
  }
}

/**
 * Make a deterministic cache key from parts
 * 
 * @param parts - Key parts (workspaceId, type, entityId, etc.)
 * @returns Deterministic cache key string
 */
export function makeCacheKey(parts: Record<string, string | number | boolean | undefined>): CacheKey {
  // Sort keys for deterministic output
  const sortedKeys = Object.keys(parts).sort()
  const keyParts = sortedKeys
    .map(key => {
      const value = parts[key]
      if (value === undefined || value === null) {
        return `${key}:null`
      }
      return `${key}:${String(value)}`
    })
    .join('|')
  
  return keyParts
}

/**
 * Create a new request cache instance
 * 
 * @returns New RequestCache instance
 */
export function createRequestCache(): RequestCache {
  return new RequestCache()
}

