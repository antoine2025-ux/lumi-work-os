/**
 * Loopbrain Org Configuration
 * 
 * Environment-based configuration for Org Loopbrain features.
 * Provides safety defaults and allows runtime configuration.
 */

export const LOOPBRAIN_ORG_CONFIG = {
  /**
   * Global enable/disable flag for Org Loopbrain
   * Defaults to enabled in non-production environments
   */
  enabledGlobally:
    process.env.LOOPBRAIN_ORG_ENABLED === "true" || process.env.NODE_ENV !== "production",

  /**
   * LLM model to use for Org queries
   * Default: claude-sonnet-4-6 (excellent reasoning for org queries)
   */
  model: process.env.LOOPBRAIN_ORG_MODEL || "claude-sonnet-4-6",

  /**
   * Maximum tokens for Org responses
   * Default: 700 (keeps responses concise)
   */
  maxTokens: Number(process.env.LOOPBRAIN_ORG_MAX_TOKENS || "700"),

  /**
   * Timeout for Org LLM calls (milliseconds)
   * Default: 20000 (20 seconds)
   */
  timeoutMs: Number(process.env.LOOPBRAIN_ORG_TIMEOUT_MS || "20000"),
};

