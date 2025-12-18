/**
 * Loopbrain Answer Format Validator
 * 
 * Lightweight validation to ensure LLM answers follow template structure.
 * Used for debugging and quality monitoring.
 */

import { LoopbrainIntent } from './intent-router'

/**
 * Format validation result
 */
export interface FormatValidation {
  ok: boolean
  missingSections: string[]
}

/**
 * Validate template compliance for an answer
 * 
 * Checks if the answer contains required sections based on intent.
 * This is a lightweight check - does not validate content quality.
 */
export function validateTemplateCompliance(
  answer: string,
  intent: LoopbrainIntent
): FormatValidation {
  const answerLower = answer.toLowerCase()
  const missingSections: string[] = []

  switch (intent) {
    case 'capacity_planning':
      // Check for required headings
      const capacitySections = [
        'what you need',
        'constraints',
        'recommended coverage',
        'risks',
        'what i\'m missing'
      ]
      
      for (const section of capacitySections) {
        // Check for heading (## or ### or **)
        const hasHeading = 
          answerLower.includes(`## ${section}`) ||
          answerLower.includes(`### ${section}`) ||
          answerLower.includes(`**${section}**`) ||
          answerLower.includes(`**${section.replace(/'/g, '')}**`) ||
          // Also check for variations
          (section === 'what you need' && (
            answerLower.includes('what you need') ||
            answerLower.includes('requirement')
          )) ||
          (section === 'what i\'m missing' && (
            answerLower.includes('what i\'m missing') ||
            answerLower.includes('missing') ||
            answerLower.includes('data gaps')
          ))
        
        if (!hasHeading) {
          missingSections.push(section)
        }
      }
      break

    case 'status_update':
      const statusSections = [
        'current status',
        'what\'s blocking',
        'next',
        'risks'
      ]
      
      for (const section of statusSections) {
        const hasSection = 
          answerLower.includes(section) ||
          (section === 'next' && answerLower.includes('next action')) ||
          (section === 'risks' && (answerLower.includes('risk') || answerLower.includes('due date')))
        
        if (!hasSection) {
          missingSections.push(section)
        }
      }
      break

    case 'who_is_responsible':
      // Check for direct answer and explanation
      const hasDirectAnswer = 
        answerLower.includes('is responsible') ||
        answerLower.includes('owns') ||
        answerLower.includes('assigned to') ||
        answerLower.includes('handles')
      
      if (!hasDirectAnswer) {
        missingSections.push('direct answer')
      }
      break

    case 'find_document':
    case 'how_to':
      // Check for doc list and excerpts
      const hasDocList = 
        answerLower.includes('doc') ||
        answerLower.includes('page') ||
        answerLower.includes('document')
      
      if (!hasDocList) {
        missingSections.push('document list')
      }
      break

    case 'list_entities':
      // Check for list format
      const hasList = 
        answerLower.includes('- ') ||
        answerLower.includes('* ') ||
        answerLower.includes('1.') ||
        answerLower.includes('•')
      
      if (!hasList) {
        missingSections.push('list format')
      }
      break

    case 'prioritization':
      // Check for ranking and criteria
      const hasRanking = 
        answerLower.includes('rank') ||
        answerLower.includes('priority') ||
        answerLower.includes('1.') ||
        answerLower.includes('top')
      
      if (!hasRanking) {
        missingSections.push('ranking')
      }
      break

    case 'summarize':
      // Check for summary format
      const hasSummary = 
        answerLower.includes('tldr') ||
        answerLower.includes('summary') ||
        answerLower.includes('key point')
      
      if (!hasSummary) {
        missingSections.push('summary format')
      }
      break

    default:
      // Unknown intent - no specific validation
      break
  }

  return {
    ok: missingSections.length === 0,
    missingSections
  }
}

