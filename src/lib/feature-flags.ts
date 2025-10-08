import { prisma } from "@/lib/db"

export interface FeatureFlag {
  key: string
  enabled: boolean
  audience?: any
}

export class FeatureFlagService {
  private static cache = new Map<string, FeatureFlag>()
  private static lastFetch = 0
  private static CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  static async getFlags(workspaceId: string, userId?: string): Promise<Record<string, boolean>> {
    const now = Date.now()
    
    // Return cached flags if still fresh
    if (now - this.lastFetch < this.CACHE_TTL && this.cache.size > 0) {
      const flags: Record<string, boolean> = {}
      for (const [key, flag] of this.cache) {
        flags[key] = this.evaluateFlag(flag, userId)
      }
      return flags
    }

    // Fetch fresh flags from database
    const dbFlags = await prisma.featureFlag.findMany({
      where: { workspaceId },
      select: { key: true, enabled: true, audience: true }
    })

    // Update cache
    this.cache.clear()
    for (const flag of dbFlags) {
      this.cache.set(flag.key, {
        key: flag.key,
        enabled: flag.enabled,
        audience: flag.audience
      })
    }
    this.lastFetch = now

    // Return evaluated flags
    const flags: Record<string, boolean> = {}
    for (const [key, flag] of this.cache) {
      flags[key] = this.evaluateFlag(flag, userId)
    }

    return flags
  }

  static async isEnabled(workspaceId: string, key: string, userId?: string): Promise<boolean> {
    const flags = await this.getFlags(workspaceId, userId)
    return flags[key] || false
  }

  static async setFlag(workspaceId: string, key: string, enabled: boolean, audience?: any): Promise<void> {
    await prisma.featureFlag.upsert({
      where: { workspaceId_key: { workspaceId, key } },
      update: { enabled, audience },
      create: { workspaceId, key, enabled, audience }
    })

    // Invalidate cache
    this.cache.clear()
    this.lastFetch = 0
  }

  private static evaluateFlag(flag: FeatureFlag, userId?: string): boolean {
    if (!flag.enabled) return false

    // If no audience rules, flag is enabled for everyone
    if (!flag.audience) return true

    // Simple audience evaluation (can be extended)
    const audience = flag.audience as any
    if (audience.userIds && userId) {
      return audience.userIds.includes(userId)
    }
    if (audience.roles && userId) {
      // This would need user role lookup - simplified for now
      return true
    }

    return true
  }

  static clearCache(): void {
    this.cache.clear()
    this.lastFetch = 0
  }
}

// Default feature flags for new workspaces
export const DEFAULT_FEATURE_FLAGS = [
  { key: "cmd_k_palette", enabled: true },
  { key: "unified_search", enabled: true },
  { key: "right_click_menus", enabled: true },
  { key: "keyboard_shortcuts", enabled: true },
  { key: "calendar_module", enabled: false },
  { key: "analytics_module", enabled: false },
  { key: "time_tracking", enabled: false },
  { key: "automations", enabled: false },
  { key: "api_access", enabled: false }
]

export async function initializeFeatureFlags(workspaceId: string): Promise<void> {
  for (const flag of DEFAULT_FEATURE_FLAGS) {
    await FeatureFlagService.setFlag(workspaceId, flag.key, flag.enabled)
  }
}
