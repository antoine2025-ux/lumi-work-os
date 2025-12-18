/**
 * Loopbrain Prompt Budgets
 * 
 * Deterministic budgets for prompt construction using item counts and character limits.
 * Token limits are a secondary guardrail; primary control is via item counts and char caps.
 * 
 * Rationale: Char caps are deterministic and predictable; token estimation is approximate.
 */

/**
 * Prompt budget configuration
 */
export const PROMPT_BUDGET = {
  /** Maximum number of ContextObjects to include in structured context */
  maxContextObjects: 12,
  
  /** Maximum number of retrieved items from semantic search */
  maxRetrievedItems: 6,
  
  /** Maximum number of org people to include (org mode only) */
  maxOrgPeople: 20,
  
  /** Maximum number of personal docs to include */
  maxPersonalDocs: 5,
  
  /** Maximum number of Slack messages to include */
  maxSlackMessages: 10,
  
  /** Hard cap per ContextObject serialization (chars) */
  maxCharsPerObject: 900,
  
  /** Hard cap for the entire context payload (chars) */
  maxTotalChars: 18000,
  
  /** Maximum model tokens (secondary guardrail, keep existing setting) */
  maxModelTokens: 2000,
} as const

/**
 * Budget for primary context (e.g., wiki page content)
 */
export const PRIMARY_CONTEXT_BUDGET = {
  /** Maximum characters for primary context content */
  maxChars: 4000,
} as const

