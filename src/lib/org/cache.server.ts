/**
 * Server-side caching utilities for Org Center data loaders.
 * Provides TTL-based caching (1-5 minutes) to reduce database load.
 * 
 * Uses in-memory cache with timestamps. For production, consider Redis.
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
};

const cacheStore = new Map<string, CacheEntry<unknown>>();

/**
 * Get cached value if it exists and hasn't expired.
 */
function getCached<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cacheStore.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Set a cached value with TTL.
 */
function setCached<T>(key: string, data: T, ttlMs: number): void {
  cacheStore.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
}

/**
 * Clear a specific cache entry.
 */
export function clearCache(key: string): void {
  cacheStore.delete(key);
}

/**
 * Clear all cache entries (useful for testing or cache invalidation).
 */
export function clearAllCache(): void {
  cacheStore.clear();
}

/**
 * Wrap a function with TTL-based caching.
 * Combines React.cache() for request deduplication with TTL caching for cross-request reuse.
 * 
 * @param fn - The function to cache
 * @param keyGenerator - Function that generates cache key from function arguments
 * @param ttlMs - Time to live in milliseconds (default: 1 minute)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic function wrapper requires flexible constraints
export function withTTLCache<T extends (...args: any[]) => Promise<unknown>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttlMs: number = 60 * 1000 // 1 minute default
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    // Generate cache key from args
    const cacheKey = keyGenerator(...args);

    // Check cache first
    const cached = getCached<ReturnType<T>>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Call function and cache result
    const result = await fn(...args);
    setCached(cacheKey, result, ttlMs);
    return result as ReturnType<T>;
  }) as T;
}

/**
 * Cache key generators for consistent key naming.
 */
export const cacheKeys = {
  orgOverviewStats: (workspaceId: string) => `org:stats:${workspaceId}`,
  orgPeople: (workspaceId: string, filters?: string) => `org:people:${workspaceId}:${filters || 'default'}`,
  orgStructure: (workspaceId: string) => `org:structure:${workspaceId}`,
  orgPermissionContext: (userId: string, workspaceId: string) => `org:perms:${userId}:${workspaceId}`,
  orgInsights: (workspaceId: string, options?: string) => `org:insights:${workspaceId}:${options || 'default'}`,
};

