import { createClient } from 'redis'

// Redis client configuration with graceful fallback to in-memory cache
let redisClient: any = null;
let isRedisAvailable = false;

// In-memory fallback cache when Redis is not available
const memoryCache = new Map<string, { data: any; expires: number }>();
const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes default

function getMemoryCache(key: string): any | null {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  
  if (Date.now() > cached.expires) {
    memoryCache.delete(key);
    return null;
  }
  
  return cached.data;
}

function setMemoryCache(key: string, data: any, ttl: number = MEMORY_CACHE_TTL): void {
  memoryCache.set(key, {
    data,
    expires: Date.now() + ttl * 1000
  });
  
  // Clean up expired entries periodically
  if (memoryCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of memoryCache.entries()) {
      if (now > v.expires) {
        memoryCache.delete(k);
      }
    }
  }
}

async function initializeRedis() {
  if (redisClient) return redisClient;
  
  try {
    if (!process.env.REDIS_URL) {
      // Silent fallback - use memory cache instead
      return null;
    }
    
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true
      }
    });
    
    redisClient.on('error', (err: Error) => {
      // Silent fallback - use memory cache instead
      isRedisAvailable = false;
    });
    
    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
      isRedisAvailable = true;
    });
    
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    // Silent fallback - use memory cache instead
    isRedisAvailable = false;
    return null;
  }
}

async function connectRedis() {
  if (!redisClient) {
    redisClient = await initializeRedis();
  }
  return redisClient;
}

export const CACHE_KEYS = {
  WIKI_PAGES: 'wiki_pages',
  PROJECTS: 'projects',
  TASKS: 'tasks',
  AI_CONTEXT: 'ai_context',
  USER_STATUS: 'user_status',
  WORKSPACE_DATA: 'workspace_data',
  PERMISSIONS: 'permissions',
  ORG_POSITIONS: 'org_positions',
  ONBOARDING_PLANS: 'onboarding_plans',
  ACTIVITIES: 'activities',
  FAVORITES: 'favorites',
  SEARCH_RESULTS: 'search_results',
  CALENDAR_EVENTS: 'calendar_events',
  PROJECT_TEMPLATES: 'project_templates',
  TASK_TEMPLATES: 'task_templates',
  MIGRATIONS: 'migrations',
  FEATURE_FLAGS: 'feature_flags',
  HEALTH_CHECK: 'health_check',
  ANALYTICS: 'analytics',
  AUDIT_LOGS: 'audit_logs'
} as const;

export const CACHE_TTL = {
  SHORT: 60 * 5, // 5 minutes
  MEDIUM: 60 * 30, // 30 minutes
  LONG: 60 * 60, // 1 hour
  VERY_LONG: 60 * 60 * 24, // 24 hours
  USER_SESSION: 60 * 60 * 2, // 2 hours
  WORKSPACE_DATA: 60 * 15, // 15 minutes
  PERMISSIONS: 60 * 10, // 10 minutes
  AI_CONTEXT: 60 * 5, // 5 minutes
  SEARCH_RESULTS: 60 * 2, // 2 minutes
  CALENDAR_EVENTS: 60 * 10, // 10 minutes
  TEMPLATES: 60 * 60 * 6, // 6 hours
  STATIC_DATA: 60 * 60 * 12, // 12 hours
  REAL_TIME: 30, // 30 seconds
  IMMEDIATE: 10 // 10 seconds
} as const;

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = await connectRedis();
      if (client && isRedisAvailable) {
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
      }
      
      // Fallback to in-memory cache
      return getMemoryCache(key) as T | null;
    } catch (error) {
      // Fallback to in-memory cache on error
      return getMemoryCache(key) as T | null;
    }
  },

  async set<T>(key: string, data: T, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    try {
      const client = await connectRedis();
      if (client && isRedisAvailable) {
        await client.setEx(key, ttl, JSON.stringify(data));
      }
      
      // Always set in-memory cache as fallback
      setMemoryCache(key, data, ttl);
    } catch (error) {
      // Fallback to in-memory cache on error
      setMemoryCache(key, data, ttl);
    }
  },

  async del(key: string): Promise<void> {
    try {
      const client = await connectRedis();
      if (!client || !isRedisAvailable) {
        return;
      }
      
      await client.del(key);
    } catch (error) {
      console.warn('Cache del error:', error);
    }
  },

  async invalidateWorkspace(workspaceId: string): Promise<void> {
    try {
      const client = await connectRedis();
      if (!client || !isRedisAvailable) {
        return;
      }
      
      const keys = await client.keys(`${workspaceId}:*`);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      console.warn('Cache invalidateWorkspace error:', error);
    }
  },

  generateKey(...parts: (string | undefined)[]): string {
    return parts.filter(Boolean).join(':');
  },

  async cacheWorkspaceData<T>(
    cacheKey: string,
    workspaceId: string,
    fetcher: () => Promise<T>,
    ttl: number = CACHE_TTL.MEDIUM
  ): Promise<T> {
    try {
      const cached = await this.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
      
      const data = await fetcher();
      await this.set(cacheKey, data, ttl);
      return data;
    } catch (error) {
      console.warn('Cache cacheWorkspaceData error:', error);
      // Fallback to direct fetch if caching fails
      return await fetcher();
    }
  },

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const client = await connectRedis();
      if (!client || !isRedisAvailable) {
        return;
      }
      
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      console.warn('Cache invalidatePattern error:', error);
    }
  },

  async flushAll(): Promise<void> {
    try {
      const client = await connectRedis();
      if (!client || !isRedisAvailable) {
        return;
      }
      
      await client.flushAll();
    } catch (error) {
      console.warn('Cache flushAll error:', error);
    }
  },

  async getStats(): Promise<{ isAvailable: boolean; keyCount?: number }> {
    try {
      const client = await connectRedis();
      if (!client || !isRedisAvailable) {
        return { isAvailable: false };
      }
      
      const keys = await client.keys('*');
      return { isAvailable: true, keyCount: keys.length };
    } catch (error) {
      console.warn('Cache getStats error:', error);
      return { isAvailable: false };
    }
  }
};

// Initialize Redis connection on module load
initializeRedis().catch(console.warn);
