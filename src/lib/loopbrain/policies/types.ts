/**
 * Policy suggestion types for AI-assisted refinement.
 * Used when compilation produces warnings; the LLM suggests concrete improvements.
 */

export interface PolicySuggestion {
  id: string
  title: string
  category: 'specificity' | 'assignment' | 'error_handling' | 'structure'
  severity: 'low' | 'medium' | 'high'
  affectedStep?: number
  currentText: string
  issue: string
  suggestedFix: string
  reasoning: string
}
