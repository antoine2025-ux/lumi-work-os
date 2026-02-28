import { createClient } from 'redis'

export interface RateLimitConfig {
  windowMs: number  // time window in milliseconds
  max: number       // max requests per window
  identifier: string // key prefix (e.g. 'newsletter', 'health')
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: Date
}

// ── Redis connection (lazy-init, same pattern as cache.ts) ─────────────────────

const globalForRateLimit = globalThis as unknown as {
  rateLimitRedis: ReturnType<typeof createClient> | null | undefined
  rateLimitRedisAvailable: boolean | undefined
}

let redisClient = globalForRateLimit.rateLimitRedis ?? null
let isRedisAvailable = globalForRateLimit.rateLimitRedisAvailable ?? false

async function getRedisClient(): Promise<ReturnType<typeof createClient> | null> {
  if (redisClient !== null) return redisClient

  const url = process.env.REDIS_URL
  if (!url) return null

  try {
    const client = createClient({
      url,
      socket: { connectTimeout: 3000 },
    })

    client.on('error', () => { isRedisAvailable = false })
    client.on('ready', () => { isRedisAvailable = true })

    await client.connect()
    redisClient = client
    isRedisAvailable = true

    if (process.env.NODE_ENV !== 'production') {
      globalForRateLimit.rateLimitRedis = client
      globalForRateLimit.rateLimitRedisAvailable = true
    }

    return client
  } catch {
    isRedisAvailable = false
    return null
  }
}

// ── In-memory fallback (fixed window counter) ──────────────────────────────────

interface MemoryEntry {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, MemoryEntry>()

function memoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  // Fixed window bucket: one bucket per window interval
  const bucket = Math.floor(now / config.windowMs)
  const storeKey = `${key}:${bucket}`
  const resetAt = new Date((bucket + 1) * config.windowMs)

  const existing = memoryStore.get(storeKey)
  if (!existing) {
    memoryStore.set(storeKey, { count: 1, resetAt: resetAt.getTime() })
    // Periodically evict expired entries to prevent unbounded growth
    if (memoryStore.size > 5000) {
      for (const [k, v] of memoryStore.entries()) {
        if (now > v.resetAt) memoryStore.delete(k)
      }
    }
    return { success: true, remaining: config.max - 1, resetAt }
  }

  existing.count++
  return {
    success: existing.count <= config.max,
    remaining: Math.max(0, config.max - existing.count),
    resetAt,
  }
}

// ── IP extraction ──────────────────────────────────────────────────────────────

function getClientIp(request: Request): string {
  const headers = request.headers
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}

// ── Main rate limiter ──────────────────────────────────────────────────────────

export async function rateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const ip = getClientIp(request)
  const key = `rl:${config.identifier}:${ip}`
  const now = Date.now()
  const windowStart = now - config.windowMs
  const resetAt = new Date(now + config.windowMs)

  try {
    const client = await getRedisClient()

    if (client && isRedisAvailable) {
      // Sliding window via sorted set (atomic MULTI/EXEC block)
      const member = `${now}-${Math.random().toString(36).slice(2)}`
      const multi = client.multi()
      multi.zRemRangeByScore(key, 0, windowStart)
      multi.zAdd(key, [{ score: now, value: member }])
      multi.zCard(key)
      multi.pExpire(key, config.windowMs)

      const results = await multi.exec()
      // results[2] is ZCARD output (number of members after cleanup + add)
      const count = (results[2] as unknown as number) ?? 0

      return {
        success: count <= config.max,
        remaining: Math.max(0, config.max - count),
        resetAt,
      }
    }
  } catch {
    // Redis unavailable — fall through to in-memory fallback
    isRedisAvailable = false
  }

  return memoryRateLimit(key, config)
}
