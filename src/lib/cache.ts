import { createClient } from 'redis'

// Redis client configuration
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 10000,
    lazyConnect: true
  }
})

// Connection handling
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err)
})

redisClient.on('connect', () => {
  console.log('✅ Redis connected')
})

// Initialize connection
if (!redisClient.isOpen) {
  redisClient.connect().catch(console.error)
}

/**
 * Cache utility functions
 */
export class CacheService {
  private static instance: CacheService
  private client = redisClient

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  /**
   * Set cache with TTL
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      const serialized = JSON.stringify(value)
      await this.client.setEx(key, ttlSeconds, serialized)
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.client.get(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  /**
   * Delete cache key
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key)
    } catch (error) {
      console.error('Cache delete error:', error)
    }
  }

  /**
   * Generate cache key for workspace-scoped data
   */
  generateKey(prefix: string, workspaceId: string, ...params: string[]): string {
    return `${prefix}:${workspaceId}:${params.join(':')}`
  }

  /**
   * Cache workspace data with automatic invalidation
   */
  async cacheWorkspaceData<T>(
    key: string,
    workspaceId: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cacheKey = this.generateKey(key, workspaceId)
    
    // Try to get from cache first
    const cached = await this.get<T>(cacheKey)
    if (cached) {
      return cached
    }

    // Fetch fresh data
    const data = await fetcher()
    
    // Cache the result
    await this.set(cacheKey, data, ttlSeconds)
    
    return data
  }

  /**
   * Invalidate workspace cache
   */
  async invalidateWorkspace(workspaceId: string): Promise<void> {
    try {
      const pattern = `*:${workspaceId}:*`
      const keys = await this.client.keys(pattern)
      if (keys.length > 0) {
        await this.client.del(keys)
      }
    } catch (error) {
      console.error('Cache invalidation error:', error)
    }
  }
}

// Export singleton instance
export const cache = CacheService.getInstance()

// Cache key constants
export const CACHE_KEYS = {
  TASKS: 'tasks',
  PROJECTS: 'projects',
  WIKI_PAGES: 'wiki_pages',
  AI_CONTEXT: 'ai_context',
  USER_PROFILE: 'user_profile',
  WORKSPACE_MEMBERS: 'workspace_members'
} as const

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  SHORT: 60,      // 1 minute
  MEDIUM: 300,    // 5 minutes
  LONG: 1800,     // 30 minutes
  VERY_LONG: 3600 // 1 hour
} as const