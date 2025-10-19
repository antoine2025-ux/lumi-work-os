interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>()
  private maxSize = 1000 // Maximum number of items in cache

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  // Generate cache key from parameters
  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|')
    
    return `${prefix}:${sortedParams}`
  }

  // Cache with automatic key generation
  setWithParams<T>(prefix: string, params: Record<string, any>, data: T, ttlSeconds: number = 300): void {
    const key = this.generateKey(prefix, params)
    this.set(key, data, ttlSeconds)
  }

  getWithParams<T>(prefix: string, params: Record<string, any>): T | null {
    const key = this.generateKey(prefix, params)
    return this.get<T>(key)
  }
}

export const cache = new MemoryCache()

// Cache decorator for functions
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  ttlSeconds: number = 300,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : `fn:${fn.name}:${JSON.stringify(args)}`
    
    // Try to get from cache first
    const cached = cache.get(key)
    if (cached !== null) {
      return cached
    }

    // Execute function and cache result
    const result = await fn(...args)
    cache.set(key, result, ttlSeconds)
    
    return result
  }) as T
}

// Cache invalidation helpers
export function invalidateCache(pattern: string): void {
  // Simple pattern matching - in production, use Redis with pattern matching
  for (const key of cache['cache'].keys()) {
    if (key.includes(pattern)) {
      cache.delete(key)
    }
  }
}

export function invalidateUserCache(userId: string): void {
  invalidateCache(`user:${userId}`)
}

export function invalidateWorkspaceCache(workspaceId: string): void {
  invalidateCache(`workspace:${workspaceId}`)
}



