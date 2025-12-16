import { prisma } from '@/lib/db'

export interface FeatureFlags {
  enableAssistant: boolean
  enableRealtime: boolean
  enableNewLayout: boolean
  enableAdvancedAnalytics: boolean
  enableBetaFeatures: boolean
}

/**
 * Get feature flags based on environment and workspace configuration
 */
export async function getFeatureFlags(workspaceId?: string): Promise<FeatureFlags> {
  const isProduction = process.env.NODE_ENV === 'production'
  const prodLock = process.env.PROD_LOCK === 'true'
  const enableAssistant = process.env.ENABLE_ASSISTANT === 'true'
  const enableRealtime = process.env.NEXT_PUBLIC_ENABLE_SOCKET_IO === 'true'
  const enableNewLayout = process.env.NEXT_PUBLIC_USE_NEW_LAYOUT === 'true'

  // Base flags from environment
  const baseFlags: FeatureFlags = {
    enableAssistant: enableAssistant && !prodLock,
    enableRealtime: enableRealtime && !prodLock,
    enableNewLayout: enableNewLayout,
    enableAdvancedAnalytics: !isProduction || !prodLock, // Only in dev/staging
    enableBetaFeatures: !isProduction || !prodLock, // Only in dev/staging
  }

  // If workspaceId provided, check workspace-specific overrides
  if (workspaceId) {
    try {
      const workspaceFlags = await prisma.featureFlag.findMany({
        where: { workspaceId },
        select: { key: true, enabled: true }
      })

      // Apply workspace-specific overrides
      workspaceFlags.forEach(flag => {
        switch (flag.key) {
          case 'enable_assistant':
            baseFlags.enableAssistant = flag.enabled
            break
          case 'enable_realtime':
            baseFlags.enableRealtime = flag.enabled
            break
          case 'enable_new_layout':
            baseFlags.enableNewLayout = flag.enabled
            break
          case 'enable_advanced_analytics':
            baseFlags.enableAdvancedAnalytics = flag.enabled
            break
          case 'enable_beta_features':
            baseFlags.enableBetaFeatures = flag.enabled
            break
        }
      })
    } catch (error) {
      console.warn('Failed to fetch workspace feature flags:', error)
    }
  }

  return baseFlags
}

/**
 * Check if a specific feature is enabled
 */
export async function isFeatureEnabled(
  feature: keyof FeatureFlags,
  workspaceId?: string
): Promise<boolean> {
  const flags = await getFeatureFlags(workspaceId)
  return flags[feature]
}

/**
 * Set a workspace-specific feature flag
 */
export async function setFeatureFlag(
  workspaceId: string,
  key: string,
  enabled: boolean
): Promise<void> {
  await prisma.featureFlag.upsert({
    where: {
      workspaceId_key: {
        workspaceId,
        key
      }
    },
    update: { enabled },
    create: {
      workspaceId,
      key,
      enabled
    }
  })
}

/**
 * Get production-safe feature flags (no workspace overrides)
 */
export function getProductionFeatureFlags(): FeatureFlags {
  const isProduction = process.env.NODE_ENV === 'production'
  const prodLock = process.env.PROD_LOCK === 'true'
  const enableAssistant = process.env.ENABLE_ASSISTANT === 'true'
  const enableRealtime = process.env.NEXT_PUBLIC_ENABLE_SOCKET_IO === 'true'
  const enableNewLayout = process.env.NEXT_PUBLIC_USE_NEW_LAYOUT === 'true'

  return {
    enableAssistant: enableAssistant && !prodLock,
    enableRealtime: enableRealtime && !prodLock,
    enableNewLayout: enableNewLayout,
    enableAdvancedAnalytics: !isProduction || !prodLock,
    enableBetaFeatures: !isProduction || !prodLock,
  }
}