/**
 * Loopbrain LLM Caller
 * 
 * Shared utility for calling LLMs across Loopbrain components.
 * Used by agent planner, scenario handlers, and other Loopbrain modules.
 * 
 * Extracted from orchestrator.ts (March 11, 2026) when the orchestrator was deleted.
 */

import { generateAIResponse } from '@/lib/ai/providers'
import { logger } from '@/lib/logger'
import type { OrgDebugSnapshot } from '@/types/loopbrain-org-debug'

/**
 * Default LLM model for Loopbrain
 */
const DEFAULT_LOOPBRAIN_MODEL = 'claude-sonnet-4-6'

/**
 * Dev-only: Track last Org debug snapshot for debugging routing decisions
 */
let lastOrgDebugSnapshot: OrgDebugSnapshot | null = null

/**
 * Set Org debug snapshot (dev-only)
 */
function setOrgDebugSnapshot(snapshot: OrgDebugSnapshot) {
  if (process.env.NODE_ENV !== "development") return
  lastOrgDebugSnapshot = snapshot
}

/**
 * Get last Org debug snapshot (dev-only)
 */
export function getLastOrgDebugSnapshot(): OrgDebugSnapshot | null {
  return lastOrgDebugSnapshot
}

/**
 * Call Loopbrain LLM with a prompt and optional system prompt.
 * 
 * This is a thin wrapper around generateAIResponse that provides Loopbrain-specific
 * defaults and error handling.
 * 
 * @param prompt - User prompt
 * @param systemPrompt - Optional system prompt (defaults to Loopbrain COO prompt)
 * @param options - Optional configuration (model, maxTokens, timeoutMs)
 * @returns LLM response with content, model, and usage stats
 */
export async function callLoopbrainLLM(
  prompt: string,
  systemPrompt?: string,
  options?: {
    model?: string
    maxTokens?: number
    timeoutMs?: number
  }
): Promise<{
  content: string
  model: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}> {
  const model = options?.model || process.env.LOOPBRAIN_MODEL || DEFAULT_LOOPBRAIN_MODEL
  const maxTokens = options?.maxTokens || 2000

  try {
    const response = await generateAIResponse(prompt, model, {
      systemPrompt: systemPrompt || 'You are Loopbrain, Loopwell\'s Virtual COO assistant.',
      temperature: 0.7,
      maxTokens
    })

    return {
      content: response.content,
      model: response.model,
      usage: response.usage
    }
  } catch (error: unknown) {
    logger.error('LLM call failed in Loopbrain', { error, model })
    throw new Error(`LLM call failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
