/**
 * ContextObject Contract Validation
 * 
 * Shared validation logic for ContextObject contracts.
 * Used by both tests and runtime dev-only checks.
 */

import { ContextObject, ContextObjectType } from './context-types'

/**
 * Result of contract validation
 */
export interface ContractValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Assert ContextObject contract compliance
 * 
 * Returns validation result with detailed errors/warnings.
 * Does NOT throw - caller decides whether to throw or log.
 * 
 * @param obj - The ContextObject to validate
 * @param expectedType - Optional expected type (for stricter validation)
 * @returns Validation result with errors and warnings
 */
export function assertContextObjectContract(
  obj: ContextObject,
  expectedType?: ContextObjectType
): ContractValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields - these are errors
  if (!obj.id) {
    errors.push(`Missing 'id' field`)
  } else if (typeof obj.id !== 'string') {
    errors.push(`Invalid 'id' type: expected string, got ${typeof obj.id}`)
  } else if (obj.id.trim() === '') {
    errors.push(`Empty 'id' field`)
  }

  if (!obj.type) {
    errors.push(`Missing 'type' field`)
  } else if (typeof obj.type !== 'string') {
    errors.push(`Invalid 'type' type: expected string, got ${typeof obj.type}`)
  } else if (expectedType && obj.type !== expectedType) {
    errors.push(`Type mismatch: expected '${expectedType}', got '${obj.type}'`)
  }

  if (!obj.workspaceId) {
    errors.push(`Missing 'workspaceId' field`)
  } else if (typeof obj.workspaceId !== 'string') {
    errors.push(`Invalid 'workspaceId' type: expected string, got ${typeof obj.workspaceId}`)
  } else if (obj.workspaceId.trim() === '') {
    errors.push(`Empty 'workspaceId' field`)
  }

  if (obj.title === undefined || obj.title === null) {
    errors.push(`Missing 'title' field`)
  } else if (typeof obj.title !== 'string') {
    errors.push(`Invalid 'title' type: expected string, got ${typeof obj.title}`)
  } else if (obj.title.trim() === '') {
    warnings.push(`Empty 'title' field (will use fallback)`)
  }

  if (obj.summary === undefined || obj.summary === null) {
    errors.push(`Missing 'summary' field`)
  } else if (typeof obj.summary !== 'string') {
    errors.push(`Invalid 'summary' type: expected string, got ${typeof obj.summary}`)
  } else if (obj.summary.trim() === '') {
    warnings.push(`Empty 'summary' field`)
  }

  if (!obj.tags) {
    errors.push(`Missing 'tags' field`)
  } else if (!Array.isArray(obj.tags)) {
    errors.push(`Invalid 'tags' type: expected array, got ${typeof obj.tags}`)
  }

  if (!obj.updatedAt) {
    errors.push(`Missing 'updatedAt' field`)
  } else if (!(obj.updatedAt instanceof Date)) {
    errors.push(`Invalid 'updatedAt' type: expected Date, got ${typeof obj.updatedAt}`)
  }

  if (!obj.relations) {
    errors.push(`Missing 'relations' field`)
  } else if (!Array.isArray(obj.relations)) {
    errors.push(`Invalid 'relations' type: expected array, got ${typeof obj.relations}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

