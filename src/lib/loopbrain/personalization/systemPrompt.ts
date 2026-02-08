/**
 * Loopbrain Personalization — system prompt assembly.
 *
 * Single helper used by all orchestrator handlers so style injection
 * cannot diverge across Spaces / Org / Dashboard modes.
 */

const DEFAULT_LOOPBRAIN_SYSTEM =
  "You are Loopbrain, Loopwell's Virtual COO assistant.";

/**
 * Build a system prompt with optional personalization style instructions.
 *
 * @param opts.basePrompt  Mode-specific system prompt (Org prompt chain, etc.).
 *                         Falls back to DEFAULT_LOOPBRAIN_SYSTEM when omitted.
 * @param opts.styleInstructions  Output of buildStyleInstructions(). Empty string = no-op.
 * @returns The assembled system prompt string.
 */
export function buildPersonalizedSystemPrompt(opts: {
  basePrompt?: string;
  styleInstructions: string;
}): string {
  const base = opts.basePrompt || DEFAULT_LOOPBRAIN_SYSTEM;
  if (!opts.styleInstructions) return base;
  return base + "\n\n" + opts.styleInstructions;
}
