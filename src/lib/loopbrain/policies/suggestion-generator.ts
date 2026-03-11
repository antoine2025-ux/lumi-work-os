/**
 * Policy Suggestion Generator
 *
 * Uses gpt-4o-mini to turn compilation warnings into structured improvement
 * suggestions that users can apply with one click.
 */

import OpenAI from 'openai'
import { callLoopbrainLLM } from '../orchestrator'
import type { PolicySuggestion } from './types'

const SUGGESTION_MODEL = 'gpt-4o-mini'

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  return new OpenAI({ apiKey })
}

function extractJSON(text: string): string | null {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) return fenceMatch[1].trim()

  const braceStart = text.indexOf('{')
  const braceEnd = text.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd > braceStart) {
    return text.slice(braceStart, braceEnd + 1)
  }

  const bracketStart = text.indexOf('[')
  const bracketEnd = text.lastIndexOf(']')
  if (bracketStart !== -1 && bracketEnd > bracketStart) {
    return text.slice(bracketStart, bracketEnd + 1)
  }

  return null
}

function normalizeSuggestion(
  raw: Record<string, unknown>,
  idx: number,
): PolicySuggestion {
  const baseId = Date.now()
  const validCategory = ['specificity', 'assignment', 'error_handling', 'structure'].includes(
    String(raw.category ?? ''),
  )
    ? (raw.category as PolicySuggestion['category'])
    : 'specificity'
  const validSeverity = ['low', 'medium', 'high'].includes(String(raw.severity ?? ''))
    ? (raw.severity as PolicySuggestion['severity'])
    : 'medium'

  return {
    id: `suggestion-${baseId}-${idx}`,
    title: String(raw.title ?? 'Improvement suggestion'),
    category: validCategory,
    severity: validSeverity,
    affectedStep: typeof raw.affectedStep === 'number' ? raw.affectedStep : undefined,
    currentText: String(raw.currentText ?? ''),
    issue: String(raw.issue ?? ''),
    suggestedFix: String(raw.suggestedFix ?? ''),
    reasoning: String(raw.reasoning ?? ''),
  }
}

function buildPrompt(policyContent: string, warnings: string[]): string {
  return `You are analyzing a Loopbrain automation policy and need to generate specific, actionable suggestions to improve it based on warnings.

**Policy Instructions:**
${policyContent}

**Warnings:**
${warnings.map((w, i) => `${i + 1}. ${w}`).join('\n')}

For each warning, generate a specific suggestion with:
1. A clear title (5-8 words)
2. **currentText**: MUST be an EXACT, character-for-character copy of a substring from the Policy Instructions above. Copy-paste the precise text that the warning refers to. Do NOT paraphrase or shorten.
3. A clear explanation of the issue
4. **suggestedFix**: The improved version of that exact text
5. Brief reasoning (1 sentence)

CRITICAL: currentText must appear verbatim in the Policy Instructions. If the policy says "Search Drive for files named 'Gemini meeting notes' modified in the last 7 days", then currentText must be exactly that string—not "read meeting notes" or any paraphrase.

Return as JSON object:
{
  "suggestions": [
    {
      "title": "Specify which meeting notes",
      "category": "specificity",
      "severity": "medium",
      "currentText": "Search Drive for files named 'Gemini meeting notes' modified in the last 7 days",
      "issue": "Multiple files might match, only first result will be read",
      "suggestedFix": "Search Drive for files named 'Gemini meeting notes' modified in the last 7 days, sort by newest first, and read the most recent one",
      "reasoning": "Adding time filter and sort order ensures you get the latest meeting"
    }
  ]
}

Categories: "specificity", "assignment", "error_handling", "structure"
Severity: "low", "medium", "high"

Return ONLY the JSON object, no additional text.`
}

/**
 * Generate AI suggestions for policy improvements based on compilation warnings.
 * Fails gracefully: returns [] on error or when no warnings.
 */
export async function generateSuggestions(
  policyContent: string,
  warnings: string[],
): Promise<PolicySuggestion[]> {
  if (warnings.length === 0) return []

  const prompt = buildPrompt(policyContent, warnings)
  const systemPrompt =
    'You are an expert at analyzing automation policies and suggesting specific improvements. Always return valid JSON with a "suggestions" array.'

  try {
    const openai = getOpenAIClient()

    if (openai) {
      const response = await openai.chat.completions.create({
        model: SUGGESTION_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      })

      const content = response.choices[0]?.message?.content
      if (!content) return []

      const parsed = JSON.parse(content) as Record<string, unknown>
      const rawList = Array.isArray(parsed?.suggestions)
        ? (parsed.suggestions as Record<string, unknown>[])
        : []

      return rawList.map((s, idx) => normalizeSuggestion(s, idx))
    }

    const response = await callLoopbrainLLM(prompt, systemPrompt, {
      model: SUGGESTION_MODEL,
      maxTokens: 2000,
      timeoutMs: 15000,
    })

    const jsonText = extractJSON(response.content)
    if (!jsonText) return []

    const parsed = JSON.parse(jsonText) as Record<string, unknown>
    const rawList = Array.isArray(parsed?.suggestions)
      ? (parsed.suggestions as Record<string, unknown>[])
      : []

    return rawList.map((s, idx) => normalizeSuggestion(s, idx))
  } catch (error: unknown) {
    console.error('Failed to generate suggestions:', error)
    return []
  }
}
