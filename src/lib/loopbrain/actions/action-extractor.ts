/**
 * Action Extractor
 * 
 * Extracts and validates actions from LLM responses.
 * Actions are proposed in ACTIONS_JSON blocks and require explicit user confirmation.
 */

import { LoopbrainAction, LoopbrainActionSchema } from './action-types'
import { logger } from '@/lib/logger'

/**
 * Extract actions from LLM response
 * 
 * Looks for ACTIONS_JSON code blocks and validates them.
 * 
 * @param content - LLM response content
 * @returns Array of validated actions (empty if none found or invalid)
 */
export function extractActions(content: string): LoopbrainAction[] {
  const actions: LoopbrainAction[] = []

  try {
    // Look for ACTIONS_JSON code block
    const actionsJsonMatch = content.match(/```(?:json)?\s*ACTIONS_JSON\s*\n([\s\S]*?)\n```/i)
    
    if (!actionsJsonMatch) {
      return actions
    }

    const jsonContent = actionsJsonMatch[1].trim()

    // Parse JSON
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonContent)
    } catch (parseError) {
      logger.warn('Failed to parse ACTIONS_JSON', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        jsonContent: jsonContent.substring(0, 200), // Log first 200 chars
      })
      return actions
    }

    // Validate: must be an array
    if (!Array.isArray(parsed)) {
      logger.warn('ACTIONS_JSON is not an array', {
        type: typeof parsed,
      })
      return actions
    }

    // Validate each action
    for (const item of parsed) {
      const validationResult = LoopbrainActionSchema.safeParse(item)

      if (validationResult.success) {
        actions.push(validationResult.data)
      } else {
        logger.warn('Invalid action in ACTIONS_JSON', {
          action: item,
          errors: validationResult.error.errors,
        })
      }
    }
  } catch (error) {
    logger.warn('Error extracting actions from LLM response', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return actions
}

/**
 * Remove ACTIONS_JSON blocks from content
 * 
 * @param content - Content with ACTIONS_JSON blocks
 * @returns Content with ACTIONS_JSON blocks removed
 */
export function removeActionsJson(content: string): string {
  return content.replace(/```(?:json)?\s*ACTIONS_JSON\s*\n[\s\S]*?\n```/gi, '')
}

