/**
 * Context Quality Tracker
 * 
 * Dev-only module for tracking ContextObject contract compliance during orchestration.
 * Provides summary statistics and top offenders for debugging.
 */

import type { ContextObject } from '@/lib/context/context-types'
import { assertContextObjectContract } from '@/lib/context/context-contract'

export type ContextQualityOffender = {
  type: string
  id: string
  workspaceId: string
  errors: string[]
  warnings: string[]
}

export type ContextQualitySummary = {
  totalValidated: number
  errorCount: number
  warningCount: number
  fallbackTitleCount: number
  fallbackSummaryCount: number
  offenders: ContextQualityOffender[] // capped at 5
}

type QualityTrackOptions = {
  requestId?: string
  // allow caller to mark when they used fallback values (so we can count)
  usedFallbackTitle?: boolean
  usedFallbackSummary?: boolean
}

export function createContextQualityTracker() {
  const summary: ContextQualitySummary = {
    totalValidated: 0,
    errorCount: 0,
    warningCount: 0,
    fallbackTitleCount: 0,
    fallbackSummaryCount: 0,
    offenders: [],
  }

  function track(obj: ContextObject, opts?: QualityTrackOptions) {
    summary.totalValidated += 1

    if (opts?.usedFallbackTitle) summary.fallbackTitleCount += 1
    if (opts?.usedFallbackSummary) summary.fallbackSummaryCount += 1

    const result = assertContextObjectContract(obj)

    if (result.errors.length === 0 && result.warnings.length === 0) return

    summary.errorCount += result.errors.length
    summary.warningCount += result.warnings.length

    // capture top offenders (cap 5)
    if (summary.offenders.length < 5) {
      summary.offenders.push({
        type: obj.type,
        id: obj.id,
        workspaceId: obj.workspaceId,
        errors: result.errors,
        warnings: result.warnings,
      })
    }
  }

  return {
    track,
    getSummary: () => summary,
  }
}

